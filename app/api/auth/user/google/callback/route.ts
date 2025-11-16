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
  
  // Для Vercel всегда используем https
  const isVercel = process.env.VERCEL || host?.includes('vercel.app');
  const finalProtocol = isVercel ? 'https' : protocol;
  
  // Используем NEXT_PUBLIC_APP_URL если установлен, иначе определяем из заголовков
  let baseOrigin = process.env.NEXT_PUBLIC_APP_URL;
  if (!baseOrigin) {
    if (host) {
      // Для Vercel используем основной домен, а не внутренний preview URL
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
    console.warn('[User Google OAuth Callback] NEXT_PUBLIC_APP_URL имел завершающий слэш и был нормализован:', {
      original: originalBaseOrigin,
      normalized: baseOrigin
    });
  }
  
  const baseUrl = baseOrigin;
  
  try {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Обрабатываем ошибку от Google
    if (error) {
      console.error('[User Google OAuth Callback] Error from Google:', error);
      
      // Определяем redirect_uri для сообщения об ошибке
      const redirectUriForError = process.env.GOOGLE_OAUTH_REDIRECT_URI || 
        `${baseOrigin}/api/auth/user/google/callback`;
      console.error('[User Google OAuth Callback] Expected Redirect URI:', redirectUriForError);
      console.error('[User Google OAuth Callback] Base Origin:', baseOrigin);
      console.error('[User Google OAuth Callback] Host:', host);
      console.error('[User Google OAuth Callback] NEXT_PUBLIC_APP_URL:', process.env.NEXT_PUBLIC_APP_URL);
      console.error('[User Google OAuth Callback] GOOGLE_OAUTH_REDIRECT_URI:', process.env.GOOGLE_OAUTH_REDIRECT_URI);
      
      let userMessage = error;
      if (error === 'redirect_uri_mismatch') {
        userMessage = `Ошибка redirect_uri_mismatch. Убедитесь, что в Google Cloud Console добавлен следующий Redirect URI: ${redirectUriForError}\n\nТакже проверьте переменные окружения:\n- NEXT_PUBLIC_APP_URL=${process.env.NEXT_PUBLIC_APP_URL || 'не установлена'}\n- GOOGLE_OAUTH_REDIRECT_URI=${process.env.GOOGLE_OAUTH_REDIRECT_URI || 'не установлена'}`;
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

    // Используем отдельные переменные для авторизации пользователей
    // Если не установлены, используем общие (для обратной совместимости)
    const clientId = process.env.GOOGLE_USER_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_USER_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(
        new URL('/indexing?error=' + encodeURIComponent('GOOGLE_USER_CLIENT_ID и GOOGLE_USER_CLIENT_SECRET (или GOOGLE_CLIENT_ID и GOOGLE_CLIENT_SECRET) должны быть установлены'), request.url)
      );
    }

    console.log('[User Google OAuth Callback] Используется Client ID для авторизации пользователей');
    console.log('[User Google OAuth Callback] GOOGLE_USER_CLIENT_ID установлен:', !!process.env.GOOGLE_USER_CLIENT_ID);
    console.log('[User Google OAuth Callback] GOOGLE_CLIENT_ID установлен:', !!process.env.GOOGLE_CLIENT_ID);

    // Определяем redirect_uri для OAuth
    // Можно явно указать через переменную окружения GOOGLE_OAUTH_REDIRECT_URI
    let oauthRedirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;
    if (oauthRedirectUri) {
      // Убираем завершающий слэш из явно указанного redirect_uri
      oauthRedirectUri = oauthRedirectUri.trim().replace(/\/+$/, '');
    } else {
      oauthRedirectUri = `${baseOrigin}/api/auth/user/google/callback`;
    }
    
    // Логируем для отладки
    console.log('[User Google OAuth Callback] Redirect URI:', oauthRedirectUri);
    console.log('[User Google OAuth Callback] Base Origin:', baseOrigin);
    console.log('[User Google OAuth Callback] Request Origin:', origin);
    console.log('[User Google OAuth Callback] Host:', host);
    console.log('[User Google OAuth Callback] Protocol:', protocol);
    console.log('[User Google OAuth Callback] Final Protocol:', finalProtocol);
    console.log('[User Google OAuth Callback] Is Vercel:', isVercel);
    console.log('[User Google OAuth Callback] NEXT_PUBLIC_APP_URL:', process.env.NEXT_PUBLIC_APP_URL);
    console.log('[User Google OAuth Callback] GOOGLE_OAUTH_REDIRECT_URI:', process.env.GOOGLE_OAUTH_REDIRECT_URI);

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
      // Используем baseOrigin, определенный выше, или переменную окружения
      const redirectUriForError = process.env.GOOGLE_OAUTH_REDIRECT_URI || 
        `${baseOrigin}/api/auth/user/google/callback`;
      
      userMessage = `Ошибка redirect_uri_mismatch. Убедитесь, что в Google Cloud Console добавлен следующий Redirect URI: ${redirectUriForError}\n\nТакже проверьте переменные окружения:\n- NEXT_PUBLIC_APP_URL=${process.env.NEXT_PUBLIC_APP_URL || 'не установлена'}\n- GOOGLE_OAUTH_REDIRECT_URI=${process.env.GOOGLE_OAUTH_REDIRECT_URI || 'не установлена'}`;
      console.error('[User Google OAuth Callback] Redirect URI для добавления в Google Cloud Console:', redirectUriForError);
      console.error('[User Google OAuth Callback] Base Origin:', baseOrigin);
      console.error('[User Google OAuth Callback] NEXT_PUBLIC_APP_URL:', process.env.NEXT_PUBLIC_APP_URL);
      console.error('[User Google OAuth Callback] GOOGLE_OAUTH_REDIRECT_URI:', process.env.GOOGLE_OAUTH_REDIRECT_URI);
    }
    
    return NextResponse.redirect(new URL(`/indexing?error=${encodeURIComponent(userMessage)}`, request.url));
  }
}
