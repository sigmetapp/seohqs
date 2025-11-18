import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-utils';
import { getUserById } from '@/lib/db-users';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/auth/user/profile
 * Получает полную информацию о профиле пользователя
 */
export async function GET() {
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

    return NextResponse.json({
      success: true,
      user: {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        picture: dbUser.picture,
        avatar: dbUser.avatar,
        googleId: dbUser.googleId,
        hasPassword: !!dbUser.passwordHash,
        deletedAt: dbUser.deletedAt,
        createdAt: dbUser.createdAt,
        updatedAt: dbUser.updatedAt,
      },
    });
  } catch (error: any) {
    console.error('Ошибка получения профиля:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Ошибка получения информации о профиле',
      },
      { status: 500 }
    );
  }
}
