import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/middleware-auth';
import { TaskMessage } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function getTaskMessages(taskId: number): Promise<TaskMessage[]> {
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
      .from('task_messages')
      .select(`
        *,
        user:users!task_messages_user_id_fkey(id, email, name)
      `)
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data || []).map((msg: any) => ({
      id: msg.id,
      taskId: msg.task_id,
      userId: msg.user_id,
      user: msg.user ? {
        id: msg.user.id,
        email: msg.user.email,
        name: msg.user.name,
      } : undefined,
      message: msg.message,
      createdAt: msg.created_at,
      updatedAt: msg.updated_at,
    }));
  } else if (usePostgres) {
    const { Pool } = await import('pg');
    const pool = new Pool({
      connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
    });
    const result = await pool.query(
      `SELECT m.*, u.id as user_user_id, u.email as user_email, u.name as user_name
       FROM task_messages m
       LEFT JOIN users u ON m.user_id = u.id
       WHERE m.task_id = $1
       ORDER BY m.created_at ASC`,
      [taskId]
    );
    await pool.end();
    return result.rows.map((msg: any) => ({
      id: msg.id,
      taskId: msg.task_id,
      userId: msg.user_id,
      user: msg.user_user_id ? {
        id: msg.user_user_id,
        email: msg.user_email,
        name: msg.user_name,
      } : undefined,
      message: msg.message,
      createdAt: msg.created_at,
      updatedAt: msg.updated_at,
    }));
  } else {
    // SQLite
    const Database = require('better-sqlite3');
    const { join } = require('path');
    const dbPath = join(process.cwd(), 'data', 'affiliate.db');
    const db = new Database(dbPath);
    const messages = db.prepare('SELECT * FROM task_messages WHERE task_id = ? ORDER BY created_at ASC').all(taskId);
    const messagesWithUsers = messages.map((msg: any) => {
      let user = null;
      if (msg.user_id) {
        user = db.prepare('SELECT id, email, name FROM users WHERE id = ?').get(msg.user_id);
      }
      return {
        id: msg.id,
        taskId: msg.task_id,
        userId: msg.user_id,
        user: user ? {
          id: user.id,
          email: user.email,
          name: user.name,
        } : undefined,
        message: msg.message,
        createdAt: msg.created_at,
        updatedAt: msg.updated_at,
      };
    });
    db.close();
    return messagesWithUsers;
  }
}

async function createTaskMessage(taskId: number, userId: number | null, message: string): Promise<TaskMessage> {
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
      .from('task_messages')
      .insert({
        task_id: taskId,
        user_id: userId || null,
        message,
      })
      .select(`
        *,
        user:users!task_messages_user_id_fkey(id, email, name)
      `)
      .single();
    if (error) throw error;
    return {
      id: data.id,
      taskId: data.task_id,
      userId: data.user_id,
      user: data.user ? {
        id: data.user.id,
        email: data.user.email,
        name: data.user.name,
      } : undefined,
      message: data.message,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  } else if (usePostgres) {
    const { Pool } = await import('pg');
    const pool = new Pool({
      connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
    });
    const result = await pool.query(
      `INSERT INTO task_messages (task_id, user_id, message)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [taskId, userId || null, message]
    );
    const msgData = result.rows[0];
    
    // Получаем информацию о пользователе
    let user = null;
    if (msgData.user_id) {
      const userResult = await pool.query('SELECT id, email, name FROM users WHERE id = $1', [msgData.user_id]);
      if (userResult.rows.length > 0) {
        user = userResult.rows[0];
      }
    }
    
    await pool.end();
    return {
      id: msgData.id,
      taskId: msgData.task_id,
      userId: msgData.user_id,
      user: user ? {
        id: user.id,
        email: user.email,
        name: user.name,
      } : undefined,
      message: msgData.message,
      createdAt: msgData.created_at,
      updatedAt: msgData.updated_at,
    };
  } else {
    // SQLite
    const Database = require('better-sqlite3');
    const { join } = require('path');
    const dbPath = join(process.cwd(), 'data', 'affiliate.db');
    const db = new Database(dbPath);
    const result = db.prepare(
      `INSERT INTO task_messages (task_id, user_id, message, created_at, updated_at)
       VALUES (?, ?, ?, datetime('now'), datetime('now'))`
    ).run(taskId, userId || null, message);
    const msgData: any = db.prepare('SELECT * FROM task_messages WHERE id = ?').get(result.lastInsertRowid);
    
    let user = null;
    if (msgData.user_id) {
      user = db.prepare('SELECT id, email, name FROM users WHERE id = ?').get(msgData.user_id);
    }
    
    db.close();
    return {
      id: msgData.id,
      taskId: msgData.task_id,
      userId: msgData.user_id,
      user: user ? {
        id: user.id,
        email: user.email,
        name: user.name,
      } : undefined,
      message: msgData.message,
      createdAt: msgData.created_at,
      updatedAt: msgData.updated_at,
    };
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

    const messages = await getTaskMessages(taskId);

    return NextResponse.json({
      success: true,
      messages,
    });
  } catch (error: any) {
    console.error('Error fetching task messages:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Ошибка получения сообщений' },
      { status: 500 }
    );
  }
}

export async function POST(
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
    const { message } = body;

    if (!message || !message.trim()) {
      return NextResponse.json(
        { success: false, error: 'Сообщение не может быть пустым' },
        { status: 400 }
      );
    }

    // Получаем userId из сессии (если есть)
    const userId = (authResult as any).user?.id || null;

    const taskMessage = await createTaskMessage(taskId, userId, message.trim());

    return NextResponse.json({
      success: true,
      message: taskMessage,
    });
  } catch (error: any) {
    console.error('Error creating task message:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Ошибка создания сообщения' },
      { status: 500 }
    );
  }
}
