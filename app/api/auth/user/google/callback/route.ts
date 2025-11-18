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
  const headers = request.headers;
  const host = headers.get('host') || headers.get('x-forwarded-host');
  const protocol = headers.get('x-forwarded-proto') || (origin.startsWith('https') ? 'https' : 'http');
  
  // Используем NEXT_PUBLIC_APP_URL если установлен
  let baseOrigin = process.env.NEXT_PUBLIC_APP_URL;
  if (!baseOrigin) {
    if (host) {
      baseOrigin = `${protocol}://${host}`;
    } else {
      baseOrigin = origin;
    }
  }
  
  baseOrigin = baseOrigin.replace(/\/+$/, '');
  const baseUrl = baseOrigin;
  
  try {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      console.error('[Google OAuth Callback] Error from Google:', error);
      return NextResponse.redirect(
        `${baseUrl}/login?error=${encodeURIComponent('Ошибка авторизации через Google')}`
      );
    }

    if (!code) {
      return NextResponse.redirect(
        `${baseUrl}/login?error=${encodeURIComponent('Код авторизации не получен')}`
      );
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(
        `${baseUrl}/login?error=${encodeURIComponent('OAuth не настроен')}`
      );
    }

    // Декодируем state для получения redirect_uri и redirect пути
    let redirectUri = `${baseOrigin}/api/auth/user/google/callback`;
    let redirectPath = '/summary';
    if (state) {
      try {
        const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
        if (stateData.redirect_uri) {
          redirectUri = stateData.redirect_uri;
        }
        if (stateData.redirect) {
          redirectPath = stateData.redirect;
        }
      } catch (e) {
        console.warn('[Google OAuth Callback] Не удалось декодировать state:', e);
      }
    }

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
