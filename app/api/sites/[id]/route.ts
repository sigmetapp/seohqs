import { NextResponse } from 'next/server';
import { getSiteById, updateSite } from '@/lib/db-adapter';
import { storage } from '@/lib/storage';

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

    // Проверяем наличие глобального ключа Ahrefs, если у сайта нет своего
    const hasAhrefsConnection = site.ahrefsApiKey || storage.integrations.ahrefsApiKey;

    return NextResponse.json({
      success: true,
      site: {
        ...site,
        hasAhrefsConnection: !!hasAhrefsConnection,
      },
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

export async function PUT(
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

    const body = await request.json();
    const { name, domain, category, googleSearchConsoleUrl, ahrefsApiKey } = body;

    const updatedSite = await updateSite(siteId, {
      name,
      domain,
      category,
      googleSearchConsoleUrl,
      ahrefsApiKey,
    });

    // Проверяем наличие глобального ключа Ahrefs, если у сайта нет своего
    const hasAhrefsConnection = updatedSite.ahrefsApiKey || storage.integrations.ahrefsApiKey;

    return NextResponse.json({
      success: true,
      site: {
        ...updatedSite,
        hasAhrefsConnection: !!hasAhrefsConnection,
      },
    });
  } catch (error: any) {
    console.error('Error updating site:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Ошибка обновления сайта',
      },
      { status: 500 }
    );
  }
}
