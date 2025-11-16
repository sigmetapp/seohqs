import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-utils';
import { getUserById, updateUserPassword } from '@/lib/db-users';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/auth/user/password
 * Устанавливает или изменяет пароль пользователя
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
    const { password, currentPassword } = body;

    if (!password || password.length < 6) {
      return NextResponse.json(
        {
          success: false,
          error: 'Пароль должен содержать минимум 6 символов',
        },
        { status: 400 }
      );
    }

    // Получаем полную информацию о пользователе из БД
    const dbUser = await getUserById(user.id);
    
    if (!dbUser) {
      return NextResponse.json(
        {
          success: false,
          error: 'Пользователь не найден',
        },
        { status: 404 }
      );
    }

    // Если у пользователя уже есть пароль, требуется текущий пароль
    if (dbUser.passwordHash) {
      if (!currentPassword) {
        return NextResponse.json(
          {
            success: false,
            error: 'Требуется текущий пароль для изменения пароля',
          },
          { status: 400 }
        );
      }

      // Проверяем текущий пароль
      const isPasswordValid = await bcrypt.compare(currentPassword, dbUser.passwordHash);
      
      if (!isPasswordValid) {
        return NextResponse.json(
          {
            success: false,
            error: 'Неверный текущий пароль',
          },
          { status: 401 }
        );
      }
    }

    // Хешируем новый пароль
    const passwordHash = await bcrypt.hash(password, 10);

    // Обновляем пароль в БД
    await updateUserPassword(user.id, passwordHash);

    return NextResponse.json({
      success: true,
      message: dbUser.passwordHash ? 'Пароль успешно изменен' : 'Пароль успешно установлен',
    });
  } catch (error: any) {
    console.error('Ошибка установки/изменения пароля:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Ошибка установки/изменения пароля',
      },
      { status: 500 }
    );
  }
}
