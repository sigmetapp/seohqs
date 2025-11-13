import { NextResponse } from 'next/server';
import { getGoogleAccountById, updateGoogleAccount, deleteGoogleAccount } from '@/lib/db-adapter';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/google-accounts/[id]
 * Получает Google аккаунт по ID
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
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

    const account = await getGoogleAccountById(id);
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
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
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
    });

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
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
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

    await deleteGoogleAccount(id);

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
