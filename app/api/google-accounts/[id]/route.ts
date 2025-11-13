import { NextResponse } from 'next/server';
import { getGoogleAccountById, updateGoogleAccount, deleteGoogleAccount } from '@/lib/db-adapter';
import { requireAuth } from '@/lib/middleware-auth';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/google-accounts/[id]
 * Получает Google аккаунт по ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;
    
    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Неверный ID аккаунта',
        },
        { status: 400 }
      );
    }

    const account = await getGoogleAccountById(id, user.id);
    if (!account) {
      return NextResponse.json(
        {
          success: false,
          error: 'Аккаунт не найден',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      account: account,
    });
  } catch (error: any) {
    console.error('Error fetching Google account:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Ошибка получения аккаунта',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/google-accounts/[id]
 * Обновляет Google аккаунт
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;
    
    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Неверный ID аккаунта',
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { email, googleAccessToken, googleRefreshToken, googleTokenExpiry } = body;

    const account = await updateGoogleAccount(id, {
      ...(email !== undefined && { email }),
      ...(googleAccessToken !== undefined && { googleAccessToken }),
      ...(googleRefreshToken !== undefined && { googleRefreshToken }),
      ...(googleTokenExpiry !== undefined && { googleTokenExpiry }),
    }, user.id);

    return NextResponse.json({
      success: true,
      account: account,
    });
  } catch (error: any) {
    console.error('Error updating Google account:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Ошибка обновления аккаунта',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/google-accounts/[id]
 * Удаляет Google аккаунт
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;
    
    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Неверный ID аккаунта',
        },
        { status: 400 }
      );
    }

    await deleteGoogleAccount(id, user.id);

    return NextResponse.json({
      success: true,
      message: 'Аккаунт успешно удален',
    });
  } catch (error: any) {
    console.error('Error deleting Google account:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Ошибка удаления аккаунта',
      },
      { status: 500 }
    );
  }
}
