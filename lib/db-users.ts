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
  avatar?: string;
  googleId?: string;
  passwordHash?: string;
  deletedAt?: string;
  ownerId?: number;
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
      INSERT INTO users (email, name, picture, google_id, owner_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(
      user.email,
      user.name || null,
      user.picture || null,
      user.googleId || null,
      user.ownerId || null
    );
    
    const newUser = db.prepare('SELECT * FROM users WHERE id = ?').get(Number(result.lastInsertRowid));
    return {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      picture: newUser.picture,
      googleId: newUser.google_id,
      passwordHash: newUser.password_hash,
      ownerId: newUser.owner_id,
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
        INSERT INTO users (email, name, picture, google_id, owner_id, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *
      `, [user.email, user.name || null, user.picture || null, user.googleId || null, user.ownerId || null]);
      
      const newUser = result.rows[0];
      return {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        picture: newUser.picture,
        googleId: newUser.google_id,
        passwordHash: newUser.password_hash,
        ownerId: newUser.owner_id,
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
        owner_id: user.ownerId || null,
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
      ownerId: data.owner_id,
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
    avatar: data.avatar,
    googleId: data.google_id,
    passwordHash: data.password_hash,
    deletedAt: data.deleted_at,
    ownerId: data.owner_id,
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
      avatar: row.avatar,
      googleId: row.google_id,
      passwordHash: row.password_hash,
      deletedAt: row.deleted_at,
      ownerId: row.owner_id,
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
      avatar: row.avatar,
      googleId: row.google_id,
      passwordHash: row.password_hash,
      deletedAt: row.deleted_at,
      ownerId: row.owner_id,
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

// Team Members Types
export interface TeamMember {
  id: number;
  ownerId: number;
  userId?: number; // ID пользователя в таблице users (для изоляции данных)
  email: string;
  name?: string;
  username: string;
  passwordHash: string;
  isActive: boolean;
  firstLogin: boolean;
  createdAt: string;
  updatedAt: string;
}

// Update user profile functions
export async function updateUserProfile(userId: number, updates: { name?: string; avatar?: string }): Promise<DbUser> {
  if (useSupabase()) {
    return updateUserProfileSupabase(userId, updates);
  } else if (usePostgres()) {
    return updateUserProfilePostgres(userId, updates);
  } else {
    if (process.env.VERCEL) {
      throw new Error('No database configured on Vercel. Please set up Supabase or PostgreSQL.');
    }
    return updateUserProfileSQLite(userId, updates);
  }
}

async function updateUserProfileSupabase(userId: number, updates: { name?: string; avatar?: string }): Promise<DbUser> {
  const { supabase } = await import('./supabase');
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }
  
  const updateData: any = { updated_at: new Date().toISOString() };
  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.avatar !== undefined) updateData.avatar = updates.avatar;
  
  const { data, error } = await supabase
    .from('users')
    .update(updateData)
    .eq('id', userId)
    .select()
    .single();
  
  if (error) throw error;
  
    return {
      id: data.id,
      email: data.email,
      name: data.name,
      picture: data.picture,
      avatar: data.avatar,
      googleId: data.google_id,
      passwordHash: data.password_hash,
      deletedAt: data.deleted_at,
      ownerId: data.owner_id,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }
  
  async function updateUserProfilePostgres(userId: number, updates: { name?: string; avatar?: string }): Promise<DbUser> {
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
  });
  
  try {
    const updatesList: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;
    
    if (updates.name !== undefined) {
      updatesList.push(`name = $${paramIndex++}`);
      values.push(updates.name || null);
    }
    if (updates.avatar !== undefined) {
      updatesList.push(`avatar = $${paramIndex++}`);
      values.push(updates.avatar || null);
    }
    
    if (updatesList.length === 0) {
      const user = await getUserByIdPostgres(userId);
      if (!user) throw new Error('User not found');
      return user;
    }
    
    updatesList.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(userId);
    
    const query = `UPDATE users SET ${updatesList.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) throw new Error('User not found');
    
    const row = result.rows[0];
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      picture: row.picture,
      avatar: row.avatar,
      googleId: row.google_id,
      passwordHash: row.password_hash,
      deletedAt: row.deleted_at,
      ownerId: row.owner_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  } finally {
    await pool.end();
  }
}

function updateUserProfileSQLite(userId: number, updates: { name?: string; avatar?: string }): DbUser {
  const Database = require('better-sqlite3');
  const { join } = require('path');
  const { existsSync, mkdirSync } = require('fs');
  
  const dbDir = join(process.cwd(), 'data');
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
  }
  
  const dbPath = join(dbDir, 'affiliate.db');
  const db = new Database(dbPath);
  
  const updatesList: string[] = [];
  const values: any[] = [];
  
  if (updates.name !== undefined) {
    updatesList.push('name = ?');
    values.push(updates.name || null);
  }
  if (updates.avatar !== undefined) {
    updatesList.push('avatar = ?');
    values.push(updates.avatar || null);
  }
  
  if (updatesList.length === 0) {
    const user = getUserByIdSQLite(userId);
    if (!user) throw new Error('User not found');
    return user;
  }
  
  updatesList.push("updated_at = datetime('now')");
  values.push(userId);
  
  const query = `UPDATE users SET ${updatesList.join(', ')} WHERE id = ?`;
  db.prepare(query).run(...values);
  
  const user = getUserByIdSQLite(userId);
  if (!user) throw new Error('User not found');
  return user;
}

