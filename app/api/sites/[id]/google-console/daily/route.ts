import { NextResponse } from 'next/server';
import { getGoogleSearchConsoleDataBySiteId } from '@/lib/db-adapter';

// Вспомогательная функция для прямой загрузки данных из БД с фильтрацией по дате
async function loadGoogleConsoleDataFromDB(
  siteId: number,
  startDate: Date,
  endDate: Date,
  limit: number = 2000
): Promise<any[]> {
  // Проверяем, какая БД используется
  const useSupabase = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && 
    (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY));
  const usePostgres = !useSupabase && !!(process.env.POSTGRES_URL || process.env.DATABASE_URL);

  if (useSupabase) {
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from('google_search_console_data')
      .select('*')
      .eq('site_id', siteId)
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])
      .order('date', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('Error loading data from Supabase:', error);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      siteId: row.site_id,
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: parseFloat(row.ctr),
      position: parseFloat(row.position),
      date: row.date,
      createdAt: row.created_at,
    }));
  } else if (usePostgres) {
    const { getPostgresClient } = await import('@/lib/postgres-client');
    const db = await getPostgresClient();
    
    const result = await db.query(
      `SELECT * FROM google_search_console_data 
       WHERE site_id = $1 
       AND date >= $2 
       AND date <= $3 
       ORDER BY date ASC 
       LIMIT $4`,
      [siteId, startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0], limit]
    );

    return result.rows.map((row: any) => ({
      id: row.id,
      siteId: row.site_id,
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: parseFloat(row.ctr),
      position: parseFloat(row.position),
      date: row.date,
      createdAt: row.created_at,
    }));
  } else {
    // Fallback к существующей функции для SQLite (локальная разработка)
    const allData = await getGoogleSearchConsoleDataBySiteId(siteId, limit);
    return allData.filter((item) => {
      const itemDate = new Date(item.date);
      itemDate.setHours(0, 0, 0, 0);
      const startDateNormalized = new Date(startDate);
      startDateNormalized.setHours(0, 0, 0, 0);
      const endDateNormalized = new Date(endDate);
      endDateNormalized.setHours(23, 59, 59, 999);
      return itemDate >= startDateNormalized && itemDate <= endDateNormalized;
    });
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Загружает данные Google Search Console из БД за указанный период
 * Всегда запрашивает данные напрямую из БД без кеширования
 */

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

    // Всегда загружаем данные напрямую из БД за 90 дней (максимальный период)
    // Затем фильтруем по запрошенному периоду
    const baseDays = 90; // Всегда загружаем 90 дней из БД
    const baseEndDate = new Date();
    baseEndDate.setHours(23, 59, 59, 999);
    const baseStartDate = new Date();
    baseStartDate.setDate(baseStartDate.getDate() - baseDays);
    baseStartDate.setHours(0, 0, 0, 0);

    // Загружаем данные напрямую из БД с фильтрацией по дате
    const limit = Math.max(baseDays * 3, 1000); // Минимум 1000 записей для 90 дней
    
    console.log(`[Google Console Daily] Loading data from DB for site ${siteId}, date range: ${baseStartDate.toISOString().split('T')[0]} - ${baseEndDate.toISOString().split('T')[0]}, limit: ${limit}`);
    const allData = await loadGoogleConsoleDataFromDB(siteId, baseStartDate, baseEndDate, limit);
    console.log(`[Google Console Daily] Loaded ${allData.length} records from DB for site ${siteId}`);

    // Преобразуем данные в нужный формат и сортируем по дате
    const baseData = allData
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((item) => ({
        siteId: item.siteId,
        clicks: item.clicks,
        impressions: item.impressions,
        ctr: item.ctr,
        position: item.position,
        date: item.date,
      }));

    // Фильтруем данные для запрошенного периода
    const filteredData = baseData.filter((item) => {
      const itemDate = new Date(item.date);
      itemDate.setHours(0, 0, 0, 0);
      return itemDate >= startDateNormalized && itemDate <= endDateNormalized;
    });

    // Логирование для отладки
    if (filteredData.length > 0) {
      const firstDate = new Date(filteredData[0].date);
      const lastDate = new Date(filteredData[filteredData.length - 1].date);
      const actualDays = Math.ceil((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
      console.log(`[Google Console Daily] Site ${siteId}, Period: ${days} days, Base records: ${baseData.length}, Filtered: ${filteredData.length} records`);
      console.log(`[Google Console Daily] Requested date range: ${startDate.toISOString().split('T')[0]} - ${endDate.toISOString().split('T')[0]}`);
      console.log(`[Google Console Daily] Actual data range: ${firstDate.toISOString().split('T')[0]} - ${lastDate.toISOString().split('T')[0]} (${actualDays} days)`);
      
      if (actualDays < days * 0.7) {
        console.warn(`[Google Console Daily] WARNING: Site ${siteId} has only ${actualDays} days of data, but ${days} days were requested. Data coverage: ${Math.round((actualDays / days) * 100)}%`);
      }
    } else {
      console.log(`[Google Console Daily] Site ${siteId}, Period: ${days} days, Base records: ${baseData.length}, Filtered: 0 records (no data for requested period)`);
      console.log(`[Google Console Daily] Requested date range: ${startDate.toISOString().split('T')[0]} - ${endDate.toISOString().split('T')[0]}`);
      if (baseData.length > 0) {
        const baseFirstDate = new Date(baseData[0].date);
        const baseLastDate = new Date(baseData[baseData.length - 1].date);
        console.log(`[Google Console Daily] Available data range in DB: ${baseFirstDate.toISOString().split('T')[0]} - ${baseLastDate.toISOString().split('T')[0]}`);
      } else {
        console.log(`[Google Console Daily] No data in database for site ${siteId}. Sync may be needed.`);
      }
    }

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
