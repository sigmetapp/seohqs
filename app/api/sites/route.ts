import { NextResponse } from 'next/server';
import { getAllSites, insertSite, getIntegrations } from '@/lib/db-adapter';
import { createSearchConsoleService } from '@/lib/google-search-console';
import { hasGoogleOAuth } from '@/lib/oauth-utils';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const sites = await getAllSites();
    const integrations = await getIntegrations();
    
    // Проверяем статус подключения для каждого сайта
    const isOAuthConfigured = hasGoogleOAuth(integrations);
    
    // Если есть OAuth, проверяем наличие сайтов в Google Search Console
    let googleConsoleSites: Array<{ siteUrl: string; permissionLevel: string }> = [];
    if (isOAuthConfigured) {
      try {
        const searchConsoleService = createSearchConsoleService();
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
    
    const sitesWithStatus = sites.map(site => {
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
        hasGoogleConsoleConnection,
        // Детальная информация для отображения причин отсутствия подключения
        googleConsoleStatus: {
          connected: hasGoogleConsoleConnection,
          hasOAuth: isOAuthConfigured,
          hasUrl: !!site.googleSearchConsoleUrl,
        },
      };
    });
    
    return NextResponse.json({
      success: true,
      sites: sitesWithStatus,
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

export async function POST(request: Request) {
  try {
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
    });

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
