import { NextResponse } from 'next/server';
import { getSiteById, updateSite, getIntegrations } from '@/lib/db-adapter';
import { createSearchConsoleService } from '@/lib/google-search-console';
import { hasGoogleOAuth } from '@/lib/oauth-utils';
import { requireAuth } from '@/lib/middleware-auth';
import { NextRequest } from 'next/server';

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
        const searchConsoleService = createSearchConsoleService(undefined, user.id);
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

    // Проверяем статус подключения Google Console
    const googleConsoleStatus = await checkGoogleConsoleConnection(site, user.id);

    return NextResponse.json({
      success: true,
      site: {
        ...site,
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
    const { name, domain, category, googleSearchConsoleUrl } = body;

    const updatedSite = await updateSite(siteId, {
      name,
      domain,
      category,
      googleSearchConsoleUrl,
    }, user.id);

    // Проверяем статус подключения Google Console
    const googleConsoleStatus = await checkGoogleConsoleConnection(updatedSite, user.id);

    return NextResponse.json({
      success: true,
      site: {
        ...updatedSite,
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
