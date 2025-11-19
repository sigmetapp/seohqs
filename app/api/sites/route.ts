import { NextResponse } from 'next/server';
import { getAllSites, insertSite, getIntegrations, getSiteTags } from '@/lib/db-adapter';
import { createSearchConsoleService } from '@/lib/google-search-console';
import { hasGoogleOAuth } from '@/lib/oauth-utils';
import { requireAuth } from '@/lib/middleware-auth';
import { NextRequest } from 'next/server';
import { cache } from '@/lib/cache';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;
    
    // Проверяем кеш (кеш на 12 часов)
    const cacheKey = `sites-list-${user.id}`;
    const cachedData = cache.get<any>(cacheKey);
    if (cachedData) {
      return NextResponse.json({
        success: true,
        sites: cachedData,
        cached: true,
      });
    }
    
    const sites = await getAllSites(user.id);
    const integrations = await getIntegrations(user.id);
    
    // Проверяем статус подключения для каждого сайта
    const isOAuthConfigured = hasGoogleOAuth(integrations);
    
    // Если есть OAuth, проверяем наличие сайтов в Google Search Console
    let googleConsoleSites: Array<{ siteUrl: string; permissionLevel: string }> = [];
    if (isOAuthConfigured) {
      try {
        const searchConsoleService = createSearchConsoleService(undefined, user.id);
        googleConsoleSites = await searchConsoleService.getSites();
      } catch (error) {
        // Если не удалось получить список сайтов (например, токен истек), просто игнорируем
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
    
    // Загружаем теги для всех сайтов
    const sitesWithTags = await Promise.all(sites.map(async (site) => {
      const tags = await getSiteTags(site.id);
      return { ...site, tags };
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
    
    const sitesWithStatus = sitesWithTags.map(site => {
      let hasGoogleConsoleConnection = false;
      
      if (isOAuthConfigured) {
        // Проверяем, есть ли сайт в Google Search Console
        const normalizedDomain = normalizeDomain(site.domain);
        
        // Проверяем по URL, если он указан
        if (site.googleSearchConsoleUrl) {
          const gscDomain = extractDomainFromGSCUrl(site.googleSearchConsoleUrl);
          hasGoogleConsoleConnection = googleConsoleSites.some(gscSite => {
            const gscSiteDomain = extractDomainFromGSCUrl(gscSite.siteUrl);
            return gscSiteDomain === normalizedDomain || gscSiteDomain === gscDomain;
          });
        } else {
          // Если URL не указан, проверяем по домену
          hasGoogleConsoleConnection = googleConsoleSites.some(gscSite => {
            const gscSiteDomain = extractDomainFromGSCUrl(gscSite.siteUrl);
            return gscSiteDomain === normalizedDomain || 
                   gscSiteDomain === `www.${normalizedDomain}` ||
                   normalizedDomain === `www.${gscSiteDomain}`;
          });
        }
      }
      
      return {
        ...site,
        status: site.statusId ? statusesMap[site.statusId] || null : null,
        hasGoogleConsoleConnection,
        // Детальная информация для отображения причин отсутствия подключения
        googleConsoleStatus: {
          connected: hasGoogleConsoleConnection,
          hasOAuth: isOAuthConfigured,
          hasUrl: !!site.googleSearchConsoleUrl,
        },
      };
    });
    
    // Сохраняем в кеш на 12 часов (43200000 мс)
    cache.set(cacheKey, sitesWithStatus, 12 * 60 * 60 * 1000);
    
    return NextResponse.json({
      success: true,
      sites: sitesWithStatus,
      cached: false,
    });
  } catch (error: any) {
    console.error('Error fetching sites:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Ошибка получения сайтов',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;
    
    const body = await request.json();
    const { name, domain, category, googleSearchConsoleUrl } = body;

    if (!name || !domain) {
      return NextResponse.json(
        {
          success: false,
          error: 'Название и домен обязательны',
        },
        { status: 400 }
      );
    }

    const newSite = await insertSite({
      name,
      domain,
      category: category || undefined,
      googleSearchConsoleUrl: googleSearchConsoleUrl || undefined,
    }, user.id);

    // Инвалидируем кеш списка сайтов
    cache.delete(`sites-list-${user.id}`);
    // Также инвалидируем кеш агрегированных данных
    for (const days of [7, 14, 30, 60, 90]) {
      cache.delete(`google-console-aggregated-${user.id}-default-${days}`);
    }

    return NextResponse.json({
      success: true,
      site: newSite,
    });
  } catch (error: any) {
    console.error('Error creating site:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Ошибка создания сайта',
      },
      { status: 500 }
    );
  }
}
