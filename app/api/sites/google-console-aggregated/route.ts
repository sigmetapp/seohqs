import { NextResponse } from 'next/server';
import { getAllSites, getGoogleSearchConsoleDataBySiteId, getIntegrations } from '@/lib/db-adapter';
import { createSearchConsoleService } from '@/lib/google-search-console';
import { hasGoogleOAuth } from '@/lib/oauth-utils';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/sites/google-console-aggregated
 * Получает агрегированные данные по всем сайтам из Google Search Console
 */
export async function GET() {
  try {
    const sites = await getAllSites();
    const integrations = await getIntegrations();
    const isOAuthConfigured = hasGoogleOAuth(integrations);
    
    // Получаем список сайтов из Google Search Console, если OAuth настроен
    let googleConsoleSites: Array<{ siteUrl: string; permissionLevel: string }> = [];
    if (isOAuthConfigured) {
      try {
        const searchConsoleService = createSearchConsoleService();
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
    
    // Получаем агрегированные данные для каждого сайта
    const sitesWithData = await Promise.all(
      sites.map(async (site) => {
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
        
        // Агрегируем данные
        const totalImpressions = gscData.reduce((sum, row) => sum + (row.impressions || 0), 0);
        const totalClicks = gscData.reduce((sum, row) => sum + (row.clicks || 0), 0);
        
        // Получаем данные о проиндексированных страницах из Google Search Console API
        let indexedPages: number | null = null;
        if (hasGoogleConsoleConnection && googleConsoleSiteUrl && isOAuthConfigured) {
          try {
            const searchConsoleService = createSearchConsoleService();
            // Пытаемся получить информацию о проиндексированных страницах
            // Это может быть доступно через URL Inspection API или через sitemap
            // Пока оставляем null, так как для этого нужен отдельный API вызов
            indexedPages = null;
          } catch (error) {
            console.warn(`Не удалось получить данные об индексации для сайта ${site.domain}:`, error);
          }
        }
        
        // Данные Ahrefs пока не реализованы, возвращаем null
        const referringDomains: number | null = null;
        const backlinks: number | null = null;
        
        return {
          id: site.id,
          domain: site.domain,
          name: site.name,
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
    
    return NextResponse.json({
      success: true,
      sites: sitesWithData,
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
