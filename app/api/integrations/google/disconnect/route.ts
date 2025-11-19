import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSupabaseAuthUserId } from '@/lib/gsc-integrations';
import { deactivateGoogleGSCAccount, getGoogleGSCAccountById } from '@/lib/google-gsc-accounts';
import { requireAuth } from '@/lib/middleware-auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/integrations/google/disconnect
 * Отвязывает Google аккаунт (помечает как неактивный)
 * 
 * Body: { id: string } - UUID записи в google_gsc_accounts
 */
export async function POST(request: NextRequest) {
  try {
    // Проверяем аутентификацию через существующую систему
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    // Получаем Supabase Auth user ID
    const userId = await getSupabaseAuthUserId(request);
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Supabase Auth не настроен или пользователь не найден. Таблица google_gsc_accounts требует Supabase Auth.' },
        { status: 401 }
      );
    }

    // Парсим тело запроса
    const body = await request.json();
    const { id } = body;

    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { error: 'Не указан ID аккаунта' },
        { status: 400 }
      );
    }

    // Проверяем, что аккаунт принадлежит текущему пользователю
    const account = await getGoogleGSCAccountById(id, userId);
    
    if (!account) {
      return NextResponse.json(
        { error: 'Аккаунт не найден или не принадлежит текущему пользователю' },
        { status: 403 }
      );
    }

    // Деактивируем аккаунт (soft delete через флаг is_active)
    const success = await deactivateGoogleGSCAccount(id, userId);

    if (!success) {
      return NextResponse.json(
        { error: 'Не удалось отвязать аккаунт' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[POST /api/integrations/google/disconnect] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Ошибка при отвязке аккаунта' },
      { status: 500 }
    );
  }
}
