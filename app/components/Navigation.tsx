'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTheme } from '@/lib/theme-context';
import { useI18n } from '@/lib/i18n-context';

interface User {
  id: number;
  email: string;
  name?: string;
  picture?: string;
  avatar?: string;
}

export default function Navigation() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useI18n();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  const fetchUser = () => {
    setLoading(true);
    fetch('/api/auth/user/me')
      .then(res => {
        if (res.status === 401) {
          // Пользователь не авторизован - это нормально
          return { success: false };
        }
        return res.json();
      })
      .then(data => {
        if (data.success && data.user) {
          setUser(data.user);
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchUser();
  }, []);


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
        setName('');
        setIsRegistering(false);
        fetchUser();
      } else {
        setLoginError(data.error || t('auth.loginError'));
      }
    } catch (error) {
      setLoginError(t('auth.loginError'));
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);

    try {
      const response = await fetch('/api/auth/user/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, name }),
      });

      const data = await response.json();

      if (data.success && data.user) {
        setUser(data.user);
        setShowLoginModal(false);
        setEmail('');
        setPassword('');
        setName('');
        setIsRegistering(false);
        fetchUser();
      } else {
        setLoginError(data.error || 'Ошибка регистрации');
      }
    } catch (error) {
      setLoginError('Ошибка регистрации');
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
      console.error('Logout error:', error);
    }
  };

  const navItems: Array<{ href: string; labelKey: string }> = [
    { href: '/content-generator', labelKey: 'Content Generator' },
  ];

  return (
    <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="flex items-center">
                <h1 className="text-2xl font-extrabold bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 dark:from-blue-400 dark:via-blue-300 dark:to-indigo-400 bg-clip-text text-transparent tracking-tight">
                  seohqs
                </h1>
              </Link>
            </div>
            <div className="hidden md:ml-4 md:flex md:space-x-4 lg:space-x-6 md:items-center">
              {navItems.map((item) => {
                const isActive = pathname === item.href || 
                  (item.href !== '/' && pathname?.startsWith(item.href));
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={(e) => {
                      if (!user && !loading) {
                        e.preventDefault();
                        window.location.href = '/login';
                      }
                    }}
                    className={`inline-flex items-center px-2 pt-1 border-b-2 text-sm font-medium transition-colors whitespace-nowrap ${
                      isActive
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-300'
                    }`}
                  >
                    {item.labelKey === 'Content Generator' ? 'Content Generator' : t(item.labelKey)}
                  </Link>
                );
              })}
              
            </div>
          </div>
          <div className="flex items-center space-x-2 md:space-x-3">
            {/* Language switcher */}
            <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded overflow-hidden">
              <button
                onClick={() => setLanguage('ru')}
                className={`px-2 py-1 text-xs font-medium transition-colors ${
                  language === 'ru'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                RU
              </button>
              <button
                onClick={() => setLanguage('en')}
                className={`px-2 py-1 text-xs font-medium transition-colors ${
                  language === 'en'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                Eng
              </button>
            </div>

            {/* Theme switcher */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            >
              {theme === 'dark' ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>

            {loading ? (
              <div className="text-gray-600 dark:text-gray-400 text-sm">{t('auth.loading')}</div>
            ) : user ? (
              <div className="flex items-center space-x-4">
                {(user.avatar || user.picture) && (
                  <img
                    src={user.avatar || user.picture}
                    alt={user.name || user.email}
                    className="h-8 w-8 rounded-full"
                  />
                )}
                <span className="text-gray-700 dark:text-gray-300 text-sm">
                  {user.name || user.email}
                </span>
                {user.email === 'admin@buylink.pro' && (
                  <Link
                    href="/admin/settings"
                    className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white text-sm font-medium"
                  >
                    Настройки
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
                >
                  {t('auth.logout')}
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setShowLoginModal(true);
                  setIsRegistering(false);
                  setEmail('');
                  setPassword('');
                  setName('');
                  setLoginError(null);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
              >
                {t('auth.login')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className="md:hidden">
        <div className="pt-2 pb-3 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== '/' && pathname?.startsWith(item.href));
            
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={(e) => {
                  if (!user && !loading) {
                    e.preventDefault();
                    window.location.href = '/login';
                  }
                }}
                className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium transition-colors ${
                  isActive
                    ? 'bg-gray-100 dark:bg-gray-900 border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                {t(item.labelKey)}
              </Link>
            );
          })}
          
        </div>
      </div>

      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {isRegistering ? 'Регистрация' : t('auth.loginTitle')}
              </h2>
              <button
                onClick={() => {
                  setShowLoginModal(false);
                  setEmail('');
                  setPassword('');
                  setName('');
                  setLoginError(null);
                  setIsRegistering(false);
                }}
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Toggle between Login and Register */}
            <div className="mb-6 flex gap-2 border-b border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setIsRegistering(false)}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                  !isRegistering
                    ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                Вход
              </button>
              <button
                type="button"
                onClick={() => setIsRegistering(true)}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                  isRegistering
                    ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                Регистрация
              </button>
            </div>

            <form onSubmit={isRegistering ? handleRegister : handleEmailLogin} className="space-y-4">
              {loginError && (
                <div className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 px-4 py-3 rounded">
                  {loginError}
                </div>
              )}

              {isRegistering && (
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Имя
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required={isRegistering}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ваше имя"
                  />
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('auth.email')}
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="your@email.com"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('auth.password')}
                  </label>
                </div>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete={isRegistering ? "new-password" : "current-password"}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="••••••••"
                />
              </div>

              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={loginLoading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loginLoading
                    ? isRegistering
                      ? 'Регистрация...'
                      : t('auth.loggingIn')
                    : isRegistering
                    ? 'Зарегистрироваться'
                    : t('auth.login')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowLoginModal(false);
                    setEmail('');
                    setPassword('');
                    setName('');
                    setLoginError(null);
                    setIsRegistering(false);
                  }}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded text-sm font-medium transition-colors"
                >
                  {t('auth.cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </nav>
  );
}
