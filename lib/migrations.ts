import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { getDatabase } from './db';

export interface Migration {
  name: string;
  sql: string;
}

export function getMigrations(): Migration[] {
  const migrationsDir = join(process.cwd(), 'migrations');
  const files = readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
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

export function getExecutedMigrations(): string[] {
  const db = getDatabase();
  try {
    const result = db.prepare('SELECT name FROM migrations ORDER BY name').all() as { name: string }[];
    return result.map(r => r.name);
  } catch (error) {
    // Таблица migrations еще не создана
    return [];
  }
}

export function markMigrationAsExecuted(migrationName: string): void {
  const db = getDatabase();
  try {
    db.prepare('INSERT INTO migrations (name) VALUES (?)').run(migrationName);
  } catch (error) {
    console.error(`Error marking migration as executed: ${migrationName}`, error);
    throw error;
  }
}

export function runMigrations(): { executed: string[]; skipped: string[] } {
  const db = getDatabase();
  const allMigrations = getMigrations();
  const executedMigrations = getExecutedMigrations();
  
  const executed: string[] = [];
  const skipped: string[] = [];

  // Для SQLite используем миграции с _sqlite.sql
  // Для других БД - стандартные миграции
  const isSQLite = true; // Пока используем только SQLite
  
  for (const migration of allMigrations) {
    // Для SQLite используем только миграции с _sqlite.sql
    if (isSQLite && !migration.name.includes('_sqlite.sql')) {
      skipped.push(migration.name);
      continue;
    }

    if (executedMigrations.includes(migration.name)) {
      skipped.push(migration.name);
      continue;
    }

    try {
      // Выполняем миграцию
      db.exec(migration.sql);
      markMigrationAsExecuted(migration.name);
      executed.push(migration.name);
      console.log(`✓ Migration executed: ${migration.name}`);
    } catch (error) {
      console.error(`✗ Error executing migration ${migration.name}:`, error);
      throw error;
    }
  }

  return { executed, skipped };
}
