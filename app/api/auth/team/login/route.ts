import { NextResponse } from 'next/server';
import { getTeamMemberByUsername, updateTeamMemberPassword } from '@/lib/db-users';
import { createSession, setSessionCookie } from '@/lib/auth-utils';
import bcrypt from 'bcryptjs';
import type { User } from '@/lib/auth-utils';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/auth/team/login
 * Вход участника команды по username и паролю
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password, newPassword } = body;

    if (!username || !password) {
      return NextResponse.json(
        {
          success: false,
          error: 'Username и пароль обязательны',
        },
        { status: 400 }
      );
    }

    // Получаем участника команды
    const member = await getTeamMemberByUsername(username);

    if (!member) {
      return NextResponse.json(
        {
          success: false,
          error: 'Неверный username или пароль',
        },
        { status: 401 }
      );
    }

    // Проверяем пароль
    const isPasswordValid = await bcrypt.compare(password, member.passwordHash);

    if (!isPasswordValid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Неверный username или пароль',
        },
        { status: 401 }
      );
    }

    // Если это первый вход и указан новый пароль, обновляем пароль
    if (member.firstLogin && newPassword) {
      if (newPassword.length < 6) {
        return NextResponse.json(
          {
            success: false,
            error: 'Новый пароль должен содержать минимум 6 символов',
          },
          { status: 400 }
        );
      }

      const newPasswordHash = await bcrypt.hash(newPassword, 10);
      await updateTeamMemberPassword(member.id, member.ownerId, newPasswordHash, true);
    }

    // Создаем сессию для владельца аккаунта (чтобы участник имел доступ к данным владельца)
    // Но сохраняем информацию о том, что это участник команды
    const sessionUser: User = {
      id: member.ownerId, // Используем ID владельца для доступа к данным
      email: member.email,
      name: member.name,
      // Можно добавить специальный флаг, если нужно различать владельца и участника
    };

    const token = await createSession(sessionUser);
    await setSessionCookie(token);

    return NextResponse.json({
      success: true,
      message: member.firstLogin && !newPassword 
        ? 'Требуется смена пароля при первом входе' 
        : 'Вход выполнен успешно',
      requiresPasswordChange: member.firstLogin && !newPassword,
      user: {
        id: member.ownerId,
        email: member.email,
        name: member.name,
        isTeamMember: true,
      },
    });
  } catch (error: any) {
    console.error('Ошибка входа участника команды:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Ошибка входа',
      },
      { status: 500 }
    );
  }
}
