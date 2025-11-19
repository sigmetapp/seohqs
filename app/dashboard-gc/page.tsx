'use client';

import { useState, useEffect, useMemo, useCallback, memo, useRef } from 'react';
import Link from 'next/link';
import { GoogleAccount, Tag, SiteStatus } from '@/lib/types';
import { useTheme } from '@/lib/theme-context';
import { useI18n } from '@/lib/i18n-context';

type SiteData = {
  id: number;
  domain: string;
  name: string;
  status?: {
    id: number;
    name: string;
    color: string;
    sortOrder: number;
    createdAt: string;
    updatedAt: string;
  } | null;
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

// Типы стилей графиков
type ChartStyle = 'default' | 'google-console' | 'bold' | 'minimal' | 'smooth';

type ChartStyleConfig = {
  name: string;
  impressions: {
    color: string;
    strokeWidth: number;
    pointRadius: number;
    pointRadiusHover: number;
    gradientOpacity: number;
    lineOpacity: number;
  };
  clicks: {
    color: string;
    strokeWidth: number;
    pointRadius: number;
    pointRadiusHover: number;
    gradientOpacity: number;
    lineOpacity: number;
  };
  positions: {
    color: string;
    strokeWidth: number;
    pointRadius: number;
    pointRadiusHover: number;
    gradientOpacity: number;
    lineOpacity: number;
  };
};

const chartStyles: Record<ChartStyle, ChartStyleConfig> = {
  default: {
    name: 'По умолчанию',
    impressions: {
      color: '#3b82f6',
      strokeWidth: 2.5,
      pointRadius: 5,
      pointRadiusHover: 7,
      gradientOpacity: 0.3,
      lineOpacity: 0.9,
    },
    clicks: {
      color: '#10b981',
      strokeWidth: 2.5,
      pointRadius: 5,
      pointRadiusHover: 7,
      gradientOpacity: 0.3,
      lineOpacity: 0.9,
    },
    positions: {
      color: '#f59e0b',
      strokeWidth: 2.5,
      pointRadius: 5,
      pointRadiusHover: 7,
      gradientOpacity: 0.3,
      lineOpacity: 0.9,
    },
  },
  'google-console': {
    name: 'Google Search Console',
    impressions: {
      color: '#1a73e8', // Google Search Console impressions color (darker blue)
      strokeWidth: 2,
      pointRadius: 4,
      pointRadiusHover: 6,
      gradientOpacity: 0.15,
      lineOpacity: 0.85,
    },
    clicks: {
      color: '#34a853', // Google green for clicks
      strokeWidth: 2,
      pointRadius: 4,
      pointRadiusHover: 6,
      gradientOpacity: 0.15,
      lineOpacity: 0.85,
    },
    positions: {
      color: '#ea4335', // Google red
      strokeWidth: 2,
      pointRadius: 4,
      pointRadiusHover: 6,
      gradientOpacity: 0.15,
      lineOpacity: 0.85,
    },
  },
  bold: {
    name: 'Жирный',
    impressions: {
      color: '#2563eb',
      strokeWidth: 4,
      pointRadius: 6,
      pointRadiusHover: 9,
      gradientOpacity: 0.4,
      lineOpacity: 1,
    },
    clicks: {
      color: '#059669',
      strokeWidth: 4,
      pointRadius: 6,
      pointRadiusHover: 9,
      gradientOpacity: 0.4,
      lineOpacity: 1,
    },
    positions: {
      color: '#d97706',
      strokeWidth: 4,
      pointRadius: 6,
      pointRadiusHover: 9,
      gradientOpacity: 0.4,
      lineOpacity: 1,
    },
  },
  minimal: {
    name: 'Минималистичный',
    impressions: {
      color: '#60a5fa',
      strokeWidth: 1.5,
      pointRadius: 3,
      pointRadiusHover: 5,
      gradientOpacity: 0.1,
      lineOpacity: 0.7,
    },
    clicks: {
      color: '#34d399',
      strokeWidth: 1.5,
      pointRadius: 3,
      pointRadiusHover: 5,
      gradientOpacity: 0.1,
      lineOpacity: 0.7,
    },
    positions: {
      color: '#fbbf24',
      strokeWidth: 1.5,
      pointRadius: 3,
      pointRadiusHover: 5,
      gradientOpacity: 0.1,
      lineOpacity: 0.7,
    },
  },
  smooth: {
    name: 'Плавный',
    impressions: {
      color: '#6366f1', // Indigo
      strokeWidth: 3,
      pointRadius: 0, // Без точек для плавности
      pointRadiusHover: 5,
      gradientOpacity: 0.25,
      lineOpacity: 1,
    },
    clicks: {
      color: '#10b981', // Emerald
      strokeWidth: 3,
      pointRadius: 0,
      pointRadiusHover: 5,
      gradientOpacity: 0.25,
      lineOpacity: 1,
    },
    positions: {
      color: '#f59e0b', // Amber
      strokeWidth: 3,
      pointRadius: 0,
      pointRadiusHover: 5,
      gradientOpacity: 0.25,
      lineOpacity: 1,
    },
  },
};

// Компонент для ленивой загрузки графиков
const LazySiteCard = memo(({ 
  siteData, 
  dailyData, 
  isLoading, 
  showImpressions, 
  showClicks, 
  showPositions,
  blurMode,
  chartStyle,
  onHover,
  onHoverLeave,
  hoveredSiteId,
  hoveredDateIndex,
  setHoveredDateIndex,
  onLoad
}: {
  siteData: SiteData;
  dailyData: DailyData[];
  isLoading: boolean;
  showImpressions: boolean;
  showClicks: boolean;
  showPositions: boolean;
  blurMode: boolean;
  chartStyle: ChartStyle;
  onHover: () => void;
  onHoverLeave: () => void;
  hoveredSiteId: number | null;
  hoveredDateIndex: { siteId: number; index: number } | null;
  setHoveredDateIndex: (value: { siteId: number; index: number } | null) => void;
  onLoad: () => void;
}) => {
  const { t } = useI18n();
  const cardRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (hasLoadedRef.current) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasLoadedRef.current) {
            setIsVisible(true);
            hasLoadedRef.current = true;
            onLoad();
            observer.disconnect();
          }
        });
      },
      { rootMargin: '100px' } // Начинаем загрузку за 100px до появления
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [onLoad]);

  if (!isVisible) {
  return (
    <div ref={cardRef} className="relative" style={{ minHeight: '300px' }}>
      <div className="h-64 flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">
        <div className="text-center">
          <div className="w-4 h-4 border-2 border-gray-300 dark:border-gray-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <div className="text-xs text-gray-400 dark:text-gray-500">{t('dashboardGc.loading')}</div>
        </div>
      </div>
    </div>
  );
  }

  return (
    <SiteCard
      siteData={siteData}
      dailyData={dailyData}
      isLoading={isLoading}
      showImpressions={showImpressions}
      showClicks={showClicks}
      showPositions={showPositions}
      blurMode={blurMode}
      chartStyle={chartStyle}
      onHover={onHover}
      onHoverLeave={onHoverLeave}
      hoveredSiteId={hoveredSiteId}
      hoveredDateIndex={hoveredDateIndex}
      setHoveredDateIndex={setHoveredDateIndex}
    />
  );
});

