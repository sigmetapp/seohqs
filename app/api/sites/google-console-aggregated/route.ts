import { NextResponse } from 'next/server';
import { getAllSites, getGoogleSearchConsoleDataBySiteId, getIntegrations, getAllGoogleAccounts, getSitesByTag, getAllSitesTags } from '@/lib/db-adapter';
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
    const statusIdsParam = searchParams.get('statusIds');
    const statusIds = statusIdsParam ? statusIdsParam.split(',').map(id => parseInt(id, 10)).filter(id => !isNaN(id)) : [];

      // Проверяем кеш (кеш на 12 часов, так как данные Google Search Console обновляются раз в сутки)
      const normalizedTagKey = tagIds.length > 0 ? tagIds.slice().sort((a, b) => a - b).join('-') : 'all';
      const normalizedStatusKey = statusIds.length > 0 ? statusIds.slice().sort((a, b) => a - b).join('-') : 'all';
      const cacheKey = `google-console-aggregated-${user.id}-${accountId || 'default'}-${days}-${normalizedTagKey}-${normalizedStatusKey}`;
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
    
    // Фильтруем сайты по статусам, если указаны
    if (statusIds.length > 0) {
      sites = sites.filter(site => site.statusId && statusIds.includes(site.statusId));
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
    
    // Загружаем теги для всех сайтов одним запросом (оптимизация N+1)
    const siteIds = sites.map(site => site.id);
    const tagsBySite = await getAllSitesTags(siteIds);
    const sitesWithTags = sites.map(site => ({
      ...site,
      tags: tagsBySite[site.id] || []
    }));
    
    // Загружаем статусы для всех сайтов одним запросом
    const statusIds = sitesWithTags.filter(site => site.statusId).map(site => site.statusId!);
    const statusesMap: Record<number, any> = {};
    
    if (statusIds.length > 0) {
      try {
        const useSupabase = !!(process.env.NEXT_PUBLIC_SUPABASE_URL);
        if (useSupabase) {
          const { createClient } = await import('@supabase/supabase-js');
          const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
          );
          const { data } = await supabase
            .from('site_statuses')
            .select('*')
            .in('id', statusIds);
          if (data) {
            data.forEach((status: any) => {
              statusesMap[status.id] = {
                id: status.id,
                name: status.name,
                color: status.color,
                sortOrder: status.sort_order,
                createdAt: status.created_at,
                updatedAt: status.updated_at,
              };
            });
          }
        } else {
          const { getPostgresClient } = await import('@/lib/postgres-client');
          const db = await getPostgresClient();
          const result = await db.query('SELECT * FROM site_statuses WHERE id = ANY($1::int[])', [statusIds]);
          result.rows.forEach((row: any) => {
            statusesMap[row.id] = {
              id: row.id,
              name: row.name,
              color: row.color,
              sortOrder: row.sort_order,
              createdAt: row.created_at,
              updatedAt: row.updated_at,
            };
          });
        }
      } catch (error) {
        console.error('Error loading site statuses:', error);
      }
    }
    
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
        // Используем кеш и делаем запрос неблокирующим (в фоне)
        let indexedPages: number | null = null;
        const indexedPagesCacheKey = `indexed-pages-${site.id}-${googleConsoleSiteUrl || site.domain}`;
        const cachedIndexedPages = cache.get<number>(indexedPagesCacheKey);
        
        if (cachedIndexedPages !== undefined) {
          indexedPages = cachedIndexedPages;
        } else if (hasGoogleConsoleConnection && googleConsoleSiteUrl && isOAuthConfigured) {
          // Запускаем запрос в фоне, не блокируя основной ответ
          // Используем более короткий таймаут (5 секунд) и кешируем результат на 24 часа
          (async () => {
            try {
              const searchConsoleService = createSearchConsoleService(accountId || undefined, user.id);
              const endDateForIndex = new Date();
              const startDateForIndex = new Date();
              startDateForIndex.setDate(startDateForIndex.getDate() - 180);
              
              const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Timeout')), 5000)
              );
              
              const performanceDataPromise = searchConsoleService.getPerformanceData(
                googleConsoleSiteUrl,
                startDateForIndex.toISOString().split('T')[0],
                endDateForIndex.toISOString().split('T')[0],
                ['page']
              );
              
              const performanceData = await Promise.race([performanceDataPromise, timeoutPromise]) as any;
              
              if (performanceData.rows && performanceData.rows.length > 0) {
                const uniquePages = new Set(performanceData.rows.map((row: any) => row.keys[0]));
                const pagesCount = uniquePages.size;
                // Кешируем на 24 часа
                cache.set(indexedPagesCacheKey, pagesCount, 24 * 60 * 60 * 1000);
                console.log(`Получено индексированных страниц для ${site.domain}: ${pagesCount}`);
              } else {
                // Кешируем null на 1 час, чтобы не делать повторные запросы
                cache.set(indexedPagesCacheKey, null, 60 * 60 * 1000);
              }
            } catch (apiError: any) {
              if (apiError?.message === 'Timeout') {
                console.warn(`Таймаут при получении данных об индексации для сайта ${site.domain}`);
              } else {
                console.warn(`Не удалось получить данные об индексации через API для сайта ${site.domain}:`, apiError?.message || apiError);
              }
              // Кешируем null на 1 час при ошибке
              cache.set(indexedPagesCacheKey, null, 60 * 60 * 1000);
            }
          })().catch(err => {
            console.warn(`Ошибка в фоновом запросе indexedPages для ${site.domain}:`, err);
          });
        }
        
        // Данные о доменах и ссылках (стабильные данные, не зависят от периода)
        // Эти данные обычно получаются из инструментов для анализа backlinks (Ahrefs, Majestic и т.д.)
        // Google Search Console не предоставляет эти данные напрямую
        // Пока возвращаем null, так как требуется интеграция с внешними сервисами
        const referringDomains: number | null = null;
        const backlinks: number | null = null;
        
        // Получаем количество постбеков за выбранный период (будет заполнено позже батч-запросом)
        let totalPostbacks = 0;
        
        return {
          id: site.id,
          domain: site.domain,
          name: site.name,
          status: site.statusId ? statusesMap[site.statusId] || null : null,
          hasGoogleConsoleConnection,
          googleConsoleSiteUrl,
          totalImpressions,
          totalClicks,
          indexedPages,
          referringDomains,
          backlinks,
        };
      })
    );
    
    // Оптимизация: получаем все постбеки одним запросом для всех сайтов
    const postbacksBySite: Record<number, number> = {};
    siteIds.forEach(siteId => {
      postbacksBySite[siteId] = 0;
    });
    
    try {
      if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
        const { createClient } = await import('@supabase/supabase-js');
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (supabaseKey && siteIds.length > 0) {
          const supabase = createClient(supabaseUrl, supabaseKey);
          const { data, error } = await supabase
            .from('postbacks')
            .select('site_id')
            .in('site_id', siteIds)
            .gte('date', startDate.toISOString())
            .lte('date', endDate.toISOString());
          
          if (!error && data) {
            data.forEach((row: any) => {
              if (postbacksBySite[row.site_id] !== undefined) {
                postbacksBySite[row.site_id]++;
              }
            });
          }
        }
      } else if (process.env.POSTGRES_URL || process.env.DATABASE_URL) {
        if (siteIds.length > 0) {
          const db = await getPostgresClient();
          const postbacksResult = await db.query(
            `SELECT site_id, COUNT(*) as count FROM postbacks 
             WHERE site_id = ANY($1::int[]) AND date >= $2 AND date <= $3
             GROUP BY site_id`,
            [siteIds, startDate, endDate]
          );
          
          postbacksResult.rows.forEach((row: any) => {
            postbacksBySite[row.site_id] = parseInt(row.count || '0', 10);
          });
        }
      } else if (!process.env.VERCEL) {
        // Для локальной разработки используем storage
        const { storage } = require('@/lib/storage');
        siteIds.forEach(siteId => {
          const sitePostbacks = storage.postbacks.filter((p: any) => {
            if (p.siteId !== siteId) return false;
            const postbackDate = new Date(p.date);
            return postbackDate >= startDate && postbackDate <= endDate;
          });
          postbacksBySite[siteId] = sitePostbacks.length;
        });
      }
    } catch (error: any) {
      console.warn(`Не удалось получить постбеки батч-запросом:`, error?.message || error);
    }
    
    // Добавляем данные о постбеках к каждому сайту
    const sitesWithPostbacks = sitesWithData.map(site => ({
      ...site,
      totalPostbacks: postbacksBySite[site.id] || 0
    }));
    
    // Сохраняем в кеш на 12 часов (43200000 мс)
    cache.set(cacheKey, sitesWithPostbacks, 12 * 60 * 60 * 1000);
    
    return NextResponse.json({
      success: true,
      sites: sitesWithPostbacks,
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
