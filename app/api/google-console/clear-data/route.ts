import { NextResponse } from 'next/server';
import { clearGoogleSearchConsoleData } from '@/lib/db-adapter';
import { requireAuth } from '@/lib/middleware-auth';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/google-console/clear-data
 * Очищает данные Google Search Console из БД
 * Query параметры:
 *   - siteId: ID сайта (опционально, если не указан - очищает все данные)
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    
    const { searchParams } = new URL(request.url);
    const siteIdParam = searchParams.get('siteId');
    const siteId = siteIdParam ? parseInt(siteIdParam) : undefined;
    
    await clearGoogleSearchConsoleData(siteId);
    
    return NextResponse.json({
      success: true,
      message: siteId 
        ? `Данные Google Search Console для сайта ${siteId} очищены`
        : 'Все данные Google Search Console очищены',
    });
  } catch (error: any) {
    console.error('Ошибка очистки данных Google Search Console:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Ошибка очистки данных',
      },
      { status: 500 }
    );
  }
}
