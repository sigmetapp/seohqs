import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/middleware-auth';
import { createUserAdmin, updateUserAdmin, deleteUserAdmin } from '@/lib/db-users';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function getUsers(): Promise<Array<{ id: number; email: string; name?: string; updatedAt?: string; createdAt?: string }>> {
  const useSupabase = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && 
    (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY));
  const usePostgres = !useSupabase && !!(process.env.POSTGRES_URL || process.env.DATABASE_URL);

  if (useSupabase) {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data, error } = await supabase
      .from('users')
      .select('id, email, name, updated_at, created_at')
      .order('email', { ascending: true });
    if (error) throw error;
    return (data || []).map((user: any) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      updatedAt: user.updated_at,
      createdAt: user.created_at,
    }));
  } else if (usePostgres) {
    const { Pool } = await import('pg');
    const pool = new Pool({
      connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
    });
    const result = await pool.query('SELECT id, email, name, updated_at, created_at FROM users ORDER BY email ASC');
    await pool.end();
    return result.rows.map((user: any) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      updatedAt: user.updated_at,
      createdAt: user.created_at,
    }));
  } else {
    // SQLite
    const Database = require('better-sqlite3');
    const { join } = require('path');
    const dbPath = join(process.cwd(), 'data', 'affiliate.db');
    const db = new Database(dbPath);
    const users = db.prepare('SELECT id, email, name, updated_at, created_at FROM users ORDER BY email ASC').all();
    db.close();
    return users.map((user: any) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      updatedAt: user.updated_at,
      createdAt: user.created_at,
    }));
  }
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const users = await getUsers();

    return NextResponse.json({
      success: true,
      users,
    });
  } catch (error: any) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Ошибка получения пользователей' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const body = await request.json();
    const { email, name, password } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email обязателен' },
        { status: 400 }
      );
    }

    let passwordHash: string | undefined;
    if (password) {
      if (password.length < 6) {
        return NextResponse.json(
          { success: false, error: 'Пароль должен содержать минимум 6 символов' },
          { status: 400 }
        );
      }
      passwordHash = await bcrypt.hash(password, 10);
    }

    const user = await createUserAdmin({ email, name, passwordHash });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error: any) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Ошибка создания пользователя' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const body = await request.json();
    const { id, email, name } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID пользователя обязателен' },
        { status: 400 }
      );
    }

    const updates: { email?: string; name?: string } = {};
    if (email !== undefined) updates.email = email;
    if (name !== undefined) updates.name = name;

    const user = await updateUserAdmin(id, updates);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error: any) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Ошибка обновления пользователя' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID пользователя обязателен' },
        { status: 400 }
      );
    }

    await deleteUserAdmin(Number(id));

    return NextResponse.json({
      success: true,
      message: 'Пользователь успешно удален',
    });
  } catch (error: any) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Ошибка удаления пользователя' },
      { status: 500 }
    );
  }
}
