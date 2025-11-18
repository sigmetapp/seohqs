import { NextResponse } from 'next/server';
import { getSiteById, updateSite, getIntegrations } from '@/lib/db-adapter';
import { createSearchConsoleService } from '@/lib/google-search-console';
import { hasGoogleOAuth } from '@/lib/oauth-utils';
import { requireAuth } from '@/lib/middleware-auth';
import { NextRequest } from 'next/server';
import { cache } from '@/lib/cache';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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

// Функция для проверки подключения сайта к Google Search Console
async function checkGoogleConsoleConnection(site: any, userId: number): Promise<{
  connected: boolean;
  hasOAuth: boolean;
  hasUrl: boolean;
}> {
  const integrations = await getIntegrations(userId);
  const isOAuthConfigured = hasGoogleOAuth(integrations);
  
  if (!isOAuthConfigured) {
    return {
      connected: false,
      hasOAuth: false,
      hasUrl: !!site.googleSearchConsoleUrl,
    };
  }
  
  let hasGoogleConsoleConnection = false;
  
  try {
    const searchConsoleService = createSearchConsoleService(undefined, userId);
    const googleConsoleSites = await searchConsoleService.getSites();
    
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
  } catch (error) {
    // Если не удалось получить список сайтов, считаем, что не подключено
    console.warn('Не удалось проверить подключение к Google Search Console:', error);
  }
  
  return {
    connected: hasGoogleConsoleConnection,
    hasOAuth: isOAuthConfigured,
    hasUrl: !!site.googleSearchConsoleUrl,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;
    
    const siteId = parseInt(params.id);
    if (isNaN(siteId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Неверный ID сайта',
        },
        { status: 400 }
      );
    }

    const site = await getSiteById(siteId, user.id);
    
    if (!site) {
      return NextResponse.json(
        {
          success: false,
          error: 'Сайт не найден',
        },
        { status: 404 }
      );
    }

    // Загружаем статус сайта, если он есть
    let siteStatus = null;
    if (site.statusId) {
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
            .eq('id', site.statusId)
            .single();
          if (data) {
            siteStatus = {
              id: data.id,
              name: data.name,
              color: data.color,
              sortOrder: data.sort_order,
              createdAt: data.created_at,
              updatedAt: data.updated_at,
            };
          }
        } else {
          const { getPostgresClient } = await import('@/lib/postgres-client');
          const db = await getPostgresClient();
          const result = await db.query('SELECT * FROM site_statuses WHERE id = $1', [site.statusId]);
          if (result.rows.length > 0) {
            const row = result.rows[0];
            siteStatus = {
              id: row.id,
              name: row.name,
              color: row.color,
              sortOrder: row.sort_order,
              createdAt: row.created_at,
              updatedAt: row.updated_at,
            };
          }
        }
      } catch (error) {
        console.error('Error loading site status:', error);
      }
    }

    // Проверяем статус подключения Google Console
    const googleConsoleStatus = await checkGoogleConsoleConnection(site, user.id);

    return NextResponse.json({
      success: true,
      site: {
        ...site,
        status: siteStatus,
        hasGoogleConsoleConnection: googleConsoleStatus.connected,
        googleConsoleStatus,
      },
    });
  } catch (error: any) {
    console.error('Error fetching site:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Ошибка получения сайта',
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;
    
    const siteId = parseInt(params.id);
    if (isNaN(siteId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Неверный ID сайта',
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, domain, category, googleSearchConsoleUrl, statusId } = body;

    const updatedSite = await updateSite(siteId, {
      name,
      domain,
      category,
      googleSearchConsoleUrl,
      statusId,
    }, user.id);

    // Инвалидируем кеш списка сайтов
    cache.delete(`sites-list-${user.id}`);
    // Также инвалидируем кеш агрегированных данных для всех периодов
    cache.delete(`google-console-aggregated-${user.id}-default-30`);
    cache.delete(`google-console-aggregated-${user.id}-default-7`);
    cache.delete(`google-console-aggregated-${user.id}-default-90`);
    cache.delete(`google-console-aggregated-${user.id}-default-180`);
    // Инвалидируем кеш для конкретного сайта
    cache.delete(`google-console-daily-${siteId}-30`);
    cache.delete(`google-console-daily-${siteId}-7`);
    cache.delete(`google-console-daily-${siteId}-90`);
    cache.delete(`google-console-daily-${siteId}-180`);

    // Загружаем статус сайта, если он есть
    let siteStatus = null;
    if (updatedSite.statusId) {
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
            .eq('id', updatedSite.statusId)
            .single();
          if (data) {
            siteStatus = {
              id: data.id,
              name: data.name,
              color: data.color,
              sortOrder: data.sort_order,
              createdAt: data.created_at,
              updatedAt: data.updated_at,
            };
          }
        } else {
          const { getPostgresClient } = await import('@/lib/postgres-client');
          const db = await getPostgresClient();
          const result = await db.query('SELECT * FROM site_statuses WHERE id = $1', [updatedSite.statusId]);
          if (result.rows.length > 0) {
            const row = result.rows[0];
            siteStatus = {
              id: row.id,
              name: row.name,
              color: row.color,
              sortOrder: row.sort_order,
              createdAt: row.created_at,
              updatedAt: row.updated_at,
            };
          }
        }
      } catch (error) {
        console.error('Error loading site status:', error);
      }
    }

    // Проверяем статус подключения Google Console
    const googleConsoleStatus = await checkGoogleConsoleConnection(updatedSite, user.id);

    return NextResponse.json({
      success: true,
      site: {
        ...updatedSite,
        status: siteStatus,
        hasGoogleConsoleConnection: googleConsoleStatus.connected,
        googleConsoleStatus,
      },
    });
  } catch (error: any) {
    console.error('Error updating site:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Ошибка обновления сайта',
      },
      { status: 500 }
    );
  }
}
