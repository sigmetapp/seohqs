import { NextResponse } from 'next/server';
import { getSiteById } from '@/lib/db-adapter';
import { storage } from '@/lib/storage';

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

    // Имитация синхронизации данных
    // В реальности здесь будет интеграция с Google Search Console API
    const newData = {
      siteId,
      clicks: Math.floor(Math.random() * 1000),
      impressions: Math.floor(Math.random() * 10000),
      ctr: Math.random() * 0.1,
      position: Math.random() * 50 + 1,
      date: new Date().toISOString(),
    };

    // Удаляем старые данные за сегодня и добавляем новые
    storage.googleData = storage.googleData.filter(
      (d) => !(d.siteId === siteId && d.date.startsWith(new Date().toISOString().split('T')[0]))
    );
    storage.googleData.push(newData);

    return NextResponse.json({
      success: true,
      data: newData,
      message: 'Данные Google Search Console синхронизированы',
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Ошибка синхронизации Google Console',
      },
      { status: 500 }
    );
  }
}
