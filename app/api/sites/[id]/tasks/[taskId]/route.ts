import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/middleware-auth';
import { SiteTask } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function getTaskById(taskId: number): Promise<SiteTask | null> {
  const useSupabase = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && 
    (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY));
  const usePostgres = !useSupabase && !!(process.env.POSTGRES_URL || process.env.DATABASE_URL);

  if (useSupabase) {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data: taskData, error } = await supabase
      .from('site_tasks')
      .select(`
        *,
        assignee:users!site_tasks_assignee_id_fkey(id, email, name)
      `)
      .eq('id', taskId)
      .single();
    if (error) throw error;
    if (!taskData) return null;

    // Получаем подзадачи
    const { data: subtasksData } = await supabase
      .from('site_tasks')
      .select('*')
      .eq('parent_task_id', taskId)
      .order('created_at', { ascending: true });

    const task: SiteTask = {
      id: taskData.id,
      siteId: taskData.site_id,
      title: taskData.title,
      description: taskData.description,
      status: taskData.status,
      deadline: taskData.deadline,
      comments: taskData.comments,
      priority: taskData.priority,
      assigneeId: taskData.assignee_id,
      assignee: taskData.assignee ? {
        id: taskData.assignee.id,
        email: taskData.assignee.email,
        name: taskData.assignee.name,
      } : undefined,
      tags: Array.isArray(taskData.tags) ? taskData.tags : (taskData.tags ? JSON.parse(taskData.tags) : []),
      estimatedTime: taskData.estimated_time,
      actualTime: taskData.actual_time,
      parentTaskId: taskData.parent_task_id,
      subtasks: subtasksData?.map((st: any) => ({
        id: st.id,
        siteId: st.site_id,
        title: st.title,
        description: st.description,
        status: st.status,
        deadline: st.deadline,
        comments: st.comments,
        priority: st.priority,
        assigneeId: st.assignee_id,
        tags: Array.isArray(st.tags) ? st.tags : (st.tags ? JSON.parse(st.tags) : []),
        estimatedTime: st.estimated_time,
        actualTime: st.actual_time,
        parentTaskId: st.parent_task_id,
        createdAt: st.created_at,
        updatedAt: st.updated_at,
      })) || [],
      createdAt: taskData.created_at,
      updatedAt: taskData.updated_at,
    };
    return task;
  } else if (usePostgres) {
    const { Pool } = await import('pg');
    const pool = new Pool({
      connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
    });
    const result = await pool.query(
      `SELECT t.*, u.id as assignee_user_id, u.email as assignee_email, u.name as assignee_name
       FROM site_tasks t
       LEFT JOIN users u ON t.assignee_id = u.id
       WHERE t.id = $1`,
      [taskId]
    );
    if (result.rows.length === 0) {
      await pool.end();
      return null;
    }
    const taskData = result.rows[0];

    // Получаем подзадачи
    const subtasksResult = await pool.query(
      'SELECT * FROM site_tasks WHERE parent_task_id = $1 ORDER BY created_at ASC',
      [taskId]
    );

    await pool.end();
    const task: SiteTask = {
      id: taskData.id,
      siteId: taskData.site_id,
      title: taskData.title,
      description: taskData.description,
      status: taskData.status,
      deadline: taskData.deadline,
      comments: taskData.comments,
      priority: taskData.priority,
      assigneeId: taskData.assignee_id,
      assignee: taskData.assignee_user_id ? {
        id: taskData.assignee_user_id,
        email: taskData.assignee_email,
        name: taskData.assignee_name,
      } : undefined,
      tags: taskData.tags || [],
      estimatedTime: taskData.estimated_time,
      actualTime: taskData.actual_time,
      parentTaskId: taskData.parent_task_id,
      subtasks: subtasksResult.rows.map((st: any) => ({
        id: st.id,
        siteId: st.site_id,
        title: st.title,
        description: st.description,
        status: st.status,
        deadline: st.deadline,
        comments: st.comments,
        priority: st.priority,
        assigneeId: st.assignee_id,
        tags: st.tags || [],
        estimatedTime: st.estimated_time,
        actualTime: st.actual_time,
        parentTaskId: st.parent_task_id,
        createdAt: st.created_at,
        updatedAt: st.updated_at,
      })),
      createdAt: taskData.created_at,
      updatedAt: taskData.updated_at,
    };
    return task;
  } else {
    // SQLite
    const Database = require('better-sqlite3');
    const { join } = require('path');
    const dbPath = join(process.cwd(), 'data', 'affiliate.db');
    const db = new Database(dbPath);
    const taskData: any = db.prepare('SELECT * FROM site_tasks WHERE id = ?').get(taskId);
    if (!taskData) {
      db.close();
      return null;
    }

    // Получаем assignee
    let assignee = null;
    if (taskData.assignee_id) {
      assignee = db.prepare('SELECT id, email, name FROM users WHERE id = ?').get(taskData.assignee_id);
    }

    // Получаем подзадачи
    const subtasksData = db.prepare('SELECT * FROM site_tasks WHERE parent_task_id = ? ORDER BY created_at ASC').all(taskId);

    db.close();
    const task: SiteTask = {
      id: taskData.id,
      siteId: taskData.site_id,
      title: taskData.title,
      description: taskData.description,
      status: taskData.status,
      deadline: taskData.deadline,
      comments: taskData.comments,
      priority: taskData.priority,
      assigneeId: taskData.assignee_id,
      assignee: assignee ? {
        id: assignee.id,
        email: assignee.email,
        name: assignee.name,
      } : undefined,
      tags: taskData.tags ? (typeof taskData.tags === 'string' ? JSON.parse(taskData.tags) : taskData.tags) : [],
      estimatedTime: taskData.estimated_time,
      actualTime: taskData.actual_time,
      parentTaskId: taskData.parent_task_id,
      subtasks: subtasksData.map((st: any) => ({
        id: st.id,
        siteId: st.site_id,
        title: st.title,
        description: st.description,
        status: st.status,
        deadline: st.deadline,
        comments: st.comments,
        priority: st.priority,
        assigneeId: st.assignee_id,
        tags: st.tags ? (typeof st.tags === 'string' ? JSON.parse(st.tags) : st.tags) : [],
        estimatedTime: st.estimated_time,
        actualTime: st.actual_time,
        parentTaskId: st.parent_task_id,
        createdAt: st.created_at,
        updatedAt: st.updated_at,
      })),
      createdAt: taskData.created_at,
      updatedAt: taskData.updated_at,
    };
    return task;
  }
}

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
  if (updates.comments !== undefined) {
    updateFields.push(`comments = $${paramIndex++}`);
    updateValues.push(updates.comments);
  }
  if (updates.priority !== undefined) {
    updateFields.push(`priority = $${paramIndex++}`);
    updateValues.push(updates.priority);
  }
  if (updates.assigneeId !== undefined) {
    updateFields.push(`assignee_id = $${paramIndex++}`);
    updateValues.push(updates.assigneeId || null);
  }
  if (updates.tags !== undefined) {
    updateFields.push(`tags = $${paramIndex++}`);
    updateValues.push(Array.isArray(updates.tags) ? updates.tags : []);
  }
  if (updates.estimatedTime !== undefined) {
    updateFields.push(`estimated_time = $${paramIndex++}`);
    updateValues.push(updates.estimatedTime || null);
  }
  if (updates.actualTime !== undefined) {
    updateFields.push(`actual_time = $${paramIndex++}`);
    updateValues.push(updates.actualTime || null);
  }
  if (updates.parentTaskId !== undefined) {
    updateFields.push(`parent_task_id = $${paramIndex++}`);
    updateValues.push(updates.parentTaskId || null);
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
    if (updates.comments !== undefined) updateObj.comments = updates.comments;
    if (updates.priority !== undefined) updateObj.priority = updates.priority;
    if (updates.assigneeId !== undefined) updateObj.assignee_id = updates.assigneeId || null;
    if (updates.tags !== undefined) updateObj.tags = Array.isArray(updates.tags) ? updates.tags : [];
    if (updates.estimatedTime !== undefined) updateObj.estimated_time = updates.estimatedTime || null;
    if (updates.actualTime !== undefined) updateObj.actual_time = updates.actualTime || null;
    if (updates.parentTaskId !== undefined) updateObj.parent_task_id = updates.parentTaskId || null;
    
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
      comments: data.comments,
      priority: data.priority,
      assigneeId: data.assignee_id,
      tags: Array.isArray(data.tags) ? data.tags : [],
      estimatedTime: data.estimated_time,
      actualTime: data.actual_time,
      parentTaskId: data.parent_task_id,
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
      comments: data.comments,
      priority: data.priority,
      assigneeId: data.assignee_id,
      tags: data.tags || [],
      estimatedTime: data.estimated_time,
      actualTime: data.actual_time,
      parentTaskId: data.parent_task_id,
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
    if (updates.comments !== undefined) {
      sqliteFields.push('comments = ?');
      sqliteValues.push(updates.comments);
    }
    if (updates.priority !== undefined) {
      sqliteFields.push('priority = ?');
      sqliteValues.push(updates.priority);
    }
    if (updates.assigneeId !== undefined) {
      sqliteFields.push('assignee_id = ?');
      sqliteValues.push(updates.assigneeId || null);
    }
    if (updates.tags !== undefined) {
      sqliteFields.push('tags = ?');
      sqliteValues.push(JSON.stringify(Array.isArray(updates.tags) ? updates.tags : []));
    }
    if (updates.estimatedTime !== undefined) {
      sqliteFields.push('estimated_time = ?');
      sqliteValues.push(updates.estimatedTime || null);
    }
    if (updates.actualTime !== undefined) {
      sqliteFields.push('actual_time = ?');
      sqliteValues.push(updates.actualTime || null);
    }
    if (updates.parentTaskId !== undefined) {
      sqliteFields.push('parent_task_id = ?');
      sqliteValues.push(updates.parentTaskId || null);
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
      comments: taskData.comments,
      priority: taskData.priority,
      assigneeId: taskData.assignee_id,
      tags: taskData.tags ? (typeof taskData.tags === 'string' ? JSON.parse(taskData.tags) : taskData.tags) : [],
      estimatedTime: taskData.estimated_time,
      actualTime: taskData.actual_time,
      parentTaskId: taskData.parent_task_id,
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

export async function GET(
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

    const task = await getTaskById(taskId);
    if (!task) {
      return NextResponse.json(
        { success: false, error: 'Задача не найдена' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      task,
    });
  } catch (error: any) {
    console.error('Error fetching task:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Ошибка получения задачи' },
      { status: 500 }
    );
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
    const { title, description, status, deadline, comments, priority, assigneeId, tags, estimatedTime, actualTime, parentTaskId } = body;

    const task = await updateTask(taskId, {
      title,
      description,
      status,
      deadline,
      comments,
      priority: priority ? Math.max(1, Math.min(10, parseInt(priority))) : undefined,
      assigneeId: assigneeId ? parseInt(assigneeId) : undefined,
      tags: Array.isArray(tags) ? tags : (tags ? tags.split(',').map((t: string) => t.trim()).filter((t: string) => t) : undefined),
      estimatedTime: estimatedTime ? parseInt(estimatedTime) : undefined,
      actualTime: actualTime ? parseInt(actualTime) : undefined,
      parentTaskId: parentTaskId ? parseInt(parentTaskId) : undefined,
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
