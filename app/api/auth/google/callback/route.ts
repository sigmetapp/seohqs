import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { storage } from '@/lib/storage';
import { updateIntegrations, getAllGoogleAccounts, createGoogleAccount, updateGoogleAccount } from '@/lib/db-adapter';
import { getCurrentUser } from '@/lib/auth-utils';
import { getSupabaseAuthUserId, upsertGSCIntegration, upsertGSCSites } from '@/lib/gsc-integrations';
import { upsertGoogleGSCAccount } from '@/lib/google-gsc-accounts';

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
      
      let errorMessage = error;
      
      // Специальная обработка для access_denied (приложение в режиме тестирования)
      if (error === 'access_denied') {
        errorMessage = `Ошибка 403: access_denied

Приложение находится в режиме тестирования в Google Cloud Console. Для подключения второго Google аккаунта необходимо:

1. Перейти в Google Cloud Console → APIs & Services → OAuth consent screen
2. Добавить email второго аккаунта в раздел "Test users" (нажать "+ ADD USERS")
3. Или перевести приложение в режим Production (нажать "PUBLISH APP")

Подробная инструкция: GOOGLE_OAUTH_TESTING_MODE_FIX.md`;
      } else if (error === 'redirect_uri_mismatch') {
        errorMessage = `Ошибка redirect_uri_mismatch. Добавьте в Google Cloud Console следующий Redirect URI: ${redirectUriForError}`;
      }
      
      return NextResponse.redirect(
        `${baseUrl}/integrations?error=${encodeURIComponent(errorMessage)}`
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

    // Получаем информацию о пользователе Google через userinfo endpoint (v3)
    // This is required for GSC integration to get google_email and google_user_id
    let googleUserInfo: { email: string; sub: string } | null = null;
    try {
      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      
      if (userInfoResponse.ok) {
        const userInfoData = await userInfoResponse.json();
        googleUserInfo = {
          email: userInfoData.email || '',
          sub: userInfoData.sub || '',
        };
        if (googleUserInfo.email && googleUserInfo.sub) {
          console.log('[Google OAuth Callback] Google userinfo:', { email: googleUserInfo.email, sub: googleUserInfo.sub });
        }
      } else {
        console.warn('[Google OAuth Callback] Failed to fetch userinfo:', userInfoResponse.status, userInfoResponse.statusText);
      }
    } catch (error) {
      console.warn('[Google OAuth Callback] Error fetching userinfo:', error);
    }

    // Fallback: также получаем через oauth2 v2 API для обратной совместимости
    oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    let userEmail = '';
    try {
      const userInfo = await oauth2.userinfo.get();
      userEmail = userInfo.data.email || '';
      // Use v2 email if v3 didn't work
      if (!googleUserInfo && userEmail) {
        googleUserInfo = { email: userEmail, sub: userInfo.data.id || '' };
      }
    } catch (error) {
      console.warn('[Google OAuth Callback] Не удалось получить email пользователя через v2:', error);
    }

    // Получаем текущего пользователя из сессии (для обратной совместимости)
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.redirect(
        `${baseUrl}/integrations?error=${encodeURIComponent('Требуется авторизация пользователя')}`
      );
    }

    // Получаем Supabase Auth user ID для GSC интеграции
    // This is the UUID from auth.users table
    // Note: This requires Supabase Auth to be set up and the user to be authenticated via Supabase Auth
    // If Supabase Auth is not configured, this will be null and GSC integration won't be saved
    const supabaseAuthUserId = await getSupabaseAuthUserId(request);
    
    // Сохраняем в gsc_integrations если у нас есть Supabase Auth user и Google userinfo
    if (supabaseAuthUserId && googleUserInfo && googleUserInfo.email && googleUserInfo.sub) {
      try {
        await upsertGSCIntegration(supabaseAuthUserId, {
          google_email: googleUserInfo.email,
          google_user_id: googleUserInfo.sub,
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        console.log('[Google OAuth Callback] GSC integration saved for Supabase Auth user:', supabaseAuthUserId);
        
        // Также сохраняем в новую таблицу google_gsc_accounts для поддержки множественных аккаунтов
        try {
          await upsertGoogleGSCAccount(supabaseAuthUserId, {
            google_email: googleUserInfo.email,
            google_user_id: googleUserInfo.sub,
            source: 'gsc',
          });
          console.log('[Google OAuth Callback] Google GSC account saved to google_gsc_accounts:', googleUserInfo.email);
        } catch (accountError) {
          console.warn('[Google OAuth Callback] Error saving to google_gsc_accounts:', accountError);
          // Continue even if this fails
        }
        
        // Optionally fetch and save GSC sites immediately
        try {
          const sitesResponse = await fetch('https://www.googleapis.com/webmasters/v3/sites', {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          });
          
          if (sitesResponse.ok) {
            const sitesData = await sitesResponse.json();
            const sites = sitesData.siteEntry || [];
            
            // Get the integration ID to save sites
            const { getGSCIntegration } = await import('@/lib/gsc-integrations');
            const integration = await getGSCIntegration(supabaseAuthUserId);
            
            if (integration && sites.length > 0) {
              await upsertGSCSites(
                integration.id,
                sites.map((site: any) => ({
                  siteUrl: site.siteUrl,
                  permissionLevel: site.permissionLevel,
                }))
              );
              console.log('[Google OAuth Callback] GSC sites saved:', sites.length);
            }
          }
        } catch (sitesError) {
          console.warn('[Google OAuth Callback] Error fetching GSC sites:', sitesError);
          // Don't fail the whole flow if sites fetch fails
        }
      } catch (gscError: any) {
        console.error('[Google OAuth Callback] Error saving GSC integration:', gscError);
        
        // If table doesn't exist, log helpful message
        if (gscError?.message?.includes('does not exist') || 
            gscError?.message?.includes('schema cache')) {
          console.error('[Google OAuth Callback] Table gsc_integrations does not exist.');
          console.error('[Google OAuth Callback] Please run migration: migrations/018_gsc_integrations_table_supabase.sql');
          console.error('[Google OAuth Callback] The integration will be saved to other tables (google_accounts) but not to gsc_integrations.');
        }
        // Continue with existing flow even if GSC integration save fails
      }
    } else {
      if (!supabaseAuthUserId) {
        console.warn('[Google OAuth Callback] Supabase Auth user ID not found. GSC integration will not be saved.');
      }
      if (!googleUserInfo) {
        console.warn('[Google OAuth Callback] Google userinfo not available. GSC integration will not be saved.');
      }
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
      const loadData = await loadGoogleConsoleSites(currentUser.id);
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
