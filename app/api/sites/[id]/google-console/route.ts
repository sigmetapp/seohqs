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

    // Получаем данные из БД
    const data = await getGoogleSearchConsoleDataBySiteId(siteId, 100);

    // Преобразуем в формат, ожидаемый фронтендом
    const formattedData = data.map((item) => ({
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
