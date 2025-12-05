'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useI18n } from '@/lib/i18n-context';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useI18n();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false);
  const [debugSteps, setDebugSteps] = useState<Array<{ step: string; status: 'pending' | 'success' | 'error'; message: string; details?: any }>>([]);
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    // Проверяем, есть ли ошибка в URL параметрах
    const errorParam = searchParams.get('error');
    if (errorParam) {
      setError(decodeURIComponent(errorParam));
    }
  }, [searchParams]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

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
        // Получаем redirect параметр или используем / по умолчанию
        const redirect = searchParams.get('redirect') || '/';
        router.push(redirect);
      } else {
        setError(data.error || t('auth.loginError'));
      }
    } catch (err: any) {
      setError(t('auth.loginError'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch('/api/auth/user/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, name }),
      });

      const data = await response.json();

      if (data.success) {
        // После регистрации автоматически входим
        const loginResponse = await fetch('/api/auth/user/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
        });

        const loginData = await loginResponse.json();
        if (loginData.success && loginData.user) {
          const redirect = searchParams.get('redirect') || '/';
          router.push(redirect);
        } else {
          setError('Регистрация успешна, но не удалось войти. Попробуйте войти вручную.');
        }
      } else {
        setError(data.error || 'Ошибка регистрации');
      }
    } catch (err: any) {
      setError('Ошибка регистрации');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setForgotPasswordLoading(true);
    setDebugSteps([]);
    setShowDebug(true);

    try {
      const response = await fetch('/api/auth/user/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: forgotPasswordEmail, debug: true }),
      });

      const data = await response.json();

      if (data.debug) {
        setDebugSteps(data.debug);
      }

      if (data.success) {
        setForgotPasswordSuccess(true);
        // Не скрываем дебаг панель сразу, чтобы пользователь мог увидеть все этапы
        setTimeout(() => {
          setShowForgotPassword(false);
          setForgotPasswordEmail('');
          setForgotPasswordSuccess(false);
          setDebugSteps([]);
          setShowDebug(false);
        }, 8000); // Увеличиваем время до 8 секунд, чтобы пользователь успел увидеть дебаг информацию
      } else {
        setError(data.error || t('login.resetPasswordError'));
        // При ошибке тоже показываем дебаг панель, если она есть
        if (data.debug && data.debug.length > 0) {
          setShowDebug(true);
        }
      }
    } catch (err: any) {
      setError(t('login.resetPasswordError'));
      console.error(err);
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg shadow-lg p-8 border border-gray-200 dark:border-gray-700">
      {error && (
        <div className="mb-6 bg-red-100 dark:bg-red-900/50 border border-red-400 dark:border-red-500 text-red-700 dark:text-red-200 px-4 py-3 rounded">
          {error}
        </div>
      )}

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

      {/* Email/Password Form */}
      <form onSubmit={isRegistering ? handleRegister : handleEmailLogin} className="space-y-4">
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
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            className="w-full px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="your@email.com"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('auth.password')}
            </label>
            <button
              type="button"
              onClick={() => setShowForgotPassword(true)}
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
            >
              {t('login.forgotPassword')}
            </button>
          </div>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete={isRegistering ? "new-password" : "current-password"}
            className="w-full px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (isRegistering ? 'Регистрация...' : t('auth.loggingIn')) : (isRegistering ? 'Зарегистрироваться' : t('auth.login'))}
        </button>
      </form>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t('login.resetPasswordTitle')}</h3>
              <button
                onClick={() => {
                  setShowForgotPassword(false);
                  setForgotPasswordEmail('');
                  setForgotPasswordSuccess(false);
                  setError(null);
                  setDebugSteps([]);
                  setShowDebug(false);
                }}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Debug Panel */}
            {showDebug && debugSteps.length > 0 && (
              <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg max-h-96 overflow-y-auto">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                    🔍 Отладочная информация ({debugSteps.length} этапов)
                  </h4>
                  <button
                    onClick={() => setShowDebug(false)}
                    className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white"
                  >
                    Скрыть
                  </button>
                </div>
                <div className="space-y-2">
                  {debugSteps.map((step, index) => (
                    <div
                      key={index}
                      className={`p-2 rounded text-xs ${
                        step.status === 'success'
                          ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                          : step.status === 'error'
                          ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                          : 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <span className="font-mono font-bold text-gray-600 dark:text-gray-400 shrink-0">
                          {step.step}.
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className={`font-medium ${
                            step.status === 'success'
                              ? 'text-green-700 dark:text-green-300'
                              : step.status === 'error'
                              ? 'text-red-700 dark:text-red-300'
                              : 'text-yellow-700 dark:text-yellow-300'
                          }`}>
                            {step.message}
                          </div>
                          {step.details && Object.keys(step.details).length > 0 && (
                            <details className="mt-1">
                              <summary className="cursor-pointer text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 text-xs">
                                Показать детали
                              </summary>
                              <pre className="mt-1 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-x-auto">
                                {JSON.stringify(step.details, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                        <span className={`text-xs shrink-0 ${
                          step.status === 'success'
                            ? 'text-green-600 dark:text-green-400'
                            : step.status === 'error'
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-yellow-600 dark:text-yellow-400'
                        }`}>
                          {step.status === 'success' ? '✓' : step.status === 'error' ? '✗' : '…'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {forgotPasswordSuccess ? (
              <div className="text-center py-4">
                <div className="mb-4">
                  <svg className="mx-auto h-12 w-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-gray-700 dark:text-gray-300 mb-2">{t('login.resetPasswordSuccess')}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('login.resetPasswordCheckEmail')}</p>
              </div>
            ) : (
              <>
                <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
                  {t('login.resetPasswordDesc')}
                </p>
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div>
                    <label htmlFor="forgotPasswordEmail" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      id="forgotPasswordEmail"
                      value={forgotPasswordEmail}
                      onChange={(e) => setForgotPasswordEmail(e.target.value)}
                      required
                      autoComplete="email"
                      className="w-full px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="your@email.com"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowForgotPassword(false);
                        setForgotPasswordEmail('');
                        setError(null);
                        setDebugSteps([]);
                        setShowDebug(false);
                      }}
                      className="flex-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                      {t('login.cancel')}
                    </button>
                    <button
                      type="submit"
                      disabled={forgotPasswordLoading}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {forgotPasswordLoading ? t('login.sending') : t('login.send')}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function LoginPage() {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            {t('auth.loginTitle')}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            {t('login.subtitle')}
          </p>
        </div>
        
        <Suspense fallback={
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg shadow-lg p-8 border border-gray-200 dark:border-gray-700">
            <div className="text-center text-gray-600 dark:text-gray-400">{t('auth.loading')}</div>
          </div>
        }>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
