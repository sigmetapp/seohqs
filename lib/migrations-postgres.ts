import { sql } from '@vercel/postgres';
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
    const result = await sql`SELECT name FROM migrations ORDER BY name`;
    return result.rows.map((r: any) => r.name);
  } catch (error) {
    // Таблица migrations еще не создана
    return [];
  }
}

export async function markMigrationAsExecuted(migrationName: string): Promise<void> {
  try {
    await sql`INSERT INTO migrations (name) VALUES (${migrationName})`;
  } catch (error) {
    console.error(`Error marking migration as executed: ${migrationName}`, error);
    throw error;
  }
}

export async function runMigrations(): Promise<{ executed: string[]; skipped: string[] }> {
  const allMigrations = getMigrations();
  const executedMigrations = await getExecutedMigrations();
  
  const executed: string[] = [];
  const skipped: string[] = [];

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

      for (const statement of statements) {
        if (statement.trim()) {
          // Используем query напрямую для выполнения SQL
          await sql.query(statement);
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
