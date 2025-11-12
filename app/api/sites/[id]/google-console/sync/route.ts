import { NextResponse } from 'next/server';
import { getSiteById, bulkInsertGoogleSearchConsoleData } from '@/lib/db-adapter';
import { createSearchConsoleService } from '@/lib/google-search-console';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(
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

    if (!site.googleSearchConsoleUrl) {
      return NextResponse.json(
        {
          success: false,
          error: 'Google Search Console не настроен для этого сайта',
        },
        { status: 400 }
      );
    }

    // Получаем данные из Google Search Console API
    const searchConsoleService = createSearchConsoleService();
    
    // Получаем данные за последние 30 дней
    const aggregatedData = await searchConsoleService.getAggregatedData(
      site.googleSearchConsoleUrl,
      30
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
    } else if (errorMessage.includes('не удалось извлечь URL')) {
      errorMessage = 'Неверный формат URL Google Search Console. Убедитесь, что URL корректный.';
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
