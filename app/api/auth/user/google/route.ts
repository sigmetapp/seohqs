import { NextResponse } from 'next/server';
import { google } from 'googleapis';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/auth/user/google
 * Начинает OAuth 2.0 flow для авторизации пользователя через Google
 */
export async function GET(request: Request) {
  try {
    const { searchParams, origin } = new URL(request.url);
    
    // Определяем правильный origin с учетом заголовков (для продакшена с прокси/CDN)
    const headers = request.headers;
    const host = headers.get('host') || headers.get('x-forwarded-host');
    const protocol = headers.get('x-forwarded-proto') || (origin.startsWith('https') ? 'https' : 'http');
    
    // Используем NEXT_PUBLIC_APP_URL если установлен, иначе определяем из заголовков
    let baseOrigin = process.env.NEXT_PUBLIC_APP_URL;
    if (!baseOrigin) {
      if (host) {
        baseOrigin = `${protocol}://${host}`;
      } else {
        baseOrigin = origin;
      }
    }
    
    // Убираем завершающий слэш из baseOrigin
    baseOrigin = baseOrigin.replace(/\/+$/, '');
    
    // Определяем redirect_uri для авторизации пользователя
    // Приоритет: GOOGLE_OAUTH_REDIRECT_URI > параметр из запроса > динамический
    const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI || 
      searchParams.get('redirect_uri') || 
      `${baseOrigin}/api/auth/user/google/callback`;

    // Используем GOOGLE_USER_CLIENT_ID для авторизации пользователей (если установлен)
    // Иначе fallback на GOOGLE_CLIENT_ID для обратной совместимости
    const clientId = process.env.GOOGLE_USER_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_USER_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      const missingVars = [];
      if (!process.env.GOOGLE_USER_CLIENT_ID && !process.env.GOOGLE_CLIENT_ID) {
        missingVars.push('GOOGLE_USER_CLIENT_ID или GOOGLE_CLIENT_ID');
      }
      if (!process.env.GOOGLE_USER_CLIENT_SECRET && !process.env.GOOGLE_CLIENT_SECRET) {
        missingVars.push('GOOGLE_USER_CLIENT_SECRET или GOOGLE_CLIENT_SECRET');
      }
      return NextResponse.json(
        {
          success: false,
          error: `${missingVars.join(' и ')} должны быть установлены в переменных окружения.`,
        },
        { status: 500 }
      );
    }

    // Scopes для получения информации о пользователе
    const scopes = [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ];

    // Логируем, какой Client ID используется (для отладки)
    console.log('[Google User OAuth] Using Client ID:', process.env.GOOGLE_USER_CLIENT_ID ? 'GOOGLE_USER_CLIENT_ID' : 'GOOGLE_CLIENT_ID');
    console.log('[Google User OAuth] Client ID value:', clientId?.substring(0, 20) + '...');
    console.log('[Google User OAuth] Redirect URI:', redirectUri);
    console.log('[Google User OAuth] Scopes:', scopes);

    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    // Получаем redirect путь из параметров запроса
    const redirectPath = searchParams.get('redirect') || '/summary';

    // Генерируем URL для авторизации
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
    });

    // Сохраняем redirect_uri и redirect путь в state параметре
    const state = Buffer.from(JSON.stringify({ 
      redirect_uri: redirectUri,
      redirect: redirectPath,
    })).toString('base64');

    return NextResponse.json({
      success: true,
      authUrl: `${authUrl}&state=${state}`,
      redirectUri: redirectUri,
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
