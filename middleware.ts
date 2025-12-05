import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Упрощенный middleware - только редирект с /login если пользователь авторизован
// Все страницы публичные, авторизация проверяется на клиенте и в API
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Если это не страница логина, разрешаем доступ
  if (pathname !== '/login') {
    return NextResponse.next();
  }

  // Для страницы логина просто разрешаем доступ
  // Редирект на главную при авторизации обрабатывается на клиенте
  return NextResponse.next();
}

export const config = {
  matcher: ['/login'],
};
