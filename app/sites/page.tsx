'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Site, GoogleAccount } from '@/lib/types';

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
  // Состояние для вкладки "Все сайты" - период для показов и кликов
  const [selectedPeriodAllSites, setSelectedPeriodAllSites] = useState<number>(30); // 7, 30, 90, 180 дней
  // Состояние для вкладки "Все сайты с Google Console"
  const [selectedPeriod, setSelectedPeriod] = useState<number>(30); // 7, 30, 90, 180 дней
  const [showImpressions, setShowImpressions] = useState<boolean>(true);
  const [showClicks, setShowClicks] = useState<boolean>(true);
  const [showPositions, setShowPositions] = useState<boolean>(false);
  const [columnsPerRow, setColumnsPerRow] = useState<number>(3); // 1-5 колонок
  const [blurMode, setBlurMode] = useState<boolean>(false); // Режим блюра
  const [hoveredSiteId, setHoveredSiteId] = useState<number | null>(null); // Для интерактивности
  const [hoveredDateIndex, setHoveredDateIndex] = useState<{ siteId: number; index: number } | null>(null); // Для отображения данных конкретной даты
  const [googleAccounts, setGoogleAccounts] = useState<GoogleAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null); // Выбранный Google аккаунт
  const [dailyData, setDailyData] = useState<Record<number, Array<{
    date: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }>>>({});
  const [loadingDailyData, setLoadingDailyData] = useState<Record<number, boolean>>({});

  useEffect(() => {
    loadSites();
    loadCategories();
    loadGoogleAccounts();
    loadAggregatedData(); // Загружаем для обеих вкладок
    if (activeTab === 'google-console') {
      loadGoogleConsoleSites();
    }
  }, [activeTab, selectedPeriodAllSites]); // Перезагружаем при изменении периода для вкладки "Все сайты"

  useEffect(() => {
    // При изменении выбранного аккаунта перезагружаем данные
    if (activeTab === 'google-console') {
      loadAggregatedData();
    }
  }, [selectedAccountId, activeTab]);

  useEffect(() => {
    if (activeTab === 'google-console' && googleConsoleAggregatedData.length > 0) {
      // Загружаем данные по дням для всех сайтов
      googleConsoleAggregatedData.forEach((site) => {
        loadDailyDataForSite(site.id);
      });
    }
  }, [activeTab, googleConsoleAggregatedData, selectedPeriod, selectedAccountId]);

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

  const loadGoogleAccounts = async () => {
    try {
      const response = await fetch('/api/google-accounts');
      const data = await response.json();
      if (data.success && data.accounts) {
        setGoogleAccounts(data.accounts);
        // Если аккаунты есть и ни один не выбран, выбираем первый
        if (data.accounts.length > 0 && !selectedAccountId) {
          setSelectedAccountId(data.accounts[0].id);
        }
      }
    } catch (err) {
      console.error('Error loading Google accounts:', err);
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
      const url = selectedAccountId 
        ? `/api/sites/google-console-sites?accountId=${selectedAccountId}`
        : '/api/sites/google-console-sites';
      const response = await fetch(url);
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
      // Используем selectedPeriodAllSites для вкладки "Все сайты", selectedPeriod для "Все сайты с Google Console"
      const period = activeTab === 'all' ? selectedPeriodAllSites : selectedPeriod;
      const url = selectedAccountId 
        ? `/api/sites/google-console-aggregated?accountId=${selectedAccountId}&days=${period}`
        : `/api/sites/google-console-aggregated?days=${period}`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.success) {
        setGoogleConsoleAggregatedData(data.sites || []);
        // Отладочная информация
        console.log('Загружены агрегированные данные:', data.sites?.map((s: any) => ({
          id: s.id,
          domain: s.domain,
          indexedPages: s.indexedPages
        })));
      }
    } catch (err) {
      console.error('Error loading aggregated data:', err);
    } finally {
      setLoadingAggregatedData(false);
    }
  };

  const loadDailyDataForSite = async (siteId: number) => {
    try {
      setLoadingDailyData(prev => ({ ...prev, [siteId]: true }));
      const response = await fetch(`/api/sites/${siteId}/google-console/daily?days=${selectedPeriod}`);
      const data = await response.json();
      if (data.success) {
        setDailyData(prev => ({
          ...prev,
          [siteId]: data.data || []
        }));
      }
    } catch (err) {
      console.error(`Error loading daily data for site ${siteId}:`, err);
    } finally {
      setLoadingDailyData(prev => ({ ...prev, [siteId]: false }));
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
            <>
              {/* Кнопки выбора периода для вкладки "Все сайты" */}
              <div className="bg-gray-800 rounded-lg p-4 mb-6 border border-gray-700">
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-400">Период для показов и кликов:</span>
                  <div className="flex gap-2">
                    {[7, 30, 90, 180].map((days) => (
                      <button
                        key={days}
                        onClick={() => setSelectedPeriodAllSites(days)}
                        className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                          selectedPeriodAllSites === days
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        {days} дней
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-700">
                      <tr>
                        <th className="px-4 py-3 text-left">Домен</th>
                        <th className="px-4 py-3 text-left">Статус подключения</th>
                        <th className="px-4 py-3 text-left">Показы</th>
                        <th className="px-4 py-3 text-left">Клики</th>
                        <th className="px-4 py-3 text-left">Действия</th>
                      </tr>
                    </thead>
                  <tbody>
                    {sites.map((site) => {
                      // Находим соответствующие данные из googleConsoleAggregatedData
                      const siteData = googleConsoleAggregatedData.find(s => s.id === site.id);
                      return (
                        <tr key={site.id} className="border-t border-gray-700 hover:bg-gray-750">
                          <td className="px-4 py-3">
                            <div className="font-medium">{site.domain}</div>
                            <div className="text-xs text-gray-500">{site.name}</div>
                          </td>
                          <td className="px-4 py-3">
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
                          </td>
                          <td className="px-4 py-3">
                            {siteData && siteData.totalImpressions > 0 ? (
                              <span>{siteData.totalImpressions.toLocaleString()}</span>
                            ) : (
                              <span className="text-gray-500">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {siteData && siteData.totalClicks > 0 ? (
                              <span>{siteData.totalClicks.toLocaleString()}</span>
                            ) : (
                              <span className="text-gray-500">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <Link
                              href={`/sites/${site.id}`}
                              className="text-blue-400 hover:text-blue-300 hover:underline text-sm"
                            >
                              Открыть →
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            </>
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
              
              {/* Контролы для периода и видимости графиков */}
              <div className="sticky top-0 z-50 bg-gray-800 rounded-lg p-4 mb-6 border border-gray-700 shadow-lg backdrop-blur-sm">
                <div className="flex flex-wrap gap-4 items-center">
                  {/* Селектор Google аккаунта */}
                  {googleAccounts.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-400">Google аккаунт:</span>
                      <select
                        value={selectedAccountId || ''}
                        onChange={(e) => setSelectedAccountId(e.target.value ? parseInt(e.target.value) : null)}
                        className="px-3 py-1 bg-gray-700 text-white rounded text-sm border border-gray-600 focus:border-blue-500 focus:outline-none"
                      >
                        {googleAccounts.map((account) => (
                          <option key={account.id} value={account.id}>
                            {account.email}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400">Период:</span>
                    <div className="flex gap-2">
                      {[7, 30, 90, 180].map((days) => (
                        <button
                          key={days}
                          onClick={() => setSelectedPeriod(days)}
                          className={`px-3 py-1 rounded text-sm ${
                            selectedPeriod === days
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          }`}
                        >
                          {days} дн.
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400">Колонок в строке:</span>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((cols) => (
                        <button
                          key={cols}
                          onClick={() => setColumnsPerRow(cols)}
                          className={`px-3 py-1 rounded text-sm ${
                            columnsPerRow === cols
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          }`}
                        >
                          {cols}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-auto">
                    <button
                      onClick={() => setBlurMode(!blurMode)}
                      className={`px-3 py-1 rounded text-sm ${
                        blurMode
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {blurMode ? '🔓 Размытие' : '🔒 Блюр'}
                    </button>
                    <span className="text-sm text-gray-400">Показать на графике:</span>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showImpressions}
                        onChange={(e) => setShowImpressions(e.target.checked)}
                        className="w-4 h-4"
                      />
                      <span className="text-gray-300">Показы</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showClicks}
                        onChange={(e) => setShowClicks(e.target.checked)}
                        className="w-4 h-4"
                      />
                      <span className="text-gray-300">Клики</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showPositions}
                        onChange={(e) => setShowPositions(e.target.checked)}
                        className="w-4 h-4"
                      />
                      <span className="text-gray-300">Средние позиции</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Карточки сайтов */}
              <div className={`grid gap-4 ${
                columnsPerRow === 1 ? 'grid-cols-1' :
                columnsPerRow === 2 ? 'grid-cols-1 md:grid-cols-2' :
                columnsPerRow === 3 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' :
                columnsPerRow === 4 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' :
                'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5'
              }`}>
                {googleConsoleAggregatedData.map((siteData) => {
                  const siteDailyData = dailyData[siteData.id] || [];
                  const isLoading = loadingDailyData[siteData.id];
                  
                  // Подготовка данных для графика
                  const maxImpressions = siteDailyData.length > 0 
                    ? Math.max(...siteDailyData.map(d => d.impressions), 1) 
                    : 1;
                  const maxClicks = siteDailyData.length > 0 
                    ? Math.max(...siteDailyData.map(d => d.clicks), 1) 
                    : 1;
                  const maxPosition = siteDailyData.length > 0 
                    ? Math.max(...siteDailyData.map(d => d.position), 1) 
                    : 1;
                  
                  const isHovered = hoveredSiteId === siteData.id;
                  const hoveredDate = hoveredDateIndex?.siteId === siteData.id 
                    ? siteDailyData[hoveredDateIndex.index] 
                    : null;
                  
                  return (
                    <div
                      key={siteData.id}
                      className="bg-gray-800 rounded-lg p-5 border border-gray-700 transition-all duration-200 hover:border-blue-500 hover:shadow-lg relative min-h-[380px]"
                      onMouseEnter={() => setHoveredSiteId(siteData.id)}
                      onMouseLeave={() => {
                        setHoveredSiteId(null);
                        setHoveredDateIndex(null);
                      }}
                    >
                      {/* Заголовок с названием и доменом */}
                      <div className="mb-4 pb-3 border-b border-gray-700">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h3 className={`text-xl font-bold truncate mb-1 transition-all duration-200 ${
                              blurMode && !isHovered ? 'blur-sm select-none' : 'text-white'
                            }`}>
                              {siteData.name}
                            </h3>
                            <p className={`text-sm truncate transition-all duration-200 ${
                              blurMode && !isHovered ? 'blur-sm select-none' : 'text-gray-400'
                            }`}>
                              {siteData.domain}
                            </p>
                          </div>
                          <Link
                            href={`/sites/${siteData.id}`}
                            className="text-blue-400 hover:text-blue-300 hover:underline text-sm whitespace-nowrap ml-2"
                          >
                            Открыть →
                          </Link>
                        </div>
                      </div>

                      {/* Всплывающее окно с данными конкретной даты */}
                      {hoveredDate && (
                        <div className="absolute top-52 left-1/2 transform -translate-x-1/2 bg-gray-900 rounded-lg p-4 z-30 border-2 border-blue-500 shadow-2xl min-w-[200px]">
                          <div className="text-xs text-gray-300 mb-3 font-semibold text-center border-b border-gray-700 pb-2">
                            {new Date(hoveredDate.date).toLocaleDateString('ru-RU', { 
                              day: '2-digit', 
                              month: 'short', 
                              year: 'numeric',
                              weekday: 'short'
                            })}
                          </div>
                          <div className="space-y-2.5">
                            {showImpressions && (
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-400">Показы:</span>
                                <span className="text-base font-bold text-blue-400">
                                  {hoveredDate.impressions.toLocaleString()}
                                </span>
                              </div>
                            )}
                            {showClicks && (
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-400">Клики:</span>
                                <span className="text-base font-bold text-green-400">
                                  {hoveredDate.clicks.toLocaleString()}
                                </span>
                              </div>
                            )}
                            {showPositions && (
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-400">Позиция:</span>
                                <span className="text-base font-bold text-yellow-400">
                                  {hoveredDate.position.toFixed(1)}
                                </span>
                              </div>
                            )}
                            <div className="flex justify-between items-center pt-2 border-t border-gray-700">
                              <span className="text-sm text-gray-400">CTR:</span>
                              <span className="text-base font-bold text-purple-400">
                                {(hoveredDate.ctr * 100).toFixed(2)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* График */}
                      {isLoading ? (
                        <div className="h-64 flex items-center justify-center text-gray-400 text-sm bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl border border-gray-700">
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                            <span>Загрузка данных...</span>
                          </div>
                        </div>
                      ) : siteDailyData.length > 0 ? (
                        <div>
                          <div className="h-64 bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 rounded-xl p-4 relative border border-gray-700 shadow-inner">
                              <svg width="100%" height="100%" viewBox="0 0 800 200" preserveAspectRatio="none" className="overflow-visible">
                              {/* Определения градиентов */}
                              <defs>
                                <linearGradient id={`impressionsGradient-${siteData.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
                                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                                </linearGradient>
                                <linearGradient id={`clicksGradient-${siteData.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
                                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                                  <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                                </linearGradient>
                                <linearGradient id={`positionsGradient-${siteData.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
                                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.3" />
                                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                                </linearGradient>
                              </defs>
                              
                              {/* Фоновая сетка */}
                              {[0, 1, 2, 3, 4].map((i) => (
                                <line
                                  key={`grid-h-${i}`}
                                  x1="50"
                                  y1={20 + (i * 35)}
                                  x2="750"
                                  y2={20 + (i * 35)}
                                  stroke="#374151"
                                  strokeWidth="0.5"
                                  opacity="0.3"
                                />
                              ))}
                              
                              {/* Оси */}
                              <line
                                x1="50"
                                y1="175"
                                x2="750"
                                y2="175"
                                stroke="#6b7280"
                                strokeWidth="2"
                              />
                              <line
                                x1="50"
                                y1="20"
                                x2="50"
                                y2="175"
                                stroke="#6b7280"
                                strokeWidth="2"
                              />
                              
                              {/* Данные */}
                              {siteDailyData.map((item, index) => {
                                const padding = 50;
                                const width = 700;
                                const height = 155;
                                const x = padding + (index / (siteDailyData.length - 1 || 1)) * width;
                                const impressionsY = 175 - (item.impressions / maxImpressions) * height;
                                const clicksY = 175 - (item.clicks / maxClicks) * height;
                                const positionY = 175 - (item.position / maxPosition) * height;
                                const isHoveredPoint = hoveredDateIndex?.siteId === siteData.id && hoveredDateIndex?.index === index;
                                
                                return (
                                  <g 
                                    key={index}
                                    onMouseEnter={() => setHoveredDateIndex({ siteId: siteData.id, index })}
                                    onMouseLeave={() => setHoveredDateIndex(null)}
                                    style={{ cursor: 'pointer' }}
                                  >
                                    {/* Интерактивная область для наведения - увеличена */}
                                    <rect
                                      x={x - 20}
                                      y={20}
                                      width={40}
                                      height={155}
                                      fill="transparent"
                                    />
                                    
                                    {/* Вертикальная линия при наведении */}
                                    {isHoveredPoint && (
                                      <>
                                        <line
                                          x1={x}
                                          y1={20}
                                          x2={x}
                                          y2={175}
                                          stroke="#60a5fa"
                                          strokeWidth="2"
                                          opacity="0.6"
                                        />
                                        {/* Точка на оси */}
                                        <circle
                                          cx={x}
                                          cy={175}
                                          r="5"
                                          fill="#60a5fa"
                                        />
                                      </>
                                    )}
                                    
                                    {/* Показы */}
                                    {showImpressions && (
                                      <>
                                        <circle
                                          cx={x}
                                          cy={impressionsY}
                                          r={isHoveredPoint ? "7" : "5"}
                                          fill="#3b82f6"
                                          stroke={isHoveredPoint ? "#60a5fa" : "#1e40af"}
                                          strokeWidth={isHoveredPoint ? "2.5" : "1.5"}
                                          className="transition-all duration-200"
                                          style={{ cursor: 'pointer', filter: isHoveredPoint ? 'drop-shadow(0 0 6px rgba(59, 130, 246, 0.9))' : 'drop-shadow(0 0 2px rgba(59, 130, 246, 0.5))' }}
                                        />
                                      </>
                                    )}
                                    {/* Клики */}
                                    {showClicks && (
                                      <>
                                        <circle
                                          cx={x}
                                          cy={clicksY}
                                          r={isHoveredPoint ? "7" : "5"}
                                          fill="#10b981"
                                          stroke={isHoveredPoint ? "#34d399" : "#047857"}
                                          strokeWidth={isHoveredPoint ? "2.5" : "1.5"}
                                          className="transition-all duration-200"
                                          style={{ cursor: 'pointer', filter: isHoveredPoint ? 'drop-shadow(0 0 6px rgba(16, 185, 129, 0.9))' : 'drop-shadow(0 0 2px rgba(16, 185, 129, 0.5))' }}
                                        />
                                      </>
                                    )}
                                    {/* Позиции */}
                                    {showPositions && (
                                      <>
                                        <circle
                                          cx={x}
                                          cy={positionY}
                                          r={isHoveredPoint ? "7" : "5"}
                                          fill="#f59e0b"
                                          stroke={isHoveredPoint ? "#fbbf24" : "#d97706"}
                                          strokeWidth={isHoveredPoint ? "2.5" : "1.5"}
                                          className="transition-all duration-200"
                                          style={{ cursor: 'pointer', filter: isHoveredPoint ? 'drop-shadow(0 0 6px rgba(245, 158, 11, 0.9))' : 'drop-shadow(0 0 2px rgba(245, 158, 11, 0.5))' }}
                                        />
                                      </>
                                    )}
                                  </g>
                                );
                              })}
                              
                              {/* Линии с градиентом */}
                              {siteDailyData.length > 1 && (
                                <>
                                  {showImpressions && (
                                    <>
                                      {/* Область под линией */}
                                      <polygon
                                        points={`50,175 ${siteDailyData.map((item, index) => {
                                          const padding = 50;
                                          const width = 700;
                                          const height = 155;
                                          const x = padding + (index / (siteDailyData.length - 1)) * width;
                                          const y = 175 - (item.impressions / maxImpressions) * height;
                                          return `${x},${y}`;
                                        }).join(' ')} 750,175`}
                                        fill={`url(#impressionsGradient-${siteData.id})`}
                                      />
                                      {/* Линия */}
                                      <polyline
                                        points={siteDailyData.map((item, index) => {
                                          const padding = 50;
                                          const width = 700;
                                          const height = 155;
                                          const x = padding + (index / (siteDailyData.length - 1)) * width;
                                          const y = 175 - (item.impressions / maxImpressions) * height;
                                          return `${x},${y}`;
                                        }).join(' ')}
                                        fill="none"
                                        stroke="#3b82f6"
                                        strokeWidth="2.5"
                                        opacity="0.9"
                                      />
                                    </>
                                  )}
                                  {showClicks && (
                                    <>
                                      <polygon
                                        points={`50,175 ${siteDailyData.map((item, index) => {
                                          const padding = 50;
                                          const width = 700;
                                          const height = 155;
                                          const x = padding + (index / (siteDailyData.length - 1)) * width;
                                          const y = 175 - (item.clicks / maxClicks) * height;
                                          return `${x},${y}`;
                                        }).join(' ')} 750,175`}
                                        fill={`url(#clicksGradient-${siteData.id})`}
                                      />
                                      <polyline
                                        points={siteDailyData.map((item, index) => {
                                          const padding = 50;
                                          const width = 700;
                                          const height = 155;
                                          const x = padding + (index / (siteDailyData.length - 1)) * width;
                                          const y = 175 - (item.clicks / maxClicks) * height;
                                          return `${x},${y}`;
                                        }).join(' ')}
                                        fill="none"
                                        stroke="#10b981"
                                        strokeWidth="2.5"
                                        opacity="0.9"
                                      />
                                    </>
                                  )}
                                  {showPositions && (
                                    <>
                                      <polygon
                                        points={`50,175 ${siteDailyData.map((item, index) => {
                                          const padding = 50;
                                          const width = 700;
                                          const height = 155;
                                          const x = padding + (index / (siteDailyData.length - 1)) * width;
                                          const y = 175 - (item.position / maxPosition) * height;
                                          return `${x},${y}`;
                                        }).join(' ')} 750,175`}
                                        fill={`url(#positionsGradient-${siteData.id})`}
                                      />
                                      <polyline
                                        points={siteDailyData.map((item, index) => {
                                          const padding = 50;
                                          const width = 700;
                                          const height = 155;
                                          const x = padding + (index / (siteDailyData.length - 1)) * width;
                                          const y = 175 - (item.position / maxPosition) * height;
                                          return `${x},${y}`;
                                        }).join(' ')}
                                        fill="none"
                                        stroke="#f59e0b"
                                        strokeWidth="2.5"
                                        opacity="0.9"
                                      />
                                    </>
                                  )}
                                </>
                              )}
                            </svg>
                            {/* Легенда */}
                            <div className="absolute bottom-3 right-3 flex gap-4 text-xs bg-gray-800/90 backdrop-blur-sm px-3 py-2 rounded-lg border border-gray-700 shadow-lg">
                              {showImpressions && (
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 bg-blue-500 rounded-full shadow-sm"></div>
                                  <span className="text-gray-200 text-xs font-medium">Показы</span>
                                </div>
                              )}
                              {showClicks && (
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 bg-green-500 rounded-full shadow-sm"></div>
                                  <span className="text-gray-200 text-xs font-medium">Клики</span>
                                </div>
                              )}
                              {showPositions && (
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 bg-yellow-500 rounded-full shadow-sm"></div>
                                  <span className="text-gray-200 text-xs font-medium">Позиции</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="h-64 flex items-center justify-center text-gray-500 text-sm bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl border border-gray-700">
                          <div className="text-center">
                            <div className="text-gray-400 mb-1">Нет данных</div>
                            <div className="text-xs text-gray-500">за выбранный период</div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
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
