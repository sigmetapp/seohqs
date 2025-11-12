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
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/integrations?error=${encodeURIComponent(error)}`
      );
    }

    if (!code) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/integrations?error=${encodeURIComponent('Код авторизации не получен')}`
      );
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/integrations?error=${encodeURIComponent('OAuth не настроен')}`
      );
    }

    // Декодируем state для получения redirect_uri
    let redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/google/callback`;
    if (state) {
      try {
        const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
        if (stateData.redirect_uri) {
          redirectUri = stateData.redirect_uri;
        }
      } catch (e) {
        console.warn('Не удалось декодировать state:', e);
      }
    }

    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    // Обмениваем код на токены
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.access_token || !tokens.refresh_token) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/integrations?error=${encodeURIComponent('Не удалось получить токены')}`
      );
    }

    // Сохраняем токены в storage
    // В продакшене это должно быть в БД с шифрованием
    // Используем non-null assertion, так как мы уже проверили наличие токенов выше
    const accessToken: string = tokens.access_token!;
    const refreshToken: string = tokens.refresh_token!;
    const tokenExpiry: string | undefined = tokens.expiry_date 
      ? new Date(tokens.expiry_date).toISOString() 
      : undefined;

    storage.integrations = {
      ...storage.integrations,
      googleAccessToken: accessToken,
      googleRefreshToken: refreshToken,
      googleTokenExpiry: tokenExpiry,
      updatedAt: new Date().toISOString(),
    };

    // Перенаправляем на страницу интеграций с успешным сообщением
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/integrations?success=${encodeURIComponent('Google авторизация успешна!')}`
    );
  } catch (error: any) {
    console.error('Ошибка обработки OAuth callback:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/integrations?error=${encodeURIComponent(error.message || 'Ошибка авторизации')}`
    );
  }
}
