import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createSession, setSessionCookie } from '@/lib/auth-utils';
import { createOrUpdateUser, getUserByGoogleId, getUserByEmail } from '@/lib/db-users';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/auth/user/google/callback
 * Обрабатывает callback от Google OAuth
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (!code) {
      return NextResponse.redirect(new URL('/?error=no_code', request.url));
    }

    // Парсим state для получения redirect_uri
    let redirectUri = '/';
    if (state) {
      try {
        const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
        redirectUri = stateData.redirect_uri || '/';
      } catch (e) {
        console.warn('Не удалось распарсить state:', e);
      }
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(new URL('/?error=config', request.url));
    }

    // Определяем redirect_uri для OAuth
    const headers = request.headers;
    const host = headers.get('host') || headers.get('x-forwarded-host');
    const protocol = headers.get('x-forwarded-proto') || 'https';
    const baseOrigin = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`;
    const oauthRedirectUri = `${baseOrigin.replace(/\/+$/, '')}/api/auth/user/google/callback`;

    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      oauthRedirectUri
    );

    // Обмениваем код на токены
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Получаем информацию о пользователе
    const oauth2 = google.oauth2({
      auth: oauth2Client,
      version: 'v2',
    });

    const userInfo = await oauth2.userinfo.get();

    if (!userInfo.data.email) {
      return NextResponse.redirect(new URL('/?error=no_email', request.url));
    }

    // Создаем или обновляем пользователя в БД
    const googleId = userInfo.data.id || undefined;
    const email = userInfo.data.email;
    const name = userInfo.data.name || undefined;
    const picture = userInfo.data.picture || undefined;

    let user;
    if (googleId) {
      // Сначала пытаемся найти по google_id
      user = await getUserByGoogleId(googleId);
    }

    if (!user) {
      // Если не нашли по google_id, ищем по email
      user = await getUserByEmail(email);
    }

    if (user) {
      // Обновляем существующего пользователя
      user = await createOrUpdateUser({
        email,
        name,
        picture,
        googleId,
      });
    } else {
      // Создаем нового пользователя
      user = await createOrUpdateUser({
        email,
        name,
        picture,
        googleId,
      });
    }

    // Создаем сессию
    const sessionToken = await createSession({
      id: user.id,
      email: user.email,
      name: user.name,
      picture: user.picture,
      googleId: user.googleId,
    });

    // Устанавливаем cookie
    await setSessionCookie(sessionToken);

    // Перенаправляем на главную страницу
    return NextResponse.redirect(new URL(redirectUri, request.url));
  } catch (error: any) {
    console.error('Ошибка обработки OAuth callback:', error);
    return NextResponse.redirect(new URL('/?error=auth_failed', request.url));
  }
}
