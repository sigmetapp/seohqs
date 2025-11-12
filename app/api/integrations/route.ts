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
      googleServiceAccountEmail,
      googlePrivateKey,
      ahrefsApiKey,
      googleSearchConsoleUrl,
    } = body;

    // Получаем текущие настройки
    const current = await getIntegrations();

    // Обновляем настройки интеграций в БД
    // OAuth токены (googleAccessToken, googleRefreshToken, googleTokenExpiry) 
    // сохраняются через callback и не должны перезаписываться здесь
    const updated = await updateIntegrations({
      googleServiceAccountEmail: googleServiceAccountEmail !== undefined ? googleServiceAccountEmail : current.googleServiceAccountEmail,
      googlePrivateKey: googlePrivateKey !== undefined ? googlePrivateKey : current.googlePrivateKey,
      ahrefsApiKey: ahrefsApiKey !== undefined ? ahrefsApiKey : current.ahrefsApiKey,
      googleSearchConsoleUrl: googleSearchConsoleUrl !== undefined ? googleSearchConsoleUrl : current.googleSearchConsoleUrl,
      // OAuth токены не обновляем здесь - они сохраняются через callback
    });

    // Также обновляем переменные окружения для Google Indexing API
    // В продакшене это должно быть сделано через переменные окружения сервера
    if (googleServiceAccountEmail) {
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = googleServiceAccountEmail;
    }
    if (googlePrivateKey) {
      process.env.GOOGLE_PRIVATE_KEY = googlePrivateKey;
    }

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
