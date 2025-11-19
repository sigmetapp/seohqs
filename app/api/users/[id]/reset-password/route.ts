import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/middleware-auth';
import { getUserById, updateUserPassword } from '@/lib/db-users';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/users/[id]/reset-password
 * Сброс пароля пользователя администратором
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { id } = await params;
    const userId = Number(id);
    if (isNaN(userId)) {
      return NextResponse.json(
        { success: false, error: 'Неверный ID пользователя' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json(
        { success: false, error: 'Пароль обязателен' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Пароль должен содержать минимум 6 символов' },
        { status: 400 }
      );
    }

    // Проверяем, существует ли пользователь
    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Пользователь не найден' },
        { status: 404 }
      );
    }

    // Хешируем новый пароль
    const passwordHash = await bcrypt.hash(password, 10);

    // Обновляем пароль
    await updateUserPassword(userId, passwordHash);

    return NextResponse.json({
      success: true,
      message: 'Пароль успешно изменен',
    });
  } catch (error: any) {
    console.error('Ошибка сброса пароля:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Ошибка сброса пароля',
      },
      { status: 500 }
    );
  }
}
