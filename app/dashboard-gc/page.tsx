'use client';

import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import Link from 'next/link';
import { GoogleAccount, Tag } from '@/lib/types';

type SiteData = {
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
};

type DailyData = {
  date: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

// Мемоизированный компонент карточки сайта для оптимизации рендеринга
const SiteCard = memo(({ 
  siteData, 
  dailyData, 
  isLoading, 
  showImpressions, 
  showClicks, 
  showPositions,
  blurMode,
  onHover,
  onHoverLeave,
  hoveredSiteId,
  hoveredDateIndex,
  setHoveredDateIndex
}: {
  siteData: SiteData;
  dailyData: DailyData[];
  isLoading: boolean;
  showImpressions: boolean;
  showClicks: boolean;
  showPositions: boolean;
  blurMode: boolean;
  onHover: () => void;
  onHoverLeave: () => void;
  hoveredSiteId: number | null;
  hoveredDateIndex: { siteId: number; index: number } | null;
  setHoveredDateIndex: (value: { siteId: number; index: number } | null) => void;
}) => {
  const isHovered = hoveredSiteId === siteData.id;
  const hoveredDate = hoveredDateIndex?.siteId === siteData.id 
    ? dailyData[hoveredDateIndex.index] 
    : null;

  // Подготовка данных для графика
  // Увеличиваем максимальные значения в 3 раза для лучшей визуализации
  // Это позволяет графику отображаться в середине шкалы, а не заполнять всю высоту
  const maxImpressions = dailyData.length > 0 
    ? Math.max(...dailyData.map(d => d.impressions), 1) * 3
    : 3;
  const maxClicks = dailyData.length > 0 
    ? Math.max(...dailyData.map(d => d.clicks), 1) * 3
    : 3;
  const maxPosition = dailyData.length > 0 
    ? Math.max(...dailyData.map(d => d.position), 1) * 3
    : 3;

  // Получаем последние значения для отображения на графике
  const lastData = dailyData.length > 0 ? dailyData[dailyData.length - 1] : null;

  return (
    <div
      className="bg-gray-800 rounded-lg p-5 border border-gray-700 transition-all duration-200 hover:border-blue-500 hover:shadow-lg relative"
      onMouseEnter={onHover}
      onMouseLeave={onHoverLeave}
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

      {/* Всплывающее окно с данными конкретной даты - позиционируем выше графика, чтобы не было под мышкой */}
      {hoveredDate && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 -translate-y-full mb-2 bg-gray-900 rounded-lg p-4 z-30 border-2 border-blue-500 shadow-2xl min-w-[200px] pointer-events-none">
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
        <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <span>Загрузка данных...</span>
          </div>
        </div>
      ) : dailyData.length > 0 ? (
        <div className="relative">
          <div className="h-64 relative">
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
              {dailyData.map((item, index) => {
                const padding = 50;
                const width = 700;
                const height = 155;
                const x = padding + (index / (dailyData.length - 1 || 1)) * width;
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
                    {/* Интерактивная область для наведения */}
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
                    )}
                    {/* Клики */}
                    {showClicks && (
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
                    )}
                    {/* Позиции */}
                    {showPositions && (
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
                    )}
                  </g>
                );
              })}
              
              {/* Линии с градиентом */}
              {dailyData.length > 1 && (
                <>
                  {showImpressions && (
                    <>
                      <polygon
                        points={`50,175 ${dailyData.map((item, index) => {
                          const padding = 50;
                          const width = 700;
                          const height = 155;
                          const x = padding + (index / (dailyData.length - 1)) * width;
                          const y = 175 - (item.impressions / maxImpressions) * height;
                          return `${x},${y}`;
                        }).join(' ')} 750,175`}
                        fill={`url(#impressionsGradient-${siteData.id})`}
                      />
                      <polyline
                        points={dailyData.map((item, index) => {
                          const padding = 50;
                          const width = 700;
                          const height = 155;
                          const x = padding + (index / (dailyData.length - 1)) * width;
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
                        points={`50,175 ${dailyData.map((item, index) => {
                          const padding = 50;
                          const width = 700;
                          const height = 155;
                          const x = padding + (index / (dailyData.length - 1)) * width;
                          const y = 175 - (item.clicks / maxClicks) * height;
                          return `${x},${y}`;
                        }).join(' ')} 750,175`}
                        fill={`url(#clicksGradient-${siteData.id})`}
                      />
                      <polyline
                        points={dailyData.map((item, index) => {
                          const padding = 50;
                          const width = 700;
                          const height = 155;
                          const x = padding + (index / (dailyData.length - 1)) * width;
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
                        points={`50,175 ${dailyData.map((item, index) => {
                          const padding = 50;
                          const width = 700;
                          const height = 155;
                          const x = padding + (index / (dailyData.length - 1)) * width;
                          const y = 175 - (item.position / maxPosition) * height;
                          return `${x},${y}`;
                        }).join(' ')} 750,175`}
                        fill={`url(#positionsGradient-${siteData.id})`}
                      />
                      <polyline
                        points={dailyData.map((item, index) => {
                          const padding = 50;
                          const width = 700;
                          const height = 155;
                          const x = padding + (index / (dailyData.length - 1)) * width;
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
            
            {/* Значки и цифры на графике - показы и клики */}
            {lastData && (
              <div className="absolute top-3 left-3 flex flex-col gap-2">
                {showImpressions && (
                  <div className="flex items-center gap-2 bg-gray-900/90 backdrop-blur-sm px-2 py-1 rounded border border-gray-700">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-xs font-semibold text-blue-400">Показы:</span>
                    <span className="text-xs font-bold text-white">{lastData.impressions.toLocaleString()}</span>
                  </div>
                )}
                {showClicks && (
                  <div className="flex items-center gap-2 bg-gray-900/90 backdrop-blur-sm px-2 py-1 rounded border border-gray-700">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-xs font-semibold text-green-400">Клики:</span>
                    <span className="text-xs font-bold text-white">{lastData.clicks.toLocaleString()}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="h-64 flex items-center justify-center text-gray-500 text-sm">
          <div className="text-center">
            <div className="text-gray-400 mb-1">Нет данных</div>
            <div className="text-xs text-gray-500">за выбранный период</div>
          </div>
        </div>
      )}
    </div>
  );
});

SiteCard.displayName = 'SiteCard';

export default function DashboardGCPage() {
  const [sites, setSites] = useState<SiteData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<number>(30);
  const [showImpressions, setShowImpressions] = useState<boolean>(true);
  const [showClicks, setShowClicks] = useState<boolean>(true);
  const [showPositions, setShowPositions] = useState<boolean>(false);
  const [columnsPerRow, setColumnsPerRow] = useState<number>(3);
  const [blurMode, setBlurMode] = useState<boolean>(false);
  const [hoveredSiteId, setHoveredSiteId] = useState<number | null>(null);
  const [hoveredDateIndex, setHoveredDateIndex] = useState<{ siteId: number; index: number } | null>(null);
  const [googleAccounts, setGoogleAccounts] = useState<GoogleAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [dailyData, setDailyData] = useState<Record<number, DailyData[]>>({});
  const [loadingDailyData, setLoadingDailyData] = useState<Record<number, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);

  // Загрузка Google аккаунтов
  useEffect(() => {
    const loadGoogleAccounts = async () => {
      try {
        const response = await fetch('/api/google-accounts');
        const data = await response.json();
        if (data.success && data.accounts) {
          setGoogleAccounts(data.accounts);
          if (data.accounts.length > 0 && !selectedAccountId) {
            setSelectedAccountId(data.accounts[0].id);
          }
        }
      } catch (err) {
        console.error('Error loading Google accounts:', err);
      }
    };
    loadGoogleAccounts();
  }, []);

  // Загрузка тегов
  useEffect(() => {
    const loadTags = async () => {
      try {
        const response = await fetch('/api/tags');
        const data = await response.json();
        if (data.success) {
          setTags(data.tags || []);
        }
      } catch (err) {
        console.error('Error loading tags:', err);
      }
    };
    loadTags();
  }, []);

  // Загрузка агрегированных данных
  useEffect(() => {
    const loadAggregatedData = async () => {
      try {
        setLoading(true);
        setError(null);
        let url = selectedAccountId 
          ? `/api/sites/google-console-aggregated?accountId=${selectedAccountId}&days=${selectedPeriod}`
          : `/api/sites/google-console-aggregated?days=${selectedPeriod}`;
        
        // Добавляем фильтр по тегам, если выбраны
        if (selectedTagIds.length > 0) {
          url += `&tagIds=${selectedTagIds.join(',')}`;
        }
        
        const response = await fetch(url);
        const data = await response.json();
        if (data.success) {
          setSites(data.sites || []);
        } else {
          setError(data.error || 'Ошибка загрузки данных');
        }
      } catch (err) {
        console.error('Error loading aggregated data:', err);
        setError('Ошибка загрузки данных');
      } finally {
        setLoading(false);
      }
    };
    loadAggregatedData();
  }, [selectedPeriod, selectedAccountId, selectedTagIds]);

  // Загрузка данных по дням для всех сайтов
  useEffect(() => {
    sites.forEach((site) => {
      if (!dailyData[site.id] && !loadingDailyData[site.id]) {
        loadDailyDataForSite(site.id);
      }
    });
  }, [sites]);

  const loadDailyDataForSite = useCallback(async (siteId: number) => {
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
  }, [selectedPeriod]);

  // Видимые сайты для рендеринга - фильтруем по тегам
  const visibleSites = useMemo(() => {
    // Фильтрация уже происходит на сервере через API
    return sites;
  }, [sites]);

  return (
    <main className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold mb-2">Dashboard GC</h1>
            <p className="text-gray-400">Все сайты с Google Console</p>
          </div>
          <Link
            href="/sites"
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm"
          >
            ← Назад к сайтам
          </Link>
        </div>

        {loading ? (
          <div className="bg-gray-800 rounded-lg p-8 text-center border border-gray-700">
            <div className="text-gray-400">Загрузка данных...</div>
          </div>
        ) : error ? (
          <div className="bg-gray-800 rounded-lg p-8 border border-red-500">
            <div className="text-red-400">
              <h3 className="text-xl font-bold mb-2">Ошибка загрузки</h3>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        ) : sites.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-8 text-center border border-gray-700">
            <p className="text-gray-400 mb-4">Сайты не найдены</p>
            <p className="text-gray-500 text-sm mb-4">
              Убедитесь, что вы авторизованы через Google в разделе Интеграции
            </p>
          </div>
        ) : (
          <>
            {/* Контролы - зафиксированы в одну строку */}
            <div className="sticky top-0 z-50 bg-gray-800 rounded-lg p-3 mb-6 border border-gray-700 shadow-lg backdrop-blur-sm">
              <div className="flex flex-nowrap gap-4 items-center overflow-x-auto">
                {/* Фильтр по тегам */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-sm text-gray-400 whitespace-nowrap">Фильтр по тегам:</span>
                  <div className="flex gap-2 flex-nowrap">
                    {tags.map((tag) => (
                      <button
                        key={tag.id}
                        onClick={() => {
                          setSelectedTagIds(prev =>
                            prev.includes(tag.id)
                              ? prev.filter(id => id !== tag.id)
                              : [...prev, tag.id]
                          );
                        }}
                        className={`px-3 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                          selectedTagIds.includes(tag.id)
                            ? 'ring-2 ring-blue-500'
                            : ''
                        }`}
                        style={{ backgroundColor: tag.color + '40', color: tag.color }}
                      >
                        {tag.name}
                      </button>
                    ))}
                    {selectedTagIds.length > 0 && (
                      <button
                        onClick={() => setSelectedTagIds([])}
                        className="px-3 py-1 rounded text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 whitespace-nowrap"
                      >
                        Сбросить
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Период */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-sm text-gray-400 whitespace-nowrap">Период:</span>
                  <div className="flex gap-2">
                    {[7, 30, 90, 180].map((days) => (
                      <button
                        key={days}
                        onClick={() => setSelectedPeriod(days)}
                        className={`px-3 py-1 rounded text-sm whitespace-nowrap ${
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
                
                {/* Колонок в строке */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-sm text-gray-400 whitespace-nowrap">Колонок в строке:</span>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((cols) => (
                      <button
                        key={cols}
                        onClick={() => setColumnsPerRow(cols)}
                        className={`px-3 py-1 rounded text-sm whitespace-nowrap ${
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
                
                {/* Блюр */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => setBlurMode(!blurMode)}
                    className={`px-3 py-1 rounded text-sm whitespace-nowrap ${
                      blurMode
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {blurMode ? '🔓 Размытие' : '🔒 Блюр'}
                  </button>
                </div>
                
                {/* Показать на графике */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-sm text-gray-400 whitespace-nowrap">Показать на графике:</span>
                  <label className="flex items-center gap-2 text-sm cursor-pointer whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={showImpressions}
                      onChange={(e) => setShowImpressions(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-gray-300">Показы</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={showClicks}
                      onChange={(e) => setShowClicks(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-gray-300">Клики</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={showPositions}
                      onChange={(e) => setShowPositions(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-gray-300">Позиции</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Карточки сайтов с ленивой загрузкой */}
            <div>
              <div className={`grid gap-4 ${
                columnsPerRow === 1 ? 'grid-cols-1' :
                columnsPerRow === 2 ? 'grid-cols-1 md:grid-cols-2' :
                columnsPerRow === 3 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' :
                columnsPerRow === 4 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' :
                'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5'
              }`}>
              {visibleSites.map((siteData) => (
                <SiteCard
                  key={siteData.id}
                  siteData={siteData}
                  dailyData={dailyData[siteData.id] || []}
                  isLoading={loadingDailyData[siteData.id] || false}
                  showImpressions={showImpressions}
                  showClicks={showClicks}
                  showPositions={showPositions}
                  blurMode={blurMode}
                  onHover={() => setHoveredSiteId(siteData.id)}
                  onHoverLeave={() => {
                    setHoveredSiteId(null);
                    setHoveredDateIndex(null);
                  }}
                  hoveredSiteId={hoveredSiteId}
                  hoveredDateIndex={hoveredDateIndex}
                  setHoveredDateIndex={setHoveredDateIndex}
                />
              ))}
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
