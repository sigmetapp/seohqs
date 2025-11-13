import { NextResponse } from 'next/server';
import { loadGoogleConsoleSites } from '@/lib/load-google-console-sites';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/sites/load-google-console-sites
 * Загружает все сайты из Google Search Console и их данные
 */
export async function POST() {
  try {
    const result = await loadGoogleConsoleSites();
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
