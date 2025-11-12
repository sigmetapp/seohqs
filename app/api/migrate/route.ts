import { NextResponse } from 'next/server';
import { runMigrations } from '@/lib/migrations';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const result = runMigrations();
    
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
