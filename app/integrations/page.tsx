'use client';

import { useState, useEffect } from 'react';
import { GoogleAccount } from '@/lib/types';
import { useI18n } from '@/lib/i18n-context';

export default function IntegrationsPage() {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [googleAccounts, setGoogleAccounts] = useState<GoogleAccount[]>([]);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
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

  const loadGoogleAccounts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/google-accounts');
      const data = await response.json();
      if (data.success && data.accounts) {
        setGoogleAccounts(data.accounts);
      }
    } catch (err) {
      console.error('Error loading Google accounts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async (accountId: number) => {
    if (!confirm(t('integrations.confirmDeleteAccount'))) {
      return;
    }

    try {
      const response = await fetch(`/api/google-accounts/${accountId}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        setMessage({ type: 'success', text: t('integrations.accountDeleted') });
        setTimeout(() => setMessage(null), 3000);
        loadGoogleAccounts();
      } else {
        setMessage({ type: 'error', text: data.error || t('integrations.errorDeleteAccount') });
      }
    } catch (err) {
      console.error('Error deleting account:', err);
      setMessage({ type: 'error', text: t('integrations.errorDeleteAccount') });
    }
  };

  const handleGoogleAuth = async () => {
    try {
      const response = await fetch('/api/auth/google');
      const data = await response.json();
      
      if (data.success && data.authUrl) {
        // Перенаправляем на страницу авторизации Google
        window.location.href = data.authUrl;
      } else {
        setMessage({ type: 'error', text: data.error || t('integrations.errorAuth') });
      }
    } catch (err) {
      console.error('Error starting Google auth:', err);
      setMessage({ type: 'error', text: t('integrations.errorAuth') });
    }
  };

  if (loading) {
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
          {/* Google Account Integration */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-6">
              <div className="text-3xl">🔍</div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('integrations.googleSearchConsole')}</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('integrations.googleSearchConsoleDesc')}
                </p>
              </div>
            </div>

            {/* Add Google Account Button */}
            <div className="mb-6">
              <button
                onClick={handleGoogleAuth}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-base font-medium transition-colors flex items-center gap-2 text-white"
              >
                <span>🔐</span>
                <span>{t('integrations.addGoogleAccount')}</span>
              </button>
            </div>

            {/* Connected Accounts List */}
            {googleAccounts.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {t('integrations.connectedAccounts')}
                </h3>
                {googleAccounts.map((account) => {
                  const isConfigured = !!(account.googleAccessToken?.trim() && account.googleRefreshToken?.trim());
                  return (
                    <div
                      key={account.id}
                      className="flex items-center justify-between bg-white dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-xl">👤</div>
                        <div>
                          <div className="text-base font-medium text-gray-900 dark:text-white">{account.email}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {isConfigured ? (
                              <span className="text-green-600 dark:text-green-400">{t('integrations.authorizedStatus')}</span>
                            ) : (
                              <span className="text-yellow-600 dark:text-yellow-400">{t('integrations.requiresAuth')}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteAccount(account.id)}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium transition-colors text-white"
                        title={t('integrations.disconnectAccount')}
                      >
                        {t('integrations.disconnect')}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {googleAccounts.length === 0 && (
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {t('integrations.noAccounts')}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
