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
  } catch (error) {
    console.error('Error running migrations:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    return NextResponse.json(
      {
        error: 'Failed to run migrations',
        details: errorMessage,
        stack: process.env.NODE_ENV === 'development' ? errorStack : undefined,
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
