import { NextResponse } from 'next/server';
import { getAllGoogleAccounts, createGoogleAccount, updateGoogleAccount, deleteGoogleAccount, getGoogleAccountById } from '@/lib/db-adapter';
import { requireAuth } from '@/lib/middleware-auth';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/google-accounts
 * Получает список всех Google аккаунтов
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;
    
    console.log('[Google Accounts API] Fetching accounts for user:', user.id, user.email);
    
    const accounts = await getAllGoogleAccounts(user.id);
    
    console.log('[Google Accounts API] Found accounts:', accounts.length);
    if (accounts.length > 0) {
      console.log('[Google Accounts API] Account emails:', accounts.map(a => a.email).join(', '));
    }
    
    return NextResponse.json({
      success: true,
      accounts: accounts,
    });
  } catch (error: any) {
    console.error('[Google Accounts API] Error fetching Google accounts:', error);
    console.error('[Google Accounts API] Error stack:', error.stack);
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
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;
    
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
    }, user.id);

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
