'use client';

import { useState, useEffect } from 'react';

interface GoogleAccount {
  id: string;
  google_email: string;
  google_user_id: string;
  created_at: string;
}

interface GoogleAccountsResponse {
  count: number;
  accounts: GoogleAccount[];
}

export default function GoogleAccountsList() {
  const [accounts, setAccounts] = useState<GoogleAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/integrations/google/accounts');
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Ошибка при загрузке аккаунтов');
      }

      const data: GoogleAccountsResponse = await response.json();
      setAccounts(data.accounts || []);
    } catch (err: any) {
      console.error('Error loading Google accounts:', err);
      setError(err.message || 'Ошибка при загрузке аккаунтов');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async (accountId: string, email: string) => {
    if (!confirm(`Вы уверены, что хотите отвязать аккаунт ${email}?`)) {
      return;
    }

    try {
      setDisconnectingId(accountId);
      setError(null);
      
      const response = await fetch('/api/integrations/google/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: accountId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Ошибка при отвязке аккаунта');
      }

      // Обновляем список аккаунтов без перезагрузки страницы
      await loadAccounts();
    } catch (err: any) {
      console.error('Error disconnecting account:', err);
      setError(err.message || 'Ошибка при отвязке аккаунта');
    } finally {
      setDisconnectingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-md">
        <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
          <span>Загрузка аккаунтов...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-md">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Интеграции Google
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Подключено аккаунтов: <strong className="text-blue-600 dark:text-blue-400">{accounts.length}</strong>
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-800 dark:text-red-300">
          {error}
        </div>
      )}

      {accounts.length === 0 ? (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 text-center">
          <div className="text-sm text-gray-700 dark:text-gray-300">
            Нет подключенных Google аккаунтов
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {accounts.map((account) => (
            <div
              key={account.id}
              className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
            >
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                      {account.google_email}
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Подключен: {formatDate(account.created_at)}
                  </div>
                </div>
                <button
                  onClick={() => handleDisconnect(account.id, account.google_email)}
                  disabled={disconnectingId === account.id}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors text-white shadow-sm hover:shadow-md"
                >
                  {disconnectingId === account.id ? 'Отвязка...' : 'Отвязать'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
