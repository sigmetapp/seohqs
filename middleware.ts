import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getCurrentUser } from './lib/auth-utils';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Публичные пути, которые не требуют авторизации
  const publicPaths = ['/login'];

  // Проверяем, является ли путь публичным
  const isPublicPath = publicPaths.includes(pathname);

  // Если это публичный путь, разрешаем доступ
  if (isPublicPath) {
    return NextResponse.next();
  }

  // Проверяем авторизацию для всех остальных страниц
  const user = await getCurrentUser();

  // Если пользователь не авторизован, перенаправляем на страницу логина
  if (!user) {
    const loginUrl = new URL('/login', request.url);
    // Сохраняем текущий путь для редиректа после логина
    if (pathname !== '/') {
      loginUrl.searchParams.set('redirect', pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  // Если пользователь авторизован и пытается зайти на страницу логина, перенаправляем на главную
  if (pathname === '/login') {
    return NextResponse.redirect(new URL('/summary', request.url));
  }

  // Если пользователь авторизован, разрешаем доступ
  return NextResponse.next();
}

// Настраиваем, для каких путей запускать middleware
export const config = {
  matcher: [
    /*
     * Соответствует всем путям, кроме:
     * - api (API routes) - API роуты обрабатывают авторизацию самостоятельно
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder (статические файлы)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
