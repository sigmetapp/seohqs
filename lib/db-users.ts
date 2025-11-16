import type { User } from './auth-utils';

// Определяем, какую БД использовать
function useSupabase(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && 
           (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY));
}

function usePostgres(): boolean {
  if (useSupabase()) return false;
  return !!(process.env.POSTGRES_URL || process.env.DATABASE_URL);
}

export interface DbUser {
  id: number;
  email: string;
  name?: string;
  picture?: string;
  googleId?: string;
  passwordHash?: string;
  createdAt: string;
  updatedAt: string;
}

// SQLite версия
function createOrUpdateUserSQLite(user: Omit<DbUser, 'id' | 'createdAt' | 'updatedAt'>): DbUser {
  const Database = require('better-sqlite3');
  const { join } = require('path');
  const { existsSync, mkdirSync } = require('fs');
  
  const dbDir = join(process.cwd(), 'data');
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
  }
  
  const dbPath = join(dbDir, 'affiliate.db');
  const db = new Database(dbPath);
  
  // Проверяем, существует ли пользователь
  let existingUser: any = null;
  if (user.googleId) {
    existingUser = db.prepare('SELECT * FROM users WHERE google_id = ?').get(user.googleId);
  }
  if (!existingUser) {
    existingUser = db.prepare('SELECT * FROM users WHERE email = ?').get(user.email);
  }
  
  if (existingUser) {
    // Обновляем существующего пользователя
    db.prepare(`
      UPDATE users 
      SET email = ?, name = ?, picture = ?, google_id = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(
      user.email,
      user.name || null,
      user.picture || null,
      user.googleId || null,
      existingUser.id
    );
    
    const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(existingUser.id);
    return {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      picture: updated.picture,
      googleId: updated.google_id,
      passwordHash: updated.password_hash,
      createdAt: updated.created_at,
      updatedAt: updated.updated_at,
    };
  } else {
    // Создаем нового пользователя
    const result = db.prepare(`
      INSERT INTO users (email, name, picture, google_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(
      user.email,
      user.name || null,
      user.picture || null,
      user.googleId || null
    );
    
    const newUser = db.prepare('SELECT * FROM users WHERE id = ?').get(Number(result.lastInsertRowid));
    return {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      picture: newUser.picture,
      googleId: newUser.google_id,
      passwordHash: newUser.password_hash,
      createdAt: newUser.created_at,
      updatedAt: newUser.updated_at,
    };
  }
}

function getUserByGoogleIdSQLite(googleId: string): DbUser | null {
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
    const row = db.prepare('SELECT * FROM users WHERE google_id = ?').get(googleId) as any;
    if (!row) return null;
    
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      picture: row.picture,
      googleId: row.google_id,
      passwordHash: row.password_hash,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  } catch (error: any) {
    if (error.message?.includes('no such table')) {
      return null;
    }
    throw error;
  }
}

function getUserByEmailSQLite(email: string): DbUser | null {
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
    const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
    if (!row) return null;
    
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      picture: row.picture,
      googleId: row.google_id,
      passwordHash: row.password_hash,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  } catch (error: any) {
    if (error.message?.includes('no such table')) {
      return null;
    }
    throw error;
  }
}

// PostgreSQL версия
async function createOrUpdateUserPostgres(user: Omit<DbUser, 'id' | 'createdAt' | 'updatedAt'>): Promise<DbUser> {
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
  });
  
  try {
    // Проверяем, существует ли пользователь
    let existingUser: any = null;
    if (user.googleId) {
      const result = await pool.query('SELECT * FROM users WHERE google_id = $1', [user.googleId]);
      if (result.rows.length > 0) {
        existingUser = result.rows[0];
      }
    }
    if (!existingUser) {
      const result = await pool.query('SELECT * FROM users WHERE email = $1', [user.email]);
      if (result.rows.length > 0) {
        existingUser = result.rows[0];
      }
    }
    
    if (existingUser) {
      // Обновляем существующего пользователя
      const result = await pool.query(`
        UPDATE users 
        SET email = $1, name = $2, picture = $3, google_id = $4, updated_at = CURRENT_TIMESTAMP
        WHERE id = $5
        RETURNING *
      `, [user.email, user.name || null, user.picture || null, user.googleId || null, existingUser.id]);
      
      const updated = result.rows[0];
      return {
        id: updated.id,
        email: updated.email,
        name: updated.name,
        picture: updated.picture,
        googleId: updated.google_id,
        passwordHash: updated.password_hash,
        createdAt: updated.created_at,
        updatedAt: updated.updated_at,
      };
    } else {
      // Создаем нового пользователя
      const result = await pool.query(`
        INSERT INTO users (email, name, picture, google_id, created_at, updated_at)
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *
      `, [user.email, user.name || null, user.picture || null, user.googleId || null]);
      
      const newUser = result.rows[0];
      return {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        picture: newUser.picture,
        googleId: newUser.google_id,
        passwordHash: newUser.password_hash,
        createdAt: newUser.created_at,
        updatedAt: newUser.updated_at,
      };
    }
  } finally {
    await pool.end();
  }
}

