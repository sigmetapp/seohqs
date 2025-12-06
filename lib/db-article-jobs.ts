// Функции для работы с задачами генерации статей (article_jobs)

import { supabase } from './supabase';

export interface ArticleJob {
  id: number;
  job_id: string;
  user_id: number;
  thread_id: string | null;
  research_run_id: string | null;
  status: 'researching' | 'research_completed' | 'writing_sections' | 'finalizing' | 'completed' | 'failed';
  topic: string;
  language: string;
  audience: string | null;
  author_persona: string | null;
  angle: string | null;
  content_goal: string | null;
  desired_length: number | null;
  complexity: string | null;
  constraints: string | null;
  outline: any | null;
  section_notes: any | null;
  sources: any | null;
  sections: any | null;
  final_html: string | null;
  meta_title: string | null;
  meta_description: string | null;
  created_at: string;
  updated_at: string;
}

function useSupabase(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && 
           (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY));
}

function usePostgres(): boolean {
  if (useSupabase()) return false;
  return !!(process.env.POSTGRES_URL || process.env.DATABASE_URL);
}

// Supabase версия
export async function createArticleJob(data: {
  jobId: string;
  userId: number;
  topic: string;
  language?: string;
  audience?: string;
  authorPersona?: string;
  angle?: string;
  contentGoal?: string;
  desiredLength?: number;
  complexity?: string;
  constraints?: string;
}): Promise<ArticleJob> {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  const { data: job, error } = await supabase
    .from('article_jobs')
    .insert({
      job_id: data.jobId,
      user_id: data.userId,
      topic: data.topic,
      language: data.language || 'RU',
      audience: data.audience || null,
      author_persona: data.authorPersona || null,
      angle: data.angle || null,
      content_goal: data.contentGoal || null,
      desired_length: data.desiredLength || null,
      complexity: data.complexity || null,
      constraints: data.constraints || null,
      status: 'researching',
    })
    .select()
    .single();

  if (error) throw error;
  return job as ArticleJob;
}

export async function getArticleJob(jobId: string): Promise<ArticleJob | null> {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  const { data, error } = await supabase
    .from('article_jobs')
    .select('*')
    .eq('job_id', jobId)
    .maybeSingle();

  if (error) throw error;
  return data as ArticleJob | null;
}

export async function updateArticleJob(jobId: string, updates: Partial<ArticleJob>): Promise<ArticleJob> {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  const { data, error } = await supabase
    .from('article_jobs')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('job_id', jobId)
    .select()
    .single();

  if (error) throw error;
  return data as ArticleJob;
}

