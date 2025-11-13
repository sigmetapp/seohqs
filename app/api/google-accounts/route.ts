import { NextResponse } from 'next/server';
import { getAllGoogleAccounts, createGoogleAccount, updateGoogleAccount, deleteGoogleAccount, getGoogleAccountById } from '@/lib/db-adapter';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/google-accounts
 * Получает список всех Google аккаунтов
 */
export async function GET() {
  try {
    const accounts = await getAllGoogleAccounts();
    return NextResponse.json({
      success: true,
      accounts: accounts,
    });
  } catch (error: any) {
    console.error('Error fetching Google accounts:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Ошибка получения списка аккаунтов',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/google-accounts
 * Создает новый Google аккаунт
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, googleAccessToken, googleRefreshToken, googleTokenExpiry } = body;

    if (!email) {
      return NextResponse.json(
        {
          success: false,
          error: 'Email обязателен',
        },
        { status: 400 }
      );
    }

    const account = await createGoogleAccount({
      email,
      googleAccessToken: googleAccessToken || '',
      googleRefreshToken: googleRefreshToken || '',
      googleTokenExpiry: googleTokenExpiry || '',
    });

    return NextResponse.json({
      success: true,
      account: account,
    });
  } catch (error: any) {
    console.error('Error creating Google account:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Ошибка создания аккаунта',
      },
      { status: 500 }
    );
  }
}
