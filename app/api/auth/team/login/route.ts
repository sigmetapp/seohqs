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

    // Используем собственный userId участника для изоляции данных
    // Если userId отсутствует, создаем пользователя (для обратной совместимости)
    let userId = member.userId;
    
    if (!userId) {
      // Создаем запись пользователя для участника команды
      const { createOrUpdateUser } = await import('@/lib/db-users');
      const dbUser = await createOrUpdateUser({
        email: member.email,
        name: member.name || undefined,
        ownerId: member.ownerId,
      });
      userId = dbUser.id;
      
      // Обновляем team_member с user_id
      const useSupabase = !!(process.env.NEXT_PUBLIC_SUPABASE_URL);
      if (useSupabase) {
        const { supabase } = await import('@/lib/supabase');
        if (supabase) {
          await supabase
            .from('team_members')
            .update({ user_id: userId })
            .eq('id', member.id);
        }
      } else if (process.env.POSTGRES_URL || process.env.DATABASE_URL) {
        const { Pool } = require('pg');
        const pool = new Pool({
          connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
        });
        try {
          await pool.query(
            'UPDATE team_members SET user_id = $1 WHERE id = $2',
            [userId, member.id]
          );
        } finally {
          await pool.end();
        }
      }
    }

    // Создаем сессию с собственным userId участника для изоляции данных
    const sessionUser: User = {
      id: userId, // Используем собственный ID участника для изоляции данных
      email: member.email,
      name: member.name,
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
        id: userId,
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
