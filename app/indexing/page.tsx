'use client';

import { useState, useEffect } from 'react';

export default function IndexingPage() {
  const [indexingUrl, setIndexingUrl] = useState('');
  const [indexingUrls, setIndexingUrls] = useState('');
  const [indexingLoading, setIndexingLoading] = useState(false);
  const [indexingError, setIndexingError] = useState<string | null>(null);
  const [indexingSuccess, setIndexingSuccess] = useState<string | null>(null);
  const [indexingStatus, setIndexingStatus] = useState<any>(null);

  const handleIndexUrl = async () => {
    if (!indexingUrl.trim()) {
      setIndexingError('Введите URL для индексации');
      return;
    }

    try {
      setIndexingLoading(true);
      setIndexingError(null);
      setIndexingSuccess(null);

      const response = await fetch('/api/index', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: indexingUrl.trim(),
          action: 'index',
        }),
      });

      const data = await response.json();

      if (data.success) {
        setIndexingSuccess(data.message);
        setIndexingUrl('');
        setIndexingStatus(data);
      } else {
        setIndexingError(data.error || data.message || 'Ошибка индексации');
        setIndexingStatus(data);
      }
    } catch (err: any) {
      console.error('Index error:', err);
      setIndexingError(err.message || 'Ошибка подключения');
    } finally {
      setIndexingLoading(false);
    }
  };

  const handleIndexUrls = async () => {
    if (!indexingUrls.trim()) {
      setIndexingError('Введите URL для индексации (по одному на строку)');
      return;
    }

    try {
      setIndexingLoading(true);
      setIndexingError(null);
      setIndexingSuccess(null);

      const urls = indexingUrls
        .split('\n')
        .map((url) => url.trim())
        .filter((url) => url.length > 0);

      if (urls.length === 0) {
        setIndexingError('Не найдено валидных URL');
        return;
      }

      const response = await fetch('/api/index', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          urls: urls,
          action: 'index',
        }),
      });

      const data = await response.json();

      if (data.success) {
        setIndexingSuccess(data.message);
        setIndexingUrls('');
        setIndexingStatus(data);
      } else {
        setIndexingError(data.error || data.message || 'Ошибка индексации');
        setIndexingStatus(data);
      }
    } catch (err: any) {
      console.error('Index error:', err);
      setIndexingError(err.message || 'Ошибка подключения');
    } finally {
      setIndexingLoading(false);
    }
  };

  const handleRemoveUrl = async () => {
    if (!indexingUrl.trim()) {
      setIndexingError('Введите URL для удаления из индекса');
      return;
    }

    try {
      setIndexingLoading(true);
      setIndexingError(null);
      setIndexingSuccess(null);

      const response = await fetch('/api/index', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: indexingUrl.trim(),
          action: 'remove',
        }),
      });

      const data = await response.json();

      if (data.success) {
        setIndexingSuccess(data.message);
        setIndexingUrl('');
        setIndexingStatus(data);
      } else {
        setIndexingError(data.error || data.message || 'Ошибка удаления');
        setIndexingStatus(data);
      }
    } catch (err: any) {
      console.error('Remove error:', err);
      setIndexingError(err.message || 'Ошибка подключения');
    } finally {
      setIndexingLoading(false);
    }
  };

  const checkIndexingStatus = async () => {
    try {
      const response = await fetch('/api/index');
      const data = await response.json();
      setIndexingStatus(data);
    } catch (err: any) {
      console.error('Status check error:', err);
    }
  };

  useEffect(() => {
    checkIndexingStatus();
  }, []);

  return (
    <main className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Индексатор ссылок</h1>
          <p className="text-gray-400">Индексируйте URL в Google через Indexing API</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 mb-6 border border-blue-500">
          {indexingStatus && (
            <div className="mb-4 p-3 bg-gray-700 rounded">
              <p className="text-sm text-gray-300">
                <strong>Статус сервиса:</strong>{' '}
                {indexingStatus.configured ? (
                  <span className="text-green-400">✓ Настроен</span>
                ) : (
                  <span className="text-red-400">✗ Не настроен</span>
                )}
              </p>
              {indexingStatus.message && (
                <p className="text-xs text-gray-400 mt-1">{indexingStatus.message}</p>
              )}
            </div>
          )}

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Индексировать один URL:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={indexingUrl}
                onChange={(e) => setIndexingUrl(e.target.value)}
                placeholder="https://example.com/page"
                className="flex-1 px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                disabled={indexingLoading}
              />
              <button
                onClick={handleIndexUrl}
                disabled={indexingLoading || !indexingUrl.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {indexingLoading ? 'Индексация...' : 'Индексировать'}
              </button>
              <button
                onClick={handleRemoveUrl}
                disabled={indexingLoading || !indexingUrl.trim()}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Удалить
              </button>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Индексировать несколько URL (по одному на строку, максимум 100):
            </label>
            <textarea
              value={indexingUrls}
              onChange={(e) => setIndexingUrls(e.target.value)}
              placeholder="https://example.com/page1&#10;https://example.com/page2&#10;https://example.com/page3"
              rows={6}
              className="w-full px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none font-mono text-sm"
              disabled={indexingLoading}
            />
            <button
              onClick={handleIndexUrls}
              disabled={indexingLoading || !indexingUrls.trim()}
              className="mt-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {indexingLoading ? 'Индексация...' : 'Индексировать все'}
            </button>
          </div>

          {indexingSuccess && (
            <div className="bg-green-900 border border-green-700 rounded p-3 mb-4">
              <p className="text-green-200 font-bold">✓ {indexingSuccess}</p>
            </div>
          )}

          {indexingError && (
            <div className="bg-red-900 border border-red-700 rounded p-3 mb-4">
              <p className="text-red-200 font-bold">✗ {indexingError}</p>
            </div>
          )}

          <div className="mt-4 p-3 bg-gray-700 rounded text-sm text-gray-400">
            <p className="mb-2">
              <strong>Примечание:</strong> Google Indexing API позволяет индексировать любые URL,
              но для успешной индексации:
            </p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>URL должен принадлежать сайту, добавленному в Google Search Console</li>
              <li>Service Account должен иметь доступ к сайту в Search Console</li>
              <li>Indexing API должен быть включен в Google Cloud Console</li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}
