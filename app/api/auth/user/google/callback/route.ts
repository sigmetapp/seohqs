import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createOrUpdateUser } from '@/lib/db-users';
import { createSession, setSessionCookie } from '@/lib/auth-utils';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/auth/user/google/callback
 * Обрабатывает callback от Google OAuth для авторизации пользователя
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  
  // Определяем правильный origin с учетом заголовков
  // Приоритет: текущий домен запроса > NEXT_PUBLIC_APP_URL
  const headers = request.headers;
  const host = headers.get('host') || headers.get('x-forwarded-host');
  const protocol = headers.get('x-forwarded-proto') || (origin.startsWith('https') ? 'https' : 'http');
  
  // Используем текущий домен запроса, если доступен
  let baseOrigin: string;
  if (host) {
    baseOrigin = `${protocol}://${host}`;
  } else {
    // Fallback на NEXT_PUBLIC_APP_URL или origin
    baseOrigin = process.env.NEXT_PUBLIC_APP_URL || origin;
  }
  
  baseOrigin = baseOrigin.replace(/\/+$/, '');
  const baseUrl = baseOrigin;
  
  try {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      console.error('[Google OAuth Callback] Error from Google:', error);
      console.error('[Google OAuth Callback] Error description:', searchParams.get('error_description'));
      
      let errorMessage = 'Ошибка авторизации через Google';
      
      if (error === 'unauthorized_client') {
        errorMessage = 'Ошибка: unauthorized_client. Проверьте настройки OAuth в Google Cloud Console:\n' +
          '1. Убедитесь, что OAuth consent screen настроен\n' +
          '2. Проверьте, что Client ID активен\n' +
          '3. Если приложение в режиме Testing, добавьте пользователя в Test users\n' +
          '4. Убедитесь, что запрашиваемые scopes разрешены';
      } else if (error === 'access_denied') {
        errorMessage = 'Доступ запрещен. Если приложение в режиме Testing, добавьте ваш email в список Test users в Google Cloud Console.';
      } else if (error === 'redirect_uri_mismatch') {
        const redirectUriForError = process.env.GOOGLE_OAUTH_REDIRECT_URI || 
          `${baseOrigin}/api/auth/user/google/callback`;
        errorMessage = `Ошибка redirect_uri_mismatch. Добавьте в Google Cloud Console следующий Redirect URI: ${redirectUriForError}`;
      }
      
      return NextResponse.redirect(
        `${baseUrl}/login?error=${encodeURIComponent(errorMessage)}`
      );
    }

    if (!code) {
      return NextResponse.redirect(
        `${baseUrl}/login?error=${encodeURIComponent('Код авторизации не получен')}`
      );
    }

    // Используем GOOGLE_USER_CLIENT_ID для авторизации пользователей (если установлен)
    // Иначе fallback на GOOGLE_CLIENT_ID для обратной совместимости
    const clientId = process.env.GOOGLE_USER_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_USER_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(
        `${baseUrl}/login?error=${encodeURIComponent('OAuth не настроен. Установите GOOGLE_USER_CLIENT_ID и GOOGLE_USER_CLIENT_SECRET (или GOOGLE_CLIENT_ID и GOOGLE_CLIENT_SECRET)')}`
      );
    }

    // Декодируем state для получения redirect_uri и redirect пути
    // Приоритет: GOOGLE_OAUTH_REDIRECT_URI > state > динамический
    let redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI || 
      `${baseOrigin}/api/auth/user/google/callback`;
    let redirectPath = '/summary';
    if (state) {
      try {
        const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
        // Используем redirect_uri из state только если GOOGLE_OAUTH_REDIRECT_URI не установлен
        if (stateData.redirect_uri && !process.env.GOOGLE_OAUTH_REDIRECT_URI) {
          redirectUri = stateData.redirect_uri;
        }
        if (stateData.redirect) {
          redirectPath = stateData.redirect;
        }
      } catch (e) {
        console.warn('[Google OAuth Callback] Не удалось декодировать state:', e);
      }
    }

    // Логируем для отладки
    console.log('[Google User OAuth Callback] Using Client ID:', process.env.GOOGLE_USER_CLIENT_ID ? 'GOOGLE_USER_CLIENT_ID' : 'GOOGLE_CLIENT_ID');
    console.log('[Google User OAuth Callback] Redirect URI:', redirectUri);

    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    // Обмениваем код на токены
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.access_token) {
      return NextResponse.redirect(
        `${baseUrl}/login?error=${encodeURIComponent('Не удалось получить токены')}`
      );
    }

    // Получаем информацию о пользователе
    oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();

    if (!userInfo.data.email) {
      return NextResponse.redirect(
        `${baseUrl}/login?error=${encodeURIComponent('Не удалось получить email пользователя')}`
      );
    }

    // Создаем или обновляем пользователя
    const dbUser = await createOrUpdateUser({
      email: userInfo.data.email,
      name: userInfo.data.name || undefined,
      picture: userInfo.data.picture || undefined,
      googleId: userInfo.data.id || undefined,
    });

    // Создаем сессию
    const user = {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      picture: dbUser.picture,
      googleId: dbUser.googleId,
    };

    const token = await createSession(user);
    await setSessionCookie(token);

    // Используем redirect путь из state или /summary по умолчанию
    return NextResponse.redirect(`${baseUrl}${redirectPath}`);
  } catch (error: any) {
    console.error('[Google OAuth Callback] Ошибка обработки OAuth callback:', error);
    return NextResponse.redirect(
      `${baseUrl}/login?error=${encodeURIComponent(error.message || 'Ошибка авторизации')}`
    );
  }
}
