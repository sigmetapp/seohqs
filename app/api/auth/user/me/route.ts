import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-utils';
import { getUserById } from '@/lib/db-users';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/auth/user/me
 * Получает информацию о текущем пользователе
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

    // Получаем актуальные данные из БД, чтобы иметь обновленное имя и аватар
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

    // Используем avatar если есть, иначе picture, иначе null
    const avatarUrl = dbUser.avatar || dbUser.picture || null;

    return NextResponse.json({
      success: true,
      user: {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        picture: dbUser.picture,
        avatar: avatarUrl,
      },
    });
  } catch (error: any) {
    console.error('Ошибка получения пользователя:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Ошибка получения информации о пользователе',
      },
      { status: 500 }
    );
  }
}
