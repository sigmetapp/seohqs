import { NextResponse } from 'next/server';
import { getGoogleSearchConsoleDataBySiteId } from '@/lib/db-adapter';

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

    // Получаем параметр days из query string
    const { searchParams } = new URL(request.url);
    const daysParam = searchParams.get('days');
    const days = daysParam ? parseInt(daysParam) : 30; // По умолчанию 30 дней

    // Вычисляем дату начала периода
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Получаем данные из БД (берем больше, чтобы отфильтровать по дате)
    const allData = await getGoogleSearchConsoleDataBySiteId(siteId, 1000);

    // Фильтруем данные по периоду
    const filteredData = allData.filter((item) => {
      const itemDate = new Date(item.date);
      return itemDate >= startDate && itemDate <= endDate;
    });

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

    return NextResponse.json({
      success: true,
      data: formattedData,
      count: formattedData.length,
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
