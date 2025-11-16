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
  
  // Убираем завершающий слэш из baseOrigin
  baseOrigin = baseOrigin.replace(/\/+$/, '');
  const baseUrl = baseOrigin;
  
  try {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Обрабатываем ошибку от Google
    if (error) {
      console.error('[User Google OAuth Callback] Error from Google:', error);
      const redirectUriForError = `${baseOrigin}/api/auth/user/google/callback`;
      console.error('[User Google OAuth Callback] Expected Redirect URI:', redirectUriForError);
      
      let userMessage = error;
      if (error === 'redirect_uri_mismatch') {
        userMessage = `Ошибка redirect_uri_mismatch. Добавьте в Google Cloud Console следующий Redirect URI: ${redirectUriForError}`;
      }
      
      return NextResponse.redirect(
        new URL(`/indexing?error=${encodeURIComponent(userMessage)}`, request.url)
      );
    }

    if (!code) {
      return NextResponse.redirect(new URL('/indexing?error=no_code', request.url));
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
      return NextResponse.redirect(new URL('/indexing?error=config', request.url));
    }

    // Определяем redirect_uri для OAuth
    // Используем baseOrigin, определенный выше
    const oauthRedirectUri = `${baseOrigin}/api/auth/user/google/callback`;
    
    // Логируем для отладки
    console.log('[User Google OAuth Callback] Redirect URI:', oauthRedirectUri);
    console.log('[User Google OAuth Callback] Base Origin:', baseOrigin);
    console.log('[User Google OAuth Callback] Request Origin:', origin);
    console.log('[User Google OAuth Callback] Host:', host);
    console.log('[User Google OAuth Callback] Protocol:', protocol);
    console.log('[User Google OAuth Callback] NEXT_PUBLIC_APP_URL:', process.env.NEXT_PUBLIC_APP_URL);

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
      return NextResponse.redirect(new URL('/indexing?error=no_email', request.url));
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

    // Перенаправляем на указанную страницу или на главную
    const finalRedirectUri = redirectUri === '/' ? '/indexing' : redirectUri;
    return NextResponse.redirect(new URL(finalRedirectUri, request.url));
  } catch (error: any) {
    console.error('[User Google OAuth Callback] Ошибка обработки OAuth callback:', error);
    
    // Проверяем, не является ли это ошибкой redirect_uri_mismatch
    const errorMessage = error.message || 'Ошибка авторизации';
    let userMessage = 'Ошибка авторизации';
    
    if (errorMessage.includes('redirect_uri_mismatch') || errorMessage.includes('redirect_uri')) {
      // Используем baseOrigin, определенный выше
      const redirectUriForError = `${baseOrigin}/api/auth/user/google/callback`;
      
      userMessage = `Ошибка redirect_uri_mismatch. Добавьте в Google Cloud Console следующий Redirect URI: ${redirectUriForError}`;
      console.error('[User Google OAuth Callback] Redirect URI для добавления в Google Cloud Console:', redirectUriForError);
    }
    
    return NextResponse.redirect(new URL(`/indexing?error=${encodeURIComponent(userMessage)}`, request.url));
  }
}
