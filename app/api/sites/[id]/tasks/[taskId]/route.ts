import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/middleware-auth';
import { SiteTask } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function updateTask(taskId: number, updates: Partial<SiteTask>): Promise<SiteTask> {
  const useSupabase = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && 
    (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY));
  const usePostgres = !useSupabase && !!(process.env.POSTGRES_URL || process.env.DATABASE_URL);

  const updateFields: string[] = [];
  const updateValues: any[] = [];
  let paramIndex = 1;

  if (updates.title !== undefined) {
    updateFields.push(`title = $${paramIndex++}`);
    updateValues.push(updates.title);
  }
  if (updates.description !== undefined) {
    updateFields.push(`description = $${paramIndex++}`);
    updateValues.push(updates.description);
  }
  if (updates.status !== undefined) {
    updateFields.push(`status = $${paramIndex++}`);
    updateValues.push(updates.status);
  }
  if (updates.deadline !== undefined) {
    updateFields.push(`deadline = $${paramIndex++}`);
    updateValues.push(updates.deadline);
  }

  if (updateFields.length === 0) {
    throw new Error('Нет полей для обновления');
  }

  updateFields.push(`updated_at = $${paramIndex++}`);
  updateValues.push(new Date().toISOString());
  updateValues.push(taskId);

  if (useSupabase) {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const updateObj: any = { updated_at: new Date().toISOString() };
    if (updates.title !== undefined) updateObj.title = updates.title;
    if (updates.description !== undefined) updateObj.description = updates.description;
    if (updates.status !== undefined) updateObj.status = updates.status;
    if (updates.deadline !== undefined) updateObj.deadline = updates.deadline;
    
    const { data, error } = await supabase
      .from('site_tasks')
      .update(updateObj)
      .eq('id', taskId)
      .select()
      .single();
    if (error) throw error;
    return {
      id: data.id,
      siteId: data.site_id,
      title: data.title,
      description: data.description,
      status: data.status,
      deadline: data.deadline,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  } else if (usePostgres) {
    const { Pool } = await import('pg');
    const pool = new Pool({
      connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
    });
    const query = `UPDATE site_tasks SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await pool.query(query, updateValues);
    await pool.end();
    if (result.rows.length === 0) {
      throw new Error('Задача не найдена');
    }
    const data = result.rows[0];
    return {
      id: data.id,
      siteId: data.site_id,
      title: data.title,
      description: data.description,
      status: data.status,
      deadline: data.deadline,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  } else {
    // SQLite
    const Database = require('better-sqlite3');
    const { join } = require('path');
    const dbPath = join(process.cwd(), 'data', 'affiliate.db');
    const db = new Database(dbPath);
    
    const sqliteFields: string[] = [];
    const sqliteValues: any[] = [];
    if (updates.title !== undefined) {
      sqliteFields.push('title = ?');
      sqliteValues.push(updates.title);
    }
    if (updates.description !== undefined) {
      sqliteFields.push('description = ?');
      sqliteValues.push(updates.description);
    }
    if (updates.status !== undefined) {
      sqliteFields.push('status = ?');
      sqliteValues.push(updates.status);
    }
    if (updates.deadline !== undefined) {
      sqliteFields.push('deadline = ?');
      sqliteValues.push(updates.deadline);
    }
    sqliteFields.push("updated_at = datetime('now')");
    sqliteValues.push(taskId);
    
    db.prepare(`UPDATE site_tasks SET ${sqliteFields.join(', ')} WHERE id = ?`).run(...sqliteValues);
    const taskData = db.prepare('SELECT * FROM site_tasks WHERE id = ?').get(taskId);
    db.close();
    if (!taskData) {
      throw new Error('Задача не найдена');
    }
    return {
      id: taskData.id,
      siteId: taskData.site_id,
      title: taskData.title,
      description: taskData.description,
      status: taskData.status,
      deadline: taskData.deadline,
      createdAt: taskData.created_at,
      updatedAt: taskData.updated_at,
    };
  }
}

async function deleteTask(taskId: number): Promise<void> {
  const useSupabase = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && 
    (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY));
  const usePostgres = !useSupabase && !!(process.env.POSTGRES_URL || process.env.DATABASE_URL);

  if (useSupabase) {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { error } = await supabase
      .from('site_tasks')
      .delete()
      .eq('id', taskId);
    if (error) throw error;
  } else if (usePostgres) {
    const { Pool } = await import('pg');
    const pool = new Pool({
      connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
    });
    await pool.query('DELETE FROM site_tasks WHERE id = $1', [taskId]);
    await pool.end();
  } else {
    // SQLite
    const Database = require('better-sqlite3');
    const { join } = require('path');
    const dbPath = join(process.cwd(), 'data', 'affiliate.db');
    const db = new Database(dbPath);
    db.prepare('DELETE FROM site_tasks WHERE id = ?').run(taskId);
    db.close();
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; taskId: string } }
) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const taskId = parseInt(params.taskId);
    if (isNaN(taskId)) {
      return NextResponse.json(
        { success: false, error: 'Неверный ID задачи' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { title, description, status, deadline } = body;

    const task = await updateTask(taskId, {
      title,
      description,
      status,
      deadline,
    });

    return NextResponse.json({
      success: true,
      task,
    });
  } catch (error: any) {
    console.error('Error updating task:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Ошибка обновления задачи' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; taskId: string } }
) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const taskId = parseInt(params.taskId);
    if (isNaN(taskId)) {
      return NextResponse.json(
        { success: false, error: 'Неверный ID задачи' },
        { status: 400 }
      );
    }

    await deleteTask(taskId);

    return NextResponse.json({
      success: true,
    });
  } catch (error: any) {
    console.error('Error deleting task:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Ошибка удаления задачи' },
      { status: 500 }
    );
  }
}
