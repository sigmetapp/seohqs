import { getPostgresClient } from './postgres-client';

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

export interface Migration {
  name: string;
  sql: string;
}

export function getMigrations(): Migration[] {
  const migrationsDir = join(process.cwd(), 'migrations');
  const files = readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql') && !file.includes('_sqlite'))
    .sort();

  return files.map(file => {
    const filePath = join(migrationsDir, file);
    const sql = readFileSync(filePath, 'utf-8');
    return {
      name: file,
      sql,
    };
  });
}

export async function getExecutedMigrations(): Promise<string[]> {
  try {
    const db = await getPostgresClient();
    // Сначала проверяем, существует ли таблица migrations
    await db.query('SELECT 1 FROM migrations LIMIT 1');
    const result = await db.query('SELECT name FROM migrations ORDER BY name');
    return result.rows.map((r: any) => r.name);
  } catch (error: any) {
    // Таблица migrations еще не создана или другая ошибка
    if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
      return [];
    }
    console.error('Error getting executed migrations:', error);
    return [];
  }
}

export async function markMigrationAsExecuted(migrationName: string): Promise<void> {
  try {
    const db = await getPostgresClient();
    await db.query('INSERT INTO migrations (name) VALUES ($1)', [migrationName]);
  } catch (error) {
    console.error(`Error marking migration as executed: ${migrationName}`, error);
    throw error;
  }
}

export async function runMigrations(): Promise<{ executed: string[]; skipped: string[] }> {
  // Проверяем доступность PostgreSQL
  if (!process.env.POSTGRES_URL && !process.env.DATABASE_URL) {
    throw new Error('PostgreSQL connection string not found. Please set POSTGRES_URL or DATABASE_URL environment variable.');
  }

  const allMigrations = getMigrations();
  const executedMigrations = await getExecutedMigrations();
  
  const executed: string[] = [];
  const skipped: string[] = [];

  if (allMigrations.length === 0) {
    console.warn('No migrations found');
    return { executed, skipped };
  }

  for (const migration of allMigrations) {
    if (executedMigrations.includes(migration.name)) {
      skipped.push(migration.name);
      continue;
    }

    try {
      // Выполняем миграцию (разделяем по ; для выполнения нескольких команд)
      const statements = migration.sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      const db = await getPostgresClient();
      for (const statement of statements) {
        if (statement.trim()) {
          try {
            // Выполняем SQL запрос напрямую
            await db.query(statement);
          } catch (queryError: any) {
            // Игнорируем ошибки "already exists" для CREATE TABLE IF NOT EXISTS
            if (queryError?.code === '42P07' || queryError?.message?.includes('already exists')) {
              console.log(`  Table/index already exists, skipping: ${statement.substring(0, 50)}...`);
              continue;
            }
            throw queryError;
          }
        }
      }

      await markMigrationAsExecuted(migration.name);
      executed.push(migration.name);
      console.log(`✓ Migration executed: ${migration.name}`);
    } catch (error) {
      console.error(`✗ Error executing migration ${migration.name}:`, error);
      throw error;
    }
  }

  return { executed, skipped };
}
