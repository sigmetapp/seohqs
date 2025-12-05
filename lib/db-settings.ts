// Функции для работы с настройками сайта

function useSupabase(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && 
           (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY));
}

function usePostgres(): boolean {
  if (useSupabase()) return false;
  return !!(process.env.POSTGRES_URL || process.env.DATABASE_URL);
}

export interface SiteSetting {
  id: number;
  key: string;
  value: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

// SQLite версия
function getSettingSQLite(key: string): SiteSetting | null {
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
    const row = db.prepare('SELECT * FROM site_settings WHERE key = ?').get(key) as any;
    if (!row) return null;
    
    return {
      id: row.id,
      key: row.key,
      value: row.value,
      description: row.description,
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

function setSettingSQLite(key: string, value: string, description?: string): SiteSetting {
  const Database = require('better-sqlite3');
  const { join } = require('path');
  const { existsSync, mkdirSync } = require('fs');
  
  const dbDir = join(process.cwd(), 'data');
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
  }
  
  const dbPath = join(dbDir, 'affiliate.db');
  const db = new Database(dbPath);
  
  const existing = db.prepare('SELECT * FROM site_settings WHERE key = ?').get(key) as any;
  
  if (existing) {
    db.prepare(`
      UPDATE site_settings 
      SET value = ?, description = ?, updated_at = datetime('now')
      WHERE key = ?
    `).run(value, description || null, key);
    
    const updated = db.prepare('SELECT * FROM site_settings WHERE key = ?').get(key) as any;
    return {
      id: updated.id,
      key: updated.key,
      value: updated.value,
      description: updated.description,
      createdAt: updated.created_at,
      updatedAt: updated.updated_at,
    };
  } else {
    const result = db.prepare(`
      INSERT INTO site_settings (key, value, description, created_at, updated_at)
      VALUES (?, ?, ?, datetime('now'), datetime('now'))
    `).run(key, value, description || null);
    
    const newSetting = db.prepare('SELECT * FROM site_settings WHERE id = ?').get(Number(result.lastInsertRowid)) as any;
    return {
      id: newSetting.id,
      key: newSetting.key,
      value: newSetting.value,
      description: newSetting.description,
      createdAt: newSetting.created_at,
      updatedAt: newSetting.updated_at,
    };
  }
}

// PostgreSQL версия
async function getSettingPostgres(key: string): Promise<SiteSetting | null> {
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
  });
  
  try {
    const result = await pool.query('SELECT * FROM site_settings WHERE key = $1', [key]);
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    return {
      id: row.id,
      key: row.key,
      value: row.value,
      description: row.description,
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

async function setSettingPostgres(key: string, value: string, description?: string): Promise<SiteSetting> {
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
  });
  
  try {
    const existing = await pool.query('SELECT * FROM site_settings WHERE key = $1', [key]);
    
    if (existing.rows.length > 0) {
      const result = await pool.query(`
        UPDATE site_settings 
        SET value = $1, description = $2, updated_at = CURRENT_TIMESTAMP
        WHERE key = $3
        RETURNING *
      `, [value, description || null, key]);
      
      const row = result.rows[0];
      return {
        id: row.id,
        key: row.key,
        value: row.value,
        description: row.description,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    } else {
      const result = await pool.query(`
        INSERT INTO site_settings (key, value, description, created_at, updated_at)
        VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *
      `, [key, value, description || null]);
      
      const row = result.rows[0];
      return {
        id: row.id,
        key: row.key,
        value: row.value,
        description: row.description,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    }
  } finally {
    await pool.end();
  }
}

// Supabase версия
async function getSettingSupabase(key: string): Promise<SiteSetting | null> {
  const { supabase } = await import('./supabase');
  if (!supabase) {
    return null;
  }
  
  const { data, error } = await supabase
    .from('site_settings')
    .select('*')
    .eq('key', key)
    .maybeSingle();
  
  if (error || !data) return null;
  
  return {
    id: data.id,
    key: data.key,
    value: data.value,
    description: data.description,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

async function setSettingSupabase(key: string, value: string, description?: string): Promise<SiteSetting> {
  const { supabase } = await import('./supabase');
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }
  
  const { data: existing } = await supabase
    .from('site_settings')
    .select('*')
    .eq('key', key)
    .maybeSingle();
  
  if (existing) {
    const { data, error } = await supabase
      .from('site_settings')
      .update({
        value,
        description: description || null,
        updated_at: new Date().toISOString(),
      })
      .eq('key', key)
      .select()
      .single();
    
    if (error) throw error;
    
    return {
      id: data.id,
      key: data.key,
      value: data.value,
      description: data.description,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  } else {
    const { data, error } = await supabase
      .from('site_settings')
      .insert({
        key,
        value,
        description: description || null,
      })
      .select()
      .single();
    
    if (error) throw error;
    
    return {
      id: data.id,
      key: data.key,
      value: data.value,
      description: data.description,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }
}

// Экспортируемые функции
export async function getSetting(key: string): Promise<SiteSetting | null> {
  if (useSupabase()) {
    return getSettingSupabase(key);
  } else if (usePostgres()) {
    return getSettingPostgres(key);
  } else {
    if (process.env.VERCEL) {
      throw new Error('No database configured on Vercel. Please set up Supabase or PostgreSQL.');
    }
    return getSettingSQLite(key);
  }
}

export async function setSetting(key: string, value: string, description?: string): Promise<SiteSetting> {
  if (useSupabase()) {
    return setSettingSupabase(key, value, description);
  } else if (usePostgres()) {
    return setSettingPostgres(key, value, description);
  } else {
    if (process.env.VERCEL) {
      throw new Error('No database configured on Vercel. Please set up Supabase or PostgreSQL.');
    }
    return setSettingSQLite(key, value, description);
  }
}
