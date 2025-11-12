'use client';

import { useState, useEffect } from 'react';
import { IntegrationsSettings } from '@/lib/types';

export default function IntegrationsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [integrations, setIntegrations] = useState<IntegrationsSettings>({
    id: 1,
    googleServiceAccountEmail: '',
    googlePrivateKey: '',
    ahrefsApiKey: '',
    googleSearchConsoleUrl: '',
    updatedAt: new Date().toISOString(),
  });

  const [formData, setFormData] = useState({
    googleServiceAccountEmail: '',
    googlePrivateKey: '',
    ahrefsApiKey: '',
    googleSearchConsoleUrl: '',
  });

  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [showAhrefsKey, setShowAhrefsKey] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadIntegrations();
  }, []);

  const loadIntegrations = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/integrations');
      const data = await response.json();
      if (data.success && data.integrations) {
        setIntegrations(data.integrations);
        setFormData({
          googleServiceAccountEmail: data.integrations.googleServiceAccountEmail || '',
          googlePrivateKey: data.integrations.googlePrivateKey || '',
          ahrefsApiKey: data.integrations.ahrefsApiKey || '',
          googleSearchConsoleUrl: data.integrations.googleSearchConsoleUrl || '',
        });
      }
    } catch (err) {
      console.error('Error loading integrations:', err);
      setMessage({ type: 'error', text: 'Ошибка загрузки настроек интеграций' });
    } finally {
      setLoading(false);
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

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">Загрузка...</div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Интеграции</h1>
          <p className="text-gray-400">
            Настройте подключения к внешним сервисам для использования во всех разделах приложения
          </p>
        </div>

        {message && (
          <div
            className={`mb-6 p-4 rounded-lg border ${
              message.type === 'success'
                ? 'bg-green-900/30 border-green-700 text-green-300'
                : 'bg-red-900/30 border-red-700 text-red-300'
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="space-y-6">
          {/* Google Service Account */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="text-3xl">🔐</div>
                <div>
                  <h2 className="text-xl font-bold">Google Service Account</h2>
                  <p className="text-sm text-gray-400">
                    Для работы Google Indexing API
                  </p>
                </div>
              </div>
              <div
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  isConfigured('googleServiceAccountEmail') && isConfigured('googlePrivateKey')
                    ? 'bg-green-900/30 text-green-300 border border-green-700'
                    : 'bg-gray-700 text-gray-400 border border-gray-600'
                }`}
              >
                {isConfigured('googleServiceAccountEmail') && isConfigured('googlePrivateKey')
                  ? 'Настроено'
                  : 'Не настроено'}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  GOOGLE_SERVICE_ACCOUNT_EMAIL
                </label>
                <input
                  type="email"
                  value={formData.googleServiceAccountEmail}
                  onChange={(e) =>
                    setFormData({ ...formData, googleServiceAccountEmail: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                  placeholder="service-account@project-id.iam.gserviceaccount.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  GOOGLE_PRIVATE_KEY
                </label>
                <div className="relative">
                  <textarea
                    value={formData.googlePrivateKey}
                    onChange={(e) =>
                      setFormData({ ...formData, googlePrivateKey: e.target.value })
                    }
                    className="w-full px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none font-mono text-sm"
                    placeholder="-----BEGIN PRIVATE KEY-----\n..."
                    rows={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPrivateKey(!showPrivateKey)}
                    className="absolute top-2 right-2 text-gray-400 hover:text-gray-200 text-sm"
                  >
                    {showPrivateKey ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Вставьте полный приватный ключ из JSON файла Service Account
                </p>
              </div>
            </div>
          </div>

          {/* Google Search Console */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="text-3xl">🔍</div>
                <div>
                  <h2 className="text-xl font-bold">Google Search Console</h2>
                  <p className="text-sm text-gray-400">
                    URL для подключения к Google Search Console
                  </p>
                </div>
              </div>
              <div
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  isConfigured('googleSearchConsoleUrl')
                    ? 'bg-green-900/30 text-green-300 border border-green-700'
                    : 'bg-gray-700 text-gray-400 border border-gray-600'
                }`}
              >
                {isConfigured('googleSearchConsoleUrl') ? 'Настроено' : 'Не настроено'}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                URL Google Search Console
              </label>
              <input
                type="url"
                value={formData.googleSearchConsoleUrl}
                onChange={(e) =>
                  setFormData({ ...formData, googleSearchConsoleUrl: e.target.value })
                }
                className="w-full px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                placeholder="https://search.google.com/search-console/..."
              />
            </div>
          </div>

          {/* Ahrefs API */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="text-3xl">📊</div>
                <div>
                  <h2 className="text-xl font-bold">Ahrefs API</h2>
                  <p className="text-sm text-gray-400">
                    API ключ для доступа к данным Ahrefs
                  </p>
                </div>
              </div>
              <div
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  isConfigured('ahrefsApiKey')
                    ? 'bg-green-900/30 text-green-300 border border-green-700'
                    : 'bg-gray-700 text-gray-400 border border-gray-600'
                }`}
              >
                {isConfigured('ahrefsApiKey') ? 'Настроено' : 'Не настроено'}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Ahrefs API Key
              </label>
              <div className="relative">
                <input
                  type={showAhrefsKey ? 'text' : 'password'}
                  value={formData.ahrefsApiKey}
                  onChange={(e) =>
                    setFormData({ ...formData, ahrefsApiKey: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none font-mono"
                  placeholder="ahrefs_api_key_here"
                />
                <button
                  type="button"
                  onClick={() => setShowAhrefsKey(!showAhrefsKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                >
                  {showAhrefsKey ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end gap-4 pt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
            >
              {saving ? 'Сохранение...' : 'Сохранить настройки'}
            </button>
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-8 bg-blue-900/20 border border-blue-700 rounded-lg p-6">
          <h3 className="text-lg font-bold mb-2 text-blue-300">ℹ️ Информация</h3>
          <ul className="space-y-2 text-sm text-gray-300">
            <li>
              • Настройки интеграций сохраняются централизованно и используются во всех разделах приложения
            </li>
            <li>
              • Google Service Account используется для работы Google Indexing API
            </li>
            <li>
              • Google Search Console URL используется для синхронизации данных из Search Console
            </li>
            <li>
              • Ahrefs API Key используется для получения данных о ссылочном профиле и метриках
            </li>
          </ul>
        </div>
      </div>
    </main>
  );
}
