'use client';

import { useState, useEffect } from 'react';
import { IntegrationsSettings, GoogleAccount } from '@/lib/types';
import { useI18n } from '@/lib/i18n-context';

export default function IntegrationsPage() {
  const { t } = useI18n();
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
      setMessage({ type: 'error', text: t('integrations.errorLoading') });
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
        setMessage({ type: 'success', text: t('integrations.settingsSaved') });
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: 'error', text: data.error || t('integrations.errorSaving') });
      }
    } catch (err) {
      console.error('Error saving integrations:', err);
      setMessage({ type: 'error', text: t('integrations.errorSaving') });
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
        setMessage({ type: 'error', text: data.error || t('integrations.errorAuth') });
      }
    } catch (err) {
      console.error('Error starting Google auth:', err);
      setMessage({ type: 'error', text: t('integrations.errorAuth') });
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
    if (!confirm(t('integrations.confirmDeleteAccount'))) {
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
        setMessage({ type: 'success', text: t('integrations.oauthResetSuccess') });
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: 'error', text: data.error || t('integrations.oauthResetError') });
      }
    } catch (err) {
      console.error('Error resetting OAuth:', err);
      setMessage({ type: 'error', text: t('integrations.oauthResetError') });
    } finally {
      setSaving(false);
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
          {/* Google Search Console */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="text-3xl">🔍</div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('integrations.googleSearchConsole')}</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t('integrations.googleSearchConsoleDesc')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowSearchConsoleGuide(true)}
                  className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2 text-white"
                >
                  <span>📖</span>
                  <span>{t('integrations.howToSetup')}</span>
                </button>
                {hasAnyAuthorizedAccount() ? (
                  <div className="flex flex-col gap-1 items-end">
                    <div className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-300 dark:border-green-700 rounded-full text-xs font-medium">
                      {t('integrations.authorized')}
                    </div>
                    {getAuthorizedAccounts().length > 0 && (
                      <div className="text-xs text-gray-600 dark:text-gray-400 text-right max-w-xs truncate" title={getAuthorizedAccounts().map(a => a.email).join(', ')}>
                        {getAuthorizedAccounts().length === 1 
                          ? `📧 ${getAuthorizedAccounts()[0].email}`
                          : `📧 ${getAuthorizedAccounts().length} ${t('integrations.accountsCount')}`
                        }
                      </div>
                    )}
                    {isGoogleOAuthConfigured() && getAuthorizedAccounts().length === 0 && (
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {t('integrations.oldAuthMethod')}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="px-3 py-1 rounded-full text-xs font-medium bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600">
                    {t('integrations.notAuthorized')}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              {/* OAuth авторизация */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-bold text-blue-800 dark:text-blue-300 mb-1">{t('integrations.googleSearchConsole')} {t('integrations.authorizationTitle')}</h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {t('integrations.authorizationDesc')}
                    </p>
                  </div>
                  <button
                    onClick={handleGoogleAuth}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 text-white"
                  >
                    <span>🔐</span>
                    <span>{t('integrations.addGoogleAccount')}</span>
                  </button>
                </div>
                
                {/* Список подключенных аккаунтов */}
                {googleAccounts.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">{t('integrations.connectedAccounts')}</h4>
                    {googleAccounts.map((account) => {
                      const isConfigured = !!(account.googleAccessToken?.trim() && account.googleRefreshToken?.trim());
                      return (
                        <div
                          key={account.id}
                          className="flex items-center justify-between bg-gray-100 dark:bg-gray-800/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700"
                        >
                          <div className="flex items-center gap-3">
                            <div className="text-lg">👤</div>
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">{account.email}</div>
                              <div className="text-xs text-gray-600 dark:text-gray-400">
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
                            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded-lg text-xs font-medium transition-colors text-white"
                            title={t('integrations.deleteAccount')}
                          >
                            {t('integrations.delete')}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
                
                {googleAccounts.length === 0 && (
                  <div className="mt-3 text-xs text-gray-600 dark:text-gray-400">
                    {t('integrations.noAccounts')}
                  </div>
                )}
                <div className="text-xs text-yellow-700 dark:text-yellow-300 mt-2">
                  {t('integrations.warningBeforeAuth')}
                  <br />
                  <a 
                    href="https://github.com/sigmetapp/seohqs/blob/main/GOOGLE_SEARCH_CONSOLE_OAUTH_SETUP.md" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="underline hover:text-yellow-800 dark:hover:text-yellow-200"
                  >
                    {t('integrations.seeInstructions')}
                  </a>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('integrations.siteUrl')}
                </label>
                <input
                  type="url"
                  value={formData.googleSearchConsoleUrl}
                  onChange={(e) =>
                    setFormData({ ...formData, googleSearchConsoleUrl: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded border border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:outline-none"
                  placeholder={t('integrations.siteUrlPlaceholder')}
                />
                <p className="text-xs text-gray-600 dark:text-gray-500 mt-1">
                  {t('integrations.siteUrlHint')} <code className="bg-gray-200 dark:bg-gray-900 px-1 rounded">sc-domain:example.com</code>, <code className="bg-gray-200 dark:bg-gray-900 px-1 rounded">https://example.com</code> {t('common.or')} full URL from interface
                </p>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end gap-4 pt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed rounded-lg font-medium transition-colors text-white"
            >
              {saving ? t('integrations.saving') : t('integrations.saveSettings')}
            </button>
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-6">
          <h3 className="text-lg font-bold mb-2 text-blue-700 dark:text-blue-300">{t('integrations.infoTitle')}</h3>
          <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
            <li>
              • {t('integrations.info1')}
            </li>
            <li>
              • {t('integrations.info2')}
            </li>
            <li>
              • {t('integrations.info3')}
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
                <span>{t('integrations.guideTitle')}</span>
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
                <h3 className="text-lg font-bold text-blue-800 dark:text-blue-300 mb-2">{t('integrations.guideWhatItGives')}</h3>
                <p className="text-gray-700 dark:text-gray-300 text-sm">
                  {t('integrations.guideWhatItGivesDesc')}
                </p>
                <ul className="mt-2 space-y-1 text-sm text-gray-700 dark:text-gray-300 list-disc list-inside">
                  <li>{t('integrations.guideBenefits1')}</li>
                  <li>{t('integrations.guideBenefits2')}</li>
                  <li>{t('integrations.guideBenefits3')}</li>
                  <li>{t('integrations.guideBenefits4')}</li>
                </ul>
              </div>

              {/* Шаг 1 */}
              <div className="border-l-4 border-blue-500 pl-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">1</span>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('integrations.guideStep1')}</h3>
                </div>
                <div className="ml-10 space-y-2 text-gray-700 dark:text-gray-300 text-sm">
                  <p>{t('integrations.guideStep1Desc')}</p>
                  <ol className="list-decimal list-inside space-y-2 ml-2">
                    <li>{t('integrations.guideStep1List1')}</li>
                    <li>{t('integrations.guideStep1List2')}</li>
                    <li>{t('integrations.guideStep1List3')}</li>
                  </ol>
                  {!isGoogleOAuthConfigured() && (
                    <div className="bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded p-2 text-yellow-800 dark:text-yellow-300 text-xs mt-2">
                      {t('integrations.guideStep1Warning')}
                    </div>
                  )}
                  {isGoogleOAuthConfigured() && (
                    <div className="bg-green-100 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded p-2 text-green-800 dark:text-green-300 text-xs mt-2">
                      {t('integrations.guideStep1Success')}
                    </div>
                  )}
                </div>
              </div>

              {/* Шаг 2 */}
              <div className="border-l-4 border-blue-500 pl-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">2</span>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('integrations.guideStep2')}</h3>
                </div>
                <div className="ml-10 space-y-2 text-gray-700 dark:text-gray-300 text-sm">
                  <p>{t('integrations.guideStep2Desc')}</p>
                  <div className="bg-gray-100 dark:bg-gray-700 rounded p-3 space-y-2 font-mono text-xs">
                    <div className="text-green-600 dark:text-green-400">sc-domain:example.com</div>
                    <div className="text-green-600 dark:text-green-400">https://example.com</div>
                    <div className="text-gray-500 dark:text-gray-500">https://search.google.com/search-console/...?resource_id=sc-domain%3Aexample.com</div>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                    {t('integrations.guideStep2Tip')}
                  </p>
                </div>
              </div>

              {/* Шаг 3 */}
              <div className="border-l-4 border-green-500 pl-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-green-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">3</span>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('integrations.guideStep3')}</h3>
                </div>
                <div className="ml-10 space-y-2 text-gray-700 dark:text-gray-300 text-sm">
                  <p>{t('integrations.guideStep3Desc')}</p>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>{t('integrations.guideStep3List1')}</li>
                    <li>{t('integrations.guideStep3List2')}</li>
                    <li>{t('integrations.guideStep3List3')} <strong>Google Console</strong></li>
                    <li>{t('integrations.guideStep3List4')} <strong>{t('common.save')}</strong></li>
                    <li>{t('integrations.guideStep3List5')}</li>
                  </ol>
                </div>
              </div>

              {/* Решение проблем */}
              <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <span>🔧</span>
                  <span>{t('integrations.troubleshooting')}</span>
                </h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="font-semibold text-red-600 dark:text-red-400 mb-1">{t('integrations.troubleshootingAuthError')}</p>
                    <p className="text-gray-700 dark:text-gray-300">{t('integrations.troubleshootingAuthErrorDesc')}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-red-600 dark:text-red-400 mb-1">{t('integrations.troubleshooting403Error')}</p>
                    <p className="text-gray-700 dark:text-gray-300 mb-2">{t('integrations.troubleshooting403ErrorDesc')}</p>
                    <ol className="list-decimal list-inside space-y-1 ml-2 text-gray-700 dark:text-gray-300 text-xs">
                      <li>{t('integrations.troubleshooting403List1')}</li>
                      <li>{t('integrations.troubleshooting403List2')}</li>
                      <li>{t('integrations.troubleshooting403List3')}</li>
                    </ol>
                    <p className="text-gray-700 dark:text-gray-300 mt-2 text-xs">
                      {t('integrations.troubleshooting403Link')} <a href="https://github.com/sigmetapp/seohqs/blob/main/GOOGLE_OAUTH_TESTING_MODE_FIX.md" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 underline">GOOGLE_OAUTH_TESTING_MODE_FIX.md</a>
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold text-red-600 dark:text-red-400 mb-1">{t('integrations.troubleshooting403Other')}</p>
                    <p className="text-gray-700 dark:text-gray-300">{t('integrations.troubleshooting403OtherDesc')}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-red-600 dark:text-red-400 mb-1">{t('integrations.troubleshootingUrlError')}</p>
                    <p className="text-gray-700 dark:text-gray-300">{t('integrations.troubleshootingUrlErrorDesc')} <code className="bg-gray-200 dark:bg-gray-900 text-gray-900 dark:text-white px-1 rounded">sc-domain:example.com</code> {t('common.or')} <code className="bg-gray-200 dark:bg-gray-900 text-gray-900 dark:text-white px-1 rounded">https://example.com</code></p>
                  </div>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 flex justify-end gap-3">
              <button
                onClick={() => setShowSearchConsoleGuide(false)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors text-gray-900 dark:text-white"
              >
                {t('integrations.close')}
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
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors text-white"
              >
                {t('integrations.setupNow')}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
