'use client';

import { useState, useEffect } from 'react';
import { useI18n } from '@/lib/i18n-context';

interface GSCAccount {
  id: string;
  google_email: string;
  google_user_id: string;
  created_at: string;
  updated_at: string;
  source: 'supabase' | 'jwt' | 'google_gsc_accounts';
  accountId?: number;
  hasSites?: boolean;
  sitesCount?: number;
  gscSitesCount?: number;
  gscSitesMatchedCount?: number;
}

export default function IntegrationsPage() {
  const { t } = useI18n();
  const [gscAccountsWithSites, setGscAccountsWithSites] = useState<GSCAccount[]>([]);
  const [gscLoading, setGscLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadGSCIntegration();
    
    // Проверяем URL параметры для сообщений от OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const error = urlParams.get('error');
    
    if (success) {
      setMessage({ type: 'success', text: decodeURIComponent(success) });
      window.history.replaceState({}, '', '/integrations');
      setTimeout(() => setMessage(null), 5000);
      loadGSCIntegration();
    } else if (error) {
      setMessage({ type: 'error', text: decodeURIComponent(error) });
      window.history.replaceState({}, '', '/integrations');
    }
  }, []);

  const loadGSCIntegration = async () => {
    try {
      setGscLoading(true);
      const response = await fetch('/api/gsc-integration');
      const data = await response.json();

      if (data.success) {
        // Показываем только аккаунты с сайтами
        if (data.accountsWithSites && Array.isArray(data.accountsWithSites)) {
          setGscAccountsWithSites(data.accountsWithSites);
        } else {
          setGscAccountsWithSites([]);
        }
      } else {
        setGscAccountsWithSites([]);
      }
    } catch (err: any) {
      console.error('Error loading GSC integration:', err);
      setGscAccountsWithSites([]);
    } finally {
      setGscLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    try {
      const response = await fetch('/api/auth/google');
      const data = await response.json();
      
      if (data.success && data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        const errorMsg = data.error || t('integrations.errorAuth');
        setMessage({ type: 'error', text: errorMsg });
      }
    } catch (err: any) {
      console.error('Error starting Google auth:', err);
      const errorMsg = t('integrations.errorAuth');
      setMessage({ type: 'error', text: errorMsg });
    }
  };

  if (gscLoading) {
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
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">{t('integrations.title')}</h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t('integrations.description')}
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
          {/* Google Search Console Integration */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 rounded-xl p-8 border-2 border-blue-200 dark:border-gray-700 shadow-lg">
            <div className="flex items-start gap-4 mb-6">
              <div className="text-4xl bg-white dark:bg-gray-700 p-3 rounded-xl shadow-md">🔍</div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {t('integrations.gscTitle')}
                </h2>
                <p className="text-base text-gray-600 dark:text-gray-400">
                  {t('integrations.gscDescription')}
                </p>
              </div>
            </div>

            {gscAccountsWithSites.length > 0 ? (
              <div className="space-y-4">
                {/* Список подключенных аккаунтов с сайтами */}
                {gscAccountsWithSites.map((account, index) => (
                  <div
                    key={account.id}
                    className={`bg-white dark:bg-gray-700 rounded-xl p-6 border-2 ${
                      index === 0
                        ? 'border-green-200 dark:border-green-800'
                        : 'border-blue-200 dark:border-blue-800'
                    } shadow-md`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-3xl">{index === 0 ? '✅' : '🔗'}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="text-lg font-semibold text-gray-900 dark:text-white">
                            {account.google_email}
                          </div>
                          {index === 0 && (
                            <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs font-medium rounded">
                              Active
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Подключен: {new Date(account.created_at).toLocaleString('ru-RU')}
                        </div>
                        {/* Показываем количество сайтов */}
                        {(account.sitesCount !== undefined || account.gscSitesCount !== undefined) && (
                          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {account.sitesCount !== undefined && account.sitesCount > 0 && (
                              <span className="inline-block mr-3">
                                📊 Сайтов в базе: <strong className="text-blue-600 dark:text-blue-400">{account.sitesCount}</strong>
                              </span>
                            )}
                            {account.gscSitesCount !== undefined && account.gscSitesCount > 0 && (
                              <span className="inline-block">
                                🔍 Сайтов в GSC: <strong className="text-green-600 dark:text-green-400">{account.gscSitesCount}</strong>
                                {account.gscSitesMatchedCount !== undefined && account.gscSitesMatchedCount > 0 && (
                                  <span className="ml-1 text-xs">({account.gscSitesMatchedCount} совпадают)</span>
                                )}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Кнопка подключения Google */}
                <button
                  onClick={handleGoogleAuth}
                  className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl text-lg font-semibold transition-all duration-200 flex items-center gap-3 text-white shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  <span className="text-2xl">🔐</span>
                  <span>Подключить Google</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
