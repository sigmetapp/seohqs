import { NextResponse } from 'next/server';
import { getCurrentUser } from './auth-utils';
import type { NextRequest } from 'next/server';

/**
 * Middleware для проверки авторизации пользователя
 * Используется в API роутах для защиты от неавторизованного доступа
 */
export async function requireAuth(request: NextRequest): Promise<{ user: { id: number; email: string } } | NextResponse> {
  const user = await getCurrentUser();
  
  if (!user) {
    return NextResponse.json(
      {
        success: false,
        error: 'Требуется авторизация',
      },
      { status: 401 }
    );
  }
  
  return { user: { id: user.id, email: user.email } };
}
