import { NextResponse } from 'next/server';
import { getUserById, updateUserPassword } from '@/lib/db-users';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/auth/user/reset-password
 * Сброс пароля по токену
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, password } = body;

    if (!token || !password) {
      return NextResponse.json(
        {
          success: false,
          error: 'Токен и пароль обязательны',
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

    // Проверяем токен
    const tokenData = await getResetToken(token);
    
    if (!tokenData) {
      return NextResponse.json(
        {
          success: false,
          error: 'Неверный или истекший токен восстановления',
        },
        { status: 400 }
      );
    }

    // Проверяем срок действия токена
    const expiryDate = new Date(tokenData.expires_at);
    if (expiryDate < new Date()) {
      await deleteResetToken(token);
      return NextResponse.json(
        {
          success: false,
          error: 'Токен восстановления истек. Запросите новый.',
        },
        { status: 400 }
      );
    }

    // Получаем пользователя
    const dbUser = await getUserById(tokenData.user_id);
    
    if (!dbUser) {
      return NextResponse.json(
        {
          success: false,
          error: 'Пользователь не найден',
        },
        { status: 404 }
      );
    }

    // Хешируем новый пароль
    const passwordHash = await bcrypt.hash(password, 10);

    // Обновляем пароль
    await updateUserPassword(dbUser.id, passwordHash);

    // Удаляем использованный токен
    await deleteResetToken(token);

    return NextResponse.json({
      success: true,
      message: 'Пароль успешно изменен',
    });
  } catch (error: any) {
    console.error('Ошибка сброса пароля:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Ошибка сброса пароля',
      },
      { status: 500 }
    );
  }
}

// Получение токена восстановления из БД
async function getResetToken(token: string): Promise<{ user_id: number; expires_at: string } | null> {
  const useSupabase = !!(process.env.NEXT_PUBLIC_SUPABASE_URL);
  
  if (useSupabase) {
    const { supabase } = await import('@/lib/supabase');
    if (supabase) {
      const { data, error } = await supabase
        .from('password_reset_tokens')
        .select('user_id, expires_at')
        .eq('token', token)
        .single();
      
      if (error || !data) return null;
      return { user_id: data.user_id, expires_at: data.expires_at };
    }
  } else if (process.env.POSTGRES_URL || process.env.DATABASE_URL) {
    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
    });
    
    try {
      const result = await pool.query(
        'SELECT user_id, expires_at FROM password_reset_tokens WHERE token = $1',
        [token]
      );
      
      if (result.rows.length === 0) return null;
      return {
        user_id: result.rows[0].user_id,
        expires_at: result.rows[0].expires_at,
      };
    } finally {
      await pool.end();
    }
  } else {
    // SQLite
    const Database = require('better-sqlite3');
    const { join } = require('path');
    const { existsSync, mkdirSync } = require('fs');
    
    const dbDir = join(process.cwd(), 'data');
    if (!existsSync(dbDir)) {
      mkdirSync(dbDir, { recursive: true });
    }
    
    const dbPath = join(dbDir, 'affiliate.db');
    const db = new Database(dbPath);
    
    const row = db.prepare('SELECT user_id, expires_at FROM password_reset_tokens WHERE token = ?').get(token) as any;
    if (!row) return null;
    
    return {
      user_id: row.user_id,
      expires_at: row.expires_at,
    };
  }
  
  return null;
}

// Удаление токена восстановления
async function deleteResetToken(token: string): Promise<void> {
  const useSupabase = !!(process.env.NEXT_PUBLIC_SUPABASE_URL);
  
  if (useSupabase) {
    const { supabase } = await import('@/lib/supabase');
    if (supabase) {
      await supabase
        .from('password_reset_tokens')
        .delete()
        .eq('token', token);
    }
  } else if (process.env.POSTGRES_URL || process.env.DATABASE_URL) {
    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
    });
    
    try {
      await pool.query('DELETE FROM password_reset_tokens WHERE token = $1', [token]);
    } finally {
      await pool.end();
    }
  } else {
    // SQLite
    const Database = require('better-sqlite3');
    const { join } = require('path');
    const { existsSync, mkdirSync } = require('fs');
    
    const dbDir = join(process.cwd(), 'data');
    if (!existsSync(dbDir)) {
      mkdirSync(dbDir, { recursive: true });
    }
    
    const dbPath = join(dbDir, 'affiliate.db');
    const db = new Database(dbPath);
    
    db.prepare('DELETE FROM password_reset_tokens WHERE token = ?').run(token);
  }
}
