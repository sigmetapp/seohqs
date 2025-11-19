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

interface VariantData {
  name: string;
  description: string;
  accounts: GSCAccount[];
  loading: boolean;
  error: string | null;
}

export default function IntegrationsPage() {
  const { t } = useI18n();
  const [gscAccountsWithSites, setGscAccountsWithSites] = useState<GSCAccount[]>([]);
  const [gscLoading, setGscLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Варианты отображения данных
  const [variants, setVariants] = useState<Record<string, VariantData>>({
    variant1: {
      name: 'Вариант 1: Все аккаунты из /api/gsc-integration',
      description: 'Показывает ВСЕ аккаунты (включая без сайтов) из основного API',
      accounts: [],
      loading: false,
      error: null,
    },
    variant2: {
      name: 'Вариант 2: Аккаунты с сайтами (текущий)',
      description: 'Показывает только аккаунты с сайтами из /api/gsc-integration',
      accounts: [],
      loading: false,
      error: null,
    },
    variant3: {
      name: 'Вариант 3: Аккаунты из google_gsc_accounts',
      description: 'Прямой запрос к таблице google_gsc_accounts через /api/integrations/google/accounts',
      accounts: [],
      loading: false,
      error: null,
    },
    variant4: {
      name: 'Вариант 4: Данные из debug endpoint',
      description: 'Полная информация из /api/gsc-integration/debug (все таблицы)',
      accounts: [],
      loading: false,
      error: null,
    },
    variant5: {
      name: 'Вариант 5: Комбинированный (все источники)',
      description: 'Объединяет данные из всех источников, убирает дубликаты',
      accounts: [],
      loading: false,
      error: null,
    },
  });

  useEffect(() => {
    loadAllVariants();
    
    // Проверяем URL параметры для сообщений от OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const error = urlParams.get('error');
    
    if (success) {
      setMessage({ type: 'success', text: decodeURIComponent(success) });
      window.history.replaceState({}, '', '/integrations');
      setTimeout(() => setMessage(null), 5000);
      loadAllVariants();
    } else if (error) {
      setMessage({ type: 'error', text: decodeURIComponent(error) });
      window.history.replaceState({}, '', '/integrations');
    }
  }, []);

  const loadAllVariants = async () => {
    setGscLoading(true);
    
    // Загружаем все варианты параллельно
    await Promise.all([
      loadVariant1(),
      loadVariant2(),
      loadVariant3(),
      loadVariant4(),
      loadVariant5(),
    ]);
    
    setGscLoading(false);
  };

  // Вариант 1: Все аккаунты из /api/gsc-integration
  const loadVariant1 = async () => {
    setVariants(prev => ({ ...prev, variant1: { ...prev.variant1, loading: true, error: null } }));
    try {
      const response = await fetch('/api/gsc-integration');
      const data = await response.json();

      if (data.success && data.accounts && Array.isArray(data.accounts)) {
        setVariants(prev => ({ ...prev, variant1: { ...prev.variant1, accounts: data.accounts, loading: false } }));
      } else {
        setVariants(prev => ({ ...prev, variant1: { ...prev.variant1, accounts: [], loading: false } }));
      }
    } catch (err: any) {
      console.error('Error loading Variant 1:', err);
      setVariants(prev => ({ ...prev, variant1: { ...prev.variant1, accounts: [], loading: false, error: err.message } }));
    }
  };

  // Вариант 2: Аккаунты с сайтами (текущий)
  const loadVariant2 = async () => {
    setVariants(prev => ({ ...prev, variant2: { ...prev.variant2, loading: true, error: null } }));
    try {
      const response = await fetch('/api/gsc-integration');
      const data = await response.json();

      if (data.success) {
        const accounts = data.accountsWithSites && Array.isArray(data.accountsWithSites) ? data.accountsWithSites : [];
        setGscAccountsWithSites(accounts);
        setVariants(prev => ({ ...prev, variant2: { ...prev.variant2, accounts, loading: false } }));
      } else {
        setVariants(prev => ({ ...prev, variant2: { ...prev.variant2, accounts: [], loading: false } }));
      }
    } catch (err: any) {
      console.error('Error loading Variant 2:', err);
      setVariants(prev => ({ ...prev, variant2: { ...prev.variant2, accounts: [], loading: false, error: err.message } }));
    }
  };

  // Вариант 3: Аккаунты из google_gsc_accounts
  const loadVariant3 = async () => {
    setVariants(prev => ({ ...prev, variant3: { ...prev.variant3, loading: true, error: null } }));
    try {
      const response = await fetch('/api/integrations/google/accounts');
      const data = await response.json();

      if (data.accounts && Array.isArray(data.accounts)) {
        const accounts: GSCAccount[] = data.accounts.map((acc: any) => ({
          id: acc.id,
          google_email: acc.google_email,
          google_user_id: acc.google_user_id || '',
          created_at: acc.created_at,
          updated_at: acc.created_at,
          source: 'google_gsc_accounts',
        }));
        setVariants(prev => ({ ...prev, variant3: { ...prev.variant3, accounts, loading: false } }));
      } else {
        setVariants(prev => ({ ...prev, variant3: { ...prev.variant3, accounts: [], loading: false, error: data.error || 'No accounts found' } }));
      }
    } catch (err: any) {
      console.error('Error loading Variant 3:', err);
      setVariants(prev => ({ ...prev, variant3: { ...prev.variant3, accounts: [], loading: false, error: err.message } }));
    }
  };

  // Вариант 4: Данные из debug endpoint
  const loadVariant4 = async () => {
    setVariants(prev => ({ ...prev, variant4: { ...prev.variant4, loading: true, error: null } }));
    try {
      const response = await fetch('/api/gsc-integration/debug');
      const data = await response.json();

      if (data.success && data.debug) {
        const accounts: GSCAccount[] = [];
        
        // Из gsc_integrations
        if (data.debug.tables?.gsc_integrations && Array.isArray(data.debug.tables.gsc_integrations)) {
          data.debug.tables.gsc_integrations.forEach((acc: any) => {
            accounts.push({
              id: acc.id,
              google_email: acc.google_email,
              google_user_id: acc.google_user_id || '',
              created_at: acc.created_at,
              updated_at: acc.updated_at,
              source: 'supabase',
              gscSitesCount: data.debug.tables?.gsc_sites?.filter((s: any) => s.integration_id === acc.id).length || 0,
            });
          });
        }
        
        // Из google_gsc_accounts
        if (data.debug.tables?.google_gsc_accounts && Array.isArray(data.debug.tables.google_gsc_accounts)) {
          data.debug.tables.google_gsc_accounts.forEach((acc: any) => {
            if (!accounts.find(a => a.google_email.toLowerCase() === acc.google_email.toLowerCase())) {
              accounts.push({
                id: acc.id,
                google_email: acc.google_email,
                google_user_id: acc.google_user_id || '',
                created_at: acc.created_at,
                updated_at: acc.updated_at,
                source: 'google_gsc_accounts',
              });
            }
          });
        }
        
        // Из google_accounts (JWT)
        if (data.debug.tables?.google_accounts && Array.isArray(data.debug.tables.google_accounts)) {
          data.debug.tables.google_accounts.forEach((acc: any) => {
            if (acc.has_access_token && acc.has_refresh_token) {
              if (!accounts.find(a => a.google_email.toLowerCase() === acc.email.toLowerCase())) {
                accounts.push({
                  id: `jwt-${acc.id}`,
                  google_email: acc.email,
                  google_user_id: `user-${data.debug.user?.jwtUserId}`,
                  created_at: acc.created_at,
                  updated_at: acc.updated_at,
                  source: 'jwt',
                  accountId: acc.id,
                });
              }
            }
          });
        }
        
        setVariants(prev => ({ ...prev, variant4: { ...prev.variant4, accounts, loading: false } }));
      } else {
        setVariants(prev => ({ ...prev, variant4: { ...prev.variant4, accounts: [], loading: false, error: 'Debug data not available' } }));
      }
    } catch (err: any) {
      console.error('Error loading Variant 4:', err);
      setVariants(prev => ({ ...prev, variant4: { ...prev.variant4, accounts: [], loading: false, error: err.message } }));
    }
  };

  // Вариант 5: Комбинированный (все источники)
  const loadVariant5 = async () => {
    setVariants(prev => ({ ...prev, variant5: { ...prev.variant5, loading: true, error: null } }));
    try {
      // Загружаем данные из всех источников
      const [variant1Data, variant3Data, variant4Data] = await Promise.all([
        fetch('/api/gsc-integration').then(r => r.json()),
        fetch('/api/integrations/google/accounts').then(r => r.json()).catch(() => ({ accounts: [] })),
        fetch('/api/gsc-integration/debug').then(r => r.json()).catch(() => ({ success: false })),
      ]);

      const allAccounts: GSCAccount[] = [];
      const emailSet = new Set<string>();

      // Добавляем из варианта 1 (все аккаунты)
      if (variant1Data.success && variant1Data.accounts) {
        variant1Data.accounts.forEach((acc: GSCAccount) => {
          const emailLower = acc.google_email.toLowerCase();
          if (!emailSet.has(emailLower)) {
            allAccounts.push(acc);
            emailSet.add(emailLower);
          }
        });
      }

      // Добавляем из варианта 3 (google_gsc_accounts)
      if (variant3Data.accounts) {
        variant3Data.accounts.forEach((acc: any) => {
          const emailLower = acc.google_email.toLowerCase();
          if (!emailSet.has(emailLower)) {
            allAccounts.push({
              id: acc.id,
              google_email: acc.google_email,
              google_user_id: acc.google_user_id || '',
              created_at: acc.created_at,
              updated_at: acc.created_at,
              source: 'google_gsc_accounts',
            });
            emailSet.add(emailLower);
          }
        });
      }

      // Добавляем из debug (если есть что-то новое)
      if (variant4Data.success && variant4Data.debug) {
        const debugAccounts: any[] = [];
        
        if (variant4Data.debug.tables?.gsc_integrations) {
          debugAccounts.push(...variant4Data.debug.tables.gsc_integrations);
        }
        if (variant4Data.debug.tables?.google_gsc_accounts) {
          debugAccounts.push(...variant4Data.debug.tables.google_gsc_accounts);
        }
        if (variant4Data.debug.tables?.google_accounts) {
          variant4Data.debug.tables.google_accounts.forEach((acc: any) => {
            if (acc.has_access_token && acc.has_refresh_token) {
              debugAccounts.push({
                google_email: acc.email,
                google_user_id: `user-${variant4Data.debug.user?.jwtUserId}`,
                created_at: acc.created_at,
                updated_at: acc.updated_at,
                source: 'jwt',
                id: `jwt-${acc.id}`,
                accountId: acc.id,
              });
            }
          });
        }

        debugAccounts.forEach((acc: any) => {
          const emailLower = acc.google_email.toLowerCase();
          if (!emailSet.has(emailLower)) {
            allAccounts.push({
              id: acc.id,
              google_email: acc.google_email,
              google_user_id: acc.google_user_id || '',
              created_at: acc.created_at,
              updated_at: acc.updated_at || acc.created_at,
              source: acc.source || 'unknown',
              accountId: acc.accountId,
            });
            emailSet.add(emailLower);
          }
        });
      }

      setVariants(prev => ({ ...prev, variant5: { ...prev.variant5, accounts: allAccounts, loading: false } }));
    } catch (err: any) {
      console.error('Error loading Variant 5:', err);
      setVariants(prev => ({ ...prev, variant5: { ...prev.variant5, accounts: [], loading: false, error: err.message } }));
    }
  };

  const loadGSCIntegration = async () => {
    await loadVariant2();
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

  const renderAccountCard = (account: GSCAccount, index: number) => (
    <div
      key={`${account.id}-${index}`}
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
            <span className={`px-2 py-1 text-xs font-medium rounded ${
              account.source === 'supabase' ? 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200' :
              account.source === 'google_gsc_accounts' ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200' :
              'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'
            }`}>
              {account.source}
            </span>
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Подключен: {new Date(account.created_at).toLocaleString('ru-RU')}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            ID: {account.id}
          </div>
          {/* Показываем количество сайтов */}
          {(account.sitesCount !== undefined || account.gscSitesCount !== undefined) && (
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">
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
  );

  const renderVariant = (variantKey: string, variant: VariantData) => (
    <div key={variantKey} className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 rounded-xl p-6 border-2 border-blue-200 dark:border-gray-700 shadow-lg">
      <div className="mb-4">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
          {variant.name}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
          {variant.description}
        </p>
        {variant.loading && (
          <div className="text-sm text-blue-600 dark:text-blue-400">Загрузка...</div>
        )}
        {variant.error && (
          <div className="text-sm text-red-600 dark:text-red-400 mb-2">
            Ошибка: {variant.error}
          </div>
        )}
        {!variant.loading && !variant.error && (
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            Найдено аккаунтов: <strong>{variant.accounts.length}</strong>
          </div>
        )}
      </div>

      {variant.loading ? (
        <div className="text-center py-8 text-gray-500">Загрузка данных...</div>
      ) : variant.error ? (
        <div className="text-center py-8 text-red-500">Ошибка: {variant.error}</div>
      ) : variant.accounts.length > 0 ? (
        <div className="space-y-3">
          {variant.accounts.map((account, index) => renderAccountCard(account, index))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          Аккаунты не найдены
        </div>
      )}
    </div>
  );

  return (
    <main className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">{t('integrations.title')}</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {t('integrations.description')}
          </p>
          <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>Внимание:</strong> На этой странице показаны все возможные варианты получения информации о подключенных аккаунтах. 
              Выберите рабочий вариант, и мы удалим остальные.
            </p>
          </div>
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

        {/* Кнопка подключения Google (если нет аккаунтов) */}
        {!gscLoading && Object.values(variants).every(v => v.accounts.length === 0) && (
          <div className="mb-6">
            <button
              onClick={handleGoogleAuth}
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl text-lg font-semibold transition-all duration-200 flex items-center gap-3 text-white shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <span className="text-2xl">🔐</span>
              <span>Подключить Google</span>
            </button>
          </div>
        )}

        <div className="space-y-6">
          {/* Отображаем все варианты */}
          {Object.entries(variants).map(([key, variant]) => renderVariant(key, variant))}
        </div>
      </div>
    </main>
  );
}
