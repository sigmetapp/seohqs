import { NextResponse } from 'next/server';
import { storage } from '@/lib/storage';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      sites: storage.sites,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Ошибка получения сайтов',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, domain, googleSearchConsoleUrl, ahrefsApiKey } = body;

    if (!name || !domain) {
      return NextResponse.json(
        {
          success: false,
          error: 'Название и домен обязательны',
        },
        { status: 400 }
      );
    }

    const newSite = {
      id: storage.counters.siteId++,
      name,
      domain,
      googleSearchConsoleUrl: googleSearchConsoleUrl || '',
      ahrefsApiKey: ahrefsApiKey || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    storage.sites.push(newSite);

    return NextResponse.json({
      success: true,
      site: newSite,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Ошибка создания сайта',
      },
      { status: 500 }
    );
  }
}
