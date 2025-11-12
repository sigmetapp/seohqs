import { NextResponse } from 'next/server';
import { google } from 'googleapis';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/auth/google
 * Начинает OAuth 2.0 flow для Google Search Console
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const redirectUri = searchParams.get('redirect_uri') || 
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/google/callback`;

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        {
          success: false,
          error: 'GOOGLE_CLIENT_ID и GOOGLE_CLIENT_SECRET должны быть установлены в переменных окружения. ' +
                 'Для локальной разработки добавьте их в .env.local. ' +
                 'Для Vercel добавьте их в Settings → Environment Variables. ' +
                 'См. инструкцию: GOOGLE_SEARCH_CONSOLE_OAUTH_SETUP.md',
        },
        { status: 500 }
      );
    }

    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    // Scopes для Google Search Console API
    const scopes = [
      'https://www.googleapis.com/auth/webmasters.readonly',
      'https://www.googleapis.com/auth/webmasters',
    ];

    // Генерируем URL для авторизации
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline', // Для получения refresh token
      scope: scopes,
      prompt: 'consent', // Принудительно запрашиваем согласие для получения refresh token
    });

    // Сохраняем redirect_uri в сессии (в продакшене использовать Redis или БД)
    // Для простоты используем state параметр
    const state = Buffer.from(JSON.stringify({ redirect_uri: redirectUri })).toString('base64');

    return NextResponse.json({
      success: true,
      authUrl: `${authUrl}&state=${state}`,
    });
  } catch (error: any) {
    console.error('Ошибка создания OAuth URL:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Ошибка создания URL авторизации',
      },
      { status: 500 }
    );
  }
}
