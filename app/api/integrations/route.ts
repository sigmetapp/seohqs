import { NextResponse } from 'next/server';
import { storage } from '@/lib/storage';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      integrations: storage.integrations,
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

    // Обновляем настройки интеграций
    storage.integrations = {
      id: storage.integrations.id,
      googleServiceAccountEmail: googleServiceAccountEmail || storage.integrations.googleServiceAccountEmail,
      googlePrivateKey: googlePrivateKey || storage.integrations.googlePrivateKey,
      ahrefsApiKey: ahrefsApiKey || storage.integrations.ahrefsApiKey,
      googleSearchConsoleUrl: googleSearchConsoleUrl || storage.integrations.googleSearchConsoleUrl,
      updatedAt: new Date().toISOString(),
    };

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
      integrations: storage.integrations,
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
