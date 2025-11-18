import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-utils';
import { scheduleAccountDeletion, cancelAccountDeletion, getUserById } from '@/lib/db-users';
import { deleteSession } from '@/lib/auth-utils';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/auth/user/delete
 * Планирует удаление аккаунта (через 14 дней)
 */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Пользователь не авторизован',
        },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { confirm } = body;

    if (confirm !== true) {
      return NextResponse.json(
        {
          success: false,
          error: 'Требуется подтверждение удаления',
        },
        { status: 400 }
      );
    }

    await scheduleAccountDeletion(user.id);

    // Удаляем сессию пользователя
    await deleteSession();

    const deletionDate = new Date();
    deletionDate.setDate(deletionDate.getDate() + 14);

    return NextResponse.json({
      success: true,
      message: 'Удаление аккаунта запланировано. Аккаунт будет удален через 14 дней.',
      deletionDate: deletionDate.toISOString(),
    });
  } catch (error: any) {
    console.error('Ошибка планирования удаления аккаунта:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Ошибка планирования удаления аккаунта',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/auth/user/delete
 * Отменяет запланированное удаление аккаунта
 */
export async function DELETE() {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Пользователь не авторизован',
        },
        { status: 401 }
      );
    }

    const dbUser = await getUserById(user.id);
    if (!dbUser || !dbUser.deletedAt) {
      return NextResponse.json(
        {
          success: false,
          error: 'Удаление аккаунта не запланировано',
        },
        { status: 400 }
      );
    }

    await cancelAccountDeletion(user.id);

    return NextResponse.json({
      success: true,
      message: 'Удаление аккаунта отменено',
    });
  } catch (error: any) {
    console.error('Ошибка отмены удаления аккаунта:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Ошибка отмены удаления аккаунта',
      },
      { status: 500 }
    );
  }
}