LazySiteCard.displayName = 'LazySiteCard';

// Функция для создания плавной кривой через Catmull-Rom сплайн
function createSmoothPath(points: Array<{ x: number; y: number }>, tension: number = 0.5): string {
  if (points.length < 2) return '';
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }

  let path = `M ${points[0].x} ${points[0].y}`;
  
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    const cp1x = p1.x + (p2.x - p0.x) / 6 * tension;
    const cp1y = p1.y + (p2.y - p0.y) / 6 * tension;
    const cp2x = p2.x - (p3.x - p1.x) / 6 * tension;
    const cp2y = p2.y - (p3.y - p1.y) / 6 * tension;

    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }

  return path;
}

// Мемоизированный компонент карточки сайта для оптимизации рендеринга
const SiteCard = memo(({ 
  siteData, 
  dailyData, 
  isLoading, 
  showImpressions, 
  showClicks, 
  showPositions,
  blurMode,
  chartStyle,
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
  chartStyle: ChartStyle;
  onHover: () => void;
  onHoverLeave: () => void;
  hoveredSiteId: number | null;
  hoveredDateIndex: { siteId: number; index: number } | null;
  setHoveredDateIndex: (value: { siteId: number; index: number } | null) => void;
}) => {
  const { theme } = useTheme();
  const { t, language } = useI18n();
  const isHovered = hoveredSiteId === siteData.id;
  const hoveredDate = hoveredDateIndex?.siteId === siteData.id 
    ? dailyData[hoveredDateIndex.index] 
    : null;
  
  // Получаем конфигурацию стиля графика
  const styleConfig = chartStyles[chartStyle];
  
  // Цвета для SVG в зависимости от темы
  const gridColor = theme === 'dark' ? '#374151' : '#d1d5db';
  const axisColor = theme === 'dark' ? '#6b7280' : '#9ca3af';

  // Подготовка данных для графика
  // Автоматически подбираем максимальное значение: если макс значение 2, шкала будет 4
  const getMaxValue = (max: number) => {
    if (max <= 0) return 4;
    // Округляем до ближайшего четного числа, которое больше максимума
    const rounded = Math.ceil(max / 2) * 2;
    return Math.max(rounded, 4); // Минимум 4 для визуализации
  };
  
  const maxImpressions = dailyData.length > 0 
    ? getMaxValue(Math.max(...dailyData.map(d => d.impressions), 1))
    : 4;
  const maxClicks = dailyData.length > 0 
    ? getMaxValue(Math.max(...dailyData.map(d => d.clicks), 1))
    : 4;
  const maxPosition = dailyData.length > 0 
    ? getMaxValue(Math.max(...dailyData.map(d => d.position), 1))
    : 4;

  // Вычисляем агрегированные данные за весь период
  const aggregatedData = useMemo(() => {
    if (dailyData.length === 0) {
      return { impressions: 0, clicks: 0 };
    }
    return {
      impressions: dailyData.reduce((sum, d) => sum + (d.impressions || 0), 0),
      clicks: dailyData.reduce((sum, d) => sum + (d.clicks || 0), 0),
    };
  }, [dailyData]);

  return (
    <div
      className="relative bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
      onMouseEnter={onHover}
      onMouseLeave={onHoverLeave}
    >
      {/* Заголовок с доменом */}
      <div className="px-2 pt-2 pb-1 mb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <p className={`text-sm truncate transition-all duration-200 ${
              blurMode && !isHovered ? 'blur-sm select-none' : 'text-gray-600 dark:text-gray-400'
            }`}>
              {siteData.domain}
            </p>
            {siteData.status && (
              <span
                className="px-2 py-0.5 rounded text-xs font-medium flex-shrink-0"
                style={{
                  backgroundColor: siteData.status.color + '20',
                  color: siteData.status.color,
                  border: `1px solid ${siteData.status.color}40`,
                }}
                title={siteData.status.name}
              >
                {siteData.status.name}
              </span>
            )}
          </div>
          <Link
            href={`/sites/${siteData.id}`}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline text-sm whitespace-nowrap ml-2 flex-shrink-0"
          >
            {t('dashboardGc.openSite')}
          </Link>
        </div>
      </div>

      {/* График */}
      {isLoading ? (
        <div className="h-64 flex items-center justify-center text-gray-600 dark:text-gray-400 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-blue-600 dark:border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <span>{t('dashboardGc.loadingData')}</span>
          </div>
        </div>
      ) : dailyData.length > 0 ? (
        <div className="relative w-full">
          <div className="h-64 relative w-full">
            <svg width="100%" height="100%" viewBox="0 0 800 200" preserveAspectRatio="none" className="overflow-visible">
              {/* Определения градиентов */}
              <defs>
                <linearGradient id={`impressionsGradient-${siteData.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor={styleConfig.impressions.color} stopOpacity={styleConfig.impressions.gradientOpacity} />
                  <stop offset="100%" stopColor={styleConfig.impressions.color} stopOpacity="0" />
                </linearGradient>
                <linearGradient id={`clicksGradient-${siteData.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor={styleConfig.clicks.color} stopOpacity={styleConfig.clicks.gradientOpacity} />
                  <stop offset="100%" stopColor={styleConfig.clicks.color} stopOpacity="0" />
                </linearGradient>
                <linearGradient id={`positionsGradient-${siteData.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor={styleConfig.positions.color} stopOpacity={styleConfig.positions.gradientOpacity} />
                  <stop offset="100%" stopColor={styleConfig.positions.color} stopOpacity="0" />
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
                  stroke={gridColor}
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
                stroke={axisColor}
                strokeWidth="2"
              />
              <line
                x1="50"
                y1="20"
                x2="50"
                y2="175"
                stroke={axisColor}
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
                    {showImpressions && styleConfig.impressions.pointRadius > 0 && (
                      <circle
                        cx={x}
                        cy={impressionsY}
                        r={isHoveredPoint ? styleConfig.impressions.pointRadiusHover : styleConfig.impressions.pointRadius}
                        fill={styleConfig.impressions.color}
                        stroke={isHoveredPoint ? styleConfig.impressions.color : styleConfig.impressions.color}
                        strokeWidth={isHoveredPoint ? "2.5" : "1.5"}
                        className="transition-all duration-200"
                        style={{ cursor: 'pointer', filter: isHoveredPoint ? `drop-shadow(0 0 6px ${styleConfig.impressions.color}90)` : `drop-shadow(0 0 2px ${styleConfig.impressions.color}50)` }}
                      />
                    )}
                    {/* Клики */}
                    {showClicks && styleConfig.clicks.pointRadius > 0 && (
                      <circle
                        cx={x}
                        cy={clicksY}
                        r={isHoveredPoint ? styleConfig.clicks.pointRadiusHover : styleConfig.clicks.pointRadius}
                        fill={styleConfig.clicks.color}
                        stroke={isHoveredPoint ? styleConfig.clicks.color : styleConfig.clicks.color}
                        strokeWidth={isHoveredPoint ? "2.5" : "1.5"}
                        className="transition-all duration-200"
                        style={{ cursor: 'pointer', filter: isHoveredPoint ? `drop-shadow(0 0 6px ${styleConfig.clicks.color}90)` : `drop-shadow(0 0 2px ${styleConfig.clicks.color}50)` }}
                      />
                    )}
                    {/* Позиции */}
                    {showPositions && styleConfig.positions.pointRadius > 0 && (
                      <circle
                        cx={x}
                        cy={positionY}
                        r={isHoveredPoint ? styleConfig.positions.pointRadiusHover : styleConfig.positions.pointRadius}
                        fill={styleConfig.positions.color}
                        stroke={isHoveredPoint ? styleConfig.positions.color : styleConfig.positions.color}
                        strokeWidth={isHoveredPoint ? "2.5" : "1.5"}
                        className="transition-all duration-200"
                        style={{ cursor: 'pointer', filter: isHoveredPoint ? `drop-shadow(0 0 6px ${styleConfig.positions.color}90)` : `drop-shadow(0 0 2px ${styleConfig.positions.color}50)` }}
                      />
                    )}
                    {/* Показываем точки при наведении для плавного стиля */}
                    {chartStyle === 'smooth' && isHoveredPoint && (
                      <>
                        {showImpressions && (
                          <circle
                            cx={x}
                            cy={impressionsY}
                            r={styleConfig.impressions.pointRadiusHover}
                            fill={styleConfig.impressions.color}
                            stroke="white"
                            strokeWidth="2"
                            className="transition-all duration-200"
                            style={{ cursor: 'pointer', filter: `drop-shadow(0 0 6px ${styleConfig.impressions.color}90)` }}
                          />
                        )}
                        {showClicks && (
                          <circle
                            cx={x}
                            cy={clicksY}
                            r={styleConfig.clicks.pointRadiusHover}
                            fill={styleConfig.clicks.color}
                            stroke="white"
                            strokeWidth="2"
                            className="transition-all duration-200"
                            style={{ cursor: 'pointer', filter: `drop-shadow(0 0 6px ${styleConfig.clicks.color}90)` }}
                          />
                        )}
                        {showPositions && (
                          <circle
                            cx={x}
                            cy={positionY}
                            r={styleConfig.positions.pointRadiusHover}
                            fill={styleConfig.positions.color}
                            stroke="white"
                            strokeWidth="2"
                            className="transition-all duration-200"
                            style={{ cursor: 'pointer', filter: `drop-shadow(0 0 6px ${styleConfig.positions.color}90)` }}
                          />
                        )}
                      </>
                    )}
                  </g>
                );
              })}
              
              {/* Линии с градиентом */}
              {dailyData.length > 1 && (() => {
                const padding = 50;
                const width = 700;
                const height = 155;
                const useSmooth = chartStyle === 'smooth' || chartStyle === 'google-console';
                const tension = chartStyle === 'smooth' ? 0.7 : 0.5;

                // Подготовка точек для всех метрик
                const divisor = Math.max(dailyData.length - 1, 1);
                const impressionsPoints = dailyData.map((item, index) => ({
                  x: padding + (index / divisor) * width,
                  y: 175 - (item.impressions / maxImpressions) * height,
                }));

                const clicksPoints = dailyData.map((item, index) => ({
                  x: padding + (index / divisor) * width,
                  y: 175 - (item.clicks / maxClicks) * height,
                }));

                const positionsPoints = dailyData.map((item, index) => ({
                  x: padding + (index / divisor) * width,
                  y: 175 - (item.position / maxPosition) * height,
                }));

                // Создаем пути для градиентов (закрытые пути)
                const createGradientPath = (points: Array<{ x: number; y: number }>) => {
                  if (useSmooth) {
                    const smoothPath = createSmoothPath(points, tension);
                    return `${smoothPath} L ${points[points.length - 1].x} 175 L ${points[0].x} 175 Z`;
                  } else {
                    return `M ${points[0].x} ${points[0].y} ${points.map(p => `L ${p.x} ${p.y}`).join(' ')} L ${points[points.length - 1].x} 175 L ${points[0].x} 175 Z`;
                  }
                };

                return (
                  <>
                    {showImpressions && (
                      <>
                        <path
                          d={createGradientPath(impressionsPoints)}
                          fill={`url(#impressionsGradient-${siteData.id})`}
                        />
                        {useSmooth ? (
                          <path
                            d={createSmoothPath(impressionsPoints, tension)}
                            fill="none"
                            stroke={styleConfig.impressions.color}
                            strokeWidth={styleConfig.impressions.strokeWidth}
                            opacity={styleConfig.impressions.lineOpacity}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        ) : (
                          <polyline
                            points={impressionsPoints.map(p => `${p.x},${p.y}`).join(' ')}
                            fill="none"
                            stroke={styleConfig.impressions.color}
                            strokeWidth={styleConfig.impressions.strokeWidth}
                            opacity={styleConfig.impressions.lineOpacity}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        )}
                      </>
                    )}
                    {showClicks && (
                      <>
                        <path
                          d={createGradientPath(clicksPoints)}
                          fill={`url(#clicksGradient-${siteData.id})`}
                        />
                        {useSmooth ? (
                          <path
                            d={createSmoothPath(clicksPoints, tension)}
                            fill="none"
                            stroke={styleConfig.clicks.color}
                            strokeWidth={styleConfig.clicks.strokeWidth}
                            opacity={styleConfig.clicks.lineOpacity}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        ) : (
                          <polyline
                            points={clicksPoints.map(p => `${p.x},${p.y}`).join(' ')}
                            fill="none"
                            stroke={styleConfig.clicks.color}
                            strokeWidth={styleConfig.clicks.strokeWidth}
                            opacity={styleConfig.clicks.lineOpacity}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        )}
                      </>
                    )}
                    {showPositions && (
                      <>
                        <path
                          d={createGradientPath(positionsPoints)}
                          fill={`url(#positionsGradient-${siteData.id})`}
                        />
                        {useSmooth ? (
                          <path
                            d={createSmoothPath(positionsPoints, tension)}
                            fill="none"
                            stroke={styleConfig.positions.color}
                            strokeWidth={styleConfig.positions.strokeWidth}
                            opacity={styleConfig.positions.lineOpacity}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        ) : (
                          <polyline
                            points={positionsPoints.map(p => `${p.x},${p.y}`).join(' ')}
                            fill="none"
                            stroke={styleConfig.positions.color}
                            strokeWidth={styleConfig.positions.strokeWidth}
                            opacity={styleConfig.positions.lineOpacity}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        )}
                      </>
                    )}
                  </>
                );
              })()}
            </svg>
            
            {/* Значки и цифры на графике - показы и клики */}
            <div className="absolute top-3 left-3 flex flex-col gap-2">
              {showImpressions && (
                <div className="flex items-center gap-1.5 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm px-2 py-1 rounded border border-gray-300 dark:border-gray-700">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: styleConfig.impressions.color }}></div>
                  <span className="text-xs font-bold text-gray-900 dark:text-white">
                    {hoveredDate 
                      ? hoveredDate.impressions.toLocaleString() 
                      : aggregatedData.impressions.toLocaleString()}
                  </span>
                </div>
              )}
              {showClicks && (
                <div className="flex items-center gap-1.5 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm px-2 py-1 rounded border border-gray-300 dark:border-gray-700">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: styleConfig.clicks.color }}></div>
                  <span className="text-xs font-bold text-gray-900 dark:text-white">
                    {hoveredDate 
                      ? hoveredDate.clicks.toLocaleString() 
                      : aggregatedData.clicks.toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>
          {/* Дата под графиком - зарезервировано место */}
          <div className="text-xs text-gray-400 dark:text-gray-500 text-center py-1 px-2 h-6">
            {hoveredDate && (
              <span>
                {new Date(hoveredDate.date).toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US', { 
                  day: '2-digit', 
                  month: 'short', 
                  year: 'numeric'
                })}
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="h-64 flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">
          <div className="text-center">
            <div className="text-gray-600 dark:text-gray-400 mb-1">{t('dashboardGc.noData')}</div>
            <div className="text-xs text-gray-400 dark:text-gray-500">{t('dashboardGc.noDataPeriod')}</div>
          </div>
        </div>
      )}
    </div>
  );
});

