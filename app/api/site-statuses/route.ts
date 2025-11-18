import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware-auth';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Функция для получения клиента БД
async function getDbClient() {
  const useSupabase = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && 
                         (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY));
  const usePostgres = !useSupabase && !!(process.env.POSTGRES_URL || process.env.DATABASE_URL);
  
  if (useSupabase) {
    const { createClient } = await import('@/lib/supabase');
    return createClient();
  } else if (usePostgres) {
    const { getPostgresClient } = await import('@/lib/postgres-client');
    return getPostgresClient();
  } else {
    throw new Error('No database configured');
  }
}

// GET - получить все статусы
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const db = await getDbClient();
    const useSupabase = !!(process.env.NEXT_PUBLIC_SUPABASE_URL);

    let statuses;
    if (useSupabase) {
      const { data, error } = await db
        .from('site_statuses')
        .select('*')
        .order('sort_order', { ascending: true });
      
      if (error) throw error;
      statuses = data;
    } else {
      const result = await db.query(
        'SELECT * FROM site_statuses ORDER BY sort_order ASC'
      );
      statuses = result.rows;
    }

    return NextResponse.json({
      success: true,
      statuses: statuses.map((s: any) => ({
        id: s.id,
        name: s.name,
        color: s.color,
        sortOrder: s.sort_order,
        createdAt: s.created_at,
        updatedAt: s.updated_at,
      })),
    });
  } catch (error: any) {
    console.error('Error fetching site statuses:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Ошибка получения статусов',
      },
      { status: 500 }
    );
  }
}

// POST - создать новый статус
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const body = await request.json();
    const { name, color, sortOrder } = body;

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          error: 'Название статуса обязательно',
        },
        { status: 400 }
      );
    }

    const db = await getDbClient();
    const useSupabase = !!(process.env.NEXT_PUBLIC_SUPABASE_URL);

    let status;
    if (useSupabase) {
      const { data, error } = await db
        .from('site_statuses')
        .insert({
          name,
          color: color || '#6b7280',
          sort_order: sortOrder || 0,
        })
        .select()
        .single();
      
      if (error) throw error;
      status = data;
    } else {
      const result = await db.query(
        'INSERT INTO site_statuses (name, color, sort_order) VALUES ($1, $2, $3) RETURNING *',
        [name, color || '#6b7280', sortOrder || 0]
      );
      status = result.rows[0];
    }

    return NextResponse.json({
      success: true,
      status: {
        id: status.id,
        name: status.name,
        color: status.color,
        sortOrder: status.sort_order,
        createdAt: status.created_at,
        updatedAt: status.updated_at,
      },
    });
  } catch (error: any) {
    console.error('Error creating site status:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Ошибка создания статуса',
      },
      { status: 500 }
    );
  }
}
