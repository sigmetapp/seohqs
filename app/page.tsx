'use client';

import { useState } from 'react';

interface IndexResult {
  url: string;
  success: boolean;
  error?: string;
  data?: any;
}

export default function Home() {
  const [url, setUrl] = useState('');
  const [urls, setUrls] = useState('');
  const [type, setType] = useState<'URL_UPDATED' | 'URL_DELETED'>('URL_UPDATED');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSingleUrl = async () => {
    if (!url.trim()) {
      setError('Введите URL');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/index', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: url.trim(), type }),
      });

      const data = await response.json();
      
      if (data.success) {
        setResult(data);
      } else {
        setError(data.error || 'Ошибка при индексации');
        setResult(data);
      }
    } catch (err: any) {
      setError(err.message || 'Ошибка подключения');
    } finally {
      setLoading(false);
    }
  };

  const handleMultipleUrls = async () => {
    const urlList = urls
      .split('\n')
      .map(u => u.trim())
      .filter(u => u.length > 0);

    if (urlList.length === 0) {
      setError('Введите хотя бы один URL');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/index', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ urls: urlList, type }),
      });

      const data = await response.json();
      
      if (data.success) {
        setResult(data);
      } else {
        setError(data.error || 'Ошибка при индексации');
        setResult(data);
      }
    } catch (err: any) {
      setError(err.message || 'Ошибка подключения');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Google Indexing Service</h1>
          <p className="text-gray-400">
            Сервис для отправки URL на индексацию в Google Search Console
          </p>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Тип операции</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as 'URL_UPDATED' | 'URL_DELETED')}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white"
            >
              <option value="URL_UPDATED">URL_UPDATED - Обновить/Добавить</option>
              <option value="URL_DELETED">URL_DELETED - Удалить</option>
            </select>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">
              Один URL
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/page"
                className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400"
                disabled={loading}
              />
              <button
                onClick={handleSingleUrl}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Отправка...' : 'Отправить'}
              </button>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Несколько URL (по одному на строку)
            </label>
            <textarea
              value={urls}
              onChange={(e) => setUrls(e.target.value)}
              placeholder="https://example.com/page1&#10;https://example.com/page2&#10;https://example.com/page3"
              rows={8}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 font-mono text-sm"
              disabled={loading}
            />
            <button
              onClick={handleMultipleUrls}
              disabled={loading}
              className="mt-2 px-6 py-2 bg-green-600 hover:bg-green-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Отправка...' : 'Отправить все'}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-900 border border-red-700 rounded p-4 mb-6">
            <p className="text-red-200 font-bold">Ошибка: {error}</p>
          </div>
        )}

        {result && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">Результат</h2>
            
            {result.summary && (
              <div className="mb-4 p-4 bg-gray-700 rounded">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-blue-400">{result.summary.total}</div>
                    <div className="text-sm text-gray-400">Всего</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-400">{result.summary.success}</div>
                    <div className="text-sm text-gray-400">Успешно</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-red-400">{result.summary.failed}</div>
                    <div className="text-sm text-gray-400">Ошибок</div>
                  </div>
                </div>
              </div>
            )}

            {result.results && (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {result.results.map((r: IndexResult, index: number) => (
                  <div
                    key={index}
                    className={`p-3 rounded ${
                      r.success ? 'bg-green-900/30 border border-green-700' : 'bg-red-900/30 border border-red-700'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-mono text-sm break-all">{r.url}</div>
                        {r.success ? (
                          <div className="text-green-400 text-sm mt-1">✓ Успешно отправлено</div>
                        ) : (
                          <div className="text-red-400 text-sm mt-1">
                            ✗ Ошибка: {r.error || 'Неизвестная ошибка'}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {result.url && !result.results && (
              <div className={`p-3 rounded ${
                result.success ? 'bg-green-900/30 border border-green-700' : 'bg-red-900/30 border border-red-700'
              }`}>
                <div className="font-mono text-sm break-all mb-2">{result.url}</div>
                {result.success ? (
                  <div className="text-green-400">✓ {result.message}</div>
                ) : (
                  <div className="text-red-400">✗ {result.error}</div>
                )}
              </div>
            )}

            {result.message && !result.results && (
              <div className="mt-4 text-gray-300">{result.message}</div>
            )}
          </div>
        )}

        <div className="mt-8 bg-blue-900/30 border border-blue-700 rounded p-4">
          <h3 className="font-bold mb-2">ℹ️ Информация</h3>
          <ul className="text-sm text-gray-300 space-y-1 list-disc list-inside">
            <li>Убедитесь, что настроены переменные окружения GOOGLE_SERVICE_ACCOUNT_EMAIL и GOOGLE_PRIVATE_KEY</li>
            <li>Service Account должен иметь доступ к Google Search Console</li>
            <li>URL должны принадлежать веб-сайту, добавленному в Search Console</li>
            <li>API имеет лимиты: до 200 запросов в день на один URL</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
