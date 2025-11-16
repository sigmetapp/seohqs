import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/middleware-auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function getUsers(): Promise<Array<{ id: number; email: string; name?: string }>> {
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
      .select('id, email, name')
      .order('email', { ascending: true });
    if (error) throw error;
    return (data || []).map((user: any) => ({
      id: user.id,
      email: user.email,
      name: user.name,
    }));
  } else if (usePostgres) {
    const { Pool } = await import('pg');
    const pool = new Pool({
      connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
    });
    const result = await pool.query('SELECT id, email, name FROM users ORDER BY email ASC');
    await pool.end();
    return result.rows.map((user: any) => ({
      id: user.id,
      email: user.email,
      name: user.name,
    }));
  } else {
    // SQLite
    const Database = require('better-sqlite3');
    const { join } = require('path');
    const dbPath = join(process.cwd(), 'data', 'affiliate.db');
    const db = new Database(dbPath);
    const users = db.prepare('SELECT id, email, name FROM users ORDER BY email ASC').all();
    db.close();
    return users.map((user: any) => ({
      id: user.id,
      email: user.email,
      name: user.name,
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
