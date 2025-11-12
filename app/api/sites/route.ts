import { NextResponse } from 'next/server';
import { getAllSites, insertSite } from '@/lib/db-adapter';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const sites = await getAllSites();
    return NextResponse.json({
      success: true,
      sites: sites,
    });
  } catch (error: any) {
    console.error('Error fetching sites:', error);
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
    const { name, domain, category, googleSearchConsoleUrl } = body;

    if (!name || !domain) {
      return NextResponse.json(
        {
          success: false,
          error: 'Название и домен обязательны',
        },
        { status: 400 }
      );
    }

    const newSite = await insertSite({
      name,
      domain,
      category: category || undefined,
      googleSearchConsoleUrl: googleSearchConsoleUrl || undefined,
    });

    return NextResponse.json({
      success: true,
      site: newSite,
    });
  } catch (error: any) {
    console.error('Error creating site:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Ошибка создания сайта',
      },
      { status: 500 }
    );
  }
}
