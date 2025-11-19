import { NextResponse } from 'next/server';
import { getSiteById, updateSite, getIntegrations, clearGoogleSearchConsoleData } from '@/lib/db-adapter';
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
    for (const days of [7, 14, 30, 60, 90]) {
      cache.delete(`google-console-aggregated-${user.id}-default-${days}`);
      cache.delete(`google-console-daily-${siteId}-${days}`);
    }

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

export async function DELETE(
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

    // Проверяем, что сайт принадлежит пользователю
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

    // Удаляем данные Google Search Console для сайта
    try {
      await clearGoogleSearchConsoleData(siteId);
    } catch (error: any) {
      console.warn(`Failed to clear GSC data for site ${siteId}:`, error.message);
      // Продолжаем удаление сайта даже если не удалось очистить данные GSC
    }

    // Удаляем сайт из БД
    const useSupabase = !!(process.env.NEXT_PUBLIC_SUPABASE_URL);
    const usePostgres = !useSupabase && !!(process.env.POSTGRES_URL || process.env.DATABASE_URL);
    
    if (useSupabase) {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      
      // Удаляем связи site_tags сначала (из-за внешних ключей)
      await supabase
        .from('site_tags')
        .delete()
        .eq('site_id', siteId);
      
      // Удаляем сайт
      const { error } = await supabase
        .from('sites')
        .delete()
        .eq('id', siteId)
        .eq('user_id', user.id);
      
      if (error) {
        throw new Error(`Failed to delete site: ${error.message}`);
      }
    } else if (usePostgres) {
      const { getPostgresClient } = await import('@/lib/postgres-client');
      const db = await getPostgresClient();
      
      // Удаляем связи site_tags сначала
      await db.query('DELETE FROM site_tags WHERE site_id = $1', [siteId]);
      
      // Удаляем сайт
      await db.query('DELETE FROM sites WHERE id = $1 AND user_id = $2', [siteId, user.id]);
    } else {
      // SQLite (локальная разработка)
      const Database = require('better-sqlite3');
      const { join } = require('path');
      const { existsSync } = require('fs');
      
      const dbDir = join(process.cwd(), 'data');
      if (existsSync(dbDir)) {
        const dbPath = join(dbDir, 'affiliate.db');
        const db = new Database(dbPath);
        
        // Удаляем связи site_tags сначала
        db.prepare('DELETE FROM site_tags WHERE site_id = ?').run(siteId);
        
        // Удаляем сайт
        db.prepare('DELETE FROM sites WHERE id = ? AND user_id = ?').run(siteId, user.id);
        
        db.close();
      }
    }

    // Инвалидируем кеш
    cache.delete(`sites-list-${user.id}`);
    for (const days of [7, 14, 30, 60, 90]) {
      cache.delete(`google-console-aggregated-${user.id}-default-${days}`);
      cache.delete(`google-console-daily-${siteId}-${days}`);
    }

    return NextResponse.json({
      success: true,
      message: 'Сайт успешно удален',
    });
  } catch (error: any) {
    console.error('Error deleting site:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Ошибка удаления сайта',
      },
      { status: 500 }
    );
  }
}
