import { NextResponse } from 'next/server';
import { createSearchConsoleService } from '@/lib/google-search-console';
import { requireAuth } from '@/lib/middleware-auth';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/sites/google-console-sites
 * Получает список всех сайтов из Google Search Console
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;
    
    const { searchParams } = new URL(request.url);
    const accountIdParam = searchParams.get('accountId');
    const accountId = accountIdParam ? parseInt(accountIdParam) : undefined;
    
    const searchConsoleService = createSearchConsoleService(accountId, user.id);
    const sites = await searchConsoleService.getSites();
    
    return NextResponse.json({
      success: true,
      sites: sites.map(site => ({
        siteUrl: site.siteUrl,
        permissionLevel: site.permissionLevel,
      })),
    });
  } catch (error: any) {
    console.error('Ошибка получения списка сайтов из Google Search Console:', error);
    
    let errorMessage = error.message || 'Ошибка получения списка сайтов';
    
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
