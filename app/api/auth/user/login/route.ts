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
            error: 'Для этого аккаунта не установлен пароль. Запросите сброс пароля.',
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

      // Используем собственный userId участника для изоляции данных
      // Если userId отсутствует, создаем пользователя (для обратной совместимости)
      let userId = teamMember.userId;
      
      if (!userId) {
        // Создаем запись пользователя для участника команды
        const { createOrUpdateUser } = await import('@/lib/db-users');
        const dbUser = await createOrUpdateUser({
          email: teamMember.email,
          name: teamMember.name || undefined,
          ownerId: teamMember.ownerId,
        });
        userId = dbUser.id;
        
        // Обновляем team_member с user_id
        // Это делается через прямой SQL запрос, так как нет функции для обновления user_id
        const useSupabase = !!(process.env.NEXT_PUBLIC_SUPABASE_URL);
        if (useSupabase) {
          const { supabase } = await import('@/lib/supabase');
          if (supabase) {
            await supabase
              .from('team_members')
              .update({ user_id: userId })
              .eq('id', teamMember.id);
          }
        } else if (process.env.POSTGRES_URL || process.env.DATABASE_URL) {
          const { Pool } = require('pg');
          const pool = new Pool({
            connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
          });
          try {
            await pool.query(
              'UPDATE team_members SET user_id = $1 WHERE id = $2',
              [userId, teamMember.id]
            );
          } finally {
            await pool.end();
          }
        }
      }

      // Создаем сессию с собственным userId участника для изоляции данных
      const sessionUser = {
        id: userId, // Используем собственный ID участника для изоляции данных
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
          id: userId,
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
