import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { storage } from '@/lib/storage';
import { updateIntegrations, getAllGoogleAccounts, createGoogleAccount, updateGoogleAccount } from '@/lib/db-adapter';
import { getCurrentUser } from '@/lib/auth-utils';

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

    // Сохраняем токены в БД и в storage (для обратной совместимости)
    // Используем non-null assertion, так как мы уже проверили наличие токенов выше
    const accessToken: string = tokens.access_token!;
    const refreshToken: string = tokens.refresh_token!;
    const tokenExpiry: string = tokens.expiry_date 
      ? new Date(tokens.expiry_date).toISOString() 
      : '';

    // Получаем информацию о пользователе для получения email
    oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    let userEmail = '';
    try {
      const userInfo = await oauth2.userinfo.get();
      userEmail = userInfo.data.email || '';
    } catch (error) {
      console.warn('[Google OAuth Callback] Не удалось получить email пользователя:', error);
    }

    // Получаем текущего пользователя из сессии
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.redirect(
        `${baseUrl}/integrations?error=${encodeURIComponent('Требуется авторизация пользователя')}`
      );
    }

    // Сохраняем в новую таблицу google_accounts
    if (userEmail) {
      try {
        // Проверяем, существует ли уже аккаунт с таким email
        const existingAccounts = await getAllGoogleAccounts(currentUser.id);
        const existingAccount = existingAccounts.find(acc => acc.email === userEmail);
        
        if (existingAccount) {
          // Обновляем существующий аккаунт
          await updateGoogleAccount(existingAccount.id, {
            googleAccessToken: accessToken,
            googleRefreshToken: refreshToken,
            googleTokenExpiry: tokenExpiry,
          }, currentUser.id);
        } else {
          // Создаем новый аккаунт
          await createGoogleAccount({
            email: userEmail,
            googleAccessToken: accessToken,
            googleRefreshToken: refreshToken,
            googleTokenExpiry: tokenExpiry,
          }, currentUser.id);
        }
      } catch (error) {
        console.error('[Google OAuth Callback] Ошибка сохранения аккаунта:', error);
        // Продолжаем выполнение, даже если не удалось сохранить в новую таблицу
      }
    }

    // Также сохраняем в старую таблицу integrations для обратной совместимости
    await updateIntegrations({
      googleAccessToken: accessToken,
      googleRefreshToken: refreshToken,
      googleTokenExpiry: tokenExpiry,
    }, currentUser.id);

    // Также обновляем storage для обратной совместимости
    storage.integrations = {
      ...storage.integrations,
      googleAccessToken: accessToken,
      googleRefreshToken: refreshToken,
      googleTokenExpiry: tokenExpiry,
      updatedAt: new Date().toISOString(),
    };

    // Автоматически загружаем все сайты из Google Search Console
    try {
      const { loadGoogleConsoleSites } = await import('@/lib/load-google-console-sites');
      const loadData = await loadGoogleConsoleSites();
      console.log('[Google OAuth Callback] Сайты загружены:', loadData);
    } catch (loadError) {
      console.warn('[Google OAuth Callback] Ошибка при загрузке сайтов:', loadError);
      // Не прерываем процесс авторизации, если загрузка сайтов не удалась
    }

    // Перенаправляем на страницу интеграций с успешным сообщением
    return NextResponse.redirect(
      `${baseUrl}/integrations?success=${encodeURIComponent('Google авторизация успешна! Сайты загружены из Google Search Console.')}`
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
