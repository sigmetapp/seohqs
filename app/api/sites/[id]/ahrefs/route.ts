import { NextResponse } from 'next/server';
import { storage } from '@/lib/storage';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const siteId = parseInt(params.id);
    const data = storage.ahrefsData.find((d) => d.siteId === siteId);

    return NextResponse.json({
      success: true,
      data: data || null,
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
