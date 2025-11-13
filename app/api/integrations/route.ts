import { NextResponse } from 'next/server';
import { getIntegrations, updateIntegrations } from '@/lib/db-adapter';
import { requireAuth } from '@/lib/middleware-auth';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;
    
    const integrations = await getIntegrations(user.id);
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

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;
    
    const body = await request.json();
    const {
      googleSearchConsoleUrl,
    } = body;

    // Получаем текущие настройки
    const current = await getIntegrations(user.id);

    // Обновляем настройки интеграций в БД
    // OAuth токены (googleAccessToken, googleRefreshToken, googleTokenExpiry) 
    // сохраняются через callback и не должны перезаписываться здесь
    const updated = await updateIntegrations({
      googleSearchConsoleUrl: googleSearchConsoleUrl !== undefined ? googleSearchConsoleUrl : current.googleSearchConsoleUrl,
      // OAuth токены не обновляем здесь - они сохраняются через callback
    }, user.id);

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
