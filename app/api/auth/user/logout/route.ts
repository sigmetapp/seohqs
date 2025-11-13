import { NextResponse } from 'next/server';
import { deleteSession } from '@/lib/auth-utils';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/auth/user/logout
 * Выход пользователя из системы
 */
export async function POST() {
  try {
    await deleteSession();
    return NextResponse.json({
      success: true,
      message: 'Вы успешно вышли из системы',
    });
  } catch (error: any) {
    console.error('Ошибка выхода:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Ошибка выхода из системы',
      },
      { status: 500 }
    );
  }
}