// PostgreSQL версия (если не Supabase)
async function createArticleJobPostgres(data: {
  jobId: string;
  userId: number;
  topic: string;
  language?: string;
  audience?: string;
  authorPersona?: string;
  angle?: string;
  contentGoal?: string;
  desiredLength?: number;
  complexity?: string;
  constraints?: string;
}): Promise<ArticleJob> {
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
  });

  try {
    const result = await pool.query(
      `INSERT INTO article_jobs (
        job_id, user_id, topic, language, audience, author_persona, angle,
        content_goal, desired_length, complexity, constraints, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        data.jobId,
        data.userId,
        data.topic,
        data.language || 'RU',
        data.audience || null,
        data.authorPersona || null,
        data.angle || null,
        data.contentGoal || null,
        data.desiredLength || null,
        data.complexity || null,
        data.constraints || null,
        'researching',
      ]
    );

    return result.rows[0] as ArticleJob;
  } finally {
    await pool.end();
  }
}

async function getArticleJobPostgres(jobId: string): Promise<ArticleJob | null> {
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
  });

  try {
    const result = await pool.query('SELECT * FROM article_jobs WHERE job_id = $1', [jobId]);
    return result.rows[0] as ArticleJob | null;
  } finally {
    await pool.end();
  }
}

async function updateArticleJobPostgres(jobId: string, updates: Partial<ArticleJob>): Promise<ArticleJob> {
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
  });

  try {
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'job_id' && key !== 'created_at') {
        updateFields.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    });

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(jobId);

    const query = `UPDATE article_jobs SET ${updateFields.join(', ')} WHERE job_id = $${paramIndex} RETURNING *`;
    const result = await pool.query(query, values);

    return result.rows[0] as ArticleJob;
  } finally {
    await pool.end();
  }
}

// SQLite версия
function createArticleJobSQLite(data: {
  jobId: string;
  userId: number;
  topic: string;
  language?: string;
  audience?: string;
  authorPersona?: string;
  angle?: string;
  contentGoal?: string;
  desiredLength?: number;
  complexity?: string;
  constraints?: string;
}): ArticleJob {
  const Database = require('better-sqlite3');
  const { join } = require('path');
  const { existsSync, mkdirSync } = require('fs');

  const dbDir = join(process.cwd(), 'data');
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
  }

  const dbPath = join(dbDir, 'affiliate.db');
  const db = new Database(dbPath);

  try {
    const result = db.prepare(`
      INSERT INTO article_jobs (
        job_id, user_id, topic, language, audience, author_persona, angle,
        content_goal, desired_length, complexity, constraints, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.jobId,
      data.userId,
      data.topic,
      data.language || 'RU',
      data.audience || null,
      data.authorPersona || null,
      data.angle || null,
      data.contentGoal || null,
      data.desiredLength || null,
      data.complexity || null,
      data.constraints || null,
      'researching'
    );

    const job = db.prepare('SELECT * FROM article_jobs WHERE id = ?').get(Number(result.lastInsertRowid)) as any;
    return {
      id: job.id,
      job_id: job.job_id,
      user_id: job.user_id,
      thread_id: job.thread_id,
      research_run_id: job.research_run_id,
      status: job.status,
      topic: job.topic,
      language: job.language,
      audience: job.audience,
      author_persona: job.author_persona,
      angle: job.angle,
      content_goal: job.content_goal,
      desired_length: job.desired_length,
      complexity: job.complexity,
      constraints: job.constraints,
      outline: job.outline ? JSON.parse(job.outline) : null,
      section_notes: job.section_notes ? JSON.parse(job.section_notes) : null,
      sources: job.sources ? JSON.parse(job.sources) : null,
      sections: job.sections ? JSON.parse(job.sections) : null,
      final_html: job.final_html,
      meta_title: job.meta_title,
      meta_description: job.meta_description,
      created_at: job.created_at,
      updated_at: job.updated_at,
    };
  } finally {
    db.close();
  }
}

function getArticleJobSQLite(jobId: string): ArticleJob | null {
  const Database = require('better-sqlite3');
  const { join } = require('path');
  const { existsSync, mkdirSync } = require('fs');

  const dbDir = join(process.cwd(), 'data');
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
  }

  const dbPath = join(dbDir, 'affiliate.db');
  const db = new Database(dbPath);

  try {
    const job = db.prepare('SELECT * FROM article_jobs WHERE job_id = ?').get(jobId) as any;
    if (!job) return null;

    return {
      id: job.id,
      job_id: job.job_id,
      user_id: job.user_id,
      thread_id: job.thread_id,
      research_run_id: job.research_run_id,
      status: job.status,
      topic: job.topic,
      language: job.language,
      audience: job.audience,
      author_persona: job.author_persona,
      angle: job.angle,
      content_goal: job.content_goal,
      desired_length: job.desired_length,
      complexity: job.complexity,
      constraints: job.constraints,
      outline: job.outline ? JSON.parse(job.outline) : null,
      section_notes: job.section_notes ? JSON.parse(job.section_notes) : null,
      sources: job.sources ? JSON.parse(job.sources) : null,
      sections: job.sections ? JSON.parse(job.sections) : null,
      final_html: job.final_html,
      meta_title: job.meta_title,
      meta_description: job.meta_description,
      created_at: job.created_at,
      updated_at: job.updated_at,
    };
  } finally {
    db.close();
  }
}

