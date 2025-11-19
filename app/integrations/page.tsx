'use client';

import { useState, useEffect } from 'react';
import { GoogleAccount, GSCIntegration } from '@/lib/types';
import { useI18n } from '@/lib/i18n-context';

interface DebugInfo {
  timestamp: string;
  type: 'api' | 'error' | 'info';
  endpoint?: string;
  status?: number;
  data?: any;
  error?: string;
  message?: string;
}

export default function IntegrationsPage() {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [googleAccounts, setGoogleAccounts] = useState<GoogleAccount[]>([]);
  const [gscIntegration, setGscIntegration] = useState<GSCIntegration | null>(null);
  const [gscLoading, setGscLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [debugInfo, setDebugInfo] = useState<DebugInfo[]>([]);
  const [showDebug, setShowDebug] = useState(false);
  const [userId, setUserId] = useState<string | number | null>(null);

  const addDebugInfo = (info: DebugInfo) => {
    setDebugInfo(prev => [...prev.slice(-49), info]); // Keep last 50 entries
  };

  useEffect(() => {
    loadGoogleAccounts();
    loadGSCIntegration();
    
    // Проверяем URL параметры для сообщений от OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const error = urlParams.get('error');
    
    if (success) {
      setMessage({ type: 'success', text: decodeURIComponent(success) });
      addDebugInfo({
        timestamp: new Date().toISOString(),
        type: 'info',
        message: `OAuth success: ${decodeURIComponent(success)}`,
      });
      // Убираем параметр из URL
      window.history.replaceState({}, '', '/integrations');
      setTimeout(() => setMessage(null), 5000);
      // Перезагружаем аккаунты после успешной авторизации
      loadGoogleAccounts();
      loadGSCIntegration();
    } else if (error) {
      setMessage({ type: 'error', text: decodeURIComponent(error) });
      addDebugInfo({
        timestamp: new Date().toISOString(),
        type: 'error',
        message: `OAuth error: ${decodeURIComponent(error)}`,
      });
      // Убираем параметр из URL
      window.history.replaceState({}, '', '/integrations');
    }
  }, []);

  const loadGoogleAccounts = async () => {
    try {
      setLoading(true);
      addDebugInfo({
        timestamp: new Date().toISOString(),
        type: 'api',
        endpoint: '/api/google-accounts',
        message: 'Loading Google accounts...',
      });

      const response = await fetch('/api/google-accounts');
      const data = await response.json();
      
      addDebugInfo({
        timestamp: new Date().toISOString(),
        type: 'api',
        endpoint: '/api/google-accounts',
        status: response.status,
        data: {
          success: data.success,
          accountsCount: data.accounts?.length || 0,
          accounts: data.accounts,
          error: data.error,
        },
      });

      if (data.success && data.accounts) {
        setGoogleAccounts(data.accounts);
        addDebugInfo({
          timestamp: new Date().toISOString(),
          type: 'info',
          message: `Loaded ${data.accounts.length} Google account(s)`,
        });
      } else {
        addDebugInfo({
          timestamp: new Date().toISOString(),
          type: 'error',
          endpoint: '/api/google-accounts',
          error: data.error || 'Unknown error',
          message: 'Failed to load Google accounts',
        });
        setGoogleAccounts([]);
      }
    } catch (err: any) {
      console.error('Error loading Google accounts:', err);
      addDebugInfo({
        timestamp: new Date().toISOString(),
        type: 'error',
        endpoint: '/api/google-accounts',
        error: err.message || String(err),
        message: 'Exception while loading Google accounts',
      });
      setGoogleAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  const loadGSCIntegration = async () => {
    try {
      setGscLoading(true);
      addDebugInfo({
        timestamp: new Date().toISOString(),
        type: 'api',
        endpoint: '/api/gsc-integration',
        message: 'Loading GSC integration...',
      });

      const response = await fetch('/api/gsc-integration');
      const data = await response.json();
      
      addDebugInfo({
        timestamp: new Date().toISOString(),
        type: 'api',
        endpoint: '/api/gsc-integration',
        status: response.status,
        data: {
          success: data.success,
          connected: data.connected,
          hasIntegration: !!data.integration,
          integrationEmail: data.integration?.google_email,
          error: data.error,
        },
      });

      if (data.success) {
        if (data.connected && data.integration) {
          setGscIntegration(data.integration);
          addDebugInfo({
            timestamp: new Date().toISOString(),
            type: 'info',
            message: `GSC integration connected: ${data.integration.google_email}`,
          });
        } else {
          setGscIntegration(null);
          addDebugInfo({
            timestamp: new Date().toISOString(),
            type: 'info',
            message: 'GSC integration not connected',
          });
        }
      } else {
        addDebugInfo({
          timestamp: new Date().toISOString(),
          type: 'error',
          endpoint: '/api/gsc-integration',
          error: data.error || 'Unknown error',
          message: 'Failed to load GSC integration',
        });
        setGscIntegration(null);
      }
    } catch (err: any) {
      console.error('Error loading GSC integration:', err);
      addDebugInfo({
        timestamp: new Date().toISOString(),
        type: 'error',
        endpoint: '/api/gsc-integration',
        error: err.message || String(err),
        message: 'Exception while loading GSC integration',
      });
      setGscIntegration(null);
    } finally {
      setGscLoading(false);
    }
  };

  // Load user ID for debug panel
  useEffect(() => {
    const loadUserId = async () => {
      try {
        addDebugInfo({
          timestamp: new Date().toISOString(),
          type: 'api',
          endpoint: '/api/auth/user/me',
          message: 'Loading user info...',
        });
        const response = await fetch('/api/auth/user/me');
        const data = await response.json();
        
        addDebugInfo({
          timestamp: new Date().toISOString(),
          type: 'api',
          endpoint: '/api/auth/user/me',
          status: response.status,
          data: {
            success: data.success,
            userId: data.user?.id,
            userEmail: data.user?.email,
            error: data.error,
          },
        });
        
        if (response.ok && data.success && data.user?.id) {
          setUserId(data.user.id);
          addDebugInfo({
            timestamp: new Date().toISOString(),
            type: 'info',
            message: `User ID loaded: ${data.user.id} (${data.user.email})`,
          });
        } else {
          addDebugInfo({
            timestamp: new Date().toISOString(),
            type: 'error',
            endpoint: '/api/auth/user/me',
            error: data.error || 'Failed to load user',
          });
        }
      } catch (err: any) {
        addDebugInfo({
          timestamp: new Date().toISOString(),
          type: 'error',
          endpoint: '/api/auth/user/me',
          error: err.message || String(err),
          message: 'Exception while loading user info',
        });
      }
    };
    loadUserId();
  }, []);

  const handleDisconnectGSC = async () => {
    if (!confirm('Are you sure you want to disconnect Google Search Console? This will remove all stored access tokens.')) {
      return;
    }

    try {
      const response = await fetch('/api/gsc-integration', {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'Google Search Console disconnected successfully' });
        setTimeout(() => setMessage(null), 3000);
        setGscIntegration(null);
      } else {
        setMessage({ type: 'error', text: data.error || 'Error disconnecting Google Search Console' });
      }
    } catch (err) {
      console.error('Error disconnecting GSC:', err);
      setMessage({ type: 'error', text: 'Error disconnecting Google Search Console' });
    }
  };

  const handleDeleteAccount = async (accountId: number) => {
    if (!confirm(t('integrations.confirmDeleteAccount'))) {
      return;
    }

    try {
      addDebugInfo({
        timestamp: new Date().toISOString(),
        type: 'api',
        endpoint: `/api/google-accounts/${accountId}`,
        message: `Deleting account ${accountId}...`,
      });

      const response = await fetch(`/api/google-accounts/${accountId}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      
      addDebugInfo({
        timestamp: new Date().toISOString(),
        type: 'api',
        endpoint: `/api/google-accounts/${accountId}`,
        status: response.status,
        data: {
          success: data.success,
          error: data.error,
        },
      });

      if (data.success) {
        setMessage({ type: 'success', text: t('integrations.accountDeleted') });
        setTimeout(() => setMessage(null), 3000);
        addDebugInfo({
          timestamp: new Date().toISOString(),
          type: 'info',
          message: `Account ${accountId} deleted successfully`,
        });
        loadGoogleAccounts();
      } else {
        const errorMsg = data.error || t('integrations.errorDeleteAccount');
        setMessage({ type: 'error', text: errorMsg });
        addDebugInfo({
          timestamp: new Date().toISOString(),
          type: 'error',
          endpoint: `/api/google-accounts/${accountId}`,
          error: errorMsg,
        });
      }
    } catch (err: any) {
      console.error('Error deleting account:', err);
      const errorMsg = t('integrations.errorDeleteAccount');
      setMessage({ type: 'error', text: errorMsg });
      addDebugInfo({
        timestamp: new Date().toISOString(),
        type: 'error',
        endpoint: `/api/google-accounts/${accountId}`,
        error: err.message || String(err),
        message: 'Exception while deleting account',
      });
    }
  };

  const handleGoogleAuth = async () => {
    try {
      addDebugInfo({
        timestamp: new Date().toISOString(),
        type: 'api',
        endpoint: '/api/auth/google',
        message: 'Starting Google OAuth...',
      });

      const response = await fetch('/api/auth/google');
      const data = await response.json();
      
      addDebugInfo({
        timestamp: new Date().toISOString(),
        type: 'api',
        endpoint: '/api/auth/google',
        status: response.status,
        data: {
          success: data.success,
          hasAuthUrl: !!data.authUrl,
          error: data.error,
        },
      });
      
      if (data.success && data.authUrl) {
        addDebugInfo({
          timestamp: new Date().toISOString(),
          type: 'info',
          message: 'Redirecting to Google OAuth...',
        });
        // Перенаправляем на страницу авторизации Google
        window.location.href = data.authUrl;
      } else {
        const errorMsg = data.error || t('integrations.errorAuth');
        setMessage({ type: 'error', text: errorMsg });
        addDebugInfo({
          timestamp: new Date().toISOString(),
          type: 'error',
          endpoint: '/api/auth/google',
          error: errorMsg,
        });
      }
    } catch (err: any) {
      console.error('Error starting Google auth:', err);
      const errorMsg = t('integrations.errorAuth');
      setMessage({ type: 'error', text: errorMsg });
      addDebugInfo({
        timestamp: new Date().toISOString(),
        type: 'error',
        endpoint: '/api/auth/google',
        error: err.message || String(err),
        message: 'Exception while starting Google auth',
      });
    }
  };

  if (loading && gscLoading) {
    return (
      <main className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-white p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">{t('integrations.loading')}</div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">{t('integrations.title')}</h1>
            <p className="text-gray-600 dark:text-gray-400">
              {t('integrations.description')}
            </p>
          </div>
          <button
            onClick={() => setShowDebug(!showDebug)}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors text-white"
            title="Toggle Debug Panel"
          >
            {showDebug ? '🔴 Hide Debug' : '🐛 Show Debug'}
          </button>
        </div>

        {/* Debug Panel */}
        {showDebug && (
          <div className="mb-6 bg-gray-900 dark:bg-black rounded-lg p-4 border border-gray-700 max-h-96 overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-yellow-400">🐛 Debug Panel</h3>
              <button
                onClick={() => setDebugInfo([])}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-xs text-white"
              >
                Clear
              </button>
            </div>
            <div className="space-y-2 text-xs font-mono">
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="text-green-400">
                  <strong>User ID:</strong> {userId || 'Not loaded'}
                </div>
                <div className="text-blue-400">
                  <strong>Loading:</strong> {loading || gscLoading ? 'Yes' : 'No'}
                </div>
                <div className="text-blue-400">
                  <strong>Google Accounts:</strong> {googleAccounts.length} loaded
                </div>
                <div className="text-blue-400">
                  <strong>GSC Integration:</strong> {gscIntegration ? `✅ Connected` : '❌ Not connected'}
                </div>
              </div>
              {gscIntegration && (
                <div className="text-purple-400 mb-2 p-2 bg-purple-900/20 rounded border border-purple-700">
                  <strong>GSC Details:</strong>
                  <div className="mt-1 text-xs">
                    <div>Email: {gscIntegration.google_email}</div>
                    <div>User ID: {gscIntegration.google_user_id}</div>
                    <div>Created: {new Date(gscIntegration.created_at).toLocaleString()}</div>
                  </div>
                </div>
              )}
              {googleAccounts.length > 0 && (
                <div className="text-cyan-400 mb-2 p-2 bg-cyan-900/20 rounded border border-cyan-700">
                  <strong>Google Accounts Details:</strong>
                  <div className="mt-1 text-xs space-y-1">
                    {googleAccounts.map((acc, idx) => (
                      <div key={idx}>
                        {idx + 1}. {acc.email} (ID: {acc.id})
                        {acc.googleAccessToken && acc.googleRefreshToken ? ' ✅' : ' ⚠️'}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="border-t border-gray-700 pt-2 mt-2">
                <strong className="text-yellow-400">Debug Log:</strong>
                {debugInfo.length === 0 ? (
                  <div className="text-gray-500 mt-2">No debug entries yet</div>
                ) : (
                  <div className="mt-2 space-y-1">
                    {debugInfo.map((info, idx) => (
                      <div
                        key={idx}
                        className={`p-2 rounded border-l-2 ${
                          info.type === 'error'
                            ? 'bg-red-900/20 border-red-500 text-red-300'
                            : info.type === 'api'
                            ? 'bg-blue-900/20 border-blue-500 text-blue-300'
                            : 'bg-green-900/20 border-green-500 text-green-300'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <span className="text-gray-500">
                            {new Date(info.timestamp).toLocaleTimeString()}
                          </span>
                          <span className="font-bold">{info.type.toUpperCase()}</span>
                          {info.endpoint && (
                            <span className="text-purple-400">{info.endpoint}</span>
                          )}
                          {info.status && (
                            <span className={info.status >= 400 ? 'text-red-400' : 'text-green-400'}>
                              [{info.status}]
                            </span>
                          )}
                        </div>
                        {info.message && (
                          <div className="mt-1 text-gray-300">{info.message}</div>
                        )}
                        {info.error && (
                          <div className="mt-1 text-red-400">Error: {info.error}</div>
                        )}
                        {info.data && (
                          <details className="mt-1">
                            <summary className="cursor-pointer text-gray-400 hover:text-gray-300">
                              Data
                            </summary>
                            <pre className="mt-1 p-2 bg-black rounded text-xs overflow-x-auto">
                              {JSON.stringify(info.data, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

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
          {/* Google Search Console Integration (New GSC Integration) */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-6">
              <div className="text-3xl">🔍</div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Google Search Console</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Connect your Google Search Console account to access site data and analytics
                </p>
              </div>
            </div>

            {gscLoading ? (
              <div className="text-sm text-gray-600 dark:text-gray-400">Loading...</div>
            ) : gscIntegration ? (
              <div className="space-y-4">
                {/* Connected State */}
                <div className="bg-white dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-xl">✅</div>
                      <div>
                        <div className="text-base font-medium text-gray-900 dark:text-white">
                          Connected account: {gscIntegration.google_email}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Connected at: {new Date(gscIntegration.created_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={handleDisconnectGSC}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium transition-colors text-white"
                      title="Disconnect Google Search Console"
                    >
                      Disconnect
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Not Connected State */}
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Google Search Console is not connected yet.
                </div>
                <button
                  onClick={handleGoogleAuth}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-base font-medium transition-colors flex items-center gap-2 text-white"
                >
                  <span>🔐</span>
                  <span>Connect Google</span>
                </button>
              </div>
            )}
          </div>

          {/* Google Account Integration (Legacy) */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-6">
              <div className="text-3xl">👤</div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Google Accounts (Legacy)</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Подключенные Google аккаунты из таблицы google_accounts
                </p>
              </div>
            </div>

            {/* Add Google Account Button */}
            <div className="mb-6 flex gap-3">
              <button
                onClick={handleGoogleAuth}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-base font-medium transition-colors flex items-center gap-2 text-white"
              >
                <span>🔐</span>
                <span>{t('integrations.addGoogleAccount')}</span>
              </button>
              <button
                onClick={() => {
                  addDebugInfo({
                    timestamp: new Date().toISOString(),
                    type: 'info',
                    message: 'Manual refresh triggered',
                  });
                  loadGoogleAccounts();
                  loadGSCIntegration();
                }}
                disabled={loading || gscLoading}
                className="px-4 py-3 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-lg text-base font-medium transition-colors flex items-center gap-2 text-white"
                title="Обновить список аккаунтов"
              >
                <span>🔄</span>
                <span>Обновить</span>
              </button>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Загрузка аккаунтов...
              </div>
            )}

            {/* Connected Accounts List */}
            {!loading && googleAccounts.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Подключенные аккаунты ({googleAccounts.length}):
                </h3>
                {googleAccounts.map((account) => {
                  const isConfigured = !!(account.googleAccessToken?.trim() && account.googleRefreshToken?.trim());
                  return (
                    <div
                      key={account.id}
                      className="flex items-center justify-between bg-white dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className="text-xl">👤</div>
                        <div className="flex-1">
                          <div className="text-base font-medium text-gray-900 dark:text-white">{account.email}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            <div>
                              {isConfigured ? (
                                <span className="text-green-600 dark:text-green-400">✅ Авторизован (есть токены)</span>
                              ) : (
                                <span className="text-yellow-600 dark:text-yellow-400">⚠️ Требуется авторизация</span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                              ID: {account.id} | Создан: {new Date(account.createdAt).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteAccount(account.id)}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium transition-colors text-white ml-4"
                        title={t('integrations.disconnectAccount')}
                      >
                        {t('integrations.disconnect')}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {!loading && googleAccounts.length === 0 && (
              <div className="text-sm text-gray-600 dark:text-gray-400 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <div className="font-semibold mb-1">Нет подключенных аккаунтов</div>
                <div className="text-xs">
                  Нажмите кнопку "Connect Google" выше, чтобы добавить Google аккаунт.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
