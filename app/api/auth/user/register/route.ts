import { NextResponse } from 'next/server';
import { getUserByEmail, createOrUpdateUser } from '@/lib/db-users';
import { createSession, setSessionCookie } from '@/lib/auth-utils';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/auth/user/register
 * Регистрация нового пользователя
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, name } = body;

    if (!email || !password) {
      return NextResponse.json(
        {
          success: false,
          error: 'Email и пароль обязательны',
        },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        {
          success: false,
          error: 'Пароль должен содержать минимум 6 символов',
        },
        { status: 400 }
      );
    }

    // Проверяем, существует ли пользователь
    const existingUser = await getUserByEmail(email);
    
    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          error: 'Пользователь с таким email уже существует',
        },
        { status: 400 }
      );
    }

    // Хешируем пароль
    const passwordHash = await bcrypt.hash(password, 10);

    // Создаем пользователя
    const dbUser = await createOrUpdateUser({
      email,
      name: name || undefined,
      passwordHash,
    });

    // Создаем сессию
    const user = {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
    };

    const token = await createSession(user);
    await setSessionCookie(token);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error: any) {
    console.error('Ошибка регистрации:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Ошибка регистрации',
      },
      { status: 500 }
    );
  }
}
