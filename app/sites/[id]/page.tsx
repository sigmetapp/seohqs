'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { GoogleSearchConsoleData, AhrefsData, PostbackData } from '@/lib/types';

export default function SiteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const siteId = params.id as string;

  const [site, setSite] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'google' | 'ahrefs' | 'postbacks'>('overview');
  const [googleData, setGoogleData] = useState<GoogleSearchConsoleData[]>([]);
  const [ahrefsData, setAhrefsData] = useState<AhrefsData | null>(null);
  const [postbacks, setPostbacks] = useState<PostbackData[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    if (siteId) {
      loadSite();
    }
  }, [siteId]);

  useEffect(() => {
    if (site && activeTab !== 'overview') {
      loadTabData();
    }
  }, [site, activeTab]);

  const loadSite = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/sites/${siteId}`);
      const data = await response.json();
      if (data.success) {
        setSite(data.site);
      }
    } catch (err) {
      console.error('Error loading site:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadTabData = async () => {
    try {
      setLoadingData(true);
      if (activeTab === 'google') {
        const response = await fetch(`/api/sites/${siteId}/google-console`);
        const data = await response.json();
        if (data.success) {
          setGoogleData(data.data || []);
        }
      } else if (activeTab === 'ahrefs') {
        const response = await fetch(`/api/sites/${siteId}/ahrefs`);
        const data = await response.json();
        if (data.success) {
          setAhrefsData(data.data);
        }
      } else if (activeTab === 'postbacks') {
        const response = await fetch(`/api/sites/${siteId}/postbacks`);
        const data = await response.json();
        if (data.success) {
          setPostbacks(data.postbacks || []);
        }
      }
    } catch (err) {
      console.error('Error loading tab data:', err);
    } finally {
      setLoadingData(false);
    }
  };

  const handleSyncGoogle = async () => {
    try {
      setLoadingData(true);
      const response = await fetch(`/api/sites/${siteId}/google-console/sync`, {
        method: 'POST',
      });
      const data = await response.json();
      if (data.success) {
        loadTabData();
        alert('Данные Google Search Console обновлены');
      } else {
        alert(data.error || 'Ошибка синхронизации');
      }
    } catch (err) {
      console.error('Error syncing Google:', err);
      alert('Ошибка синхронизации');
    } finally {
      setLoadingData(false);
    }
  };

  const handleSyncAhrefs = async () => {
    try {
      setLoadingData(true);
      const response = await fetch(`/api/sites/${siteId}/ahrefs/sync`, {
        method: 'POST',
      });
      const data = await response.json();
      if (data.success) {
        loadTabData();
        alert('Данные Ahrefs обновлены');
      } else {
        alert(data.error || 'Ошибка синхронизации');
      }
    } catch (err) {
      console.error('Error syncing Ahrefs:', err);
      alert('Ошибка синхронизации');
    } finally {
      setLoadingData(false);
    }
  };

  if (loading && !site) {
    return (
      <main className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">Загрузка...</div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <button
            onClick={() => router.push('/sites')}
            className="text-blue-400 hover:text-blue-300 mb-4"
          >
            ← Назад к сайтам
          </button>
          <h1 className="text-4xl font-bold mb-2">{site?.name || 'Сайт'}</h1>
          <p className="text-gray-400">{site?.domain}</p>
        </div>

        {/* Вкладки */}
        <div className="border-b border-gray-700 mb-6">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', label: 'Обзор' },
              { id: 'google', label: 'Google Console' },
              { id: 'ahrefs', label: 'Ahrefs' },
              { id: 'postbacks', label: 'Постбеки' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Контент вкладок */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="text-sm text-gray-400 mb-2">Домен</div>
                <div className="text-xl font-bold">{site?.domain}</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="text-sm text-gray-400 mb-2">Google Console</div>
                <div className="text-xl font-bold">
                  {site?.googleSearchConsoleUrl ? (
                    <span className="text-green-400">Подключено</span>
                  ) : (
                    <span className="text-gray-600">Не подключено</span>
                  )}
                </div>
              </div>
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="text-sm text-gray-400 mb-2">Ahrefs API</div>
                <div className="text-xl font-bold">
                  {site?.hasAhrefsConnection ? (
                    <span className="text-green-400">Подключено</span>
                  ) : (
                    <span className="text-gray-600">Не подключено</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'google' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Данные Google Search Console</h2>
              <button
                onClick={handleSyncGoogle}
                disabled={loadingData || !site?.googleSearchConsoleUrl}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50"
              >
                {loadingData ? 'Синхронизация...' : 'Синхронизировать'}
              </button>
            </div>
            {loadingData ? (
              <div className="text-center py-8">Загрузка данных...</div>
            ) : googleData.length === 0 ? (
              <div className="bg-gray-800 rounded-lg p-8 text-center border border-gray-700">
                <p className="text-gray-400">Данные не загружены</p>
              </div>
            ) : (
              <div className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
                <table className="w-full">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left">Дата</th>
                      <th className="px-4 py-3 text-left">Клики</th>
                      <th className="px-4 py-3 text-left">Показы</th>
                      <th className="px-4 py-3 text-left">CTR</th>
                      <th className="px-4 py-3 text-left">Позиция</th>
                    </tr>
                  </thead>
                  <tbody>
                    {googleData.map((item, index) => (
                      <tr key={index} className="border-t border-gray-700">
                        <td className="px-4 py-3">{new Date(item.date).toLocaleDateString('ru-RU')}</td>
                        <td className="px-4 py-3">{item.clicks}</td>
                        <td className="px-4 py-3">{item.impressions}</td>
                        <td className="px-4 py-3">{(item.ctr * 100).toFixed(2)}%</td>
                        <td className="px-4 py-3">{item.position.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'ahrefs' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Данные Ahrefs</h2>
              <button
                onClick={handleSyncAhrefs}
                disabled={loadingData || !site?.hasAhrefsConnection}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50"
              >
                {loadingData ? 'Синхронизация...' : 'Синхронизировать'}
              </button>
            </div>
            {loadingData ? (
              <div className="text-center py-8">Загрузка данных...</div>
            ) : !ahrefsData ? (
              <div className="bg-gray-800 rounded-lg p-8 text-center border border-gray-700">
                <p className="text-gray-400">Данные не загружены</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                  <div className="text-sm text-gray-400 mb-2">Domain Rating</div>
                  <div className="text-3xl font-bold">{ahrefsData.domainRating}</div>
                </div>
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                  <div className="text-sm text-gray-400 mb-2">Backlinks</div>
                  <div className="text-3xl font-bold">{ahrefsData.backlinks.toLocaleString()}</div>
                </div>
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                  <div className="text-sm text-gray-400 mb-2">Referring Domains</div>
                  <div className="text-3xl font-bold">{ahrefsData.referringDomains.toLocaleString()}</div>
                </div>
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                  <div className="text-sm text-gray-400 mb-2">Organic Keywords</div>
                  <div className="text-3xl font-bold">{ahrefsData.organicKeywords.toLocaleString()}</div>
                </div>
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                  <div className="text-sm text-gray-400 mb-2">Organic Traffic</div>
                  <div className="text-3xl font-bold">{ahrefsData.organicTraffic.toLocaleString()}</div>
                </div>
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                  <div className="text-sm text-gray-400 mb-2">Обновлено</div>
                  <div className="text-lg">{new Date(ahrefsData.date).toLocaleDateString('ru-RU')}</div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'postbacks' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Постбеки с партнерок</h2>
            {loadingData ? (
              <div className="text-center py-8">Загрузка данных...</div>
            ) : postbacks.length === 0 ? (
              <div className="bg-gray-800 rounded-lg p-8 text-center border border-gray-700">
                <p className="text-gray-400 mb-4">Постбеки не найдены</p>
                <p className="text-sm text-gray-500">
                  Настройте endpoint для приема постбеков: <code className="bg-gray-900 px-2 py-1 rounded">/api/sites/{siteId}/postbacks</code>
                </p>
              </div>
            ) : (
              <div className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
                <table className="w-full">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left">Дата</th>
                      <th className="px-4 py-3 text-left">Партнерка</th>
                      <th className="px-4 py-3 text-left">Событие</th>
                      <th className="px-4 py-3 text-left">Сумма</th>
                    </tr>
                  </thead>
                  <tbody>
                    {postbacks.map((postback, index) => (
                      <tr key={index} className="border-t border-gray-700">
                        <td className="px-4 py-3">{new Date(postback.date).toLocaleString('ru-RU')}</td>
                        <td className="px-4 py-3">{postback.network}</td>
                        <td className="px-4 py-3">{postback.event}</td>
                        <td className="px-4 py-3">
                          {postback.amount} {postback.currency}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
