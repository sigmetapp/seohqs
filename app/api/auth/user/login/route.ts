import { NextResponse } from 'next/server';
import { getUserByEmail } from '@/lib/db-users';
import { createSession, setSessionCookie } from '@/lib/auth-utils';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/auth/user/login
 * Авторизация пользователя по email и паролю
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        {
          success: false,
          error: 'Email и пароль обязательны',
        },
        { status: 400 }
      );
    }

    // Получаем пользователя по email
    const dbUser = await getUserByEmail(email);
    
    if (!dbUser) {
      return NextResponse.json(
        {
          success: false,
          error: 'Неверный email или пароль',
        },
        { status: 401 }
      );
    }

    // Проверяем, есть ли у пользователя пароль
    if (!dbUser.passwordHash) {
      return NextResponse.json(
        {
          success: false,
          error: 'Для этого аккаунта не установлен пароль. Используйте вход через Google.',
        },
        { status: 401 }
      );
    }

    // Проверяем пароль
    const isPasswordValid = await bcrypt.compare(password, dbUser.passwordHash);
    
    if (!isPasswordValid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Неверный email или пароль',
        },
        { status: 401 }
      );
    }

    // Создаем сессию
    const user = {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      picture: dbUser.picture,
      googleId: dbUser.googleId,
    };

    const token = await createSession(user);
    await setSessionCookie(token);

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
    console.error('Ошибка входа:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Ошибка входа в систему',
      },
      { status: 500 }
    );
  }
}