// Team Members functions
export async function getTeamMembers(ownerId: number): Promise<TeamMember[]> {
  if (useSupabase()) {
    return getTeamMembersSupabase(ownerId);
  } else if (usePostgres()) {
    return getTeamMembersPostgres(ownerId);
  } else {
    if (process.env.VERCEL) {
      throw new Error('No database configured on Vercel. Please set up Supabase or PostgreSQL.');
    }
    return getTeamMembersSQLite(ownerId);
  }
}

async function getTeamMembersSupabase(ownerId: number): Promise<TeamMember[]> {
  const { supabase } = await import('./supabase');
  if (!supabase) {
    return [];
  }
  
  const { data, error } = await supabase
    .from('team_members')
    .select('*')
    .eq('owner_id', ownerId)
    .eq('is_active', true)
    .order('created_at', { ascending: true });
  
  if (error || !data) return [];
  
  return data.map((row: any) => ({
    id: row.id,
    ownerId: row.owner_id,
    userId: row.user_id,
    email: row.email,
    name: row.name,
    username: row.username,
    passwordHash: row.password_hash,
    isActive: row.is_active,
    firstLogin: row.first_login,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

async function getTeamMembersPostgres(ownerId: number): Promise<TeamMember[]> {
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
  });
  
  try {
    const result = await pool.query(
      'SELECT * FROM team_members WHERE owner_id = $1 AND is_active = true ORDER BY created_at ASC',
      [ownerId]
    );
    
    return result.rows.map((row: any) => ({
      id: row.id,
      ownerId: row.owner_id,
      userId: row.user_id,
      email: row.email,
      name: row.name,
      username: row.username,
      passwordHash: row.password_hash,
      isActive: row.is_active,
      firstLogin: row.first_login,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } finally {
    await pool.end();
  }
}

function getTeamMembersSQLite(ownerId: number): TeamMember[] {
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
    const rows = db.prepare('SELECT * FROM team_members WHERE owner_id = ? AND is_active = 1 ORDER BY created_at ASC').all(ownerId) as any[];
    
    return rows.map((row: any) => ({
      id: row.id,
      ownerId: row.owner_id,
      userId: row.user_id,
      email: row.email,
      name: row.name,
      username: row.username,
      passwordHash: row.password_hash,
      isActive: row.is_active === 1,
      firstLogin: row.first_login === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } catch (error: any) {
    if (error.message?.includes('no such table')) {
      return [];
    }
    throw error;
  }
}

// Найти неактивного участника по email и owner_id
export async function getInactiveTeamMemberByEmail(ownerId: number, email: string): Promise<TeamMember | null> {
  if (useSupabase()) {
    return getInactiveTeamMemberByEmailSupabase(ownerId, email);
  } else if (usePostgres()) {
    return getInactiveTeamMemberByEmailPostgres(ownerId, email);
  } else {
    if (process.env.VERCEL) {
      throw new Error('No database configured on Vercel. Please set up Supabase or PostgreSQL.');
    }
    return getInactiveTeamMemberByEmailSQLite(ownerId, email);
  }
}

async function getInactiveTeamMemberByEmailSupabase(ownerId: number, email: string): Promise<TeamMember | null> {
  const { supabase } = await import('./supabase');
  if (!supabase) {
    return null;
  }
  
  const { data, error } = await supabase
    .from('team_members')
    .select('*')
    .eq('owner_id', ownerId)
    .eq('email', email)
    .eq('is_active', false)
    .maybeSingle();
  
  if (error || !data) return null;
  
  return {
    id: data.id,
    ownerId: data.owner_id,
    userId: data.user_id,
    email: data.email,
    name: data.name,
    username: data.username,
    passwordHash: data.password_hash,
    isActive: data.is_active,
    firstLogin: data.first_login,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

async function getInactiveTeamMemberByEmailPostgres(ownerId: number, email: string): Promise<TeamMember | null> {
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
  });
  
  try {
    const result = await pool.query(
      'SELECT * FROM team_members WHERE owner_id = $1 AND email = $2 AND is_active = false',
      [ownerId, email]
    );
    
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    return {
      id: row.id,
      ownerId: row.owner_id,
      userId: row.user_id,
      email: row.email,
      name: row.name,
      username: row.username,
      passwordHash: row.password_hash,
      isActive: row.is_active,
      firstLogin: row.first_login,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  } finally {
    await pool.end();
  }
}

function getInactiveTeamMemberByEmailSQLite(ownerId: number, email: string): TeamMember | null {
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
    const row = db.prepare('SELECT * FROM team_members WHERE owner_id = ? AND email = ? AND is_active = 0').get(ownerId, email) as any;
    
    if (!row) return null;
    
    return {
      id: row.id,
      ownerId: row.owner_id,
      userId: row.user_id,
      email: row.email,
      name: row.name,
      username: row.username,
      passwordHash: row.password_hash,
      isActive: row.is_active === 1,
      firstLogin: row.first_login === 1,
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

// Активировать и обновить неактивного участника
export async function reactivateTeamMember(
  memberId: number,
  updates: {
    name?: string | null;
    username: string;
    passwordHash: string;
  }
): Promise<TeamMember> {
  if (useSupabase()) {
    return reactivateTeamMemberSupabase(memberId, updates);
  } else if (usePostgres()) {
    return reactivateTeamMemberPostgres(memberId, updates);
  } else {
    if (process.env.VERCEL) {
      throw new Error('No database configured on Vercel. Please set up Supabase or PostgreSQL.');
    }
    return reactivateTeamMemberSQLite(memberId, updates);
  }
}

async function reactivateTeamMemberSupabase(
  memberId: number,
  updates: { name?: string | null; username: string; passwordHash: string }
): Promise<TeamMember> {
  const { supabase } = await import('./supabase');
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }
  
  // Получаем текущую запись участника для получения owner_id и email
  const { data: existingMember, error: fetchError } = await supabase
    .from('team_members')
    .select('owner_id, email')
    .eq('id', memberId)
    .single();
  
  if (fetchError || !existingMember) throw new Error('Team member not found');
  
  // Проверяем, есть ли уже user_id, если нет - создаем пользователя
  const { data: currentMember } = await supabase
    .from('team_members')
    .select('user_id')
    .eq('id', memberId)
    .single();
  
  let userId = currentMember?.user_id;
  
  if (!userId) {
    // Создаем запись пользователя с owner_id для изоляции данных
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert({
        email: existingMember.email,
        name: updates.name || null,
        owner_id: existingMember.owner_id,
      })
      .select()
      .single();
    
    if (userError) throw userError;
    userId = userData.id;
  }
  
  const updateData: any = {
    is_active: true,
    user_id: userId,
    username: updates.username,
    password_hash: updates.passwordHash,
    first_login: true,
    updated_at: new Date().toISOString(),
  };
  
  if (updates.name !== undefined) {
    updateData.name = updates.name;
  }
  
  const { data, error } = await supabase
    .from('team_members')
    .update(updateData)
    .eq('id', memberId)
    .select()
    .single();
  
  if (error) throw error;
  
  return {
    id: data.id,
    ownerId: data.owner_id,
    userId: data.user_id,
    email: data.email,
    name: data.name,
    username: data.username,
    passwordHash: data.password_hash,
    isActive: data.is_active,
    firstLogin: data.first_login,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

async function reactivateTeamMemberPostgres(
  memberId: number,
  updates: { name?: string | null; username: string; passwordHash: string }
): Promise<TeamMember> {
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
  });
  
  try {
    // Получаем текущую запись участника для получения owner_id и email
    const existingResult = await pool.query(
      'SELECT owner_id, email, user_id FROM team_members WHERE id = $1',
      [memberId]
    );
    
    if (existingResult.rows.length === 0) throw new Error('Team member not found');
    
    const existingMember = existingResult.rows[0];
    let userId = existingMember.user_id;
    
    // Если user_id отсутствует, создаем пользователя
    if (!userId) {
      const userResult = await pool.query(`
        INSERT INTO users (email, name, owner_id, created_at, updated_at)
        VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING id
      `, [existingMember.email, updates.name || null, existingMember.owner_id]);
      
      userId = userResult.rows[0].id;
    }
    
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;
    
    updateFields.push(`is_active = $${paramIndex++}`);
    values.push(true);
    
    updateFields.push(`user_id = $${paramIndex++}`);
    values.push(userId);
    
    updateFields.push(`username = $${paramIndex++}`);
    values.push(updates.username);
    
    updateFields.push(`password_hash = $${paramIndex++}`);
    values.push(updates.passwordHash);
    
    updateFields.push(`first_login = $${paramIndex++}`);
    values.push(true);
    
    if (updates.name !== undefined) {
      updateFields.push(`name = $${paramIndex++}`);
      values.push(updates.name);
    }
    
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    
    values.push(memberId);
    
    const result = await pool.query(
      `UPDATE team_members SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    
    const row = result.rows[0];
    return {
      id: row.id,
      ownerId: row.owner_id,
      userId: row.user_id,
      email: row.email,
      name: row.name,
      username: row.username,
      passwordHash: row.password_hash,
      isActive: row.is_active,
      firstLogin: row.first_login,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  } finally {
    await pool.end();
  }
}

function reactivateTeamMemberSQLite(
  memberId: number,
  updates: { name?: string | null; username: string; passwordHash: string }
): TeamMember {
  const Database = require('better-sqlite3');
  const { join } = require('path');
  const { existsSync, mkdirSync } = require('fs');
  
  const dbDir = join(process.cwd(), 'data');
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
  }
  
  const dbPath = join(dbDir, 'affiliate.db');
  const db = new Database(dbPath);
  
  // Получаем текущую запись участника для получения owner_id и email
  const existingRow = db.prepare('SELECT owner_id, email, user_id FROM team_members WHERE id = ?').get(memberId) as any;
  
  if (!existingRow) throw new Error('Team member not found');
  
  let userId = existingRow.user_id;
  
  // Если user_id отсутствует, создаем пользователя
  if (!userId) {
    const userResult = db.prepare(`
      INSERT INTO users (email, name, owner_id, created_at, updated_at)
      VALUES (?, ?, ?, datetime('now'), datetime('now'))
    `).run(
      existingRow.email,
      updates.name || null,
      existingRow.owner_id
    );
    
    userId = Number(userResult.lastInsertRowid);
  }
  
  const updateFields: string[] = [];
  const values: any[] = [];
  
  updateFields.push('is_active = 1');
  updateFields.push('user_id = ?');
  values.push(userId);
  updateFields.push('username = ?');
  values.push(updates.username);
  
  updateFields.push('password_hash = ?');
  values.push(updates.passwordHash);
  
  updateFields.push('first_login = 1');
  
  if (updates.name !== undefined) {
    updateFields.push('name = ?');
    values.push(updates.name);
  }
  
  updateFields.push('updated_at = datetime("now")');
  
  values.push(memberId);
  
  db.prepare(`UPDATE team_members SET ${updateFields.join(', ')} WHERE id = ?`).run(...values);
  
  const row = db.prepare('SELECT * FROM team_members WHERE id = ?').get(memberId) as any;
  
  return {
    id: row.id,
    ownerId: row.owner_id,
    userId: row.user_id,
    email: row.email,
    name: row.name,
    username: row.username,
    passwordHash: row.password_hash,
    isActive: row.is_active === 1,
    firstLogin: row.first_login === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createTeamMember(member: Omit<TeamMember, 'id' | 'createdAt' | 'updatedAt'>): Promise<TeamMember> {
  if (useSupabase()) {
    return createTeamMemberSupabase(member);
  } else if (usePostgres()) {
    return createTeamMemberPostgres(member);
  } else {
    if (process.env.VERCEL) {
      throw new Error('No database configured on Vercel. Please set up Supabase or PostgreSQL.');
    }
    return createTeamMemberSQLite(member);
  }
}

async function createTeamMemberSupabase(member: Omit<TeamMember, 'id' | 'createdAt' | 'updatedAt'>): Promise<TeamMember> {
  const { supabase } = await import('./supabase');
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }
  
  // Сначала создаем запись пользователя с owner_id для изоляции данных
  const { data: userData, error: userError } = await supabase
    .from('users')
    .insert({
      email: member.email,
      name: member.name || null,
      owner_id: member.ownerId, // Связываем с владельцем команды
    })
    .select()
    .single();
  
  if (userError) throw userError;
  
  // Затем создаем запись участника команды с user_id
  const { data, error } = await supabase
    .from('team_members')
    .insert({
      owner_id: member.ownerId,
      user_id: userData.id, // Связываем с созданным пользователем
      email: member.email,
      name: member.name || null,
      username: member.username,
      password_hash: member.passwordHash,
      is_active: true,
      first_login: true,
    })
    .select()
    .single();
  
  if (error) throw error;
  
  return {
    id: data.id,
    ownerId: data.owner_id,
    userId: data.user_id,
    email: data.email,
    name: data.name,
    username: data.username,
    passwordHash: data.password_hash,
    isActive: data.is_active,
    firstLogin: data.first_login,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

async function createTeamMemberPostgres(member: Omit<TeamMember, 'id' | 'createdAt' | 'updatedAt'>): Promise<TeamMember> {
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
  });
  
  try {
    // Сначала создаем запись пользователя с owner_id для изоляции данных
    const userResult = await pool.query(`
      INSERT INTO users (email, name, owner_id, created_at, updated_at)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id
    `, [member.email, member.name || null, member.ownerId]);
    
    const userId = userResult.rows[0].id;
    
    // Затем создаем запись участника команды с user_id
    const result = await pool.query(`
      INSERT INTO team_members (owner_id, user_id, email, name, username, password_hash, is_active, first_login)
      VALUES ($1, $2, $3, $4, $5, $6, true, true)
      RETURNING *
    `, [member.ownerId, userId, member.email, member.name || null, member.username, member.passwordHash]);
    
    const row = result.rows[0];
    return {
      id: row.id,
      ownerId: row.owner_id,
      userId: row.user_id,
      email: row.email,
      name: row.name,
      username: row.username,
      passwordHash: row.password_hash,
      isActive: row.is_active,
      firstLogin: row.first_login,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  } finally {
    await pool.end();
  }
}

function createTeamMemberSQLite(member: Omit<TeamMember, 'id' | 'createdAt' | 'updatedAt'>): TeamMember {
  const Database = require('better-sqlite3');
  const { join } = require('path');
  const { existsSync, mkdirSync } = require('fs');
  
  const dbDir = join(process.cwd(), 'data');
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
  }
  
  const dbPath = join(dbDir, 'affiliate.db');
  const db = new Database(dbPath);
  
  // Сначала создаем запись пользователя с owner_id для изоляции данных
  const userResult = db.prepare(`
    INSERT INTO users (email, name, owner_id, created_at, updated_at)
    VALUES (?, ?, ?, datetime('now'), datetime('now'))
  `).run(
    member.email,
    member.name || null,
    member.ownerId
  );
  
  const userId = Number(userResult.lastInsertRowid);
  
  // Затем создаем запись участника команды с user_id
  const result = db.prepare(`
    INSERT INTO team_members (owner_id, user_id, email, name, username, password_hash, is_active, first_login, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 1, 1, datetime('now'), datetime('now'))
  `).run(
    member.ownerId,
    userId,
    member.email,
    member.name || null,
    member.username,
    member.passwordHash
  );
  
  const row = db.prepare('SELECT * FROM team_members WHERE id = ?').get(Number(result.lastInsertRowid)) as any;
  
  return {
    id: row.id,
    ownerId: row.owner_id,
    userId: row.user_id,
    email: row.email,
    name: row.name,
    username: row.username,
    passwordHash: row.password_hash,
    isActive: row.is_active === 1,
    firstLogin: row.first_login === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function deleteTeamMember(memberId: number, ownerId: number): Promise<void> {
  if (useSupabase()) {
    return deleteTeamMemberSupabase(memberId, ownerId);
  } else if (usePostgres()) {
    return deleteTeamMemberPostgres(memberId, ownerId);
  } else {
    if (process.env.VERCEL) {
      throw new Error('No database configured on Vercel. Please set up Supabase or PostgreSQL.');
    }
    return deleteTeamMemberSQLite(memberId, ownerId);
  }
}

async function deleteTeamMemberSupabase(memberId: number, ownerId: number): Promise<void> {
  const { supabase } = await import('./supabase');
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }
  
  const { error } = await supabase
    .from('team_members')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', memberId)
    .eq('owner_id', ownerId);
  
  if (error) throw error;
}

async function deleteTeamMemberPostgres(memberId: number, ownerId: number): Promise<void> {
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
  });
  
  try {
    await pool.query(
      'UPDATE team_members SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND owner_id = $2',
      [memberId, ownerId]
    );
  } finally {
    await pool.end();
  }
}

function deleteTeamMemberSQLite(memberId: number, ownerId: number): void {
  const Database = require('better-sqlite3');
  const { join } = require('path');
  const { existsSync, mkdirSync } = require('fs');
  
  const dbDir = join(process.cwd(), 'data');
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
  }
  
  const dbPath = join(dbDir, 'affiliate.db');
  const db = new Database(dbPath);
  
  db.prepare('UPDATE team_members SET is_active = 0, updated_at = datetime("now") WHERE id = ? AND owner_id = ?').run(memberId, ownerId);
}

export async function updateTeamMemberPassword(memberId: number, ownerId: number, passwordHash: string, clearFirstLogin: boolean = false): Promise<void> {
  if (useSupabase()) {
    return updateTeamMemberPasswordSupabase(memberId, ownerId, passwordHash, clearFirstLogin);
  } else if (usePostgres()) {
    return updateTeamMemberPasswordPostgres(memberId, ownerId, passwordHash, clearFirstLogin);
  } else {
    if (process.env.VERCEL) {
      throw new Error('No database configured on Vercel. Please set up Supabase or PostgreSQL.');
    }
    return updateTeamMemberPasswordSQLite(memberId, ownerId, passwordHash, clearFirstLogin);
  }
}

async function updateTeamMemberPasswordSupabase(memberId: number, ownerId: number, passwordHash: string, clearFirstLogin: boolean): Promise<void> {
  const { supabase } = await import('./supabase');
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }
  
  const updateData: any = {
    password_hash: passwordHash,
    updated_at: new Date().toISOString(),
  };
  if (clearFirstLogin) {
    updateData.first_login = false;
  }
  
  const { error } = await supabase
    .from('team_members')
    .update(updateData)
    .eq('id', memberId)
    .eq('owner_id', ownerId);
  
  if (error) throw error;
}

async function updateTeamMemberPasswordPostgres(memberId: number, ownerId: number, passwordHash: string, clearFirstLogin: boolean): Promise<void> {
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
  });
  
  try {
    if (clearFirstLogin) {
      await pool.query(
        'UPDATE team_members SET password_hash = $1, first_login = false, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND owner_id = $3',
        [passwordHash, memberId, ownerId]
      );
    } else {
      await pool.query(
        'UPDATE team_members SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND owner_id = $3',
        [passwordHash, memberId, ownerId]
      );
    }
  } finally {
    await pool.end();
  }
}

function updateTeamMemberPasswordSQLite(memberId: number, ownerId: number, passwordHash: string, clearFirstLogin: boolean): void {
  const Database = require('better-sqlite3');
  const { join } = require('path');
  const { existsSync, mkdirSync } = require('fs');
  
  const dbDir = join(process.cwd(), 'data');
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
  }
  
  const dbPath = join(dbDir, 'affiliate.db');
  const db = new Database(dbPath);
  
  if (clearFirstLogin) {
    db.prepare('UPDATE team_members SET password_hash = ?, first_login = 0, updated_at = datetime("now") WHERE id = ? AND owner_id = ?').run(passwordHash, memberId, ownerId);
  } else {
    db.prepare('UPDATE team_members SET password_hash = ?, updated_at = datetime("now") WHERE id = ? AND owner_id = ?').run(passwordHash, memberId, ownerId);
  }
}

export async function getTeamMemberByUsername(username: string): Promise<TeamMember | null> {
  if (useSupabase()) {
    return getTeamMemberByUsernameSupabase(username);
  } else if (usePostgres()) {
    return getTeamMemberByUsernamePostgres(username);
  } else {
    if (process.env.VERCEL) {
      throw new Error('No database configured on Vercel. Please set up Supabase or PostgreSQL.');
    }
    return getTeamMemberByUsernameSQLite(username);
  }
}

// Получить активного участника команды по email
export async function getTeamMemberByEmail(email: string): Promise<TeamMember | null> {
  if (useSupabase()) {
    return getTeamMemberByEmailSupabase(email);
  } else if (usePostgres()) {
    return getTeamMemberByEmailPostgres(email);
  } else {
    if (process.env.VERCEL) {
      throw new Error('No database configured on Vercel. Please set up Supabase or PostgreSQL.');
    }
    return getTeamMemberByEmailSQLite(email);
  }
}

async function getTeamMemberByEmailSupabase(email: string): Promise<TeamMember | null> {
  const { supabase } = await import('./supabase');
  if (!supabase) {
    return null;
  }
  
  const { data, error } = await supabase
    .from('team_members')
    .select('*')
    .eq('email', email)
    .eq('is_active', true)
    .maybeSingle();
  
  if (error || !data) return null;
  
  return {
    id: data.id,
    ownerId: data.owner_id,
    userId: data.user_id,
    email: data.email,
    name: data.name,
    username: data.username,
    passwordHash: data.password_hash,
    isActive: data.is_active,
    firstLogin: data.first_login,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

async function getTeamMemberByEmailPostgres(email: string): Promise<TeamMember | null> {
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
  });
  
  try {
    const result = await pool.query(
      'SELECT * FROM team_members WHERE email = $1 AND is_active = true',
      [email]
    );
    
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    return {
      id: row.id,
      ownerId: row.owner_id,
      userId: row.user_id,
      email: row.email,
      name: row.name,
      username: row.username,
      passwordHash: row.password_hash,
      isActive: row.is_active,
      firstLogin: row.first_login,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  } finally {
    await pool.end();
  }
}

function getTeamMemberByEmailSQLite(email: string): TeamMember | null {
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
    const row = db.prepare('SELECT * FROM team_members WHERE email = ? AND is_active = 1').get(email) as any;
    if (!row) return null;
    
    return {
      id: row.id,
      ownerId: row.owner_id,
      userId: row.user_id,
      email: row.email,
      name: row.name,
      username: row.username,
      passwordHash: row.password_hash,
      isActive: row.is_active === 1,
      firstLogin: row.first_login === 1,
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

async function getTeamMemberByUsernameSupabase(username: string): Promise<TeamMember | null> {
  const { supabase } = await import('./supabase');
  if (!supabase) {
    return null;
  }
  
  const { data, error } = await supabase
    .from('team_members')
    .select('*')
    .eq('username', username)
    .eq('is_active', true)
    .single();
  
  if (error || !data) return null;
  
  return {
    id: data.id,
    ownerId: data.owner_id,
    userId: data.user_id,
    email: data.email,
    name: data.name,
    username: data.username,
    passwordHash: data.password_hash,
    isActive: data.is_active,
    firstLogin: data.first_login,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

async function getTeamMemberByUsernamePostgres(username: string): Promise<TeamMember | null> {
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
  });
  
  try {
    const result = await pool.query(
      'SELECT * FROM team_members WHERE username = $1 AND is_active = true',
      [username]
    );
    
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    return {
      id: row.id,
      ownerId: row.owner_id,
      userId: row.user_id,
      email: row.email,
      name: row.name,
      username: row.username,
      passwordHash: row.password_hash,
      isActive: row.is_active,
      firstLogin: row.first_login,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  } finally {
    await pool.end();
  }
}

function getTeamMemberByUsernameSQLite(username: string): TeamMember | null {
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
    const row = db.prepare('SELECT * FROM team_members WHERE username = ? AND is_active = 1').get(username) as any;
    if (!row) return null;
    
    return {
      id: row.id,
      ownerId: row.owner_id,
      userId: row.user_id,
      email: row.email,
      name: row.name,
      username: row.username,
      passwordHash: row.password_hash,
      isActive: row.is_active === 1,
      firstLogin: row.first_login === 1,
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

// Account deletion functions
export async function scheduleAccountDeletion(userId: number): Promise<void> {
  const deletionDate = new Date();
  deletionDate.setDate(deletionDate.getDate() + 14);
  
  if (useSupabase()) {
    return scheduleAccountDeletionSupabase(userId, deletionDate);
  } else if (usePostgres()) {
    return scheduleAccountDeletionPostgres(userId, deletionDate);
  } else {
    if (process.env.VERCEL) {
      throw new Error('No database configured on Vercel. Please set up Supabase or PostgreSQL.');
    }
    return scheduleAccountDeletionSQLite(userId, deletionDate);
  }
}

async function scheduleAccountDeletionSupabase(userId: number, deletionDate: Date): Promise<void> {
  const { supabase } = await import('./supabase');
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }
  
  const { error } = await supabase
    .from('users')
    .update({ deleted_at: deletionDate.toISOString() })
    .eq('id', userId);
  
  if (error) throw error;
}

async function scheduleAccountDeletionPostgres(userId: number, deletionDate: Date): Promise<void> {
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
  });
  
  try {
    await pool.query(
      'UPDATE users SET deleted_at = $1 WHERE id = $2',
      [deletionDate, userId]
    );
  } finally {
    await pool.end();
  }
}

function scheduleAccountDeletionSQLite(userId: number, deletionDate: Date): void {
  const Database = require('better-sqlite3');
  const { join } = require('path');
  const { existsSync, mkdirSync } = require('fs');
  
  const dbDir = join(process.cwd(), 'data');
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
  }
  
  const dbPath = join(dbDir, 'affiliate.db');
  const db = new Database(dbPath);
  
  db.prepare('UPDATE users SET deleted_at = ? WHERE id = ?').run(deletionDate.toISOString(), userId);
}

export async function cancelAccountDeletion(userId: number): Promise<void> {
  if (useSupabase()) {
    return cancelAccountDeletionSupabase(userId);
  } else if (usePostgres()) {
    return cancelAccountDeletionPostgres(userId);
  } else {
    if (process.env.VERCEL) {
      throw new Error('No database configured on Vercel. Please set up Supabase or PostgreSQL.');
    }
    return cancelAccountDeletionSQLite(userId);
  }
}

async function cancelAccountDeletionSupabase(userId: number): Promise<void> {
  const { supabase } = await import('./supabase');
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }
  
  const { error } = await supabase
    .from('users')
    .update({ deleted_at: null })
    .eq('id', userId);
  
  if (error) throw error;
}

async function cancelAccountDeletionPostgres(userId: number): Promise<void> {
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
  });
  
  try {
    await pool.query('UPDATE users SET deleted_at = NULL WHERE id = $1', [userId]);
  } finally {
    await pool.end();
  }
}

function cancelAccountDeletionSQLite(userId: number): void {
  const Database = require('better-sqlite3');
  const { join } = require('path');
  const { existsSync, mkdirSync } = require('fs');
  
  const dbDir = join(process.cwd(), 'data');
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
  }
  
  const dbPath = join(dbDir, 'affiliate.db');
  const db = new Database(dbPath);
  
  db.prepare('UPDATE users SET deleted_at = NULL WHERE id = ?').run(userId);
}

// Admin functions for user management
export async function createUserAdmin(user: { email: string; name?: string; passwordHash?: string }): Promise<DbUser> {
  if (useSupabase()) {
    return createUserAdminSupabase(user);
  } else if (usePostgres()) {
    return createUserAdminPostgres(user);
  } else {
    if (process.env.VERCEL) {
      throw new Error('No database configured on Vercel. Please set up Supabase or PostgreSQL.');
    }
    return createUserAdminSQLite(user);
  }
}

async function createUserAdminSupabase(user: { email: string; name?: string; passwordHash?: string }): Promise<DbUser> {
  const { supabase } = await import('./supabase');
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }
  
  const { data, error } = await supabase
    .from('users')
    .insert({
      email: user.email,
      name: user.name || null,
      password_hash: user.passwordHash || null,
    })
    .select()
    .single();
  
  if (error) throw error;
  
  return {
    id: data.id,
    email: data.email,
    name: data.name,
    picture: data.picture,
    avatar: data.avatar,
    googleId: data.google_id,
    passwordHash: data.password_hash,
    deletedAt: data.deleted_at,
    ownerId: data.owner_id,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

async function createUserAdminPostgres(user: { email: string; name?: string; passwordHash?: string }): Promise<DbUser> {
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
  });
  
  try {
    const result = await pool.query(`
      INSERT INTO users (email, name, password_hash, created_at, updated_at)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `, [user.email, user.name || null, user.passwordHash || null]);
    
    const row = result.rows[0];
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      picture: row.picture,
      avatar: row.avatar,
      googleId: row.google_id,
      passwordHash: row.password_hash,
      deletedAt: row.deleted_at,
      ownerId: row.owner_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  } finally {
    await pool.end();
  }
}

function createUserAdminSQLite(user: { email: string; name?: string; passwordHash?: string }): DbUser {
  const Database = require('better-sqlite3');
  const { join } = require('path');
  const { existsSync, mkdirSync } = require('fs');
  
  const dbDir = join(process.cwd(), 'data');
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
  }
  
  const dbPath = join(dbDir, 'affiliate.db');
  const db = new Database(dbPath);
  
  const result = db.prepare(`
    INSERT INTO users (email, name, password_hash, created_at, updated_at)
    VALUES (?, ?, ?, datetime('now'), datetime('now'))
  `).run(user.email, user.name || null, user.passwordHash || null);
  
  const newUser = db.prepare('SELECT * FROM users WHERE id = ?').get(Number(result.lastInsertRowid)) as any;
  return {
    id: newUser.id,
    email: newUser.email,
    name: newUser.name,
    picture: newUser.picture,
    avatar: newUser.avatar,
    googleId: newUser.google_id,
    passwordHash: newUser.password_hash,
    deletedAt: newUser.deleted_at,
    ownerId: newUser.owner_id,
    createdAt: newUser.created_at,
    updatedAt: newUser.updated_at,
  };
}

export async function updateUserAdmin(userId: number, updates: { email?: string; name?: string }): Promise<DbUser> {
  if (useSupabase()) {
    return updateUserAdminSupabase(userId, updates);
  } else if (usePostgres()) {
    return updateUserAdminPostgres(userId, updates);
  } else {
    if (process.env.VERCEL) {
      throw new Error('No database configured on Vercel. Please set up Supabase or PostgreSQL.');
    }
    return updateUserAdminSQLite(userId, updates);
  }
}

async function updateUserAdminSupabase(userId: number, updates: { email?: string; name?: string }): Promise<DbUser> {
  const { supabase } = await import('./supabase');
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }
  
  const updateData: any = { updated_at: new Date().toISOString() };
  if (updates.email !== undefined) updateData.email = updates.email;
  if (updates.name !== undefined) updateData.name = updates.name;
  
  const { data, error } = await supabase
    .from('users')
    .update(updateData)
    .eq('id', userId)
    .select()
    .single();
  
  if (error) throw error;
  
  return {
    id: data.id,
    email: data.email,
    name: data.name,
    picture: data.picture,
    avatar: data.avatar,
    googleId: data.google_id,
    passwordHash: data.password_hash,
    deletedAt: data.deleted_at,
    ownerId: data.owner_id,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

async function updateUserAdminPostgres(userId: number, updates: { email?: string; name?: string }): Promise<DbUser> {
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
  });
  
  try {
    const updatesList: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;
    
    if (updates.email !== undefined) {
      updatesList.push(`email = $${paramIndex++}`);
      values.push(updates.email);
    }
    if (updates.name !== undefined) {
      updatesList.push(`name = $${paramIndex++}`);
      values.push(updates.name || null);
    }
    
    if (updatesList.length === 0) {
      const user = await getUserByIdPostgres(userId);
      if (!user) throw new Error('User not found');
      return user;
    }
    
    updatesList.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(userId);
    
    const query = `UPDATE users SET ${updatesList.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) throw new Error('User not found');
    
    const row = result.rows[0];
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      picture: row.picture,
      avatar: row.avatar,
      googleId: row.google_id,
      passwordHash: row.password_hash,
      deletedAt: row.deleted_at,
      ownerId: row.owner_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  } finally {
    await pool.end();
  }
}

function updateUserAdminSQLite(userId: number, updates: { email?: string; name?: string }): DbUser {
  const Database = require('better-sqlite3');
  const { join } = require('path');
  const { existsSync, mkdirSync } = require('fs');
  
  const dbDir = join(process.cwd(), 'data');
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
  }
  
  const dbPath = join(dbDir, 'affiliate.db');
  const db = new Database(dbPath);
  
  const updatesList: string[] = [];
  const values: any[] = [];
  
  if (updates.email !== undefined) {
    updatesList.push('email = ?');
    values.push(updates.email);
  }
  if (updates.name !== undefined) {
    updatesList.push('name = ?');
    values.push(updates.name || null);
  }
  
  if (updatesList.length === 0) {
    const user = getUserByIdSQLite(userId);
    if (!user) throw new Error('User not found');
    return user;
  }
  
  updatesList.push("updated_at = datetime('now')");
  values.push(userId);
  
  const query = `UPDATE users SET ${updatesList.join(', ')} WHERE id = ?`;
  db.prepare(query).run(...values);
  
  const user = getUserByIdSQLite(userId);
  if (!user) throw new Error('User not found');
  return user;
}

export async function deleteUserAdmin(userId: number): Promise<void> {
  if (useSupabase()) {
    return deleteUserAdminSupabase(userId);
  } else if (usePostgres()) {
    return deleteUserAdminPostgres(userId);
  } else {
    if (process.env.VERCEL) {
      throw new Error('No database configured on Vercel. Please set up Supabase or PostgreSQL.');
    }
    return deleteUserAdminSQLite(userId);
  }
}

async function deleteUserAdminSupabase(userId: number): Promise<void> {
  const { supabase } = await import('./supabase');
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }
  
  const { error } = await supabase
    .from('users')
    .delete()
    .eq('id', userId);
  
  if (error) throw error;
}

async function deleteUserAdminPostgres(userId: number): Promise<void> {
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
  });
  
  try {
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
  } finally {
    await pool.end();
  }
}

function deleteUserAdminSQLite(userId: number): void {
  const Database = require('better-sqlite3');
  const { join } = require('path');
  const { existsSync, mkdirSync } = require('fs');
  
  const dbDir = join(process.cwd(), 'data');
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
  }
  
  const dbPath = join(dbDir, 'affiliate.db');
  const db = new Database(dbPath);
  
  db.prepare('DELETE FROM users WHERE id = ?').run(userId);
}
