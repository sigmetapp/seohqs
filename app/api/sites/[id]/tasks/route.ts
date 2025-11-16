import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/middleware-auth';
import { SiteTask } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Временная реализация через SQL запросы
// Позже можно вынести в db-adapter
async function getTasksBySiteId(siteId: number): Promise<SiteTask[]> {
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
      .from('site_tasks')
      .select('*')
      .eq('site_id', siteId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((task: any) => ({
      id: task.id,
      siteId: task.site_id,
      title: task.title,
      description: task.description,
      status: task.status,
      deadline: task.deadline,
      comments: task.comments,
      priority: task.priority,
      assigneeId: task.assignee_id,
      tags: Array.isArray(task.tags) ? task.tags : [],
      estimatedTime: task.estimated_time,
      actualTime: task.actual_time,
      parentTaskId: task.parent_task_id,
      createdAt: task.created_at,
      updatedAt: task.updated_at,
    }));
  } else if (usePostgres) {
    const { Pool } = await import('pg');
    const pool = new Pool({
      connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
    });
    const result = await pool.query(
      'SELECT * FROM site_tasks WHERE site_id = $1 ORDER BY created_at DESC',
      [siteId]
    );
    await pool.end();
    return result.rows.map((task: any) => ({
      id: task.id,
      siteId: task.site_id,
      title: task.title,
      description: task.description,
      status: task.status,
      deadline: task.deadline,
      comments: task.comments,
      priority: task.priority,
      assigneeId: task.assignee_id,
      tags: task.tags || [],
      estimatedTime: task.estimated_time,
      actualTime: task.actual_time,
      parentTaskId: task.parent_task_id,
      createdAt: task.created_at,
      updatedAt: task.updated_at,
    }));
  } else {
    // SQLite
    const Database = require('better-sqlite3');
    const { join } = require('path');
    const dbPath = join(process.cwd(), 'data', 'affiliate.db');
    const db = new Database(dbPath);
    const tasks = db.prepare('SELECT * FROM site_tasks WHERE site_id = ? ORDER BY created_at DESC').all(siteId);
    db.close();
    return tasks.map((task: any) => ({
      id: task.id,
      siteId: task.site_id,
      title: task.title,
      description: task.description,
      status: task.status,
      deadline: task.deadline,
      comments: task.comments,
      priority: task.priority,
      assigneeId: task.assignee_id,
      tags: task.tags ? (typeof task.tags === 'string' ? JSON.parse(task.tags) : task.tags) : [],
      estimatedTime: task.estimated_time,
      actualTime: task.actual_time,
      parentTaskId: task.parent_task_id,
      createdAt: task.created_at,
      updatedAt: task.updated_at,
    }));
  }
}

async function createTask(siteId: number, task: Omit<SiteTask, 'id' | 'siteId' | 'createdAt' | 'updatedAt'>): Promise<SiteTask> {
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
      .from('site_tasks')
      .insert({
        site_id: siteId,
        title: task.title,
        description: task.description || null,
        status: task.status || 'pending',
        deadline: task.deadline || null,
        comments: task.comments || null,
        priority: task.priority || null,
        assignee_id: task.assigneeId || null,
        tags: Array.isArray(task.tags) ? task.tags : [],
        estimated_time: task.estimatedTime || null,
        actual_time: task.actualTime || null,
        parent_task_id: task.parentTaskId || null,
      })
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
    const result = await pool.query(
      `INSERT INTO site_tasks (site_id, title, description, status, deadline, comments, priority, assignee_id, tags, estimated_time, actual_time, parent_task_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        siteId, 
        task.title, 
        task.description || null, 
        task.status || 'pending', 
        task.deadline || null, 
        task.comments || null, 
        task.priority || null,
        task.assigneeId || null,
        Array.isArray(task.tags) ? task.tags : [],
        task.estimatedTime || null,
        task.actualTime || null,
        task.parentTaskId || null,
      ]
    );
    await pool.end();
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
    const result = db.prepare(
      `INSERT INTO site_tasks (site_id, title, description, status, deadline, comments, priority, assignee_id, tags, estimated_time, actual_time, parent_task_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
    ).run(
      siteId, 
      task.title, 
      task.description || null, 
      task.status || 'pending', 
      task.deadline || null, 
      task.comments || null, 
      task.priority || null,
      task.assigneeId || null,
      JSON.stringify(Array.isArray(task.tags) ? task.tags : []),
      task.estimatedTime || null,
      task.actualTime || null,
      task.parentTaskId || null,
    );
    const taskData: any = db.prepare('SELECT * FROM site_tasks WHERE id = ?').get(result.lastInsertRowid);
    db.close();
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

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const siteId = parseInt(params.id);
    if (isNaN(siteId)) {
      return NextResponse.json(
        { success: false, error: 'Неверный ID сайта' },
        { status: 400 }
      );
    }

    const tasks = await getTasksBySiteId(siteId);

    return NextResponse.json({
      success: true,
      tasks,
    });
  } catch (error: any) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Ошибка получения задач' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const siteId = parseInt(params.id);
    if (isNaN(siteId)) {
      return NextResponse.json(
        { success: false, error: 'Неверный ID сайта' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { title, description, status, deadline, comments, priority, assigneeId, tags, estimatedTime, actualTime, parentTaskId } = body;

    if (!title) {
      return NextResponse.json(
        { success: false, error: 'Название задачи обязательно' },
        { status: 400 }
      );
    }

    const task = await createTask(siteId, {
      title,
      description,
      status: status || 'pending',
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
    console.error('Error creating task:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Ошибка создания задачи' },
      { status: 500 }
    );
  }
}
