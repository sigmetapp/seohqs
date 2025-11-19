'use client';

import { useState, useEffect } from 'react';
import { useI18n } from '@/lib/i18n-context';

export default function IndexingPage() {
  const { t } = useI18n();
  const [indexingUrl, setIndexingUrl] = useState('');
  const [indexingUrls, setIndexingUrls] = useState('');
  const [indexingLoading, setIndexingLoading] = useState(false);
  const [indexingError, setIndexingError] = useState<string | null>(null);
  const [indexingSuccess, setIndexingSuccess] = useState<string | null>(null);
  const [indexingStatus, setIndexingStatus] = useState<any>(null);

  const handleIndexUrl = async () => {
    if (!indexingUrl.trim()) {
      setIndexingError(t('indexing.enterUrlError'));
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
        setIndexingError(data.error || data.message || t('indexing.indexingError'));
        setIndexingStatus(data);
      }
    } catch (err: any) {
      console.error('Index error:', err);
      setIndexingError(err.message || t('indexing.connectionError'));
    } finally {
      setIndexingLoading(false);
    }
  };

  const handleIndexUrls = async () => {
    if (!indexingUrls.trim()) {
      setIndexingError(t('indexing.enterUrlsError'));
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
        setIndexingError(t('indexing.noValidUrls'));
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
        setIndexingError(data.error || data.message || t('indexing.indexingError'));
        setIndexingStatus(data);
      }
    } catch (err: any) {
      console.error('Index error:', err);
      setIndexingError(err.message || t('indexing.connectionError'));
    } finally {
      setIndexingLoading(false);
    }
  };

  const handleRemoveUrl = async () => {
    if (!indexingUrl.trim()) {
      setIndexingError(t('indexing.enterUrlRemoveError'));
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
        setIndexingError(data.error || data.message || t('indexing.removeError'));
        setIndexingStatus(data);
      }
    } catch (err: any) {
      console.error('Remove error:', err);
      setIndexingError(err.message || t('indexing.connectionError'));
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
    
    // Check URL parameters for error messages from OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');
    
    if (error) {
      setIndexingError(decodeURIComponent(error));
      // Remove parameter from URL
      window.history.replaceState({}, '', '/indexing');
    }
  }, []);

  return (
    <main className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">{t('indexing.title')}</h1>
          <p className="text-gray-600 dark:text-gray-400">{t('indexing.description')}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 mb-6 border border-gray-200 dark:border-blue-500 shadow-sm dark:shadow-none">
          {indexingStatus && (
            <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                <strong>{t('indexing.serviceStatus')}</strong>{' '}
                {indexingStatus.configured ? (
                  <span className="text-green-600 dark:text-green-400">{t('indexing.configured')}</span>
                ) : (
                  <span className="text-red-600 dark:text-red-400">{t('indexing.notConfigured')}</span>
                )}
              </p>
              {indexingStatus.message && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{indexingStatus.message}</p>
              )}
            </div>
          )}

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('indexing.indexSingleUrl')}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={indexingUrl}
                onChange={(e) => setIndexingUrl(e.target.value)}
                placeholder={t('indexing.indexUrlPlaceholder')}
                className="flex-1 px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded border border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:outline-none"
                disabled={indexingLoading}
              />
              <button
                onClick={handleIndexUrl}
                disabled={indexingLoading || !indexingUrl.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {indexingLoading ? t('indexing.indexing') : t('indexing.indexButton')}
              </button>
              <button
                onClick={handleRemoveUrl}
                disabled={indexingLoading || !indexingUrl.trim()}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('indexing.removeButton')}
              </button>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('indexing.indexMultipleUrls')}
            </label>
            <textarea
              value={indexingUrls}
              onChange={(e) => setIndexingUrls(e.target.value)}
              placeholder={t('indexing.indexMultiplePlaceholder')}
              rows={6}
              className="w-full px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded border border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:outline-none font-mono text-sm"
              disabled={indexingLoading}
            />
            <button
              onClick={handleIndexUrls}
              disabled={indexingLoading || !indexingUrls.trim()}
              className="mt-2 px-4 py-2 bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {indexingLoading ? t('indexing.indexing') : t('indexing.indexAllButton')}
            </button>
          </div>

          {indexingSuccess && (
            <div className="bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 rounded p-3 mb-4">
              <p className="text-green-800 dark:text-green-200 font-bold">✓ {indexingSuccess}</p>
            </div>
          )}

          {indexingError && (
            <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded p-3 mb-4">
              <p className="text-red-800 dark:text-red-200 font-bold">✗ {indexingError}</p>
            </div>
          )}

          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-400">
            <p className="mb-2">
              <strong>{t('indexing.note')}</strong> {t('indexing.noteText')}
            </p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>{t('indexing.noteItem1')}</li>
              <li>{t('indexing.noteItem2')}</li>
              <li>{t('indexing.noteItem3')}</li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}
