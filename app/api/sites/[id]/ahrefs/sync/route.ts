import { NextResponse } from 'next/server';
import { getSiteById, getIntegrations } from '@/lib/db-adapter';
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

    // Используем ключ сайта или глобальный ключ из настроек интеграций
    const integrations = await getIntegrations();
    const ahrefsApiKey = site.ahrefsApiKey || integrations.ahrefsApiKey;
    
    if (!ahrefsApiKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'Ahrefs API Key не настроен. Настройте его для сайта или в глобальных настройках интеграций.',
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
