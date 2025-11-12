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
    const result = await runMigrations();
    
    return NextResponse.json({
      success: true,
      message: 'Migrations completed',
      executed: result.executed,
      skipped: result.skipped,
    });
  } catch (error) {
    console.error('Error running migrations:', error);
    return NextResponse.json(
      {
        error: 'Failed to run migrations',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST() {
  // POST также запускает миграции
  return GET();
}
