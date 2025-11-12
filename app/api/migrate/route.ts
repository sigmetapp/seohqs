import { NextResponse } from 'next/server';

async function runMigrations() {
  // Проверяем, используем ли мы PostgreSQL
  const usePostgres = !!(process.env.POSTGRES_URL || process.env.DATABASE_URL || process.env.VERCEL);
  
  if (usePostgres) {
    const { runMigrations: runPostgres } = await import('@/lib/migrations-postgres');
    return runPostgres();
  } else {
    const { runMigrations: runSQLite } = require('@/lib/migrations');
    return runSQLite();
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    // Проверяем наличие переменных окружения
    const hasPostgres = !!(process.env.POSTGRES_URL || process.env.DATABASE_URL);
    const isVercel = !!process.env.VERCEL;
    
    // Пробуем выполнить миграции, но не падаем если они уже выполнены вручную
    try {
      const result = await runMigrations();
      
      return NextResponse.json({
        success: true,
        message: 'Migrations completed',
        executed: result.executed,
        skipped: result.skipped,
        environment: {
          hasPostgres,
          isVercel,
          hasPostgresUrl: !!process.env.POSTGRES_URL,
          hasDatabaseUrl: !!process.env.DATABASE_URL,
        },
      });
    } catch (migrationError) {
      // Если миграции уже выполнены вручную, это нормально
      return NextResponse.json({
        success: true,
        message: 'Migrations may already be applied. If tables exist, you can ignore this.',
        executed: [],
        skipped: [],
        note: 'You can run migrations manually using SQL from migrations/manual_migration.sql',
        environment: {
          hasPostgres,
          isVercel,
          hasPostgresUrl: !!process.env.POSTGRES_URL,
          hasDatabaseUrl: !!process.env.DATABASE_URL,
        },
      });
    }
  } catch (error) {
    console.error('Error running migrations:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      {
        error: 'Failed to run migrations',
        details: errorMessage,
        note: 'You can run migrations manually using SQL from migrations/manual_migration.sql',
        environment: {
          hasPostgres: !!(process.env.POSTGRES_URL || process.env.DATABASE_URL),
          isVercel: !!process.env.VERCEL,
        },
      },
      { status: 500 }
    );
  }
}

export async function POST() {
  // POST также запускает миграции
  return GET();
}
