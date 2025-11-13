import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';

const SECRET_KEY = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || 'your-secret-key-change-in-production';
const COOKIE_NAME = 'auth-token';

export interface User {
  id: number;
  email: string;
  name?: string;
  picture?: string;
  googleId?: string;
}

export interface Session {
  user: User;
  expires: string;
}

// Создаем JWT токен для пользователя
export async function createSession(user: User): Promise<string> {
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 дней
  const session = await new SignJWT({ user })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expires)
    .sign(new TextEncoder().encode(SECRET_KEY));

  return session;
}

// Проверяем и получаем сессию из токена
export async function getSession(): Promise<Session | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;

    if (!token) {
      return null;
    }

    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(SECRET_KEY)
    );

    // Извлекаем данные из payload
    const sessionData = payload as { user?: User; exp?: number };
    
    if (!sessionData.user) {
      return null;
    }

    // Преобразуем exp (expiration timestamp) в строку даты
    const expires = sessionData.exp 
      ? new Date(sessionData.exp * 1000).toISOString()
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    return {
      user: sessionData.user,
      expires,
    };
  } catch (error) {
    console.error('Error verifying session:', error);
    return null;
  }
}

// Удаляем сессию
export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

// Устанавливаем cookie с сессией
export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60, // 30 дней
    path: '/',
  });
}

// Получаем текущего пользователя
export async function getCurrentUser(): Promise<User | null> {
  const session = await getSession();
  return session?.user || null;
}
