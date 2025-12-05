import { NextResponse } from 'next/server';
import { createOrUpdateUser } from '@/lib/db-users';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/admin/create-user
 * Создание пользователя администратором
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

    // Хешируем пароль
    const passwordHash = await bcrypt.hash(password, 10);

    // Создаем или обновляем пользователя
    const dbUser = await createOrUpdateUser({
      email,
      name: name || undefined,
      passwordHash,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
      },
      message: 'Пользователь успешно создан/обновлен',
    });
  } catch (error: any) {
    console.error('Ошибка создания пользователя:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Ошибка создания пользователя',
      },
      { status: 500 }
    );
  }
}