async function getUserByGoogleIdPostgres(googleId: string): Promise<DbUser | null> {
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
  });
  
  try {
    const result = await pool.query('SELECT * FROM users WHERE google_id = $1', [googleId]);
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      picture: row.picture,
      googleId: row.google_id,
      passwordHash: row.password_hash,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  } catch (error: any) {
    if (error.code === '42P01') {
      return null;
    }
    throw error;
  } finally {
    await pool.end();
  }
}

async function getUserByEmailPostgres(email: string): Promise<DbUser | null> {
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
  });
  
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      picture: row.picture,
      googleId: row.google_id,
      passwordHash: row.password_hash,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  } catch (error: any) {
    if (error.code === '42P01') {
      return null;
    }
    throw error;
  } finally {
    await pool.end();
  }
}

// Supabase версия
async function createOrUpdateUserSupabase(user: Omit<DbUser, 'id' | 'createdAt' | 'updatedAt'>): Promise<DbUser> {
  const { supabase } = await import('./supabase');
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }
  
  // Проверяем, существует ли пользователь
  let existingUser: any = null;
  if (user.googleId) {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('google_id', user.googleId)
      .single();
    if (data) existingUser = data;
  }
  if (!existingUser) {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('email', user.email)
      .single();
    if (data) existingUser = data;
  }
  
  if (existingUser) {
    // Обновляем существующего пользователя
    const { data, error } = await supabase
      .from('users')
      .update({
        email: user.email,
        name: user.name || null,
        picture: user.picture || null,
        google_id: user.googleId || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingUser.id)
      .select()
      .single();
    
    if (error) throw error;
    
    return {
      id: data.id,
      email: data.email,
      name: data.name,
      picture: data.picture,
      googleId: data.google_id,
      passwordHash: data.password_hash,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  } else {
    // Создаем нового пользователя
    const { data, error } = await supabase
      .from('users')
      .insert({
        email: user.email,
        name: user.name || null,
        picture: user.picture || null,
        google_id: user.googleId || null,
      })
      .select()
      .single();
    
    if (error) throw error;
    
    return {
      id: data.id,
      email: data.email,
      name: data.name,
      picture: data.picture,
      googleId: data.google_id,
      passwordHash: data.password_hash,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }
}

async function getUserByGoogleIdSupabase(googleId: string): Promise<DbUser | null> {
  const { supabase } = await import('./supabase');
  if (!supabase) {
    return null;
  }
  
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('google_id', googleId)
    .single();
  
  if (error || !data) return null;
  
  return {
    id: data.id,
    email: data.email,
    name: data.name,
    picture: data.picture,
    googleId: data.google_id,
    passwordHash: data.password_hash,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

async function getUserByEmailSupabase(email: string): Promise<DbUser | null> {
  const { supabase } = await import('./supabase');
  if (!supabase) {
    return null;
  }
  
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();
  
  if (error || !data) return null;
  
  return {
    id: data.id,
    email: data.email,
    name: data.name,
    picture: data.picture,
    googleId: data.google_id,
    passwordHash: data.password_hash,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

// Экспортируемые функции
export async function createOrUpdateUser(user: Omit<DbUser, 'id' | 'createdAt' | 'updatedAt'>): Promise<DbUser> {
  if (useSupabase()) {
    return createOrUpdateUserSupabase(user);
  } else if (usePostgres()) {
    return createOrUpdateUserPostgres(user);
  } else {
    if (process.env.VERCEL) {
      throw new Error('No database configured on Vercel. Please set up Supabase or PostgreSQL.');
    }
    return createOrUpdateUserSQLite(user);
  }
}

export async function getUserByGoogleId(googleId: string): Promise<DbUser | null> {
  if (useSupabase()) {
    return getUserByGoogleIdSupabase(googleId);
  } else if (usePostgres()) {
    return getUserByGoogleIdPostgres(googleId);
  } else {
    if (process.env.VERCEL) {
      throw new Error('No database configured on Vercel. Please set up Supabase or PostgreSQL.');
    }
    return getUserByGoogleIdSQLite(googleId);
  }
}

export async function getUserByEmail(email: string): Promise<DbUser | null> {
  if (useSupabase()) {
    return getUserByEmailSupabase(email);
  } else if (usePostgres()) {
    return getUserByEmailPostgres(email);
  } else {
    if (process.env.VERCEL) {
      throw new Error('No database configured on Vercel. Please set up Supabase or PostgreSQL.');
    }
    return getUserByEmailSQLite(email);
  }
}

// Функции для работы с паролями

// SQLite версия
function updateUserPasswordSQLite(userId: number, passwordHash: string): void {
  const Database = require('better-sqlite3');
  const { join } = require('path');
  const { existsSync, mkdirSync } = require('fs');
  
  const dbDir = join(process.cwd(), 'data');
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
  }
  
  const dbPath = join(dbDir, 'affiliate.db');
  const db = new Database(dbPath);
  
  db.prepare(`
    UPDATE users 
    SET password_hash = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(passwordHash, userId);
}

// PostgreSQL версия
async function updateUserPasswordPostgres(userId: number, passwordHash: string): Promise<void> {
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
  });
  
  try {
    await pool.query(`
      UPDATE users 
      SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [passwordHash, userId]);
  } finally {
    await pool.end();
  }
}

// Supabase версия
async function updateUserPasswordSupabase(userId: number, passwordHash: string): Promise<void> {
  const { supabase } = await import('./supabase');
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }
  
  const { error } = await supabase
    .from('users')
    .update({
      password_hash: passwordHash,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);
  
  if (error) throw error;
}

// Экспортируемая функция для обновления пароля
export async function updateUserPassword(userId: number, passwordHash: string): Promise<void> {
  if (useSupabase()) {
    return updateUserPasswordSupabase(userId, passwordHash);
  } else if (usePostgres()) {
    return updateUserPasswordPostgres(userId, passwordHash);
  } else {
    if (process.env.VERCEL) {
      throw new Error('No database configured on Vercel. Please set up Supabase or PostgreSQL.');
    }
    return updateUserPasswordSQLite(userId, passwordHash);
  }
}

// Функция для получения пользователя по ID
async function getUserByIdSupabase(userId: number): Promise<DbUser | null> {
  const { supabase } = await import('./supabase');
  if (!supabase) {
    return null;
  }
  
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();
  
  if (error || !data) return null;
  
  return {
    id: data.id,
    email: data.email,
    name: data.name,
    picture: data.picture,
    googleId: data.google_id,
    passwordHash: data.password_hash,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

async function getUserByIdPostgres(userId: number): Promise<DbUser | null> {
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
  });
  
  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      picture: row.picture,
      googleId: row.google_id,
      passwordHash: row.password_hash,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  } catch (error: any) {
    if (error.code === '42P01') {
      return null;
    }
    throw error;
  } finally {
    await pool.end();
  }
}

function getUserByIdSQLite(userId: number): DbUser | null {
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
    const row = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
    if (!row) return null;
    
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      picture: row.picture,
      googleId: row.google_id,
      passwordHash: row.password_hash,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  } catch (error: any) {
    if (error.message?.includes('no such table')) {
      return null;
    }
    throw error;
  }
}

export async function getUserById(userId: number): Promise<DbUser | null> {
  if (useSupabase()) {
    return getUserByIdSupabase(userId);
  } else if (usePostgres()) {
    return getUserByIdPostgres(userId);
  } else {
    if (process.env.VERCEL) {
      throw new Error('No database configured on Vercel. Please set up Supabase or PostgreSQL.');
    }
    return getUserByIdSQLite(userId);
  }
}
