import { NextResponse } from 'next/server';
import { getGoogleSearchConsoleDataBySiteId } from '@/lib/db-adapter';
import { cache } from '@/lib/cache';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Оптимизированная система кеширования для данных Google Search Console:
 * 1. Базовый кеш за 180 дней (основной источник данных)
 * 2. Кеш для каждого периода (7, 30, 90, 180 дней) для быстрого доступа
 * 3. Все данные берутся из БД (180 дней всегда хранятся в БД при синхронизации)
 */

// Константы для кеширования
const BASE_CACHE_DAYS = 180; // Базовый период для кеша (всегда загружаем 180 дней из БД)
const BASE_CACHE_KEY_PREFIX = 'google-console-base'; // Префикс для базового кеша
const PERIOD_CACHE_KEY_PREFIX = 'google-console-daily'; // Префикс для кеша периодов

// TTL для разных типов кеша (в миллисекундах)
const BASE_CACHE_TTL = 2 * 60 * 60 * 1000; // 2 часа для базового кеша (180 дней)
const PERIOD_CACHE_TTL = {
  7: 12 * 60 * 60 * 1000,   // 12 часов для 7 дней
  30: 12 * 60 * 60 * 1000,  // 12 часов для 30 дней
  90: 6 * 60 * 60 * 1000,   // 6 часов для 90 дней
  180: 2 * 60 * 60 * 1000,  // 2 часа для 180 дней
};

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

    // Вычисляем дату начала периода
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999); // Конец текущего дня
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0); // Начало дня

    const startDateNormalized = new Date(startDate);
    startDateNormalized.setHours(0, 0, 0, 0);
    const endDateNormalized = new Date(endDate);
    endDateNormalized.setHours(23, 59, 59, 999);

    // Ключи кеша
    const periodCacheKey = `${PERIOD_CACHE_KEY_PREFIX}-${siteId}-${days}`;
    const baseCacheKey = `${BASE_CACHE_KEY_PREFIX}-${siteId}`;

    // Шаг 1: Проверяем кеш для конкретного периода (быстрый путь)
    if (!refresh) {
      const periodCachedData = cache.get<any[]>(periodCacheKey);
      if (periodCachedData && Array.isArray(periodCachedData) && periodCachedData.length > 0) {
        // Проверяем, что кешированные данные покрывают нужный период
        const cachedFirstDate = new Date(periodCachedData[0].date);
        cachedFirstDate.setHours(0, 0, 0, 0);
        const cachedLastDate = new Date(periodCachedData[periodCachedData.length - 1].date);
        cachedLastDate.setHours(23, 59, 59, 999);
        
        if (cachedFirstDate <= startDateNormalized && cachedLastDate >= endDateNormalized) {
          const cachedDays = Math.ceil((cachedLastDate.getTime() - cachedFirstDate.getTime()) / (1000 * 60 * 60 * 24));
          if (cachedDays >= days - 1) { // -1 для учета возможных пропусков
            console.log(`[Google Console Daily] Using period cache for site ${siteId}, period: ${days} days, cached records: ${periodCachedData.length}`);
            return NextResponse.json({
              success: true,
              data: periodCachedData,
              count: periodCachedData.length,
              cached: true,
            });
          }
        }
      }
    }

    // Шаг 2: Проверяем базовый кеш за 180 дней
    let baseData: any[] | null = null;
    if (!refresh) {
      baseData = cache.get<any[]>(baseCacheKey);
      if (baseData && Array.isArray(baseData) && baseData.length > 0) {
        console.log(`[Google Console Daily] Using base cache (180 days) for site ${siteId}, records: ${baseData.length}`);
      }
    }

    // Шаг 3: Если базового кеша нет, загружаем из БД за 180 дней
    if (!baseData) {
      // Загружаем достаточно данных из БД для покрытия 180 дней
      // В БД всегда хранятся данные за 180 дней (при синхронизации)
      const limit = Math.max(BASE_CACHE_DAYS * 3, 2000); // Минимум 2000 записей для 180 дней
      
      console.log(`[Google Console Daily] Loading base data (180 days) from DB for site ${siteId}, limit: ${limit}`);
      const allData = await getGoogleSearchConsoleDataBySiteId(siteId, limit);
      console.log(`[Google Console Daily] Loaded ${allData.length} records from DB for site ${siteId}`);

      // Вычисляем даты для базового периода (180 дней)
      const baseEndDate = new Date();
      baseEndDate.setHours(23, 59, 59, 999);
      const baseStartDate = new Date();
      baseStartDate.setDate(baseStartDate.getDate() - BASE_CACHE_DAYS);
      baseStartDate.setHours(0, 0, 0, 0);

      const baseStartDateNormalized = new Date(baseStartDate);
      baseStartDateNormalized.setHours(0, 0, 0, 0);
      const baseEndDateNormalized = new Date(baseEndDate);
      baseEndDateNormalized.setHours(23, 59, 59, 999);

      // Фильтруем данные по базовому периоду (180 дней)
      baseData = allData
        .filter((item) => {
          const itemDate = new Date(item.date);
          itemDate.setHours(0, 0, 0, 0);
          return itemDate >= baseStartDateNormalized && itemDate <= baseEndDateNormalized;
        })
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .map((item) => ({
          siteId: item.siteId,
          clicks: item.clicks,
          impressions: item.impressions,
          ctr: item.ctr,
          position: item.position,
          date: item.date,
        }));

      // Сохраняем базовый кеш
      cache.set(baseCacheKey, baseData, BASE_CACHE_TTL);
      console.log(`[Google Console Daily] Cached base data (180 days) for site ${siteId}, records: ${baseData.length}`);
    }

    // Шаг 4: Фильтруем данные из базового кеша для запрошенного периода
    const filteredData = baseData.filter((item) => {
      const itemDate = new Date(item.date);
      itemDate.setHours(0, 0, 0, 0);
      return itemDate >= startDateNormalized && itemDate <= endDateNormalized;
    });

    // Логирование для отладки
    console.log(`[Google Console Daily] Site ${siteId}, Period: ${days} days, Base records: ${baseData.length}, Filtered: ${filteredData.length} records, Date range: ${startDate.toISOString().split('T')[0]} - ${endDate.toISOString().split('T')[0]}`);

    // Шаг 5: Сохраняем отфильтрованные данные в кеш для конкретного периода
    const periodTTL = PERIOD_CACHE_TTL[days as keyof typeof PERIOD_CACHE_TTL] || PERIOD_CACHE_TTL[30];
    cache.set(periodCacheKey, filteredData, periodTTL);
    console.log(`[Google Console Daily] Cached period data (${days} days) for site ${siteId}, records: ${filteredData.length}`);

    return NextResponse.json({
      success: true,
      data: filteredData,
      count: filteredData.length,
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
