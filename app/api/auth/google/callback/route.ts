import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { storage } from '@/lib/storage';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/auth/google/callback
 * Обрабатывает callback от Google OAuth и сохраняет токены
 */
export async function GET(request: Request) {
  // Определяем базовый URL и origin вне блока try, чтобы они были доступны в catch
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
  
  // Убираем завершающий слэш из baseOrigin, чтобы избежать двойного слэша
  baseOrigin = baseOrigin.replace(/\/+$/, '');
  
  const baseUrl = baseOrigin;
  
  try {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      console.error('[Google OAuth Callback] Error from Google:', error);
      const redirectUriForError = `${baseOrigin}/api/auth/google/callback`;
      console.error('[Google OAuth Callback] Expected Redirect URI:', redirectUriForError);
      console.error('[Google OAuth Callback] Base Origin:', baseOrigin);
      console.error('[Google OAuth Callback] Request Origin:', origin);
      console.error('[Google OAuth Callback] Host:', host);
      
      return NextResponse.redirect(
        `${baseUrl}/integrations?error=${encodeURIComponent(
          error === 'redirect_uri_mismatch' 
            ? `Ошибка redirect_uri_mismatch. Добавьте в Google Cloud Console следующий Redirect URI: ${redirectUriForError}`
            : error
        )}`
      );
    }

    if (!code) {
      return NextResponse.redirect(
        `${baseUrl}/integrations?error=${encodeURIComponent('Код авторизации не получен')}`
      );
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(
        `${baseUrl}/integrations?error=${encodeURIComponent('OAuth не настроен')}`
      );
    }

    // Декодируем state для получения redirect_uri
    // Если state не передан, используем текущий baseOrigin
    let redirectUri = `${baseOrigin}/api/auth/google/callback`;
    if (state) {
      try {
        const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
        if (stateData.redirect_uri) {
          redirectUri = stateData.redirect_uri;
        }
      } catch (e) {
        console.warn('[Google OAuth Callback] Не удалось декодировать state:', e);
      }
    }

    // Логируем для отладки
    console.log('[Google OAuth Callback] Redirect URI:', redirectUri);
    console.log('[Google OAuth Callback] Base Origin:', baseOrigin);
    console.log('[Google OAuth Callback] Request Origin:', origin);
    console.log('[Google OAuth Callback] Host:', host);
    console.log('[Google OAuth Callback] Protocol:', protocol);

    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    // Обмениваем код на токены
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.access_token || !tokens.refresh_token) {
      return NextResponse.redirect(
        `${baseUrl}/integrations?error=${encodeURIComponent('Не удалось получить токены')}`
      );
    }

    // Сохраняем токены в storage
    // В продакшене это должно быть в БД с шифрованием
    // Используем non-null assertion, так как мы уже проверили наличие токенов выше
    const accessToken: string = tokens.access_token!;
    const refreshToken: string = tokens.refresh_token!;
    const tokenExpiry: string = tokens.expiry_date 
      ? new Date(tokens.expiry_date).toISOString() 
      : '';

    storage.integrations = {
      ...storage.integrations,
      googleAccessToken: accessToken,
      googleRefreshToken: refreshToken,
      googleTokenExpiry: tokenExpiry,
      updatedAt: new Date().toISOString(),
    };

    // Перенаправляем на страницу интеграций с успешным сообщением
    return NextResponse.redirect(
      `${baseUrl}/integrations?success=${encodeURIComponent('Google авторизация успешна!')}`
    );
  } catch (error: any) {
    console.error('[Google OAuth Callback] Ошибка обработки OAuth callback:', error);
    
    // Проверяем, не является ли это ошибкой redirect_uri_mismatch
    const errorMessage = error.message || 'Ошибка авторизации';
    let userMessage = errorMessage;
    
    if (errorMessage.includes('redirect_uri_mismatch') || errorMessage.includes('redirect_uri')) {
      const redirectUriForError = `${baseOrigin}/api/auth/google/callback`;
      userMessage = `Ошибка redirect_uri_mismatch. Добавьте в Google Cloud Console следующий Redirect URI: ${redirectUriForError}`;
      console.error('[Google OAuth Callback] Redirect URI для добавления в Google Cloud Console:', redirectUriForError);
    }
    
    return NextResponse.redirect(
      `${baseUrl}/integrations?error=${encodeURIComponent(userMessage)}`
    );
  }
}
