'use client';

import { useState, useEffect } from 'react';
import { IntegrationsSettings, GoogleAccount } from '@/lib/types';

export default function IntegrationsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [integrations, setIntegrations] = useState<IntegrationsSettings>({
    id: 1,
    googleSearchConsoleUrl: '',
    updatedAt: new Date().toISOString(),
  });
  const [googleAccounts, setGoogleAccounts] = useState<GoogleAccount[]>([]);

  const [formData, setFormData] = useState({
    googleSearchConsoleUrl: '',
  });
  const [showSearchConsoleGuide, setShowSearchConsoleGuide] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadIntegrations();
    loadGoogleAccounts();
    
    // Проверяем URL параметры для сообщений от OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const error = urlParams.get('error');
    
    if (success) {
      setMessage({ type: 'success', text: decodeURIComponent(success) });
      // Убираем параметр из URL
      window.history.replaceState({}, '', '/integrations');
      setTimeout(() => setMessage(null), 5000);
      // Перезагружаем аккаунты после успешной авторизации
      loadGoogleAccounts();
    } else if (error) {
      setMessage({ type: 'error', text: decodeURIComponent(error) });
      // Убираем параметр из URL
      window.history.replaceState({}, '', '/integrations');
    }
  }, []);

  const loadIntegrations = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/integrations');
      const data = await response.json();
      if (data.success && data.integrations) {
        setIntegrations(data.integrations);
        setFormData({
          googleSearchConsoleUrl: data.integrations.googleSearchConsoleUrl || '',
        });
        // OAuth токены загружаются автоматически в integrations, но не отображаются в форме
      }
    } catch (err) {
      console.error('Error loading integrations:', err);
      setMessage({ type: 'error', text: 'Ошибка загрузки настроек интеграций' });
    } finally {
      setLoading(false);
    }
  };

  const loadGoogleAccounts = async () => {
    try {
      const response = await fetch('/api/google-accounts');
      const data = await response.json();
      if (data.success && data.accounts) {
        setGoogleAccounts(data.accounts);
      }
    } catch (err) {
      console.error('Error loading Google accounts:', err);
    }
  };

  const handleDeleteAccount = async (accountId: number) => {
    if (!confirm('Вы уверены, что хотите удалить этот Google аккаунт?')) {
      return;
    }

    try {
      const response = await fetch(`/api/google-accounts/${accountId}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'Аккаунт успешно удален' });
        setTimeout(() => setMessage(null), 3000);
        loadGoogleAccounts();
      } else {
        setMessage({ type: 'error', text: data.error || 'Ошибка удаления аккаунта' });
      }
    } catch (err) {
      console.error('Error deleting account:', err);
      setMessage({ type: 'error', text: 'Ошибка удаления аккаунта' });
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage(null);
      
      const response = await fetch('/api/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (data.success) {
        setIntegrations(data.integrations);
        setMessage({ type: 'success', text: 'Настройки успешно сохранены' });
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: 'error', text: data.error || 'Ошибка сохранения настроек' });
      }
    } catch (err) {
      console.error('Error saving integrations:', err);
      setMessage({ type: 'error', text: 'Ошибка сохранения настроек' });
    } finally {
      setSaving(false);
    }
  };

  const isConfigured = (field: string) => {
    return integrations[field as keyof IntegrationsSettings] && 
           String(integrations[field as keyof IntegrationsSettings]).trim() !== '';
  };

  const handleGoogleAuth = async () => {
    try {
      const response = await fetch('/api/auth/google');
      const data = await response.json();
      
      if (data.success && data.authUrl) {
        // Если есть redirectUri, показываем его пользователю для справки
        if (data.redirectUri) {
          console.log('Redirect URI для добавления в Google Cloud Console:', data.redirectUri);
        }
        // Перенаправляем на страницу авторизации Google
        window.location.href = data.authUrl;
      } else {
        setMessage({ type: 'error', text: data.error || 'Ошибка начала авторизации' });
      }
    } catch (err) {
      console.error('Error starting Google auth:', err);
      setMessage({ type: 'error', text: 'Ошибка начала авторизации' });
    }
  };

  const isGoogleOAuthConfigured = () => {
    const accessToken = integrations.googleAccessToken?.trim() || '';
    const refreshToken = integrations.googleRefreshToken?.trim() || '';
    return !!(accessToken && refreshToken);
  };

  const getAuthorizedAccounts = () => {
    return googleAccounts.filter(account => 
      account.googleAccessToken?.trim() && account.googleRefreshToken?.trim()
    );
  };

  const hasAnyAuthorizedAccount = () => {
    return isGoogleOAuthConfigured() || getAuthorizedAccounts().length > 0;
  };

  const handleResetOAuth = async () => {
    if (!confirm('Вы уверены, что хотите сбросить авторизацию Google? После этого вам нужно будет авторизоваться заново.')) {
      return;
    }

    try {
      setSaving(true);
      setMessage(null);
      
      const response = await fetch('/api/integrations/oauth', {
        method: 'DELETE',
      });

      const data = await response.json();
      if (data.success) {
        // Обновляем состояние
        setIntegrations({
          ...integrations,
          googleAccessToken: '',
          googleRefreshToken: '',
          googleTokenExpiry: '',
        });
        setMessage({ type: 'success', text: 'Авторизация успешно сброшена' });
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: 'error', text: data.error || 'Ошибка сброса авторизации' });
      }
    } catch (err) {
      console.error('Error resetting OAuth:', err);
      setMessage({ type: 'error', text: 'Ошибка сброса авторизации' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-white p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center text-gray-900 dark:text-white">Загрузка...</div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 text-gray-900 dark:text-white">Интеграции</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Настройте подключения к внешним сервисам для использования во всех разделах приложения
          </p>
        </div>

        {message && (
          <div
            className={`mb-6 p-4 rounded-lg border ${
              message.type === 'success'
                ? 'bg-green-50 dark:bg-green-900/30 border-green-300 dark:border-green-700 text-green-800 dark:text-green-300'
                : 'bg-red-50 dark:bg-red-900/30 border-red-300 dark:border-red-700 text-red-800 dark:text-red-300'
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="space-y-6">
          {/* Google Search Console */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="text-3xl">🔍</div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Google Search Console</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Автоматическая синхронизация данных о производительности сайта в поиске Google
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowSearchConsoleGuide(true)}
                  className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  <span>📖</span>
                  <span>Как настроить?</span>
                </button>
                {hasAnyAuthorizedAccount() ? (
                  <div className="flex flex-col gap-1 items-end">
                    <div className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-300 dark:border-green-700 rounded-full text-xs font-medium">
                      Авторизовано в Google Search Console
                    </div>
                    {getAuthorizedAccounts().length > 0 && (
                      <div className="text-xs text-gray-600 dark:text-gray-400 text-right max-w-xs truncate" title={getAuthorizedAccounts().map(a => a.email).join(', ')}>
                        {getAuthorizedAccounts().length === 1 
                          ? `📧 ${getAuthorizedAccounts()[0].email}`
                          : `📧 ${getAuthorizedAccounts().length} аккаунтов`
                        }
                      </div>
                    )}
                    {isGoogleOAuthConfigured() && getAuthorizedAccounts().length === 0 && (
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        (старый способ авторизации)
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="px-3 py-1 rounded-full text-xs font-medium bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600">
                    Не авторизовано
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              {/* OAuth авторизация */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-bold text-blue-800 dark:text-blue-300 mb-1">Авторизация Google Search Console</h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Авторизуйтесь через Google аккаунт для доступа к данным Search Console. Можно добавить несколько аккаунтов.
                    </p>
                  </div>
                  <button
                    onClick={handleGoogleAuth}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                  >
                    <span>🔐</span>
                    <span>Добавить Google аккаунт</span>
                  </button>
                </div>
                
                {/* Список подключенных аккаунтов */}
                {googleAccounts.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Подключенные аккаунты:</h4>
                    {googleAccounts.map((account) => {
                      const isConfigured = !!(account.googleAccessToken?.trim() && account.googleRefreshToken?.trim());
                      return (
                        <div
                          key={account.id}
                          className="flex items-center justify-between bg-white dark:bg-gray-800/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700"
                        >
                          <div className="flex items-center gap-3">
                            <div className="text-lg">👤</div>
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">{account.email}</div>
                              <div className="text-xs text-gray-600 dark:text-gray-400">
                                {isConfigured ? (
                                  <span className="text-green-600 dark:text-green-400">✓ Авторизован</span>
                                ) : (
                                  <span className="text-yellow-600 dark:text-yellow-400">⚠ Требуется авторизация</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteAccount(account.id)}
                            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-medium transition-colors"
                            title="Удалить аккаунт"
                          >
                            Удалить
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
                
                {googleAccounts.length === 0 && (
                  <div className="mt-3 text-xs text-gray-600 dark:text-gray-400">
                    Нет подключенных Google аккаунтов. Нажмите кнопку выше, чтобы добавить первый аккаунт.
                  </div>
                )}
                <div className="text-xs text-yellow-700 dark:text-yellow-300 mt-2">
                  ⚠️ Перед авторизацией убедитесь, что GOOGLE_CLIENT_ID и GOOGLE_CLIENT_SECRET настроены в переменных окружения.
                  <br />
                  <a 
                    href="https://github.com/sigmetapp/seohqs/blob/main/GOOGLE_SEARCH_CONSOLE_OAUTH_SETUP.md" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="underline hover:text-yellow-600 dark:hover:text-yellow-200"
                  >
                    См. инструкцию по настройке
                  </a>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  URL сайта в Google Search Console
                </label>
                <input
                  type="url"
                  value={formData.googleSearchConsoleUrl}
                  onChange={(e) =>
                    setFormData({ ...formData, googleSearchConsoleUrl: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded border border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:outline-none"
                  placeholder="sc-domain:example.com или https://example.com"
                />
                <p className="text-xs text-gray-600 dark:text-gray-500 mt-1">
                  Укажите URL сайта из Google Search Console. Поддерживаются форматы: <code className="bg-gray-200 dark:bg-gray-900 text-gray-900 dark:text-white px-1 rounded">sc-domain:example.com</code>, <code className="bg-gray-200 dark:bg-gray-900 text-gray-900 dark:text-white px-1 rounded">https://example.com</code> или полный URL из интерфейса
                </p>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end gap-4 pt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
            >
              {saving ? 'Сохранение...' : 'Сохранить настройки'}
            </button>
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-6">
          <h3 className="text-lg font-bold mb-2 text-blue-800 dark:text-blue-300">ℹ️ Информация</h3>
          <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
            <li>
              • Настройки интеграций сохраняются централизованно и используются во всех разделах приложения
            </li>
            <li>
              • Google Search Console использует авторизацию через OAuth 2.0 для доступа к данным
            </li>
            <li>
              • Google Search Console позволяет автоматически получать данные о кликах, показах, CTR и позициях в поиске
            </li>
          </ul>
        </div>
      </div>

      {/* Google Search Console Guide Modal */}
      {showSearchConsoleGuide && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <span>🔍</span>
                <span>Настройка Google Search Console</span>
              </h2>
              <button
                onClick={() => setShowSearchConsoleGuide(false)}
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Описание */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                <h3 className="text-lg font-bold text-blue-800 dark:text-blue-300 mb-2">Что это дает?</h3>
                <p className="text-gray-700 dark:text-gray-300 text-sm">
                  Интеграция с Google Search Console позволяет автоматически получать данные о производительности ваших сайтов в поиске Google:
                </p>
                <ul className="mt-2 space-y-1 text-sm text-gray-700 dark:text-gray-300 list-disc list-inside">
                  <li>Количество кликов из поиска</li>
                  <li>Количество показов в поиске</li>
                  <li>CTR (Click-Through Rate)</li>
                  <li>Средняя позиция в поиске</li>
                </ul>
              </div>

              {/* Шаг 1 */}
              <div className="border-l-4 border-blue-500 pl-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">1</span>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Авторизуйтесь через Google</h3>
                </div>
                <div className="ml-10 space-y-2 text-gray-700 dark:text-gray-300 text-sm">
                  <p>Нажмите кнопку "Авторизоваться через Google" выше. Вы будете перенаправлены на страницу авторизации Google, где нужно будет:</p>
                  <ol className="list-decimal list-inside space-y-2 ml-2">
                    <li>Войти в свой Google аккаунт</li>
                    <li>Предоставить доступ к Google Search Console API</li>
                    <li>После успешной авторизации вы вернетесь на эту страницу</li>
                  </ol>
                  {!isGoogleOAuthConfigured() && (
                    <div className="bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded p-2 text-yellow-800 dark:text-yellow-300 text-xs mt-2">
                      ⚠ Сначала авторизуйтесь через Google, нажав кнопку выше
                    </div>
                  )}
                  {isGoogleOAuthConfigured() && (
                    <div className="bg-green-100 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded p-2 text-green-800 dark:text-green-300 text-xs mt-2">
                      ✓ Авторизация выполнена успешно
                    </div>
                  )}
                </div>
              </div>

              {/* Шаг 2 */}
              <div className="border-l-4 border-blue-500 pl-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">2</span>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Укажите URL сайта</h3>
                </div>
                <div className="ml-10 space-y-2 text-gray-700 dark:text-gray-300 text-sm">
                  <p>В поле выше укажите URL сайта из Google Search Console. Поддерживаются следующие форматы:</p>
                  <div className="bg-gray-100 dark:bg-gray-700 rounded p-3 space-y-2 font-mono text-xs">
                    <div className="text-green-600 dark:text-green-400">sc-domain:example.com</div>
                    <div className="text-green-600 dark:text-green-400">https://example.com</div>
                    <div className="text-gray-500 dark:text-gray-500">https://search.google.com/search-console/...?resource_id=sc-domain%3Aexample.com</div>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                    💡 <strong>Совет:</strong> Самый простой способ - скопировать URL из адресной строки браузера, когда вы находитесь на странице сайта в Google Search Console.
                  </p>
                </div>
              </div>

              {/* Шаг 3 */}
              <div className="border-l-4 border-green-500 pl-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-green-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">3</span>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Синхронизируйте данные</h3>
                </div>
                <div className="ml-10 space-y-2 text-gray-700 dark:text-gray-300 text-sm">
                  <p>После настройки:</p>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Сохраните настройки на этой странице</li>
                    <li>Перейдите на страницу сайта</li>
                    <li>Откройте вкладку <strong>Google Console</strong></li>
                    <li>Нажмите кнопку <strong>Синхронизировать</strong></li>
                    <li>Данные за последние 30 дней будут загружены автоматически</li>
                  </ol>
                </div>
              </div>

              {/* Решение проблем */}
              <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <span>🔧</span>
                  <span>Решение проблем</span>
                </h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="font-semibold text-red-600 dark:text-red-400 mb-1">Ошибка аутентификации</p>
                    <p className="text-gray-700 dark:text-gray-300">Убедитесь, что вы успешно авторизовались через Google. Проверьте, что GOOGLE_CLIENT_ID и GOOGLE_CLIENT_SECRET настроены в переменных окружения.</p>
                  </div>
                  <div>
                    <p className="font-semibold text-red-600 dark:text-red-400 mb-1">Ошибка 403: access_denied</p>
                    <p className="text-gray-700 dark:text-gray-300 mb-2">Если вы видите сообщение о том, что приложение находится в режиме тестирования, это означает, что приложение в Google Cloud Console находится в режиме Testing. Для подключения второго Google аккаунта необходимо:</p>
                    <ol className="list-decimal list-inside space-y-1 ml-2 text-gray-700 dark:text-gray-300 text-xs">
                      <li>Перейти в Google Cloud Console → APIs & Services → OAuth consent screen</li>
                      <li>Добавить email второго аккаунта в раздел "Test users" (нажать "+ ADD USERS")</li>
                      <li>Или перевести приложение в режим Production (нажать "PUBLISH APP")</li>
                    </ol>
                    <p className="text-gray-700 dark:text-gray-300 mt-2 text-xs">
                      Подробная инструкция: <a href="https://github.com/sigmetapp/seohqs/blob/main/GOOGLE_OAUTH_TESTING_MODE_FIX.md" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 underline">GOOGLE_OAUTH_TESTING_MODE_FIX.md</a>
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold text-red-600 dark:text-red-400 mb-1">Доступ запрещен (403) - другой случай</p>
                    <p className="text-gray-700 dark:text-gray-300">Убедитесь, что ваш Google аккаунт имеет доступ к сайту в Google Search Console. Перейдите в Google Search Console и проверьте, что сайт добавлен и у вас есть права доступа.</p>
                  </div>
                  <div>
                    <p className="font-semibold text-red-600 dark:text-red-400 mb-1">Неверный формат URL</p>
                    <p className="text-gray-700 dark:text-gray-300">Убедитесь, что URL корректный. Используйте формат <code className="bg-gray-200 dark:bg-gray-900 text-gray-900 dark:text-white px-1 rounded">sc-domain:example.com</code> или <code className="bg-gray-200 dark:bg-gray-900 text-gray-900 dark:text-white px-1 rounded">https://example.com</code></p>
                  </div>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 flex justify-end gap-3">
              <button
                onClick={() => setShowSearchConsoleGuide(false)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors"
              >
                Закрыть
              </button>
              <button
                onClick={() => {
                  setShowSearchConsoleGuide(false);
                  // Прокручиваем к полю ввода URL
                  setTimeout(() => {
                    document.querySelector('input[type="url"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    (document.querySelector('input[type="url"]') as HTMLInputElement)?.focus();
                  }, 100);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Настроить сейчас
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
