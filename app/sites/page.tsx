'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Site } from '@/lib/types';

type TabType = 'all' | 'google-console';

export default function SitesPage() {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [sites, setSites] = useState<Site[]>([]);
  const [googleConsoleSites, setGoogleConsoleSites] = useState<Array<{ siteUrl: string; permissionLevel: string }>>([]);
  const [googleConsoleAggregatedData, setGoogleConsoleAggregatedData] = useState<Array<{
    id: number;
    domain: string;
    name: string;
    hasGoogleConsoleConnection: boolean;
    googleConsoleSiteUrl: string | null;
    totalImpressions: number;
    totalClicks: number;
    indexedPages: number | null;
    referringDomains: number | null;
    backlinks: number | null;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [loadingGoogleSites, setLoadingGoogleSites] = useState(false);
  const [loadingAggregatedData, setLoadingAggregatedData] = useState(false);
  const [googleConsoleError, setGoogleConsoleError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSite, setNewSite] = useState({
    name: '',
    domain: '',
    category: '',
    googleSearchConsoleUrl: '',
  });
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    loadSites();
    loadCategories();
    if (activeTab === 'google-console') {
      loadGoogleConsoleSites();
      loadAggregatedData();
    }
  }, [activeTab]);

  const loadCategories = async () => {
    try {
      const response = await fetch('/api/data');
      const data = await response.json();
      if (data.success && data.offers) {
        // Получаем уникальные категории из офферов
        const uniqueCategories = Array.from(
          new Set(data.offers.map((offer: any) => offer.topic || offer.category).filter(Boolean))
        ) as string[];
        setCategories(uniqueCategories.sort());
      }
    } catch (err) {
      console.error('Error loading categories:', err);
    }
  };

  const loadSites = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/sites');
      const data = await response.json();
      if (data.success) {
        setSites(data.sites || []);
      }
    } catch (err) {
      console.error('Error loading sites:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadGoogleConsoleSites = async () => {
    try {
      setLoadingGoogleSites(true);
      setGoogleConsoleError(null);
      const response = await fetch('/api/sites/google-console-sites');
      const data = await response.json();
      if (data.success) {
        setGoogleConsoleSites(data.sites || []);
        setGoogleConsoleError(null);
      } else {
        // Не устанавливаем ошибку, если сайты уже загружены из БД
        if (sites.length === 0) {
          setGoogleConsoleError(data.error || 'Ошибка загрузки сайтов из Google Search Console');
        }
      }
    } catch (err) {
      console.error('Error loading Google Console sites:', err);
      // Не устанавливаем ошибку, если сайты уже загружены из БД
      if (sites.length === 0) {
        setGoogleConsoleError('Ошибка загрузки сайтов из Google Search Console');
      }
    } finally {
      setLoadingGoogleSites(false);
    }
  };

  const loadAggregatedData = async () => {
    try {
      setLoadingAggregatedData(true);
      const response = await fetch('/api/sites/google-console-aggregated');
      const data = await response.json();
      if (data.success) {
        setGoogleConsoleAggregatedData(data.sites || []);
      }
    } catch (err) {
      console.error('Error loading aggregated data:', err);
    } finally {
      setLoadingAggregatedData(false);
    }
  };

  const handleLoadGoogleSites = async () => {
    try {
      setLoadingGoogleSites(true);
      setGoogleConsoleError(null);
      const response = await fetch('/api/sites/load-google-console-sites', {
        method: 'POST',
      });
      const data = await response.json();
      if (data.success) {
        alert(`Успешно! Загружено ${data.sitesLoaded} новых сайтов, обновлено ${data.sitesUpdated} существующих, загружено ${data.dataLoaded} записей данных`);
        setGoogleConsoleError(null);
        await loadSites();
        await loadGoogleConsoleSites();
        await loadAggregatedData();
      } else {
        const errorMsg = data.error || 'Ошибка загрузки сайтов';
        setGoogleConsoleError(errorMsg);
        alert(errorMsg);
      }
    } catch (err) {
      console.error('Error loading Google Console sites:', err);
      const errorMsg = 'Ошибка загрузки сайтов из Google Console';
      setGoogleConsoleError(errorMsg);
      alert(errorMsg);
    } finally {
      setLoadingGoogleSites(false);
    }
  };

  const handleCreateSite = async () => {
    try {
      const response = await fetch('/api/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSite),
      });
      const data = await response.json();
      if (data.success) {
        setShowCreateModal(false);
        setNewSite({ name: '', domain: '', category: '', googleSearchConsoleUrl: '' });
        loadSites();
      } else {
        alert(data.error || 'Ошибка создания сайта');
      }
    } catch (err) {
      console.error('Error creating site:', err);
      alert('Ошибка создания сайта');
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">Загрузка...</div>
        </div>
      </main>
    );
  }

  // Функция для нормализации домена из Google Console URL
  const normalizeGoogleConsoleDomain = (siteUrl: string): string => {
    let domain = siteUrl.replace(/^sc-domain:/, '');
    domain = domain.replace(/^https?:\/\//, '');
    domain = domain.replace(/^www\./, '');
    domain = domain.split('/')[0];
    return domain.toLowerCase().trim();
  };

  return (
    <main className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold mb-2">Панель сайтов</h1>
            <p className="text-gray-400">Мониторинг сайтов: Google Console, постбеки</p>
          </div>
          {activeTab === 'all' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
            >
              + Добавить сайт
            </button>
          )}
          {activeTab === 'google-console' && (
            <button
              onClick={handleLoadGoogleSites}
              disabled={loadingGoogleSites}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingGoogleSites ? 'Загрузка...' : '🔄 Загрузить все сайты из Google Console'}
            </button>
          )}
        </div>

        {/* Вкладки */}
        <div className="mb-6 border-b border-gray-700">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'all'
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              Все сайты
            </button>
            <button
              onClick={() => setActiveTab('google-console')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'google-console'
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              Все сайты с Google Console
            </button>
          </div>
        </div>

        {activeTab === 'all' ? (
          sites.length === 0 ? (
            <div className="bg-gray-800 rounded-lg p-8 text-center border border-gray-700">
              <p className="text-gray-400 mb-4">Сайты не добавлены</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
              >
                Добавить первый сайт
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sites.map((site) => (
                <Link
                  key={site.id}
                  href={`/sites/${site.id}`}
                  className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-blue-500 transition-colors cursor-pointer"
                >
                  <h3 className="text-xl font-bold mb-2">{site.name}</h3>
                  <p className="text-gray-400 text-sm mb-4">{site.domain}</p>
                  {site.category && (
                    <p className="text-blue-400 text-xs mb-2">Категория: {site.category}</p>
                  )}
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Google Console:</span>
                      <div className="flex items-center gap-2">
                        {site.hasGoogleConsoleConnection ? (
                          <span className="text-green-400">✓ Подключено</span>
                        ) : (
                          <span className="text-yellow-400">
                            {site.googleConsoleStatus?.hasOAuth && !site.googleConsoleStatus?.hasUrl
                              ? '⚠ Нет URL'
                              : !site.googleConsoleStatus?.hasOAuth
                              ? '⚠ Нет OAuth'
                              : '✗ Не подключено'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-600 mt-4">
                    Добавлен: {new Date(site.createdAt).toLocaleDateString('ru-RU')}
                  </div>
                </Link>
              ))}
            </div>
          )
        ) : (
          loadingAggregatedData || loadingGoogleSites ? (
            <div className="bg-gray-800 rounded-lg p-8 text-center border border-gray-700">
              <div className="text-gray-400">Загрузка данных...</div>
            </div>
          ) : googleConsoleAggregatedData.length > 0 ? (
            <>
              {googleConsoleError && (
                <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4 mb-4">
                  <div className="text-yellow-300 text-sm">
                    <strong>Предупреждение:</strong> {googleConsoleError}
                  </div>
                </div>
              )}
              <div className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-700">
                      <tr>
                        <th className="px-4 py-3 text-left">Домен</th>
                        <th className="px-4 py-3 text-left">Статус подключения</th>
                        <th className="px-4 py-3 text-left">Индекс Google</th>
                        <th className="px-4 py-3 text-left">Показы</th>
                        <th className="px-4 py-3 text-left">Клики</th>
                        <th className="px-4 py-3 text-left">Домены на домен</th>
                        <th className="px-4 py-3 text-left">Ссылки на домен</th>
                        <th className="px-4 py-3 text-left">Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {googleConsoleAggregatedData.map((siteData) => (
                        <tr key={siteData.id} className="border-t border-gray-700 hover:bg-gray-750">
                          <td className="px-4 py-3">
                            <div className="font-medium">{siteData.domain}</div>
                            <div className="text-xs text-gray-500">{siteData.name}</div>
                          </td>
                          <td className="px-4 py-3">
                            {siteData.hasGoogleConsoleConnection ? (
                              <span className="text-green-400">✓ Подключено</span>
                            ) : (
                              <span className="text-yellow-400">⚠ Не подключено</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {siteData.indexedPages !== null ? (
                              <span>{siteData.indexedPages.toLocaleString()}</span>
                            ) : (
                              <span className="text-gray-500">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {siteData.totalImpressions > 0 ? (
                              <span>{siteData.totalImpressions.toLocaleString()}</span>
                            ) : (
                              <span className="text-gray-500">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {siteData.totalClicks > 0 ? (
                              <span>{siteData.totalClicks.toLocaleString()}</span>
                            ) : (
                              <span className="text-gray-500">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {siteData.referringDomains !== null ? (
                              <span>{siteData.referringDomains.toLocaleString()}</span>
                            ) : (
                              <span className="text-gray-500">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {siteData.backlinks !== null ? (
                              <span>{siteData.backlinks.toLocaleString()}</span>
                            ) : (
                              <span className="text-gray-500">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <Link
                              href={`/sites/${siteData.id}`}
                              className="text-blue-400 hover:text-blue-300 hover:underline text-sm"
                            >
                              Открыть →
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : googleConsoleError ? (
            <div className="bg-gray-800 rounded-lg p-8 border border-red-500">
              <div className="text-red-400 mb-4">
                <h3 className="text-xl font-bold mb-2">Ошибка загрузки сайтов</h3>
                <p className="text-sm whitespace-pre-line">{googleConsoleError}</p>
              </div>
              {googleConsoleError.includes('не включен') || googleConsoleError.includes('Enable it by visiting') ? (
                <div className="mt-4 space-y-2">
                  <p className="text-gray-300 text-sm">
                    Для решения проблемы:
                  </p>
                  <ol className="text-gray-300 text-sm list-decimal list-inside space-y-1 ml-4">
                    <li>Перейдите по ссылке выше, чтобы включить Google Search Console API</li>
                    <li>Нажмите кнопку "Enable" (Включить)</li>
                    <li>Подождите 2-3 минуты для распространения изменений</li>
                    <li>Попробуйте загрузить сайты снова</li>
                  </ol>
                </div>
              ) : null}
              <button
                onClick={() => {
                  loadGoogleConsoleSites();
                  loadAggregatedData();
                }}
                className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
              >
                Попробовать снова
              </button>
            </div>
          ) : (
            <div className="bg-gray-800 rounded-lg p-8 text-center border border-gray-700">
              <p className="text-gray-400 mb-4">Сайты не найдены</p>
              <p className="text-gray-500 text-sm mb-4">
                Убедитесь, что вы авторизованы через Google в разделе Интеграции
              </p>
              <button
                onClick={handleLoadGoogleSites}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded"
              >
                Загрузить сайты из Google Console
              </button>
            </div>
          )
        )}

        {/* Модальное окно создания сайта */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md border border-gray-700">
              <h2 className="text-2xl font-bold mb-4">Добавить сайт</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Название сайта
                  </label>
                  <input
                    type="text"
                    value={newSite.name}
                    onChange={(e) => setNewSite({ ...newSite, name: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                    placeholder="Мой сайт"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Домен
                  </label>
                  <input
                    type="text"
                    value={newSite.domain}
                    onChange={(e) => setNewSite({ ...newSite, domain: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                    placeholder="example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Категория (необязательно)
                  </label>
                  <select
                    value={newSite.category}
                    onChange={(e) => setNewSite({ ...newSite, category: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">Выберите категорию</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                  {categories.length === 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      Загрузите офферы, чтобы увидеть доступные категории
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Google Search Console URL <span className="text-gray-500 text-xs">(необязательно - будет определен автоматически по домену)</span>
                  </label>
                  <input
                    type="text"
                    value={newSite.googleSearchConsoleUrl}
                    onChange={(e) => setNewSite({ ...newSite, googleSearchConsoleUrl: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                    placeholder="https://search.google.com/search-console/..."
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCreateSite}
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
                  >
                    Создать
                  </button>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
                  >
                    Отмена
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
