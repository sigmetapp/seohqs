import { NextResponse } from 'next/server';
import { getIntegrations, updateIntegrations } from '@/lib/db-adapter';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const integrations = await getIntegrations();
    return NextResponse.json({
      success: true,
      integrations: integrations,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Ошибка получения настроек интеграций',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      googleSearchConsoleUrl,
    } = body;

    // Получаем текущие настройки
    const current = await getIntegrations();

    // Обновляем настройки интеграций в БД
    // OAuth токены (googleAccessToken, googleRefreshToken, googleTokenExpiry) 
    // сохраняются через callback и не должны перезаписываться здесь
    const updated = await updateIntegrations({
      googleSearchConsoleUrl: googleSearchConsoleUrl !== undefined ? googleSearchConsoleUrl : current.googleSearchConsoleUrl,
      // OAuth токены не обновляем здесь - они сохраняются через callback
    });

    return NextResponse.json({
      success: true,
      integrations: updated,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Ошибка сохранения настроек интеграций',
      },
      { status: 500 }
    );
  }
}
