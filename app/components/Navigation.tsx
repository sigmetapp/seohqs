'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

interface User {
  id: number;
  email: string;
  name?: string;
  picture?: string;
}

export default function Navigation() {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Проверяем авторизацию при загрузке компонента
    fetch('/api/auth/user/me')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.user) {
          setUser(data.user);
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  const handleLogin = async () => {
    try {
      const response = await fetch('/api/auth/user/google');
      const data = await response.json();
      if (data.success && data.authUrl) {
        window.location.href = data.authUrl;
      }
    } catch (error) {
      console.error('Ошибка авторизации:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/user/logout', { method: 'POST' });
      setUser(null);
      window.location.href = '/';
    } catch (error) {
      console.error('Ошибка выхода:', error);
    }
  };

  const navItems = [
    { href: '/', label: 'Индексатор ссылок', icon: '🔗' },
    { href: '/link-profile', label: 'Ссылочный профиль', icon: '📊' },
    { href: '/sites', label: 'Панель сайтов', icon: '🌐' },
    { href: '/dashboard-gc', label: 'Dashboard GC', icon: '📈' },
    { href: '/integrations', label: 'Интеграции', icon: '⚙️' },
  ];

  return (
    <nav className="bg-gray-800 border-b border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <h1 className="text-xl font-bold text-white">SEO Tools</h1>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {navItems.map((item) => {
                const isActive = pathname === item.href || 
                  (item.href !== '/' && pathname?.startsWith(item.href));
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors ${
                      isActive
                        ? 'border-blue-500 text-blue-400'
                        : 'border-transparent text-gray-300 hover:text-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="mr-2">{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
          <div className="flex items-center">
            {loading ? (
              <div className="text-gray-400 text-sm">Загрузка...</div>
            ) : user ? (
              <div className="flex items-center space-x-4">
                {user.picture && (
                  <img
                    src={user.picture}
                    alt={user.name || user.email}
                    className="h-8 w-8 rounded-full"
                  />
                )}
                <Link
                  href="/profile"
                  className="text-gray-300 text-sm hover:text-white transition-colors"
                >
                  {user.name || user.email}
                </Link>
                <button
                  onClick={handleLogout}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
                >
                  Выйти
                </button>
              </div>
            ) : (
              <button
                onClick={handleLogin}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors flex items-center"
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Войти через Google
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className="sm:hidden">
        <div className="pt-2 pb-3 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== '/' && pathname?.startsWith(item.href));
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium transition-colors ${
                  isActive
                    ? 'bg-gray-900 border-blue-500 text-blue-400'
                    : 'border-transparent text-gray-300 hover:bg-gray-700 hover:text-gray-200'
                }`}
              >
                <span className="mr-2">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
