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

// PUT - обновить статус
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const statusId = parseInt(params.id);
    if (isNaN(statusId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Неверный ID статуса',
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, color, sortOrder } = body;

    const db = await getDbClient();
    const useSupabase = !!(process.env.NEXT_PUBLIC_SUPABASE_URL);

    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (color !== undefined) updates.color = color;
    if (sortOrder !== undefined) updates.sort_order = sortOrder;
    updates.updated_at = new Date().toISOString();

    let status;
    if (useSupabase) {
      const { data, error } = await db
        .from('site_statuses')
        .update(updates)
        .eq('id', statusId)
        .select()
        .single();
      
      if (error) throw error;
      status = data;
    } else {
      const fields = Object.keys(updates).map((key, i) => {
        const dbKey = key === 'updated_at' ? 'updated_at' : key;
        return `${dbKey} = $${i + 1}`;
      }).join(', ');
      
      const values = Object.values(updates);
      values.push(statusId);
      
      const result = await db.query(
        `UPDATE site_statuses SET ${fields} WHERE id = $${values.length} RETURNING *`,
        values
      );
      status = result.rows[0];
    }

    if (!status) {
      return NextResponse.json(
        {
          success: false,
          error: 'Статус не найден',
        },
        { status: 404 }
      );
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
    console.error('Error updating site status:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Ошибка обновления статуса',
      },
      { status: 500 }
    );
  }
}

// DELETE - удалить статус
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const statusId = parseInt(params.id);
    if (isNaN(statusId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Неверный ID статуса',
        },
        { status: 400 }
      );
    }

    const db = await getDbClient();
    const useSupabase = !!(process.env.NEXT_PUBLIC_SUPABASE_URL);

    if (useSupabase) {
      const { error } = await db
        .from('site_statuses')
        .delete()
        .eq('id', statusId);
      
      if (error) throw error;
    } else {
      await db.query('DELETE FROM site_statuses WHERE id = $1', [statusId]);
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error: any) {
    console.error('Error deleting site status:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Ошибка удаления статуса',
      },
      { status: 500 }
    );
  }
}
