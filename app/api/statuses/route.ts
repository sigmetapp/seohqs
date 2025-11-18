import { NextResponse } from 'next/server';
import { getAllStatuses } from '@/lib/db-adapter';
import { requireAuth } from '@/lib/middleware-auth';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    
    const statuses = await getAllStatuses();
    
    return NextResponse.json({
      success: true,
      statuses,
    });
  } catch (error: any) {
    console.error('Error fetching statuses:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Ошибка получения статусов',
      },
      { status: 500 }
    );
  }
}
