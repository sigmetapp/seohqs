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
    if (!params || !params.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Неверный ID сайта: параметр не найден',
        },
        { status: 400 }
      );
    }
    
    const siteId = parseInt(params.id);
    if (isNaN(siteId)) {
      return NextResponse.json(
        {
          success: false,
          error: `Неверный ID сайта: "${params.id}" не является числом`,
        },
        { status: 400 }
      );
    }

    // Получаем параметры из query string
    const { searchParams } = new URL(request.url);
    const daysParam = searchParams.get('days');
    const days = daysParam ? parseInt(daysParam) : 30; // По умолчанию 30 дней
    
    // Валидация периода
    if (isNaN(days) || days < 1 || days > 365) {
      return NextResponse.json(
        {
          success: false,
          error: `Неверный период: "${daysParam}" должен быть числом от 1 до 365`,
        },
        { status: 400 }
      );
    }
    
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
        
        // Строгая проверка: данные должны полностью покрывать запрошенный период
        const startDateNormalized = new Date(startDate);
        startDateNormalized.setHours(0, 0, 0, 0);
        const endDateNormalized = new Date(endDate);
        endDateNormalized.setHours(23, 59, 59, 999);
        
        if (cachedFirstDate <= startDateNormalized && cachedLastDate >= endDateNormalized) {
          // Дополнительная проверка: убеждаемся, что количество дней в кеше соответствует запрошенному
          const cachedDays = Math.ceil((cachedLastDate.getTime() - cachedFirstDate.getTime()) / (1000 * 60 * 60 * 24));
          if (cachedDays >= days - 1) { // -1 для учета возможных пропусков
            console.log(`[Google Console Daily] Using cached data for site ${siteId}, period: ${days} days, cached records: ${cachedData.length}`);
            return NextResponse.json({
              success: true,
              data: cachedData,
              count: cachedData.length,
              cached: true,
            });
          }
        }
      }
    }

    // Получаем данные из БД (берем достаточно для покрытия периода + запас)
    // Для больших периодов значительно увеличиваем лимит:
    // - 30 дней: минимум 200 записей (с запасом на пропуски)
    // - 90 дней: минимум 500 записей
    // - 180 дней: минимум 2000 записей (учитывая возможные пропуски и исторические данные)
    const limit = days <= 30 
      ? Math.max(days * 3, 200)
      : days <= 90
      ? Math.max(days * 3, 500)
      : Math.max(days * 3, 2000); // Для 180 дней берем минимум 2000 записей
    
    console.log(`[Google Console Daily] Loading data for site ${siteId}, period: ${days} days, limit: ${limit}`);
    const allData = await getGoogleSearchConsoleDataBySiteId(siteId, limit);
    console.log(`[Google Console Daily] Loaded ${allData.length} records from DB for site ${siteId}`);

    // Фильтруем данные по периоду (сравниваем только даты, без учета времени)
    const startDateNormalized = new Date(startDate);
    startDateNormalized.setHours(0, 0, 0, 0);
    const endDateNormalized = new Date(endDate);
    endDateNormalized.setHours(23, 59, 59, 999);
    
    const filteredData = allData.filter((item) => {
      const itemDate = new Date(item.date);
      itemDate.setHours(0, 0, 0, 0);
      return itemDate >= startDateNormalized && itemDate <= endDateNormalized;
    });

    // Логирование для отладки
    console.log(`[Google Console Daily] Site ${siteId}, Period: ${days} days, Loaded: ${allData.length} records, Filtered: ${filteredData.length} records, Date range: ${startDate.toISOString().split('T')[0]} - ${endDate.toISOString().split('T')[0]}`);
    
    // Дополнительная проверка: если данных меньше ожидаемого, логируем предупреждение
    const expectedMinRecords = Math.floor(days * 0.7); // Минимум 70% дней должны иметь данные
    if (filteredData.length < expectedMinRecords) {
      console.warn(`[Google Console Daily] Site ${siteId}: Expected at least ${expectedMinRecords} records for ${days} days period, but got only ${filteredData.length}. This may indicate missing data in the database.`);
    }

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