function updateArticleJobSQLite(jobId: string, updates: Partial<ArticleJob>): ArticleJob {
  const Database = require('better-sqlite3');
  const { join } = require('path');
  const { existsSync, mkdirSync } = require('fs');

  const dbDir = join(process.cwd(), 'data');
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
  }

  const dbPath = join(dbDir, 'affiliate.db');
  const db = new Database(dbPath);

  try {
    const updateFields: string[] = [];
    const values: any[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'job_id' && key !== 'created_at') {
        if (key === 'outline' || key === 'section_notes' || key === 'sources' || key === 'sections') {
          updateFields.push(`${key} = ?`);
          values.push(JSON.stringify(value));
        } else {
          updateFields.push(`${key} = ?`);
          values.push(value);
        }
      }
    });

    updateFields.push(`updated_at = datetime('now')`);
    values.push(jobId);

    db.prepare(`UPDATE article_jobs SET ${updateFields.join(', ')} WHERE job_id = ?`).run(...values);

    const job = db.prepare('SELECT * FROM article_jobs WHERE job_id = ?').get(jobId) as any;
    return {
      id: job.id,
      job_id: job.job_id,
      user_id: job.user_id,
      thread_id: job.thread_id,
      research_run_id: job.research_run_id,
      status: job.status,
      topic: job.topic,
      language: job.language,
      audience: job.audience,
      author_persona: job.author_persona,
      angle: job.angle,
      content_goal: job.content_goal,
      desired_length: job.desired_length,
      complexity: job.complexity,
      constraints: job.constraints,
      outline: job.outline ? JSON.parse(job.outline) : null,
      section_notes: job.section_notes ? JSON.parse(job.section_notes) : null,
      sources: job.sources ? JSON.parse(job.sources) : null,
      sections: job.sections ? JSON.parse(job.sections) : null,
      final_html: job.final_html,
      meta_title: job.meta_title,
      meta_description: job.meta_description,
      created_at: job.created_at,
      updated_at: job.updated_at,
    };
  } finally {
    db.close();
  }
}

// Экспортируемые функции с автоматическим выбором БД
export async function createJob(data: {
  jobId: string;
  userId: number;
  topic: string;
  language?: string;
  audience?: string;
  authorPersona?: string;
  angle?: string;
  contentGoal?: string;
  desiredLength?: number;
  complexity?: string;
  constraints?: string;
}): Promise<ArticleJob> {
  if (useSupabase()) {
    return createArticleJob(data);
  } else if (usePostgres()) {
    return createArticleJobPostgres(data);
  } else {
    if (process.env.VERCEL) {
      throw new Error('No database configured on Vercel. Please set up Supabase or PostgreSQL.');
    }
    return createArticleJobSQLite(data);
  }
}

export async function getJob(jobId: string): Promise<ArticleJob | null> {
  if (useSupabase()) {
    return getArticleJob(jobId);
  } else if (usePostgres()) {
    return getArticleJobPostgres(jobId);
  } else {
    if (process.env.VERCEL) {
      throw new Error('No database configured on Vercel. Please set up Supabase or PostgreSQL.');
    }
    return getArticleJobSQLite(jobId);
  }
}

export async function updateJob(jobId: string, updates: Partial<ArticleJob>): Promise<ArticleJob> {
  if (useSupabase()) {
    return updateArticleJob(jobId, updates);
  } else if (usePostgres()) {
    return updateArticleJobPostgres(jobId, updates);
  } else {
    if (process.env.VERCEL) {
      throw new Error('No database configured on Vercel. Please set up Supabase or PostgreSQL.');
    }
    return updateArticleJobSQLite(jobId, updates);
  }
}
