import { NextResponse } from 'next/server';
import { getUserByEmail, getTeamMemberByEmail, updateTeamMemberPassword } from '@/lib/db-users';
import { createSession, setSessionCookie } from '@/lib/auth-utils';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/auth/user/login
 * Авторизация пользователя по email и паролю
 * Также поддерживает вход участников команды по email
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, newPassword } = body;

    if (!email || !password) {
      return NextResponse.json(
        {
          success: false,
          error: 'Email и пароль обязательны',
        },
        { status: 400 }
      );
    }

    // Сначала проверяем обычного пользователя
    const dbUser = await getUserByEmail(email);
    
    if (dbUser) {
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
    }

    // Если пользователь не найден, проверяем участников команды
    const teamMember = await getTeamMemberByEmail(email);
    
    if (teamMember) {
      // Проверяем пароль участника команды
      const isPasswordValid = await bcrypt.compare(password, teamMember.passwordHash);
      
      if (!isPasswordValid) {
        return NextResponse.json(
          {
            success: false,
            error: 'Неверный email или пароль',
          },
          { status: 401 }
        );
      }

      // Если это первый вход и указан новый пароль, обновляем пароль
      if (teamMember.firstLogin && newPassword) {
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
        await updateTeamMemberPassword(teamMember.id, teamMember.ownerId, newPasswordHash, true);
      }

      // Создаем сессию для владельца аккаунта (чтобы участник имел доступ к данным владельца)
      const sessionUser = {
        id: teamMember.ownerId, // Используем ID владельца для доступа к данным
        email: teamMember.email,
        name: teamMember.name,
      };

      const token = await createSession(sessionUser);
      await setSessionCookie(token);

      return NextResponse.json({
        success: true,
        message: teamMember.firstLogin && !newPassword 
          ? 'Требуется смена пароля при первом входе' 
          : 'Вход выполнен успешно',
        requiresPasswordChange: teamMember.firstLogin && !newPassword,
        user: {
          id: teamMember.ownerId,
          email: teamMember.email,
          name: teamMember.name,
          isTeamMember: true,
        },
      });
    }

    // Если не найден ни пользователь, ни участник команды
    return NextResponse.json(
      {
        success: false,
        error: 'Неверный email или пароль',
      },
      { status: 401 }
    );
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
