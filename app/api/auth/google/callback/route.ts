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
  try {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Определяем базовый URL для редиректов
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || origin;

    if (error) {
      console.error('[Google OAuth Callback] Error from Google:', error);
      return NextResponse.redirect(
        `${baseUrl}/integrations?error=${encodeURIComponent(
          error === 'redirect_uri_mismatch' 
            ? 'Ошибка redirect_uri_mismatch: Убедитесь, что в Google Cloud Console добавлен правильный Redirect URI: ' + origin + '/api/auth/google/callback'
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
    // Если state не передан, используем текущий origin
    let redirectUri = `${origin}/api/auth/google/callback`;
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
    console.log('[Google OAuth Callback] Origin:', origin);

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
      userMessage = `Ошибка redirect_uri_mismatch. Убедитесь, что в Google Cloud Console добавлен Redirect URI: ${origin}/api/auth/google/callback`;
    }
    
    return NextResponse.redirect(
      `${baseUrl}/integrations?error=${encodeURIComponent(userMessage)}`
    );
  }
}
