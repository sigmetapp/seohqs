import { NextResponse } from 'next/server';
import { getSiteById, bulkInsertGoogleSearchConsoleData } from '@/lib/db-adapter';
import { createSearchConsoleService } from '@/lib/google-search-console';
import { requireAuth } from '@/lib/middleware-auth';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(
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

    // Получаем данные из Google Search Console API
    const searchConsoleService = createSearchConsoleService();
    
    // Если URL не указан, пытаемся найти автоматически по домену
    let foundSiteUrl: string | null = null;
    if (!site.googleSearchConsoleUrl && site.domain) {
      try {
        foundSiteUrl = await searchConsoleService.findSiteByDomain(site.domain);
        if (foundSiteUrl) {
          console.log(`Автоматически найден сайт в GSC: ${foundSiteUrl} для домена ${site.domain}`);
        }
      } catch (error) {
        console.warn('Не удалось автоматически найти сайт в GSC:', error);
      }
    }
    
    // Получаем данные за последние 30 дней
    // Передаем найденный URL или указанный вручную, и домен для автоматического поиска
    const aggregatedData = await searchConsoleService.getAggregatedData(
      site.googleSearchConsoleUrl || foundSiteUrl,
      30,
      site.domain
    );

    if (aggregatedData.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Данные синхронизированы, но новых данных не найдено',
        data: [],
        count: 0,
      });
    }

    // Преобразуем данные для сохранения в БД
    const dataToInsert = aggregatedData.map((item) => ({
      siteId,
      clicks: item.clicks,
      impressions: item.impressions,
      ctr: item.ctr,
      position: item.position,
      date: item.date,
    }));

    // Сохраняем данные в БД
    await bulkInsertGoogleSearchConsoleData(dataToInsert);

    return NextResponse.json({
      success: true,
      message: `Данные Google Search Console синхронизированы. Загружено ${dataToInsert.length} записей`,
      data: aggregatedData,
      count: dataToInsert.length,
    });
  } catch (error: any) {
    console.error('Ошибка синхронизации Google Search Console:', error);
    
    // Более детальная обработка ошибок
    let errorMessage = error.message || 'Ошибка синхронизации Google Console';
    
    if (errorMessage.includes('OAuth') || errorMessage.includes('авторизоваться')) {
      errorMessage = 'Ошибка аутентификации. Убедитесь, что вы авторизованы через Google в разделе Интеграции.';
    } else if (errorMessage.includes('доступ запрещен') || errorMessage.includes('403')) {
      errorMessage = 'Доступ запрещен. Убедитесь, что ваш Google аккаунт имеет доступ к сайту в Google Search Console.';
    } else if (errorMessage.includes('не удалось извлечь URL') || errorMessage.includes('Не удалось автоматически найти сайт')) {
      errorMessage = 'Не удалось автоматически найти сайт в Google Search Console. Укажите URL сайта вручную в настройках сайта.';
    } else if (errorMessage.includes('Не указан URL сайта')) {
      errorMessage = 'Не указан URL сайта и домен для автоматического поиска. Укажите URL сайта в настройках сайта.';
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
