import { NextResponse } from 'next/server';
import { getSiteById } from '@/lib/db-adapter';

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

    return NextResponse.json({
      success: true,
      site: site,
    });
  } catch (error: any) {
    console.error('Error fetching site:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Ошибка получения сайта',
      },
      { status: 500 }
    );
  }
}
