import { NextResponse } from 'next/server';
import { getGoogleSearchConsoleDataBySiteId } from '@/lib/db-adapter';
import { cache } from '@/lib/cache';

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

    // Получаем параметры из query string
    const { searchParams } = new URL(request.url);
    const daysParam = searchParams.get('days');
    const days = daysParam ? parseInt(daysParam) : 30; // По умолчанию 30 дней
    const refresh = searchParams.get('refresh') === 'true'; // Принудительное обновление кеша

    // Вычисляем дату начала периода (устанавливаем время на начало дня для корректного сравнения)
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999); // Конец текущего дня
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0); // Начало дня

    // Проверяем кеш только если не требуется обновление
    // Для больших периодов (90+ дней) используем более короткий TTL кеша
    const cacheKey = `google-console-daily-${siteId}-${days}`;
    if (!refresh) {
      const cachedData = cache.get<any>(cacheKey);
      if (cachedData && Array.isArray(cachedData) && cachedData.length > 0) {
        // Данные в кеше уже отсортированы по дате (от старых к новым после фильтрации)
        // Проверяем, что кешированные данные покрывают нужный период
        const cachedFirstDate = new Date(cachedData[0].date);
        cachedFirstDate.setHours(0, 0, 0, 0);
        const cachedLastDate = new Date(cachedData[cachedData.length - 1].date);
        cachedLastDate.setHours(23, 59, 59, 999);
        // Если данные покрывают нужный период, возвращаем из кеша
        if (cachedFirstDate <= startDate && cachedLastDate >= endDate) {
          return NextResponse.json({
            success: true,
            data: cachedData,
            count: cachedData.length,
            cached: true,
          });
        }
      }
    }

    // Получаем данные из БД (берем достаточно для покрытия периода + запас)
    // Для больших периодов увеличиваем лимит:
    // - 30 дней: ~60-100 записей (с запасом)
    // - 90 дней: ~200-300 записей
    // - 180 дней: ~400-500 записей (учитывая возможные пропуски)
    const limit = days <= 30 
      ? Math.max(days * 2, 200)
      : days <= 90
      ? Math.max(days * 2, 500)
      : Math.max(days * 2, 1000); // Для 180 дней берем минимум 1000 записей
    const allData = await getGoogleSearchConsoleDataBySiteId(siteId, limit);

    // Фильтруем данные по периоду (сравниваем только даты, без учета времени)
    const filteredData = allData.filter((item) => {
      const itemDate = new Date(item.date);
      itemDate.setHours(0, 0, 0, 0);
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      return itemDate >= start && itemDate <= end;
    });

    // Логирование для отладки
    console.log(`[Google Console Daily] Site ${siteId}, Period: ${days} days, Loaded: ${allData.length} records, Filtered: ${filteredData.length} records, Date range: ${startDate.toISOString().split('T')[0]} - ${endDate.toISOString().split('T')[0]}`);

    // Сортируем по дате
    filteredData.sort((a, b) => {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    // Преобразуем в формат, ожидаемый фронтендом
    const formattedData = filteredData.map((item) => ({
      siteId: item.siteId,
      clicks: item.clicks,
      impressions: item.impressions,
      ctr: item.ctr,
      position: item.position,
      date: item.date,
    }));

    // Сохраняем в кеш с разным TTL в зависимости от периода
    // Для больших периодов используем более короткий TTL, чтобы данные обновлялись чаще
    const cacheTTL = days <= 30 
      ? 12 * 60 * 60 * 1000 // 12 часов для малых периодов
      : days <= 90
      ? 6 * 60 * 60 * 1000  // 6 часов для средних периодов
      : 2 * 60 * 60 * 1000; // 2 часа для больших периодов (90+ дней)
    cache.set(cacheKey, formattedData, cacheTTL);

    return NextResponse.json({
      success: true,
      data: formattedData,
      count: formattedData.length,
      cached: false,
    });
  } catch (error: any) {
    console.error('Ошибка получения данных Google Search Console:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Ошибка получения данных Google Console',
      },
      { status: 500 }
    );
  }
}
