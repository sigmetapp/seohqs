import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-utils';
import { updateUserProfile } from '@/lib/db-users';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/auth/user/profile/avatar
 * Загружает аватар пользователя (base64 или URL)
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
    const { avatar } = body;

    if (!avatar) {
      return NextResponse.json(
        {
          success: false,
          error: 'Аватар не указан',
        },
        { status: 400 }
      );
    }

    // Если это base64, проверяем формат
    if (avatar.startsWith('data:image/')) {
      // Валидация размера (максимум 2MB в base64)
      const base64Size = (avatar.length * 3) / 4;
      if (base64Size > 2 * 1024 * 1024) {
        return NextResponse.json(
          {
            success: false,
            error: 'Размер изображения не должен превышать 2MB',
          },
          { status: 400 }
        );
      }
    }

    const updatedUser = await updateUserProfile(user.id, { avatar });

    return NextResponse.json({
      success: true,
      avatar: updatedUser.avatar,
    });
  } catch (error: any) {
    console.error('Ошибка загрузки аватара:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Ошибка загрузки аватара',
      },
      { status: 500 }
    );
  }
}
