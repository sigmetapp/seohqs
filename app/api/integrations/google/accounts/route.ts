import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSupabaseAuthUserId } from '@/lib/gsc-integrations';
import { getGoogleGSCAccounts } from '@/lib/google-gsc-accounts';
import { requireAuth } from '@/lib/middleware-auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/integrations/google/accounts
 * Получает список всех активных Google аккаунтов текущего пользователя
 */
export async function GET(request: NextRequest) {
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

    // Получаем все активные аккаунты пользователя
    const accounts = await getGoogleGSCAccounts(userId);

    // Формируем ответ в требуемом формате
    return NextResponse.json({
      count: accounts.length,
      accounts: accounts.map(account => ({
        id: account.id,
        google_email: account.google_email,
        google_user_id: account.google_user_id,
        created_at: account.created_at,
      })),
    });
  } catch (error: any) {
    console.error('[GET /api/integrations/google/accounts] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Ошибка при получении списка аккаунтов' },
      { status: 500 }
    );
  }
}