SiteCard.displayName = 'SiteCard';

export default function DashboardGCPage() {
  const { theme } = useTheme();
  const { t } = useI18n();
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
  const [statuses, setStatuses] = useState<SiteStatus[]>([]);
  const [selectedStatusIds, setSelectedStatusIds] = useState<number[]>([]);
  const [searchDomain, setSearchDomain] = useState<string>('');
  const [chartStyle, setChartStyle] = useState<ChartStyle>('default');

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

  // Загрузка статусов
  useEffect(() => {
    const loadStatuses = async () => {
      try {
        const response = await fetch('/api/statuses');
        const data = await response.json();
        if (data.success) {
          setStatuses(data.statuses || []);
        }
      } catch (err) {
        console.error('Error loading statuses:', err);
      }
    };
    loadStatuses();
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
        
        // Добавляем фильтр по статусам, если выбраны
        if (selectedStatusIds.length > 0) {
          url += `&statusIds=${selectedStatusIds.join(',')}`;
        }
        
        const response = await fetch(url);
        const data = await response.json();
        if (data.success) {
          setSites(data.sites || []);
        } else {
          setError(data.error || t('dashboardGc.errorLoading'));
        }
      } catch (err) {
        console.error('Error loading aggregated data:', err);
        setError(t('dashboardGc.errorLoading'));
      } finally {
        setLoading(false);
      }
    };
    loadAggregatedData();
  }, [selectedPeriod, selectedAccountId, selectedTagIds, selectedStatusIds]);

  // Загрузка данных по дням для сайта (вызывается через lazy load)
  // Используем ref для стабильности колбэка
  const loadingDailyDataRef = useRef<Record<number, boolean>>({});
  const dailyDataRef = useRef<Record<number, DailyData[]>>({});
  
  useEffect(() => {
    loadingDailyDataRef.current = loadingDailyData;
    dailyDataRef.current = dailyData;
  }, [loadingDailyData, dailyData]);

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

  const handleSiteLoad = useCallback((siteId: number) => {
    if (!dailyDataRef.current[siteId] && !loadingDailyDataRef.current[siteId]) {
      loadDailyDataForSite(siteId);
    }
  }, [loadDailyDataForSite]);

  // Видимые сайты для рендеринга - фильтруем по тегам, статусам и поиску
  const visibleSites = useMemo(() => {
    let filtered = sites;
    
    // Фильтрация по статусам
    if (selectedStatusIds.length > 0) {
      filtered = filtered.filter(site => 
        site.status && selectedStatusIds.includes(site.status.id)
      );
    }
    
    // Фильтрация по поисковому запросу
    if (searchDomain.trim()) {
      const searchLower = searchDomain.toLowerCase().trim();
      filtered = filtered.filter(site => 
        site.domain.toLowerCase().includes(searchLower)
      );
    }
    
    return filtered;
  }, [sites, selectedStatusIds, searchDomain]);

  return (
    <main className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold mb-2">{t('dashboardGc.title')}</h1>
            <p className="text-gray-600 dark:text-gray-400">{t('dashboardGc.description')}</p>
          </div>
          <Link
            href="/sites"
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded text-sm text-gray-900 dark:text-white"
          >
            {t('dashboardGc.backToSites')}
          </Link>
        </div>

        {loading ? (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-8 text-center border border-gray-200 dark:border-gray-700">
            <div className="text-gray-600 dark:text-gray-400">{t('dashboardGc.loading')}</div>
          </div>
        ) : error ? (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-8 border border-red-400 dark:border-red-500">
            <div className="text-red-600 dark:text-red-400">
              <h3 className="text-xl font-bold mb-2">{t('dashboardGc.errorLoading')}</h3>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        ) : (
          <>
            {/* Контролы - зафиксированы в одну строку */}
            <div className="sticky top-0 z-50 bg-gray-50 dark:bg-gray-800 rounded-lg p-2 mb-6 border border-gray-200 dark:border-gray-700 shadow-lg backdrop-blur-sm">
              <div className="flex flex-nowrap gap-2 items-center overflow-x-auto">
                {/* Фильтр по тегам */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <select
                    value={selectedTagIds.length > 0 ? selectedTagIds[0] : ''}
                    onChange={(e) => {
                      const tagId = e.target.value ? parseInt(e.target.value) : null;
                      setSelectedTagIds(tagId ? [tagId] : []);
                    }}
                    className="px-2 py-1 rounded text-sm bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer appearance-none pr-7"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%9ca3af' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 0.5rem center',
                      paddingRight: '1.75rem'
                    }}
                  >
                    <option value="">{t('dashboardGc.allTags')}</option>
                    {tags.map((tag) => (
                      <option key={tag.id} value={tag.id} style={{ backgroundColor: tag.color + '20' }}>
                        {tag.name}
                      </option>
                    ))}
                  </select>
                  {/* Показываем цвет выбранного тега */}
                  {selectedTagIds.length > 0 && tags.find(t => t.id === selectedTagIds[0]) && (
                    <div 
                      className="w-3.5 h-3.5 rounded border border-gray-300 dark:border-gray-600 flex-shrink-0"
                      style={{ backgroundColor: tags.find(t => t.id === selectedTagIds[0])?.color || '#3b82f6' }}
                      title={tags.find(t => t.id === selectedTagIds[0])?.name}
                    />
                  )}
                </div>
                
                {/* Фильтр по статусам */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <select
                    value={selectedStatusIds.length > 0 ? selectedStatusIds[0] : ''}
                    onChange={(e) => {
                      const statusId = e.target.value ? parseInt(e.target.value) : null;
                      setSelectedStatusIds(statusId ? [statusId] : []);
                    }}
                    className="px-2 py-1 rounded text-sm bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer appearance-none pr-7"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%9ca3af' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 0.5rem center',
                      paddingRight: '1.75rem'
                    }}
                  >
                    <option value="">{t('dashboardGc.allStatuses')}</option>
                    {statuses.map((status) => (
                      <option key={status.id} value={status.id} style={{ backgroundColor: status.color + '20' }}>
                        {status.name}
                      </option>
                    ))}
                  </select>
                  {/* Показываем цвет выбранного статуса */}
                  {selectedStatusIds.length > 0 && statuses.find(s => s.id === selectedStatusIds[0]) && (
                    <div 
                      className="w-3.5 h-3.5 rounded border border-gray-300 dark:border-gray-600 flex-shrink-0"
                      style={{ backgroundColor: statuses.find(s => s.id === selectedStatusIds[0])?.color || '#6b7280' }}
                      title={statuses.find(s => s.id === selectedStatusIds[0])?.name}
                    />
                  )}
                </div>
                
                {/* Период */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <select
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(parseInt(e.target.value))}
                    className="px-2 py-1 rounded text-sm bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer appearance-none pr-7"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%9ca3af' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 0.5rem center',
                      paddingRight: '1.75rem'
                    }}
                  >
                    <option value="7">7 {t('dashboardGc.daysShort')}</option>
                    <option value="30">30 {t('dashboardGc.daysShort')}</option>
                    <option value="90">90 {t('dashboardGc.daysShort')}</option>
                    <option value="180">180 {t('dashboardGc.daysShort')}</option>
                  </select>
                </div>
                
                {/* Колонок в строке */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <select
                    value={columnsPerRow}
                    onChange={(e) => setColumnsPerRow(parseInt(e.target.value))}
                    className="px-2 py-1 rounded text-sm bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer appearance-none pr-7"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%9ca3af' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 0.5rem center',
                      paddingRight: '1.75rem'
                    }}
                  >
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                    <option value="5">5</option>
                  </select>
                </div>
                
                {/* Блюр */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => setBlurMode(!blurMode)}
                    className={`px-2 py-1 rounded text-sm whitespace-nowrap ${
                      blurMode
                        ? 'bg-purple-500 dark:bg-purple-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                    }`}
                  >
                    {blurMode ? '🔓' : '🔒'}
                  </button>
                </div>
                
                {/* Показать на графике */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <label className="flex items-center gap-1 text-sm cursor-pointer whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={showImpressions}
                      onChange={(e) => setShowImpressions(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-gray-700 dark:text-gray-300 text-xs">{t('dashboardGc.impressions')}</span>
                  </label>
                  <label className="flex items-center gap-1 text-sm cursor-pointer whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={showClicks}
                      onChange={(e) => setShowClicks(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-gray-700 dark:text-gray-300 text-xs">{t('dashboardGc.clicks')}</span>
                  </label>
                  <label className="flex items-center gap-1 text-sm cursor-pointer whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={showPositions}
                      onChange={(e) => setShowPositions(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-gray-700 dark:text-gray-300 text-xs">{t('dashboardGc.positions')}</span>
                  </label>
                </div>
                
                {/* Стиль графика */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <select
                    value={chartStyle}
                    onChange={(e) => setChartStyle(e.target.value as ChartStyle)}
                    className="px-2 py-1 rounded text-sm bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer appearance-none pr-7"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%9ca3af' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 0.5rem center',
                      paddingRight: '1.75rem'
                    }}
                  >
                    {Object.entries(chartStyles).map(([key, style]) => (
                      <option key={key} value={key}>
                        {style.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Поиск по домену */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <input
                    type="text"
                    placeholder={t('dashboardGc.search')}
                    value={searchDomain}
                    onChange={(e) => setSearchDomain(e.target.value)}
                    className="px-2 py-1 rounded text-sm bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-24"
                  />
                </div>
              </div>
            </div>

            {/* Карточки сайтов с ленивой загрузкой или сообщение об отсутствии сайтов */}
            {visibleSites.length === 0 ? (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-8 text-center border border-gray-200 dark:border-gray-700">
                <p className="text-gray-600 dark:text-gray-400 mb-4">{t('dashboardGc.sitesNotFound')}</p>
                <p className="text-gray-500 dark:text-gray-500 text-sm mb-4">
                  {t('dashboardGc.sitesNotFoundHint')}
                </p>
              </div>
            ) : (
              <div>
                <div className={`grid gap-6 ${
                  columnsPerRow === 1 ? 'grid-cols-1' :
                  columnsPerRow === 2 ? 'grid-cols-1 md:grid-cols-2' :
                  columnsPerRow === 3 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' :
                  columnsPerRow === 4 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' :
                  'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5'
                }`}>
                {visibleSites.map((siteData) => (
                  <LazySiteCard
                    key={siteData.id}
                    siteData={siteData}
                    dailyData={dailyData[siteData.id] || []}
                    isLoading={loadingDailyData[siteData.id] || false}
                    showImpressions={showImpressions}
                    showClicks={showClicks}
                    showPositions={showPositions}
                    blurMode={blurMode}
                    chartStyle={chartStyle}
                    onHover={() => setHoveredSiteId(siteData.id)}
                    onHoverLeave={() => {
                      setHoveredSiteId(null);
                      setHoveredDateIndex(null);
                    }}
                    hoveredSiteId={hoveredSiteId}
                    hoveredDateIndex={hoveredDateIndex}
                    setHoveredDateIndex={setHoveredDateIndex}
                    onLoad={() => handleSiteLoad(siteData.id)}
                  />
                ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
