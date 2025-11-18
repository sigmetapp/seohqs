import { NextResponse } from 'next/server';
import { getCurrentUser, createSession, setSessionCookie } from '@/lib/auth-utils';
import { updateUserProfile } from '@/lib/db-users';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * PATCH /api/auth/user/profile/update
 * Обновляет имя и/или аватар пользователя
 */
export async function PATCH(request: Request) {
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
    const { name, avatar } = body;

    const updates: { name?: string; avatar?: string } = {};
    if (name !== undefined) updates.name = name;
    if (avatar !== undefined) updates.avatar = avatar;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Не указаны поля для обновления',
        },
        { status: 400 }
      );
    }

    const updatedUser = await updateUserProfile(user.id, updates);

    // Обновляем сессию с новыми данными
    const sessionUser = {
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      picture: updatedUser.picture,
      googleId: updatedUser.googleId,
    };
    const token = await createSession(sessionUser);
    await setSessionCookie(token);

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        picture: updatedUser.picture,
        avatar: updatedUser.avatar,
        googleId: updatedUser.googleId,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt,
      },
    });
  } catch (error: any) {
    console.error('Ошибка обновления профиля:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Ошибка обновления профиля',
      },
      { status: 500 }
    );
  }
}
