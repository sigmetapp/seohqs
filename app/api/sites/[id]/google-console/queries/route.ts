import { NextResponse } from 'next/server';
import { getSiteById, getIntegrations } from '@/lib/db-adapter';
import { createSearchConsoleService } from '@/lib/google-search-console';
import { hasGoogleOAuth } from '@/lib/oauth-utils';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
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

    const site = await getSiteById(siteId);
    if (!site) {
      return NextResponse.json(
        {
          success: false,
          error: 'Сайт не найден',
        },
        { status: 404 }
      );
    }

    const integrations = await getIntegrations();
    
    if (!hasGoogleOAuth(integrations)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Необходима авторизация через Google. Перейдите в раздел Интеграции.',
        },
        { status: 401 }
      );
    }

    const searchConsoleService = createSearchConsoleService();
    
    // Получаем URL сайта в Google Search Console
    let siteUrl: string | null = null;
    
    // Если URL указан, используем его
    if (site.googleSearchConsoleUrl) {
      // Извлекаем URL из настроек используя метод сервиса
      const extractedUrl = searchConsoleService.extractSiteUrl(site.googleSearchConsoleUrl);
      if (extractedUrl) {
        siteUrl = extractedUrl;
      }
    }
    
    // Если URL не указан или не удалось извлечь, пытаемся найти автоматически
    if (!siteUrl && site.domain) {
      siteUrl = await searchConsoleService.findSiteByDomain(site.domain);
    }
    
    if (!siteUrl) {
      return NextResponse.json(
        {
          success: false,
          error: 'Не удалось найти сайт в Google Search Console. Укажите URL сайта в настройках.',
        },
        { status: 404 }
      );
    }

    // Получаем данные по запросам за последние 30 дней
    const queryData = await searchConsoleService.getQueryData(siteUrl, 30, 100);

    return NextResponse.json({
      success: true,
      data: queryData,
      count: queryData.length,
    });
  } catch (error: any) {
    console.error('Ошибка получения данных по запросам:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Ошибка получения данных по запросам',
      },
      { status: 500 }
    );
  }
}
