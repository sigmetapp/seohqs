'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

interface User {
  id: number;
  email: string;
  name?: string;
  picture?: string;
  avatar?: string;
}

export default function Navigation() {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  const fetchUser = async () => {
    try {
      const response = await fetch('/api/auth/user/me');
      const data = await response.json();
      if (data.success && data.user) {
        setUser(data.user);
      }
      setLoading(false);
    } catch (error) {
      console.error('Ошибка загрузки пользователя:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    // Проверяем авторизацию при загрузке компонента
    fetchUser();

    // Обновляем данные при фокусе на окне (когда пользователь возвращается на вкладку)
    const handleFocus = () => {
      fetchUser();
    };

    // Обновляем данные при обновлении профиля
    const handleProfileUpdate = () => {
      fetchUser();
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('userProfileUpdated', handleProfileUpdate);
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('userProfileUpdated', handleProfileUpdate);
    };
  }, []);

  const handleGoogleLogin = async () => {
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

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);

    try {
      const response = await fetch('/api/auth/user/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success && data.user) {
        setUser(data.user);
        setShowLoginModal(false);
        setEmail('');
        setPassword('');
        // Перезагружаем страницу для обновления состояния
        window.location.reload();
      } else {
        setLoginError(data.error || 'Ошибка входа');
      }
    } catch (error) {
      setLoginError('Ошибка входа в систему');
    } finally {
      setLoginLoading(false);
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
                {(user.avatar || user.picture) && (
                  <img
                    src={user.avatar || user.picture}
                    alt={user.name || user.email}
                    className="h-8 w-8 rounded-full object-cover"
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
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
                >
                  Войти
                </button>
                <button
                  onClick={handleGoogleLogin}
                  className="bg-white hover:bg-gray-100 text-gray-700 px-3 py-2 rounded text-sm font-bold transition-colors flex items-center justify-center w-10 h-10"
                  title="Войти через Google"
                >
                  G
                </button>
              </div>
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

      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">Вход</h2>
              <button
                onClick={() => {
                  setShowLoginModal(false);
                  setEmail('');
                  setPassword('');
                  setLoginError(null);
                }}
                className="text-gray-400 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleEmailLogin} className="space-y-4">
              {loginError && (
                <div className="bg-red-900 text-red-200 px-4 py-3 rounded">
                  {loginError}
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="your@email.com"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                  Пароль
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="••••••••"
                />
              </div>

              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={loginLoading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loginLoading ? 'Вход...' : 'Войти'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowLoginModal(false);
                    setEmail('');
                    setPassword('');
                    setLoginError(null);
                  }}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm font-medium transition-colors"
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </nav>
  );
}
