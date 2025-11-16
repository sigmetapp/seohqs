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
    
    // Для Vercel всегда используем https
    const isVercel = process.env.VERCEL || host?.includes('vercel.app');
    const finalProtocol = isVercel ? 'https' : protocol;
    
    // Используем NEXT_PUBLIC_APP_URL если установлен, иначе определяем из заголовков
    let baseOrigin = process.env.NEXT_PUBLIC_APP_URL;
    if (!baseOrigin) {
      if (host) {
        // Для Vercel используем основной домен, а не внутренний preview URL
        // Если host содержит vercel.app, но не основной домен, используем NEXT_PUBLIC_VERCEL_URL
        if (isVercel && process.env.NEXT_PUBLIC_VERCEL_URL) {
          baseOrigin = process.env.NEXT_PUBLIC_VERCEL_URL;
        } else {
          baseOrigin = `${finalProtocol}://${host}`;
        }
      } else {
        baseOrigin = origin;
      }
    }
    
    // Убираем завершающий слэш и пробелы из baseOrigin
    const originalBaseOrigin = baseOrigin;
    baseOrigin = baseOrigin.trim().replace(/\/+$/, '');
    
    // Предупреждаем, если был завершающий слэш
    if (originalBaseOrigin !== baseOrigin) {
      console.warn('[User Google OAuth] NEXT_PUBLIC_APP_URL имел завершающий слэш и был нормализован:', {
        original: originalBaseOrigin,
        normalized: baseOrigin
      });
    }
    
    // Определяем redirect_uri
    // Можно явно указать через переменную окружения GOOGLE_OAUTH_REDIRECT_URI
    let redirectUri: string;
    if (process.env.GOOGLE_OAUTH_REDIRECT_URI) {
      // Убираем завершающий слэш из явно указанного redirect_uri
      redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI.trim().replace(/\/+$/, '');
    } else {
      const redirectUriFromParams = searchParams.get('redirect_uri');
      if (redirectUriFromParams) {
        redirectUri = redirectUriFromParams.trim().replace(/\/+$/, '');
      } else {
        redirectUri = `${baseOrigin}/api/auth/user/google/callback`;
      }
    }
    
    // Логируем redirect_uri для отладки
    console.log('[User Google OAuth] Redirect URI:', redirectUri);
    console.log('[User Google OAuth] Base Origin:', baseOrigin);
    console.log('[User Google OAuth] Request Origin:', origin);
    console.log('[User Google OAuth] Host:', host);
    console.log('[User Google OAuth] Protocol:', protocol);
    console.log('[User Google OAuth] Final Protocol:', finalProtocol);
    console.log('[User Google OAuth] Is Vercel:', isVercel);
    console.log('[User Google OAuth] NEXT_PUBLIC_APP_URL:', process.env.NEXT_PUBLIC_APP_URL);
    console.log('[User Google OAuth] GOOGLE_OAUTH_REDIRECT_URI:', process.env.GOOGLE_OAUTH_REDIRECT_URI);

    // Используем отдельные переменные для авторизации пользователей
    // Если не установлены, используем общие (для обратной совместимости)
    const clientId = process.env.GOOGLE_USER_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_USER_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        {
          success: false,
          error: 'GOOGLE_USER_CLIENT_ID и GOOGLE_USER_CLIENT_SECRET (или GOOGLE_CLIENT_ID и GOOGLE_CLIENT_SECRET) должны быть установлены в переменных окружения.',
        },
        { status: 500 }
      );
    }

    console.log('[User Google OAuth] Используется Client ID для авторизации пользователей');
    console.log('[User Google OAuth] GOOGLE_USER_CLIENT_ID установлен:', !!process.env.GOOGLE_USER_CLIENT_ID);
    console.log('[User Google OAuth] GOOGLE_CLIENT_ID установлен:', !!process.env.GOOGLE_CLIENT_ID);

    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    // Scopes для получения информации о пользователе
    const scopes = [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ];

    // Генерируем URL для авторизации
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
    });

    // Парсим authUrl, чтобы проверить, какой redirect_uri там используется
    try {
      const authUrlObj = new URL(authUrl);
      const redirectUriInUrl = authUrlObj.searchParams.get('redirect_uri');
      console.log('[User Google OAuth] Redirect URI в authUrl:', redirectUriInUrl);
      console.log('[User Google OAuth] Redirect URI, который мы передали:', redirectUri);
      if (redirectUriInUrl !== redirectUri) {
        console.error('[User Google OAuth] ВНИМАНИЕ: redirect_uri в authUrl не совпадает с переданным!', {
          inUrl: redirectUriInUrl,
          expected: redirectUri
        });
      }
    } catch (e) {
      console.warn('[User Google OAuth] Не удалось распарсить authUrl:', e);
    }

    console.log('[User Google OAuth] Полный authUrl (первые 200 символов):', authUrl.substring(0, 200));

    // Сохраняем redirect_uri в state
    const state = Buffer.from(JSON.stringify({ redirect_uri: redirectUri })).toString('base64');

    return NextResponse.json({
      success: true,
      authUrl: `${authUrl}&state=${state}`,
      redirectUri: redirectUri,
      debug: {
        redirectUriInAuthUrl: new URL(authUrl).searchParams.get('redirect_uri'),
        redirectUriExpected: redirectUri,
        clientId: clientId?.substring(0, 20) + '...',
      },
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
