import { NextResponse } from 'next/server';
import { storage } from '@/lib/storage';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const siteId = parseInt(params.id);
    const site = storage.sites.find((s) => s.id === siteId);

    if (!site) {
      return NextResponse.json(
        {
          success: false,
          error: 'Сайт не найден',
        },
        { status: 404 }
      );
    }

    if (!site.ahrefsApiKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'Ahrefs API Key не настроен для этого сайта',
        },
        { status: 400 }
      );
    }

    // Имитация синхронизации данных
    // В реальности здесь будет интеграция с Ahrefs API
    const newData = {
      siteId,
      domainRating: Math.floor(Math.random() * 50 + 20),
      backlinks: Math.floor(Math.random() * 100000 + 10000),
      referringDomains: Math.floor(Math.random() * 5000 + 500),
      organicKeywords: Math.floor(Math.random() * 50000 + 5000),
      organicTraffic: Math.floor(Math.random() * 100000 + 10000),
      date: new Date().toISOString(),
    };

    // Обновляем данные
    storage.ahrefsData = storage.ahrefsData.filter((d) => d.siteId !== siteId);
    storage.ahrefsData.push(newData);

    return NextResponse.json({
      success: true,
      data: newData,
      message: 'Данные Ahrefs синхронизированы',
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Ошибка синхронизации Ahrefs',
      },
      { status: 500 }
    );
  }
}
