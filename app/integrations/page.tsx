'use client';

import { useState, useEffect } from 'react';
import { GSCIntegration } from '@/lib/types';
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
  const [gscIntegration, setGscIntegration] = useState<GSCIntegration | null>(null);
  const [gscAccounts, setGscAccounts] = useState<GSCAccount[]>([]);
  const [gscAccountsWithSites, setGscAccountsWithSites] = useState<GSCAccount[]>([]);
  const [gscLoading, setGscLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [debugInfo, setDebugInfo] = useState<DebugInfo[]>([]);
  const [showDebug, setShowDebug] = useState(false);
  const [userId, setUserId] = useState<string | number | null>(null);
  const [showOnlyWithSites, setShowOnlyWithSites] = useState(true); // По умолчанию показываем только аккаунты с сайтами
  const [debugData, setDebugData] = useState<any>(null);
  const [loadingDebug, setLoadingDebug] = useState(false);

  const addDebugInfo = (info: DebugInfo) => {
    setDebugInfo(prev => [...prev.slice(-49), info]); // Keep last 50 entries
  };

  useEffect(() => {
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
      // Перезагружаем интеграцию после успешной авторизации
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
          accountsCount: data.accounts?.length || 0,
          integrationEmail: data.integration?.google_email,
          error: data.error,
        },
      });

      if (data.success) {
        // Set accounts array (all connected accounts)
        if (data.accounts && Array.isArray(data.accounts)) {
          setGscAccounts(data.accounts);
          addDebugInfo({
            timestamp: new Date().toISOString(),
            type: 'info',
            message: `Found ${data.accounts.length} GSC account(s): ${data.accounts.map((a: GSCAccount) => a.google_email).join(', ')}`,
          });
        } else {
          setGscAccounts([]);
        }

        // Set accounts with sites
        if (data.accountsWithSites && Array.isArray(data.accountsWithSites)) {
          setGscAccountsWithSites(data.accountsWithSites);
          addDebugInfo({
            timestamp: new Date().toISOString(),
            type: 'info',
            message: `Found ${data.accountsWithSites.length} GSC account(s) with sites: ${data.accountsWithSites.map((a: GSCAccount) => `${a.google_email} (${a.sitesCount || 0} sites)`).join(', ')}`,
          });
        } else {
          setGscAccountsWithSites([]);
        }

        // Set integration for backward compatibility (first account)
        if (data.connected && data.integration) {
          setGscIntegration(data.integration);
        } else {
          setGscIntegration(null);
          if (data.accounts && data.accounts.length === 0) {
            addDebugInfo({
              timestamp: new Date().toISOString(),
              type: 'info',
              message: 'GSC integration not connected',
            });
          }
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
        setGscAccounts([]);
        setGscAccountsWithSites([]);
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
      setGscAccounts([]);
      setGscAccountsWithSites([]);
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

  const handleDisconnectGSC = async (account?: GSCAccount) => {
    const accountEmail = account?.google_email || 'this account';
    const hasSites = account?.hasSites || (account?.sitesCount ?? 0) > 0;
    
    // Show warning if account has sites
    const confirmMessage = hasSites
      ? `Вы уверены, что хотите отвязать аккаунт ${accountEmail}? Все сайты будут удалены из панелей /dashboard-gc и /sites. Это действие нельзя отменить.`
      : `Вы уверены, что хотите отвязать аккаунт ${accountEmail}?`;
    
    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      let url = '/api/gsc-integration';
      if (account) {
        // Delete specific account based on source
        if (account.source === 'jwt' && account.accountId) {
          url += `?accountId=${account.accountId}`;
        } else if (account.source === 'google_gsc_accounts') {
          url += `?accountUuid=${account.id}&source=google_gsc_accounts`;
        } else if (account.source === 'supabase') {
          url += `?accountUuid=${account.id}&source=supabase`;
        }
        
        // Add deleteSites parameter if account has sites
        if (hasSites) {
          url += url.includes('?') ? '&deleteSites=true' : '?deleteSites=true';
        }
      }

      const response = await fetch(url, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        const successMessage = data.deletedSites > 0
          ? `Аккаунт ${accountEmail} отвязан. Удалено ${data.deletedSites} сайтов.`
          : `Аккаунт ${accountEmail} отвязан успешно`;
        setMessage({ type: 'success', text: successMessage });
        setTimeout(() => setMessage(null), 5000);
        // Reload accounts
        loadGSCIntegration();
      } else {
        setMessage({ type: 'error', text: data.error || 'Ошибка отвязки аккаунта' });
      }
    } catch (err) {
      console.error('Error disconnecting GSC:', err);
      setMessage({ type: 'error', text: 'Ошибка отвязки аккаунта' });
    }
  };

  const handleResetAllIntegrations = async () => {
    if (!confirm(t('integrations.resetAllConfirm'))) {
      return;
    }

    try {
      addDebugInfo({
        timestamp: new Date().toISOString(),
        type: 'api',
        endpoint: '/api/gsc-integration',
        message: 'Resetting all integrations...',
      });

      const response = await fetch('/api/gsc-integration', {
        method: 'DELETE',
      });
      const data = await response.json();
      
      addDebugInfo({
        timestamp: new Date().toISOString(),
        type: 'api',
        endpoint: '/api/gsc-integration',
        status: response.status,
        data: {
          success: data.success,
          message: data.message,
          error: data.error,
        },
      });

      if (data.success) {
        setMessage({ type: 'success', text: t('integrations.resetAllSuccess') });
        setTimeout(() => setMessage(null), 5000);
        // Reload accounts
        loadGSCIntegration();
      } else {
        setMessage({ type: 'error', text: data.error || t('integrations.resetAllError') });
      }
    } catch (err: any) {
      console.error('Error resetting all integrations:', err);
      setMessage({ type: 'error', text: t('integrations.resetAllError') });
      addDebugInfo({
        timestamp: new Date().toISOString(),
        type: 'error',
        endpoint: '/api/gsc-integration',
        error: err.message || String(err),
        message: 'Exception while resetting all integrations',
      });
    }
  };

  const handleClearAllSites = async () => {
    if (!confirm('Вы уверены, что хотите удалить все сайты? Это действие удалит все сайты и все данные Google Search Console. Это действие нельзя отменить.')) {
      return;
    }

    try {
      addDebugInfo({
        timestamp: new Date().toISOString(),
        type: 'api',
        endpoint: '/api/sites/clear-all',
        message: 'Clearing all sites...',
      });

      const response = await fetch('/api/sites/clear-all', {
        method: 'DELETE',
      });
      const data = await response.json();
      
      addDebugInfo({
        timestamp: new Date().toISOString(),
        type: 'api',
        endpoint: '/api/sites/clear-all',
        status: response.status,
        data: {
          success: data.success,
          message: data.message,
          deletedSites: data.deletedSites,
          deletedGSCData: data.deletedGSCData,
          error: data.error,
        },
      });

      if (data.success) {
        setMessage({ 
          type: 'success', 
          text: data.message || `Удалено ${data.deletedSites || 0} сайтов и связанные данные Google Search Console` 
        });
        setTimeout(() => setMessage(null), 5000);
      } else {
        setMessage({ type: 'error', text: data.error || 'Ошибка удаления сайтов' });
      }
    } catch (err: any) {
      console.error('Error clearing all sites:', err);
      setMessage({ type: 'error', text: 'Ошибка удаления сайтов' });
      addDebugInfo({
        timestamp: new Date().toISOString(),
        type: 'error',
        endpoint: '/api/sites/clear-all',
        error: err.message || String(err),
        message: 'Exception while clearing all sites',
      });
    }
  };

  const handleLoadDebugData = async () => {
    try {
      setLoadingDebug(true);
      addDebugInfo({
        timestamp: new Date().toISOString(),
        type: 'api',
        endpoint: '/api/gsc-integration/debug',
        message: 'Loading debug data from database...',
      });

      const response = await fetch('/api/gsc-integration/debug');
      const data = await response.json();
      
      addDebugInfo({
        timestamp: new Date().toISOString(),
        type: 'api',
        endpoint: '/api/gsc-integration/debug',
        status: response.status,
        data: {
          success: data.success,
          hasDebugData: !!data.debug,
          error: data.error,
        },
      });

      if (data.success && data.debug) {
        setDebugData(data.debug);
        addDebugInfo({
          timestamp: new Date().toISOString(),
          type: 'info',
          message: 'Debug data loaded successfully',
        });
      } else {
        addDebugInfo({
          timestamp: new Date().toISOString(),
          type: 'error',
          endpoint: '/api/gsc-integration/debug',
          error: data.error || 'Failed to load debug data',
        });
      }
    } catch (err: any) {
      console.error('Error loading debug data:', err);
      addDebugInfo({
        timestamp: new Date().toISOString(),
        type: 'error',
        endpoint: '/api/gsc-integration/debug',
        error: err.message || String(err),
        message: 'Exception while loading debug data',
      });
    } finally {
      setLoadingDebug(false);
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
              <div className="flex gap-2">
                <button
                  onClick={handleLoadDebugData}
                  disabled={loadingDebug}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-xs text-white"
                >
                  {loadingDebug ? 'Loading...' : '🔍 Load DB Data'}
                </button>
                <button
                  onClick={() => setDebugInfo([])}
                  className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-xs text-white"
                >
                  Clear
                </button>
              </div>
            </div>
            <div className="space-y-2 text-xs font-mono">
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="text-green-400">
                  <strong>User ID:</strong> {userId || 'Not loaded'}
                </div>
                <div className="text-blue-400">
                  <strong>Loading:</strong> {gscLoading ? 'Yes' : 'No'}
                </div>
                <div className="text-blue-400">
                  <strong>GSC Integration:</strong> {gscAccounts.length > 0 ? `✅ ${gscAccounts.length} connected` : '❌ Not connected'}
                </div>
                <div className="text-green-400">
                  <strong>Accounts with Sites:</strong> {gscAccountsWithSites.length > 0 ? `✅ ${gscAccountsWithSites.length}` : '❌ None'}
                </div>
              </div>
              {gscAccounts.length > 0 && (
                <div className="text-purple-400 mb-2 p-2 bg-purple-900/20 rounded border border-purple-700">
                  <strong>GSC Accounts ({gscAccounts.length}):</strong>
                  <div className="mt-1 text-xs space-y-1">
                    {gscAccounts.map((account, idx) => (
                      <div key={account.id} className="border-l-2 border-purple-600 pl-2">
                        <div>Email: {account.google_email}</div>
                        <div>Source: {account.source}</div>
                        <div>Created: {new Date(account.created_at).toLocaleString()}</div>
                        {account.hasSites && (
                          <div className="text-green-400">
                            ✅ Has Sites: {account.sitesCount || 0} sites
                            {account.gscSitesCount !== undefined && account.gscSitesCount > 0 && `, ${account.gscSitesCount} GSC sites`}
                          </div>
                        )}
                        {idx === 0 && <div className="text-green-400">⭐ Active (Primary)</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {debugData && (
                <div className="text-cyan-400 mb-2 p-2 bg-cyan-900/20 rounded border border-cyan-700">
                  <strong>📊 Database Debug Data:</strong>
                  <div className="mt-2 text-xs space-y-2">
                    <div className="border-l-2 border-cyan-600 pl-2">
                      <div><strong>Supabase Auth User ID:</strong> {debugData.supabase?.authUserId || '❌ Not found'}</div>
                      <div><strong>JWT User ID:</strong> {debugData.user?.jwtUserId}</div>
                      <div><strong>JWT User Email:</strong> {debugData.user?.jwtUserEmail}</div>
                      <div><strong>Supabase Configured:</strong> {debugData.supabase?.configured ? '✅ Yes' : '❌ No'}</div>
                    </div>
                    {debugData.tables?.gsc_integrations && debugData.tables.gsc_integrations.length > 0 && (
                      <div className="border-l-2 border-green-600 pl-2">
                        <strong>gsc_integrations ({debugData.tables.gsc_integrations.length}):</strong>
                        {debugData.tables.gsc_integrations.map((integration: any, idx: number) => (
                          <div key={idx} className="ml-2 mt-1">
                            <div>Email: {integration.google_email}</div>
                            <div>Google User ID: {integration.google_user_id}</div>
                            <div>Has Access Token: {integration.has_access_token ? '✅' : '❌'}</div>
                            <div>Has Refresh Token: {integration.has_refresh_token ? '✅' : '❌'}</div>
                            <div>Created: {new Date(integration.created_at).toLocaleString()}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    {debugData.tables?.google_gsc_accounts && debugData.tables.google_gsc_accounts.length > 0 && (
                      <div className="border-l-2 border-blue-600 pl-2">
                        <strong>google_gsc_accounts ({debugData.tables.google_gsc_accounts.length}):</strong>
                        {debugData.tables.google_gsc_accounts.map((account: any, idx: number) => (
                          <div key={idx} className="ml-2 mt-1">
                            <div>Email: {account.google_email}</div>
                            <div>Google User ID: {account.google_user_id}</div>
                            <div>Source: {account.source}</div>
                            <div>Active: {account.is_active ? '✅' : '❌'}</div>
                            <div>Created: {new Date(account.created_at).toLocaleString()}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    {debugData.tables?.gsc_sites && debugData.tables.gsc_sites.length > 0 && (
                      <div className="border-l-2 border-yellow-600 pl-2">
                        <strong>gsc_sites ({debugData.tables.gsc_sites.length}):</strong>
                        {debugData.tables.gsc_sites.map((site: any, idx: number) => (
                          <div key={idx} className="ml-2 mt-1">
                            <div>URL: {site.site_url}</div>
                            <div>Permission: {site.permission || 'N/A'}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    {debugData.tables?.google_accounts && debugData.tables.google_accounts.length > 0 && (
                      <div className="border-l-2 border-orange-600 pl-2">
                        <strong>google_accounts ({debugData.tables.google_accounts.length}):</strong>
                        {debugData.tables.google_accounts.map((account: any, idx: number) => (
                          <div key={idx} className="ml-2 mt-1">
                            <div>Email: {account.email}</div>
                            <div>Has Access Token: {account.has_access_token ? '✅' : '❌'}</div>
                            <div>Has Refresh Token: {account.has_refresh_token ? '✅' : '❌'}</div>
                            <div>Created: {new Date(account.created_at).toLocaleString()}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    {debugData.errors && debugData.errors.length > 0 && (
                      <div className="border-l-2 border-red-600 pl-2">
                        <strong className="text-red-400">Errors:</strong>
                        {debugData.errors.map((error: string, idx: number) => (
                          <div key={idx} className="ml-2 mt-1 text-red-300">{error}</div>
                        ))}
                      </div>
                    )}
                    {(!debugData.tables?.gsc_integrations || debugData.tables.gsc_integrations.length === 0) &&
                     (!debugData.tables?.google_gsc_accounts || debugData.tables.google_gsc_accounts.length === 0) &&
                     (!debugData.tables?.google_accounts || debugData.tables.google_accounts.length === 0) && (
                      <div className="text-yellow-400 border-l-2 border-yellow-600 pl-2">
                        ⚠️ No integration data found in any table
                      </div>
                    )}
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

            {gscLoading ? (
              <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400 py-4">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                <span>{t('integrations.gscLoading')}</span>
              </div>
            ) : (showOnlyWithSites ? gscAccountsWithSites : gscAccounts).length > 0 ? (
              <div className="space-y-4">
                {/* Filter Toggle and Action Buttons */}
                <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showOnlyWithSites}
                        onChange={(e) => setShowOnlyWithSites(e.target.checked)}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        Показать только аккаунты с сайтами
                      </span>
                    </label>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      ({showOnlyWithSites ? gscAccountsWithSites.length : gscAccounts.length} из {gscAccounts.length})
                    </span>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleClearAllSites}
                      className="px-6 py-3 bg-orange-600 hover:bg-orange-700 rounded-lg text-base font-medium transition-all duration-200 text-white shadow-md hover:shadow-lg transform hover:scale-105"
                      title="Очистить все сайты"
                    >
                      Очистить все сайты
                    </button>
                    <button
                      onClick={handleResetAllIntegrations}
                      className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg text-base font-medium transition-all duration-200 text-white shadow-md hover:shadow-lg transform hover:scale-105"
                      title={t('integrations.resetAll')}
                    >
                      {t('integrations.resetAll')}
                    </button>
                  </div>
                </div>
                {/* Connected Accounts List */}
                {(showOnlyWithSites ? gscAccountsWithSites : gscAccounts).map((account, index) => (
                  <div
                    key={account.id}
                    className={`bg-white dark:bg-gray-700 rounded-xl p-6 border-2 ${
                      index === 0
                        ? 'border-green-200 dark:border-green-800'
                        : 'border-blue-200 dark:border-blue-800'
                    } shadow-md`}
                  >
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <div className="flex items-center gap-4 flex-1">
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
                            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs font-medium rounded">
                              {account.source === 'supabase' 
                                ? 'Supabase Auth' 
                                : account.source === 'google_gsc_accounts'
                                ? 'Google GSC Account'
                                : 'JWT Auth'}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            Connected: {new Date(account.created_at).toLocaleString()}
                          </div>
                          {/* Show sites count if available */}
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
                      <button
                        onClick={() => handleDisconnectGSC(account)}
                        className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg text-base font-medium transition-all duration-200 text-white shadow-md hover:shadow-lg transform hover:scale-105"
                        title={account.hasSites || (account.sitesCount ?? 0) > 0 ? `Отвязать ${account.google_email} (все сайты будут удалены)` : `Отвязать ${account.google_email}`}
                      >
                        Отвязать
                      </button>
                    </div>
                  </div>
                ))}
                {/* Show message if filtering and no accounts match */}
                {showOnlyWithSites && gscAccountsWithSites.length === 0 && gscAccounts.length > 0 && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 text-center">
                    <div className="text-sm text-gray-700 dark:text-gray-300">
                      Нет аккаунтов с сайтами. Отключите фильтр, чтобы увидеть все подключенные аккаунты.
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Not Connected State */}
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    {t('integrations.gscNotConnected')}
                  </div>
                </div>
                <button
                  onClick={handleGoogleAuth}
                  className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl text-lg font-semibold transition-all duration-200 flex items-center gap-3 text-white shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  <span className="text-2xl">🔐</span>
                  <span>{t('integrations.gscConnectButton')}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
