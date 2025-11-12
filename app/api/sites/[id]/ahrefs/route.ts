import { NextResponse } from 'next/server';
import { getAhrefsDataBySiteId } from '@/lib/db-adapter';
import type { AhrefsData } from '@/lib/types';

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

    const data = await getAhrefsDataBySiteId(siteId);

    if (!data) {
      return NextResponse.json({
        success: true,
        data: null,
      });
    }

    // Преобразуем в формат AhrefsData
    const ahrefsData: AhrefsData = {
      siteId: data.siteId,
      domainRating: data.domainRating,
      backlinks: data.backlinks,
      referringDomains: data.referringDomains,
      organicKeywords: data.organicKeywords,
      organicTraffic: data.organicTraffic,
      date: data.date,
    };

    return NextResponse.json({
      success: true,
      data: ahrefsData,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Ошибка получения данных Ahrefs',
      },
      { status: 500 }
    );
  }
}
