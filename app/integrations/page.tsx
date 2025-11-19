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
  const [accounts, setAccounts] = useState<GSCAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  useEffect(() => {
    loadAccounts();
    
    // Проверяем URL параметры для сообщений от OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const error = urlParams.get('error');
    
    if (success) {
      setMessage({ type: 'success', text: decodeURIComponent(success) });
      window.history.replaceState({}, '', '/integrations');
      setTimeout(() => setMessage(null), 5000);
      loadAccounts();
    } else if (error) {
      setMessage({ type: 'error', text: decodeURIComponent(error) });
      window.history.replaceState({}, '', '/integrations');
    }
  }, []);

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/gsc-integration');
      const data = await response.json();

      if (data.success && data.accounts && Array.isArray(data.accounts)) {
        setAccounts(data.accounts);
      } else {
        setAccounts([]);
      }
    } catch (err: any) {
      console.error('Error loading accounts:', err);
      setAccounts([]);
      setMessage({ type: 'error', text: err.message || t('integrations.errorLoading') });
    } finally {
      setLoading(false);
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

  const handleUnlinkAccount = async (account: GSCAccount) => {
    if (!confirm(t('integrations.unlinkConfirm'))) {
      return;
    }

    setUnlinkingId(account.id);
    try {
      let response: Response;
      let data: any;

      // Определяем endpoint для отвязывания в зависимости от источника
      if (account.source === 'jwt' && account.accountId) {
        // JWT аккаунт - используем DELETE /api/gsc-integration с accountId
        response = await fetch(`/api/gsc-integration?accountId=${account.accountId}&source=jwt`, {
          method: 'DELETE',
        });
        data = await response.json();
      } else if (account.source === 'google_gsc_accounts') {
        // Аккаунт из google_gsc_accounts - используем POST /api/integrations/google/disconnect
        response = await fetch('/api/integrations/google/disconnect', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ id: account.id }),
        });
        data = await response.json();
      } else {
        // Аккаунт из gsc_integrations (supabase) - используем DELETE /api/gsc-integration с accountUuid
        response = await fetch(`/api/gsc-integration?accountUuid=${account.id}&source=supabase`, {
          method: 'DELETE',
        });
        data = await response.json();
      }
      
      if (data.success || response.ok) {
        setMessage({ type: 'success', text: t('integrations.unlinkSuccess') });
        await loadAccounts();
      } else {
        throw new Error(data.error || t('integrations.unlinkError'));
      }
    } catch (err: any) {
      console.error('Error unlinking account:', err);
      setMessage({ type: 'error', text: err.message || t('integrations.unlinkError') });
    } finally {
      setUnlinkingId(null);
    }
  };

  const getAccountCountText = () => {
    const count = accounts.length;
    if (count === 0) return '';
    if (count === 1) return `(${count} ${t('integrations.account')})`;
    return `(${count} ${t('integrations.accounts')})`;
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString;
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
          <h1 className="text-4xl font-bold mb-2">{t('integrations.linkedAccounts')} {getAccountCountText()}</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {t('integrations.linkedAccountsDesc')}
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

        {/* Кнопка добавления аккаунта */}
        <div className="mb-6">
          <button
            onClick={handleGoogleAuth}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-lg text-white font-semibold transition-all duration-200 flex items-center gap-2 shadow-md hover:shadow-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>{t('integrations.addAccount')}</span>
          </button>
        </div>

        {/* Список аккаунтов */}
        {accounts.length === 0 ? (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-8 text-center border border-gray-200 dark:border-gray-700">
            <div className="text-gray-500 dark:text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-lg">{t('integrations.noAccounts')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {accounts.map((account) => (
              <div
                key={account.id}
                className="bg-white dark:bg-gray-800 rounded-lg p-5 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between group"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  {/* Аватар аккаунта */}
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-lg">
                    {account.google_email.charAt(0).toUpperCase()}
                  </div>
                  
                  {/* Информация об аккаунте */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                        {account.google_email}
                      </h3>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {t('integrations.connectedAt')}: {formatDate(account.created_at)}
                      </span>
                      {account.sitesCount !== undefined && account.sitesCount > 0 && (
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                          </svg>
                          {account.sitesCount} {account.sitesCount === 1 ? 'site' : 'sites'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Кнопка отвязывания */}
                <button
                  onClick={() => handleUnlinkAccount(account)}
                  disabled={unlinkingId === account.id}
                  className="flex-shrink-0 ml-4 p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  title={t('integrations.unlinkAccount')}
                >
                  {unlinkingId === account.id ? (
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
