'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Site } from '@/lib/types';

type TabType = 'all' | 'google-console';

export default function SitesPage() {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [sites, setSites] = useState<Site[]>([]);
  const [googleConsoleSites, setGoogleConsoleSites] = useState<Array<{ siteUrl: string; permissionLevel: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [loadingGoogleSites, setLoadingGoogleSites] = useState(false);
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
      const response = await fetch('/api/sites/google-console-sites');
      const data = await response.json();
      if (data.success) {
        setGoogleConsoleSites(data.sites || []);
      }
    } catch (err) {
      console.error('Error loading Google Console sites:', err);
    } finally {
      setLoadingGoogleSites(false);
    }
  };

  const handleLoadGoogleSites = async () => {
    try {
      setLoadingGoogleSites(true);
      const response = await fetch('/api/sites/load-google-console-sites', {
        method: 'POST',
      });
      const data = await response.json();
      if (data.success) {
        alert(`Успешно! Загружено ${data.sitesLoaded} новых сайтов, обновлено ${data.sitesUpdated} существующих, загружено ${data.dataLoaded} записей данных`);
        loadSites();
        loadGoogleConsoleSites();
      } else {
        alert(data.error || 'Ошибка загрузки сайтов');
      }
    } catch (err) {
      console.error('Error loading Google Console sites:', err);
      alert('Ошибка загрузки сайтов из Google Console');
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
          loadingGoogleSites ? (
            <div className="bg-gray-800 rounded-lg p-8 text-center border border-gray-700">
              <div className="text-gray-400">Загрузка сайтов из Google Console...</div>
            </div>
          ) : googleConsoleSites.length === 0 ? (
            <div className="bg-gray-800 rounded-lg p-8 text-center border border-gray-700">
              <p className="text-gray-400 mb-4">Сайты из Google Search Console не найдены</p>
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
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {googleConsoleSites.map((googleSite, index) => {
                const domain = normalizeGoogleConsoleDomain(googleSite.siteUrl);
                const existingSite = sites.find(site => {
                  const siteDomain = normalizeGoogleConsoleDomain(site.domain);
                  return siteDomain === domain || 
                         siteDomain === `www.${domain}` ||
                         domain === `www.${siteDomain}`;
                });

                return (
                  <div
                    key={index}
                    className={`bg-gray-800 rounded-lg p-6 border ${
                      existingSite 
                        ? 'border-green-500 hover:border-green-400' 
                        : 'border-gray-700 hover:border-blue-500'
                    } transition-colors`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-xl font-bold">{domain}</h3>
                      {existingSite && (
                        <Link
                          href={`/sites/${existingSite.id}`}
                          className="text-green-400 text-xs hover:underline"
                        >
                          Открыть →
                        </Link>
                      )}
                    </div>
                    <p className="text-gray-400 text-sm mb-2">{googleSite.siteUrl}</p>
                    <div className="space-y-2 text-xs mt-4">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">Уровень доступа:</span>
                        <span className="text-blue-400">{googleSite.permissionLevel}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">Статус:</span>
                        {existingSite ? (
                          <span className="text-green-400">✓ В базе данных</span>
                        ) : (
                          <span className="text-yellow-400">⚠ Не добавлен</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
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
