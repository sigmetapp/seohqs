import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-utils';

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

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
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
