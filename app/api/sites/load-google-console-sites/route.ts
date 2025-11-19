import { NextResponse } from 'next/server';
import { loadGoogleConsoleSites } from '@/lib/load-google-console-sites';
import { requireAuth } from '@/lib/middleware-auth';
import { NextRequest } from 'next/server';
import { cache } from '@/lib/cache';
import { getAllSites, getAllGoogleAccounts } from '@/lib/db-adapter';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/sites/load-google-console-sites
 * Загружает все сайты из Google Search Console и их данные
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;
    
    const result = await loadGoogleConsoleSites(user.id);
    
    // Инвалидируем кеш для всех сайтов пользователя
    // Очищаем кеш агрегированных данных для всех периодов
    const sites = await getAllSites(user.id);
    const accounts = await getAllGoogleAccounts(user.id);
    
    for (const site of sites) {
      // Очищаем кеш daily данных для всех периодов
      for (const days of [180, 360]) {
        cache.delete(`google-console-daily-${site.id}-${days}`);
      }
    }
    
    // Очищаем кеш агрегированных данных для всех периодов и аккаунтов
    for (const days of [180, 360]) {
      // Очищаем для default (без accountId)
      cache.delete(`google-console-aggregated-${user.id}-default-${days}`);
      // Очищаем для всех аккаунтов пользователя
      for (const account of accounts) {
        cache.delete(`google-console-aggregated-${user.id}-${account.id}-${days}`);
      }
    }
    
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Ошибка загрузки сайтов из Google Search Console:', error);
    
    let errorMessage = error.message || 'Ошибка загрузки сайтов';
    
    if (errorMessage.includes('OAuth') || errorMessage.includes('авторизоваться')) {
      errorMessage = 'Ошибка аутентификации. Убедитесь, что вы авторизованы через Google в разделе Интеграции.';
    } else if (errorMessage.includes('не включен') || errorMessage.includes('is disabled') || errorMessage.includes('has not been used')) {
      // Сообщение об ошибке уже содержит ссылку на включение API
      // Оставляем его как есть
    }
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
