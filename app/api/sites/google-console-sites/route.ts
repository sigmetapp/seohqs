import { NextResponse } from 'next/server';
import { createSearchConsoleService } from '@/lib/google-search-console';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/sites/google-console-sites
 * Получает список всех сайтов из Google Search Console
 */
export async function GET() {
  try {
    const searchConsoleService = createSearchConsoleService();
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
