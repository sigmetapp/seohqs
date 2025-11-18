import { NextResponse } from 'next/server';
import { getAllSites, getGoogleSearchConsoleDataBySiteId, getIntegrations, getAllGoogleAccounts, getSitesByTag, getSiteTags } from '@/lib/db-adapter';
import { createSearchConsoleService } from '@/lib/google-search-console';
import { hasGoogleOAuth } from '@/lib/oauth-utils';
import { requireAuth } from '@/lib/middleware-auth';
import { NextRequest } from 'next/server';
import { cache } from '@/lib/cache';
import { getPostgresClient } from '@/lib/postgres-client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/sites/google-console-aggregated
 * Получает агрегированные данные по всем сайтам из Google Search Console
 * Query параметры:
 *   - days: количество дней для фильтрации показов и кликов (по умолчанию 30)
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;
    
    // Получаем параметры из query string
    const { searchParams } = new URL(request.url);
    const daysParam = searchParams.get('days');
    const days = daysParam ? parseInt(daysParam) : 30; // По умолчанию 30 дней
    const accountIdParam = searchParams.get('accountId');
    const accountId = accountIdParam ? parseInt(accountIdParam) : null;
    const tagIdsParam = searchParams.get('tagIds');
    const tagIds = tagIdsParam ? tagIdsParam.split(',').map(id => parseInt(id, 10)).filter(id => !isNaN(id)) : [];

      // Проверяем кеш (кеш на 12 часов, так как данные Google Search Console обновляются раз в сутки)
      const normalizedTagKey = tagIds.length > 0 ? tagIds.slice().sort((a, b) => a - b).join('-') : 'all';
      const cacheKey = `google-console-aggregated-${user.id}-${accountId || 'default'}-${days}-${normalizedTagKey}`;
    const cachedData = cache.get<any>(cacheKey);
    if (cachedData) {
      return NextResponse.json({
        success: true,
        sites: cachedData,
        cached: true,
      });
    }

    let sites = await getAllSites(user.id);
    
    // Фильтруем сайты по тегам, если указаны
    if (tagIds.length > 0) {
      const siteIdsByTags = new Set<number>();
      for (const tagId of tagIds) {
        const siteIds = await getSitesByTag(tagId, user.id);
        siteIds.forEach(id => siteIdsByTags.add(id));
      }
      sites = sites.filter(site => siteIdsByTags.has(site.id));
    }
    
    const integrations = await getIntegrations(user.id);
    const isOAuthConfigured = hasGoogleOAuth(integrations);
    
    // Получаем список сайтов из Google Search Console, если OAuth настроен
    let googleConsoleSites: Array<{ siteUrl: string; permissionLevel: string }> = [];
    if (isOAuthConfigured || accountId) {
      try {
        const searchConsoleService = createSearchConsoleService(accountId || undefined, user.id);
        googleConsoleSites = await searchConsoleService.getSites();
      } catch (error) {
        console.warn('Не удалось получить список сайтов из Google Search Console:', error);
      }
    }
    
    // Функция для нормализации домена
    const normalizeDomain = (domain: string): string => {
      return domain.toLowerCase().trim().replace(/^www\./, '').replace(/^https?:\/\//, '').split('/')[0];
    };
    
    // Функция для извлечения домена из URL Google Search Console
    const extractDomainFromGSCUrl = (siteUrl: string): string => {
      let domain = siteUrl.replace(/^sc-domain:/, '');
      domain = domain.replace(/^https?:\/\//, '');
      domain = domain.replace(/^www\./, '');
      domain = domain.split('/')[0];
      return domain.toLowerCase().trim();
    };

    // Вычисляем дату начала периода для фильтрации
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // Загружаем теги для всех сайтов
    const sitesWithTags = await Promise.all(sites.map(async (site) => {
      const tags = await getSiteTags(site.id);
      return { ...site, tags };
    }));
    
    // Получаем агрегированные данные для каждого сайта
    const sitesWithData = await Promise.all(
      sitesWithTags.map(async (site) => {
        // Проверяем подключение к Google Search Console
        let hasGoogleConsoleConnection = false;
        let googleConsoleSiteUrl: string | null = null;
        
        if (isOAuthConfigured) {
          const normalizedDomain = normalizeDomain(site.domain);
          
          // Проверяем по URL, если он указан
          if (site.googleSearchConsoleUrl) {
            const gscDomain = extractDomainFromGSCUrl(site.googleSearchConsoleUrl);
            const matchingSite = googleConsoleSites.find(gscSite => {
              const gscSiteDomain = extractDomainFromGSCUrl(gscSite.siteUrl);
              return gscSiteDomain === normalizedDomain || gscSiteDomain === gscDomain;
            });
            if (matchingSite) {
              hasGoogleConsoleConnection = true;
              googleConsoleSiteUrl = matchingSite.siteUrl;
            }
          } else {
            // Если URL не указан, проверяем по домену
            const matchingSite = googleConsoleSites.find(gscSite => {
              const gscSiteDomain = extractDomainFromGSCUrl(gscSite.siteUrl);
              return gscSiteDomain === normalizedDomain || 
                     gscSiteDomain === `www.${normalizedDomain}` ||
                     normalizedDomain === `www.${gscSiteDomain}`;
            });
            if (matchingSite) {
              hasGoogleConsoleConnection = true;
              googleConsoleSiteUrl = matchingSite.siteUrl;
            }
          }
        }
        
        // Получаем данные Google Search Console из БД
        const gscData = await getGoogleSearchConsoleDataBySiteId(site.id, 1000);
        
        // Если OAuth настроен и есть данные в БД, считаем сайт подключенным
        if (isOAuthConfigured && gscData.length > 0 && !hasGoogleConsoleConnection) {
          hasGoogleConsoleConnection = true;
        }
        
        // Фильтруем данные по периоду для показов и кликов
        const filteredGscData = gscData.filter((row) => {
          const rowDate = new Date(row.date);
          return rowDate >= startDate && rowDate <= endDate;
        });
        
        // Агрегируем данные за выбранный период (только показы и клики фильтруются)
        const totalImpressions = filteredGscData.reduce((sum, row) => sum + (row.impressions || 0), 0);
        const totalClicks = filteredGscData.reduce((sum, row) => sum + (row.clicks || 0), 0);
        
        // Получаем данные о проиндексированных страницах из Google Search Console API
        // Это стабильные данные, не зависящие от выбранного периода
        // Используем Promise.race с таймаутом, чтобы не блокировать загрузку страницы
        let indexedPages: number | null = null;
        if (hasGoogleConsoleConnection && googleConsoleSiteUrl && isOAuthConfigured) {
          try {
            const searchConsoleService = createSearchConsoleService(accountId || undefined, user.id);
            // Пытаемся получить информацию о проиндексированных страницах через API
            // Используем большой период (180 дней) для получения более полной картины
            const endDateForIndex = new Date();
            const startDateForIndex = new Date();
            startDateForIndex.setDate(startDateForIndex.getDate() - 180);
            
            // Добавляем таймаут для запроса (10 секунд)
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Timeout')), 10000)
            );
            
            try {
              const performanceDataPromise = searchConsoleService.getPerformanceData(
                googleConsoleSiteUrl,
                startDateForIndex.toISOString().split('T')[0],
                endDateForIndex.toISOString().split('T')[0],
                ['page']
              );
              
              const performanceData = await Promise.race([performanceDataPromise, timeoutPromise]) as any;
              
              // Подсчитываем количество уникальных страниц, которые получили показы
              // Это приблизительное значение, так как Google Search Console API не предоставляет
              // точное количество всех проиндексированных страниц
              if (performanceData.rows && performanceData.rows.length > 0) {
                // Используем Set для подсчета уникальных страниц
                const uniquePages = new Set(performanceData.rows.map((row: any) => row.keys[0]));
                indexedPages = uniquePages.size;
                console.log(`Получено индексированных страниц для ${site.domain}: ${indexedPages}`);
              } else {
                console.log(`Нет данных о страницах для ${site.domain}`);
              }
            } catch (apiError: any) {
              if (apiError?.message === 'Timeout') {
                console.warn(`Таймаут при получении данных об индексации для сайта ${site.domain}`);
              } else {
                console.warn(`Не удалось получить данные об индексации через API для сайта ${site.domain}:`, apiError?.message || apiError);
              }
              // Если не удалось получить через API, оставляем null
              indexedPages = null;
            }
          } catch (error: any) {
            console.warn(`Не удалось получить данные об индексации для сайта ${site.domain}:`, error?.message || error);
            indexedPages = null;
          }
        } else {
          console.log(`Сайт ${site.domain} не подключен к Google Search Console или OAuth не настроен`);
        }
        
        // Данные о доменах и ссылках (стабильные данные, не зависят от периода)
        // Эти данные обычно получаются из инструментов для анализа backlinks (Ahrefs, Majestic и т.д.)
        // Google Search Console не предоставляет эти данные напрямую
        // Пока возвращаем null, так как требуется интеграция с внешними сервисами
        const referringDomains: number | null = null;
        const backlinks: number | null = null;
        
        // Получаем количество постбеков за выбранный период
        let totalPostbacks = 0;
        try {
          if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
            const { createClient } = await import('@supabase/supabase-js');
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
            const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
            if (supabaseKey) {
              const supabase = createClient(supabaseUrl, supabaseKey);
              const { count } = await supabase
                .from('postbacks')
                .select('*', { count: 'exact', head: true })
                .eq('site_id', site.id)
                .gte('date', startDate.toISOString())
                .lte('date', endDate.toISOString());
              totalPostbacks = count || 0;
            }
          } else if (process.env.POSTGRES_URL || process.env.DATABASE_URL) {
            const db = await getPostgresClient();
            const postbacksResult = await db.query(
              `SELECT COUNT(*) as count FROM postbacks 
               WHERE site_id = $1 AND date >= $2 AND date <= $3`,
              [site.id, startDate, endDate]
            );
            totalPostbacks = parseInt(postbacksResult.rows[0]?.count || '0', 10);
          } else if (!process.env.VERCEL) {
            // Для локальной разработки используем storage
            const { storage } = require('@/lib/storage');
            const sitePostbacks = storage.postbacks.filter((p: any) => {
              if (p.siteId !== site.id) return false;
              const postbackDate = new Date(p.date);
              return postbackDate >= startDate && postbackDate <= endDate;
            });
            totalPostbacks = sitePostbacks.length;
          }
        } catch (error: any) {
          console.warn(`Не удалось получить постбеки для сайта ${site.domain}:`, error?.message || error);
          totalPostbacks = 0;
        }
        
        return {
          id: site.id,
          domain: site.domain,
          name: site.name,
          hasGoogleConsoleConnection,
          googleConsoleSiteUrl,
          totalImpressions,
          totalClicks,
          totalPostbacks,
          indexedPages,
          referringDomains,
          backlinks,
        };
      })
    );
    
    // Сохраняем в кеш на 12 часов (43200000 мс)
    cache.set(cacheKey, sitesWithData, 12 * 60 * 60 * 1000);
    
    return NextResponse.json({
      success: true,
      sites: sitesWithData,
      cached: false,
    });
  } catch (error: any) {
    console.error('Ошибка получения агрегированных данных:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Ошибка получения данных',
      },
      { status: 500 }
    );
  }
}
