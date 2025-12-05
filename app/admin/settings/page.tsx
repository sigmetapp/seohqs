'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const ADMIN_EMAIL = 'admin@buylin.pro';

export default function AdminSettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [openaiAssistantId, setOpenaiAssistantId] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    checkAuthAndLoadSettings();
  }, []);

  const checkAuthAndLoadSettings = async () => {
    try {
      const res = await fetch('/api/auth/user/me');
      const data = await res.json();
      
      if (!data.success || !data.user) {
        router.push('/login');
        return;
      }

      if (data.user.email !== ADMIN_EMAIL) {
        router.push('/');
        return;
      }

      setUser(data.user);
      await loadSettings();
    } catch (error) {
      console.error('Ошибка проверки авторизации:', error);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings');
      const data = await res.json();
      
      if (data.success && data.settings) {
        setOpenaiApiKey(data.settings.openaiApiKey || '');
        setOpenaiAssistantId(data.settings.openaiAssistantId || '');
      }
    } catch (error) {
      console.error('Ошибка загрузки настроек:', error);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          openaiApiKey,
          openaiAssistantId,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setMessage({ type: 'success', text: 'Настройки успешно сохранены' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Ошибка сохранения настроек' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Ошибка сохранения настроек' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-400">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
            Настройки сайта
          </h1>

          {message && (
            <div
              className={`mb-4 p-4 rounded ${
                message.type === 'success'
                  ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                  : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
              }`}
            >
              {message.text}
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-6">
            <div>
              <label
                htmlFor="openaiApiKey"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                OpenAI API Key
              </label>
              <input
                type="password"
                id="openaiApiKey"
                value={openaiApiKey}
                onChange={(e) => setOpenaiApiKey(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="sk-..."
              />
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                API ключ для работы с OpenAI Assistants API
              </p>
            </div>

            <div>
              <label
                htmlFor="openaiAssistantId"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                OpenAI Assistant ID (опционально)
              </label>
              <input
                type="text"
                id="openaiAssistantId"
                value={openaiAssistantId}
                onChange={(e) => setOpenaiAssistantId(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="asst_..."
              />
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                ID существующего ассистента. Если не указан, будет создан автоматически
              </p>
            </div>

            <div className="flex space-x-4">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Сохранение...' : 'Сохранить'}
              </button>
              <button
                type="button"
                onClick={() => router.push('/')}
                className="px-6 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium rounded transition-colors"
              >
                Отмена
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
