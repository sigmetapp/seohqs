'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface BotVisit {
  botName: string;
  userAgent: string;
  count: number;
  sampleLines: string[];
  errors?: {
    statusCode: number;
    count: number;
    sampleLines: string[];
  }[];
}

interface GoogleError {
  statusCode: number;
  botName: string;
  userAgent: string;
  count: number;
  sampleLines: string[];
  url?: string;
}

interface UrlAnalysis {
  url: string;
  count: number;
  statusCodes: { [key: number]: number };
  hasParams: boolean;
  depth: number;
  sampleLines: string[];
}

interface StatusDistribution {
  status200: number;
  status301: number;
  status302: number;
  status308: number;
  status404: number;
  status410: number;
  status403: number;
  status401: number;
  status5xx: number;
  other: number;
}

interface CrawlBudgetDistribution {
  canonical: number;
  withParams: number;
  pagination: number;
  service: number;
  notFound: number;
}

interface DepthDistribution {
  root: number;
  level1: number;
  level2: number;
  deeper: number;
}

interface TimeAnalysis {
  byHour: { [hour: number]: number };
  byDay: { [day: string]: number };
}

interface DetailedAnalysis {
  step1: {
    googlebotRequests: number;
    totalRequests: number;
    googlebotPercentage: number;
    verifiedBots: number;
    unverifiedBots: number;
  };
  step2: {
    totalRequests: number;
    uniqueUrls: number;
    avgRequestsPerUrl: number;
    topUrls: UrlAnalysis[];
  };
  step3: {
    top20Urls: UrlAnalysis[];
  };
  step4: CrawlBudgetDistribution;
  step5: StatusDistribution;
  step6: {
    totalRedirects: number;
    redirectChains: number;
    redirectTypes: { [key: number]: number };
  };
  step7: DepthDistribution;
  step8: {
    avgResponseTime?: number;
    maxResponseTime?: number;
    timingDataAvailable: boolean;
  };
  step9: TimeAnalysis;
}

interface AnalysisResult {
  totalGoogleVisits: number;
  bots: BotVisit[];
  uniqueBots: number;
  errors: GoogleError[];
  detailedAnalysis?: DetailedAnalysis;
}

export default function LogcheckerPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/user/me');
      
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      
      const data = await res.json();
      
      if (!data.success || !data.user) {
        router.push('/login');
        return;
      }

      setUser(data.user);
    } catch (error) {
      console.error('Ошибка проверки авторизации:', error);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const analyzeLogs = () => {
    if (!logs.trim()) {
      setError('Вставьте логи для анализа');
      return;
    }

    setAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      // Список паттернов для поиска Google ботов в User-Agent
      const googleBotPatterns = [
        /Googlebot/i,
        /Google-InspectionTool/i,
        /Google-Extended/i,
        /Googlebot-Image/i,
        /Googlebot-Video/i,
        /Googlebot-News/i,
        /Googlebot-Mobile/i,
        /Mediapartners-Google/i,
        /AdsBot-Google/i,
        /FeedFetcher-Google/i,
        /Google Web Preview/i,
        /Google-Site-Verification/i,
        /Google Favicon/i,
        /Googlebot-Desktop/i,
        /Googlebot-Smartphone/i,
      ];

      // Паттерны для поиска рефереров от Google (не используются - фильтруем только по User-Agent)
      // Удалено: рефереры могут быть от обычных пользователей или других ботов

      // Разбиваем логи на строки
      const lines = logs.split('\n').filter(line => line.trim());
      const totalLines = lines.length;
      
      // Словарь для хранения информации о ботах
      const botsMap = new Map<string, BotVisit>();
      
      // Массив для хранения ошибок Google ботов
      const errorsMap = new Map<string, GoogleError>();

      // Данные для детального анализа
      const urlMap = new Map<string, UrlAnalysis>();
      const statusDistribution: StatusDistribution = {
        status200: 0,
        status301: 0,
        status302: 0,
        status308: 0,
        status404: 0,
        status410: 0,
        status403: 0,
        status401: 0,
        status5xx: 0,
        other: 0,
      };
      const crawlBudget: CrawlBudgetDistribution = {
        canonical: 0,
        withParams: 0,
        pagination: 0,
        service: 0,
        notFound: 0,
      };
      const depthDistribution: DepthDistribution = {
        root: 0,
        level1: 0,
        level2: 0,
        deeper: 0,
      };
      const timeAnalysis: TimeAnalysis = {
        byHour: {},
        byDay: {},
      };
      const redirectTypes: { [key: number]: number } = {};
      let verifiedBots = 0;
      let unverifiedBots = 0;
      const responseTimes: number[] = [];
      let googlebotRequests = 0;

      // Вспомогательная функция для извлечения URL из строки
      const extractUrl = (line: string): string | null => {
        const patterns = [
          /(?:GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\s+([^\s"']+)/i,
          /"([^"]+)"\s+\d{3}/,
          /'([^']+)'\s+\d{3}/,
          /(https?:\/\/[^\s"']+)/i,
        ];
        
        for (const pattern of patterns) {
          const match = line.match(pattern);
          if (match && match[1]) {
            let url = match[1];
            // Убираем протокол и домен, оставляем только путь
            url = url.replace(/^https?:\/\/[^\/]+/, '');
            // Убираем query string для анализа
            const pathOnly = url.split('?')[0];
            return pathOnly || '/';
          }
        }
        return null;
      };

      // Вспомогательная функция для определения глубины URL
      const getUrlDepth = (url: string): number => {
        if (!url || url === '/') return 0;
        const parts = url.split('/').filter(p => p.length > 0);
        return parts.length;
      };

      // Вспомогательная функция для классификации URL
      const classifyUrl = (url: string, statusCode: number | null): keyof CrawlBudgetDistribution => {
        if (!url) return 'canonical';
        if (statusCode === 404) return 'notFound';
        
        const lowerUrl = url.toLowerCase();
        if (lowerUrl.includes('?') || lowerUrl.includes('&')) return 'withParams';
        if (lowerUrl.includes('/page/') || lowerUrl.includes('/p/') || lowerUrl.match(/\/\d+$/)) return 'pagination';
        if (lowerUrl.includes('/admin') || lowerUrl.includes('/api') || lowerUrl.includes('/_next') || lowerUrl.includes('/static')) return 'service';
        return 'canonical';
      };

      // Вспомогательная функция для извлечения времени из строки
      const extractTime = (line: string): { hour?: number; day?: string } => {
        // Паттерны для даты/времени в различных форматах логов
        const datePatterns = [
          /\[(\d{2})\/(\w{3})\/(\d{4}):(\d{2}):(\d{2}):(\d{2})/,
          /(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/,
          /\[(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/,
        ];
        
        for (const pattern of datePatterns) {
          const match = line.match(pattern);
          if (match) {
            const hour = parseInt(match[4] || match[match.length - 3], 10);
            const day = match[2] || `${match[1]}-${match[2]}-${match[3]}`;
            return { hour, day };
          }
        }
        return {};
      };

      // Вспомогательная функция для извлечения времени ответа
      const extractResponseTime = (line: string): number | null => {
        const patterns = [
          /\s(\d+\.?\d*)\s*$/,
          /"rt=(\d+\.?\d*)/,
          /time=(\d+\.?\d*)/,
          /duration[:\s]+(\d+\.?\d*)/i,
        ];
        
        for (const pattern of patterns) {
          const match = line.match(pattern);
          if (match && match[1]) {
            const time = parseFloat(match[1]);
            if (time > 0 && time < 100000) return time; // Разумные пределы
          }
        }
        return null;
      };

      // Анализируем каждую строку
      lines.forEach((line, index) => {
        let foundBot = false;
        let botName = '';
        let userAgent = '';

        // Извлекаем HTTP статус код из строки (обычно это число 3-5 цифр)
        // Паттерны: " 400 ", " 400\n", "400 ", "HTTP/1.1 400", " 400 " и т.д.
        const statusMatch = line.match(/\s(\d{3})\s/) || 
                           line.match(/HTTP\/[\d.]+\s+(\d{3})/) ||
                           line.match(/"\s+(\d{3})\s+/) ||
                           line.match(/\s+(\d{3})["\s]/);
        const statusCode = statusMatch ? parseInt(statusMatch[1], 10) : null;
        
        // Проверяем, является ли это ошибкой (4xx или 5xx)
        const isError = statusCode !== null && (statusCode >= 400 && statusCode < 600);

        // Сначала проверяем User-Agent паттерны
        for (const pattern of googleBotPatterns) {
          if (pattern.test(line)) {
            foundBot = true;
            
            // Извлекаем User-Agent из строки
            const uaMatch = line.match(/["']([^"']*Google[^"']*)["']/i) || 
                           line.match(/User-Agent[:\s]+([^\s]+)/i) ||
                           line.match(/(Google[^\s]+)/i);
            
            if (uaMatch) {
              userAgent = uaMatch[1];
            } else {
              // Если не нашли явный User-Agent, берем часть строки с Google
              const googleMatch = line.match(/(Google[^\s]+)/i);
              userAgent = googleMatch ? googleMatch[1] : 'Googlebot';
            }

            // Определяем имя бота
            if (/Google-InspectionTool/i.test(userAgent)) {
              botName = 'Google Inspection Tool';
            } else if (/Google-Extended/i.test(userAgent)) {
              botName = 'Google Extended';
            } else if (/Googlebot-Image/i.test(userAgent)) {
              botName = 'Googlebot Image';
            } else if (/Googlebot-Video/i.test(userAgent)) {
              botName = 'Googlebot Video';
            } else if (/Googlebot-News/i.test(userAgent)) {
              botName = 'Googlebot News';
            } else if (/Googlebot-Mobile/i.test(userAgent)) {
              botName = 'Googlebot Mobile';
            } else if (/Mediapartners-Google/i.test(userAgent)) {
              botName = 'Mediapartners Google';
            } else if (/AdsBot-Google/i.test(userAgent)) {
              botName = 'AdsBot Google';
            } else if (/FeedFetcher-Google/i.test(userAgent)) {
              botName = 'FeedFetcher Google';
            } else if (/Google Web Preview/i.test(userAgent)) {
              botName = 'Google Web Preview';
            } else if (/Google-Site-Verification/i.test(userAgent)) {
              botName = 'Google Site Verification';
            } else if (/Googlebot-Desktop/i.test(userAgent)) {
              botName = 'Googlebot Desktop';
            } else if (/Googlebot-Smartphone/i.test(userAgent)) {
              botName = 'Googlebot Smartphone';
            } else if (/Googlebot/i.test(userAgent)) {
              botName = 'Googlebot';
            } else {
              botName = 'Googlebot';
            }
            break;
          }
        }

        // ВАЖНО: Показываем ТОЛЬКО Google ботов по User-Agent
        // Рефереры от Google не учитываем, так как они могут быть от обычных пользователей
        // или других ботов, которые перешли с Google поиска

        // Если нашли бота, сохраняем информацию
        if (foundBot) {
          googlebotRequests++;
          
          // Проверка подлинности бота (по IP или rDNS - упрощенная проверка)
          const hasGoogleIp = /66\.249\.|64\.233\.|72\.14\.|74\.125\.|209\.85\.|216\.239\./i.test(line);
          const hasGoogleRdns = /\.googlebot\.com|\.google\.com/i.test(line);
          if (hasGoogleIp || hasGoogleRdns) {
            verifiedBots++;
          } else {
            unverifiedBots++;
          }

          const key = botName.toLowerCase();
          if (!botsMap.has(key)) {
            botsMap.set(key, {
              botName,
              userAgent: userAgent.substring(0, 100), // Ограничиваем длину
              count: 0,
              sampleLines: [],
              errors: [],
            });
          }

          const bot = botsMap.get(key)!;
          bot.count++;
          
          // Сохраняем примеры строк (максимум 3)
          if (bot.sampleLines.length < 3) {
            bot.sampleLines.push(line.substring(0, 200)); // Ограничиваем длину
          }
          
          // Извлекаем URL для детального анализа
          const url = extractUrl(line);
          if (url) {
            const urlKey = url.split('?')[0]; // Без query параметров для группировки
            if (!urlMap.has(urlKey)) {
              urlMap.set(urlKey, {
                url: urlKey,
                count: 0,
                statusCodes: {},
                hasParams: url.includes('?'),
                depth: getUrlDepth(urlKey),
                sampleLines: [],
              });
            }
            
            const urlAnalysis = urlMap.get(urlKey)!;
            urlAnalysis.count++;
            
            if (statusCode !== null) {
              urlAnalysis.statusCodes[statusCode] = (urlAnalysis.statusCodes[statusCode] || 0) + 1;
            }
            
            if (urlAnalysis.sampleLines.length < 2) {
              urlAnalysis.sampleLines.push(line.substring(0, 200));
            }
            
            // Распределение по глубине
            const depth = getUrlDepth(urlKey);
            if (depth === 0) depthDistribution.root++;
            else if (depth === 1) depthDistribution.level1++;
            else if (depth === 2) depthDistribution.level2++;
            else depthDistribution.deeper++;
            
            // Распределение crawl budget
            const urlClass = classifyUrl(url, statusCode);
            crawlBudget[urlClass]++;
          }
          
          // Распределение статусов
          if (statusCode !== null) {
            if (statusCode === 200) statusDistribution.status200++;
            else if (statusCode === 301) statusDistribution.status301++;
            else if (statusCode === 302) statusDistribution.status302++;
            else if (statusCode === 308) statusDistribution.status308++;
            else if (statusCode === 404) statusDistribution.status404++;
            else if (statusCode === 410) statusDistribution.status410++;
            else if (statusCode === 403) statusDistribution.status403++;
            else if (statusCode === 401) statusDistribution.status401++;
            else if (statusCode >= 500 && statusCode < 600) statusDistribution.status5xx++;
            else statusDistribution.other++;
            
            // Редиректы
            if (statusCode === 301 || statusCode === 302 || statusCode === 308) {
              redirectTypes[statusCode] = (redirectTypes[statusCode] || 0) + 1;
            }
          }
          
          // Анализ времени
          const timeData = extractTime(line);
          if (timeData.hour !== undefined) {
            timeAnalysis.byHour[timeData.hour] = (timeAnalysis.byHour[timeData.hour] || 0) + 1;
          }
          if (timeData.day) {
            timeAnalysis.byDay[timeData.day] = (timeAnalysis.byDay[timeData.day] || 0) + 1;
          }
          
          // Время ответа
          const responseTime = extractResponseTime(line);
          if (responseTime !== null) {
            responseTimes.push(responseTime);
          }
          
          // Если это ошибка, сохраняем информацию об ошибке
          if (isError && statusCode !== null) {
            // Сохраняем в общий список ошибок
            const errorKey = `${botName}-${statusCode}`;
            if (!errorsMap.has(errorKey)) {
              const urlMatch = line.match(/(?:GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\s+([^\s"']+)/i) ||
                              line.match(/["']([^"']+)["']/) ||
                              line.match(/(https?:\/\/[^\s"']+)/i);
              const errorUrl = urlMatch ? urlMatch[1].substring(0, 150) : undefined;
              
              errorsMap.set(errorKey, {
                statusCode,
                botName,
                userAgent: userAgent.substring(0, 100),
                count: 0,
                sampleLines: [],
                url: errorUrl,
              });
            }
            
            const error = errorsMap.get(errorKey)!;
            error.count++;
            
            // Сохраняем примеры строк с ошибками (максимум 3)
            if (error.sampleLines.length < 3) {
              error.sampleLines.push(line.substring(0, 200));
            }
            
            // Также сохраняем ошибку в информацию о боте
            if (!bot.errors) {
              bot.errors = [];
            }
            
            const botError = bot.errors.find(e => e.statusCode === statusCode);
            if (!botError) {
              bot.errors.push({
                statusCode,
                count: 0,
                sampleLines: [],
              });
            }
            
            const botErrorEntry = bot.errors.find(e => e.statusCode === statusCode)!;
            botErrorEntry.count++;
            if (botErrorEntry.sampleLines.length < 3) {
              botErrorEntry.sampleLines.push(line.substring(0, 200));
            }
          }
        }
      });

      // Преобразуем Map в массив и сортируем по количеству заходов
      const botsArray = Array.from(botsMap.values()).sort((a, b) => b.count - a.count);
      
      // Преобразуем ошибки в массив и сортируем по статус коду и количеству
      const errorsArray = Array.from(errorsMap.values())
        .sort((a, b) => {
          // Сначала по статус коду (400, 401, 404, 500 и т.д.)
          if (a.statusCode !== b.statusCode) {
            return a.statusCode - b.statusCode;
          }
          // Затем по количеству ошибок
          return b.count - a.count;
        });
      
      const totalVisits = botsArray.reduce((sum, bot) => sum + bot.count, 0);
      
      // Формируем TOP-20 URL
      const top20Urls = Array.from(urlMap.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 20);
      
      // Вычисляем среднее время ответа
      const avgResponseTime = responseTimes.length > 0
        ? responseTimes.reduce((sum, t) => sum + t, 0) / responseTimes.length
        : undefined;
      const maxResponseTime = responseTimes.length > 0
        ? Math.max(...responseTimes)
        : undefined;
      
      // Подсчитываем редиректы
      const totalRedirects = statusDistribution.status301 + statusDistribution.status302 + statusDistribution.status308;
      
      // Формируем детальный анализ
      const detailedAnalysis: DetailedAnalysis = {
        step1: {
          googlebotRequests,
          totalRequests: totalLines,
          googlebotPercentage: totalLines > 0 ? (googlebotRequests / totalLines) * 100 : 0,
          verifiedBots,
          unverifiedBots,
        },
        step2: {
          totalRequests: googlebotRequests,
          uniqueUrls: urlMap.size,
          avgRequestsPerUrl: urlMap.size > 0 ? googlebotRequests / urlMap.size : 0,
          topUrls: top20Urls,
        },
        step3: {
          top20Urls: top20Urls,
        },
        step4: crawlBudget,
        step5: statusDistribution,
        step6: {
          totalRedirects,
          redirectChains: 0, // Требует дополнительного анализа последовательных редиректов
          redirectTypes,
        },
        step7: depthDistribution,
        step8: {
          avgResponseTime,
          maxResponseTime,
          timingDataAvailable: responseTimes.length > 0,
        },
        step9: timeAnalysis,
      };

      setResult({
        totalGoogleVisits: totalVisits,
        bots: botsArray,
        uniqueBots: botsArray.length,
        errors: errorsArray,
        detailedAnalysis,
      });
    } catch (err: any) {
      setError(err.message || 'Ошибка при анализе логов');
      console.error('Ошибка анализа:', err);
    } finally {
      setAnalyzing(false);
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
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
          Logchecker
        </h1>

        {/* Форма */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-8">
          <div className="space-y-6">
            {/* Блок для ввода логов */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Вставьте логи для анализа *
              </label>
              <textarea
                value={logs}
                onChange={(e) => setLogs(e.target.value)}
                rows={15}
                className="w-full px-4 py-3 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y font-mono"
                placeholder="Вставьте логи сервера (access.log, error.log и т.д.)..."
              />
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Анализируются ТОЛЬКО заходы Google ботов по User-Agent (Googlebot, Google-InspectionTool, Googlebot-Image и др.). Другие боты не показываются.
              </p>
            </div>

            {error && (
              <div className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <button
              onClick={analyzeLogs}
              disabled={analyzing || !logs.trim()}
              className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {analyzing ? 'Анализ...' : 'Анализировать логи'}
            </button>
          </div>
        </div>

        {/* Результаты анализа */}
        {result && (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
              Результаты анализа
            </h2>

            {/* Оповещения об ошибках */}
            {result.errors.length > 0 && (
              <div className="mb-6">
                <div className="bg-red-50 dark:bg-red-900/30 border-2 border-red-300 dark:border-red-700 rounded-lg p-6">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <div className="ml-3 flex-1">
                      <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">
                        ⚠️ Требуется исправление: Google боты получают ошибки
                      </h3>
                      <div className="space-y-3">
                        {result.errors.map((error, index) => (
                          <div 
                            key={index}
                            className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-red-200 dark:border-red-800"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <span className="font-semibold text-red-700 dark:text-red-300">
                                  Ошибка {error.statusCode}
                                </span>
                                <span className="text-sm text-gray-600 dark:text-gray-400 ml-2">
                                  от {error.botName}
                                </span>
                              </div>
                              <span className="text-lg font-bold text-red-600 dark:text-red-400">
                                {error.count} {error.count === 1 ? 'раз' : 'раз'}
                              </span>
                            </div>
                            {error.url && (
                              <div className="text-sm text-gray-700 dark:text-gray-300 mb-2 font-mono break-all">
                                URL: {error.url}
                              </div>
                            )}
                            <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                              User-Agent: {error.userAgent}
                            </div>
                            <div className="mt-2">
                              <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                Примеры запросов с ошибкой:
                              </div>
                              <div className="space-y-1">
                                {error.sampleLines.map((line, lineIndex) => (
                                  <div 
                                    key={lineIndex}
                                    className="text-xs font-mono text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 p-2 rounded border border-gray-200 dark:border-gray-700 overflow-x-auto"
                                  >
                                    {line}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Краткая статистика */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Всего заходов Google
                </div>
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {result.totalGoogleVisits}
                </div>
              </div>
              <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-4">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Уникальных ботов
                </div>
                <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {result.uniqueBots}
                </div>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/30 rounded-lg p-4">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Среднее заходов на бота
                </div>
                <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                  {result.uniqueBots > 0 
                    ? Math.round(result.totalGoogleVisits / result.uniqueBots)
                    : 0}
                </div>
              </div>
            </div>

            {/* Сводка ботов */}
            {result.bots.length > 0 && (
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Сводка ботов
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {result.bots.map((bot, index) => {
                    const percentage = result.totalGoogleVisits > 0
                      ? ((bot.count / result.totalGoogleVisits) * 100).toFixed(1)
                      : '0';
                    const hasErrors = bot.errors && bot.errors.length > 0;
                    const totalErrors = hasErrors 
                      ? bot.errors!.reduce((sum, e) => sum + e.count, 0)
                      : 0;
                    
                    return (
                      <div
                        key={index}
                        className={`bg-gradient-to-br ${
                          hasErrors 
                            ? 'from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-900/30 border-2 border-red-300 dark:border-red-700' 
                            : 'from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/30 border border-blue-200 dark:border-blue-800'
                        } rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 dark:text-white text-sm mb-1">
                              {bot.botName}
                            </h4>
                            {hasErrors && (
                              <div className="flex items-center gap-1 mt-1">
                                <svg className="h-4 w-4 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                <span className="text-xs font-medium text-red-700 dark:text-red-300">
                                  {totalErrors} {totalErrors === 1 ? 'ошибка' : 'ошибок'}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                          <div className="flex items-baseline justify-between">
                            <span className="text-xs text-gray-600 dark:text-gray-400">
                              Заходов:
                            </span>
                            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                              {bot.count.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex items-baseline justify-between mt-2">
                            <span className="text-xs text-gray-600 dark:text-gray-400">
                              Процент:
                            </span>
                            <span className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                              {percentage}%
                            </span>
                          </div>
                          {hasErrors && (
                            <div className="mt-2 pt-2 border-t border-red-200 dark:border-red-800">
                              <div className="text-xs text-red-700 dark:text-red-300">
                                Ошибки:
                                {bot.errors!.map((error, errIndex) => (
                                  <span key={errIndex} className="ml-1 font-semibold">
                                    {error.statusCode} ({error.count})
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Таблица ботов */}
            {result.bots.length > 0 ? (
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Детальная таблица ботов
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-100 dark:bg-gray-700">
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-600">
                          Бот
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-600">
                          User-Agent
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-600">
                          Количество заходов
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-600">
                          Процент
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {result.bots.map((bot, index) => {
                        const percentage = result.totalGoogleVisits > 0
                          ? ((bot.count / result.totalGoogleVisits) * 100).toFixed(1)
                          : '0';
                        
                        return (
                          <tr 
                            key={index}
                            className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                          >
                            <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                              <div className="flex items-center gap-2">
                                {bot.botName}
                                {bot.errors && bot.errors.length > 0 && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                                    {bot.errors.length} {bot.errors.length === 1 ? 'ошибка' : 'ошибок'}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 font-mono text-xs">
                              {bot.userAgent || 'N/A'}
                            </td>
                            <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-white font-semibold">
                              {bot.count.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-sm text-right text-gray-600 dark:text-gray-400">
                              {percentage}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-600 dark:text-gray-400">
                Google боты не найдены в логах
              </div>
            )}

            {/* Примеры строк для каждого бота */}
            {result.bots.length > 0 && (
              <div className="mt-8">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Примеры запросов
                </h3>
                <div className="space-y-4">
                  {result.bots.map((bot, index) => (
                    <div 
                      key={index}
                      className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
                    >
                      <div className="font-semibold text-gray-900 dark:text-white mb-2">
                        {bot.botName} ({bot.count} {bot.count === 1 ? 'заход' : 'заходов'})
                        {bot.errors && bot.errors.length > 0 && (
                          <span className="ml-2 text-red-600 dark:text-red-400 text-sm">
                            - {bot.errors.reduce((sum, e) => sum + e.count, 0)} ошибок
                          </span>
                        )}
                      </div>
                      {bot.errors && bot.errors.length > 0 && (
                        <div className="mb-3 p-3 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
                          <div className="text-sm font-semibold text-red-700 dark:text-red-300 mb-2">
                            Ошибки:
                          </div>
                          <div className="space-y-2">
                            {bot.errors.map((error, errorIndex) => (
                              <div key={errorIndex} className="text-xs">
                                <span className="font-semibold text-red-600 dark:text-red-400">
                                  {error.statusCode}:
                                </span>
                                <span className="text-gray-700 dark:text-gray-300 ml-1">
                                  {error.count} {error.count === 1 ? 'раз' : 'раз'}
                                </span>
                                {error.sampleLines.length > 0 && (
                                  <div className="mt-1 space-y-1">
                                    {error.sampleLines.map((line, lineIndex) => (
                                      <div 
                                        key={lineIndex}
                                        className="text-xs font-mono text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 p-2 rounded border border-red-200 dark:border-red-800 overflow-x-auto"
                                      >
                                        {line}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="space-y-2">
                        <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                          Примеры запросов:
                        </div>
                        {bot.sampleLines.map((line, lineIndex) => (
                          <div 
                            key={lineIndex}
                            className="text-xs font-mono text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-600 overflow-x-auto"
                          >
                            {line}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Детальный анализ по 9 шагам */}
            {result.detailedAnalysis && (
              <div className="mt-8 bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
                  Детальный анализ Googlebot
                </h2>

                {/* Шаг 1: Идентификация Googlebot */}
                <div className="mb-8">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                    Шаг 1. Идентификация Googlebot
                  </h3>
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-2">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Запросов Googlebot</div>
                        <div className="text-lg font-bold text-gray-900 dark:text-white">
                          {result.detailedAnalysis.step1.googlebotRequests.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Всего запросов</div>
                        <div className="text-lg font-bold text-gray-900 dark:text-white">
                          {result.detailedAnalysis.step1.totalRequests.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Процент Googlebot</div>
                        <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                          {result.detailedAnalysis.step1.googlebotPercentage.toFixed(2)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Подтвержденных ботов</div>
                        <div className="text-lg font-bold text-green-600 dark:text-green-400">
                          {result.detailedAnalysis.step1.verifiedBots}
                        </div>
                      </div>
                    </div>
                    {result.detailedAnalysis.step1.unverifiedBots > 0 && (
                      <div className="mt-2 text-sm text-yellow-600 dark:text-yellow-400">
                        ⚠️ Неподтвержденных ботов: {result.detailedAnalysis.step1.unverifiedBots}
                      </div>
                    )}
                  </div>
                </div>

                {/* Шаг 2: Объем и частота обхода */}
                <div className="mb-8">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                    Шаг 2. Объем и частота обхода
                  </h3>
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-2">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Всего запросов Googlebot</div>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                          {result.detailedAnalysis.step2.totalRequests.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Уникальных URL</div>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                          {result.detailedAnalysis.step2.uniqueUrls.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Среднее запросов на URL</div>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                          {result.detailedAnalysis.step2.avgRequestsPerUrl.toFixed(2)}
                        </div>
                      </div>
                    </div>
                    {result.detailedAnalysis.step2.avgRequestsPerUrl > 10 && (
                      <div className="mt-2 text-sm text-yellow-600 dark:text-yellow-400">
                        Высокая концентрация запросов на малом числе URL
                      </div>
                    )}
                  </div>
                </div>

                {/* Шаг 3: TOP-20 URL */}
                <div className="mb-8">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                    Шаг 3. TOP-20 URL по количеству запросов
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-100 dark:bg-gray-700">
                          <th className="px-4 py-2 text-left text-sm font-semibold text-gray-900 dark:text-white border-b">URL</th>
                          <th className="px-4 py-2 text-right text-sm font-semibold text-gray-900 dark:text-white border-b">Запросов</th>
                          <th className="px-4 py-2 text-right text-sm font-semibold text-gray-900 dark:text-white border-b">Глубина</th>
                          <th className="px-4 py-2 text-left text-sm font-semibold text-gray-900 dark:text-white border-b">Статусы</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {result.detailedAnalysis.step3.top20Urls.map((url, index) => (
                          <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                            <td className="px-4 py-2 text-sm font-mono text-gray-900 dark:text-white">
                              {url.url || '/'}
                              {url.hasParams && <span className="ml-2 text-xs text-yellow-600">параметры</span>}
                            </td>
                            <td className="px-4 py-2 text-sm text-right text-gray-900 dark:text-white font-semibold">
                              {url.count.toLocaleString()}
                            </td>
                            <td className="px-4 py-2 text-sm text-right text-gray-600 dark:text-gray-400">
                              {url.depth}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
                              {Object.entries(url.statusCodes).map(([code, count]) => (
                                <span key={code} className="mr-2">
                                  {code}: {count}
                                </span>
                              ))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Шаг 4: Распределение crawl budget */}
                <div className="mb-8">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                    Шаг 4. Распределение crawl budget
                  </h3>
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                    <div className="space-y-3">
                      {Object.entries(result.detailedAnalysis.step4).map(([key, value]) => {
                        const total = Object.values(result.detailedAnalysis.step4).reduce((a, b) => a + b, 0);
                        const percentage = total > 0 ? (value / total) * 100 : 0;
                        const labels: { [key: string]: string } = {
                          canonical: 'Каноничные страницы',
                          withParams: 'URL с параметрами',
                          pagination: 'Pagination',
                          service: 'Служебные разделы',
                          notFound: 'Несуществующие URL',
                        };
                        return (
                          <div key={key}>
                            <div className="flex justify-between mb-1">
                              <span className="text-sm text-gray-700 dark:text-gray-300">{labels[key]}</span>
                              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                {value.toLocaleString()} ({percentage.toFixed(1)}%)
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${
                                  key === 'canonical' ? 'bg-green-500' :
                                  key === 'notFound' || key === 'service' ? 'bg-red-500' :
                                  'bg-yellow-500'
                                }`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {result.detailedAnalysis.step4.notFound + result.detailedAnalysis.step4.service > 
                     Object.values(result.detailedAnalysis.step4).reduce((a, b) => a + b, 0) * 0.1 && (
                      <div className="mt-4 text-sm text-red-600 dark:text-red-400">
                        ⚠️ Более 10% бюджета тратится на несуществующие или служебные URL
                      </div>
                    )}
                  </div>
                </div>

                {/* Шаг 5: HTTP статусы */}
                <div className="mb-8">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                    Шаг 5. Распределение HTTP статусов для Googlebot
                  </h3>
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">200 OK</div>
                        <div className="text-xl font-bold text-green-600 dark:text-green-400">
                          {result.detailedAnalysis.step5.status200.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">301 Moved</div>
                        <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                          {result.detailedAnalysis.step5.status301.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">302 Found</div>
                        <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                          {result.detailedAnalysis.step5.status302.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">404 Not Found</div>
                        <div className="text-xl font-bold text-red-600 dark:text-red-400">
                          {result.detailedAnalysis.step5.status404.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">410 Gone</div>
                        <div className="text-xl font-bold text-red-600 dark:text-red-400">
                          {result.detailedAnalysis.step5.status410.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">403/401</div>
                        <div className="text-xl font-bold text-red-600 dark:text-red-400">
                          {(result.detailedAnalysis.step5.status403 + result.detailedAnalysis.step5.status401).toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">5xx ошибки</div>
                        <div className="text-xl font-bold text-red-600 dark:text-red-400">
                          {result.detailedAnalysis.step5.status5xx.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Другие</div>
                        <div className="text-xl font-bold text-gray-600 dark:text-gray-400">
                          {result.detailedAnalysis.step5.other.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Шаг 6: Редиректы */}
                <div className="mb-8">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                    Шаг 6. Анализ редиректов
                  </h3>
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Всего редиректов</div>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                          {result.detailedAnalysis.step6.totalRedirects.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">301 редиректы</div>
                        <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                          {(result.detailedAnalysis.step6.redirectTypes[301] || 0).toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">302 редиректы</div>
                        <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                          {(result.detailedAnalysis.step6.redirectTypes[302] || 0).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    {result.detailedAnalysis.step6.totalRedirects > result.detailedAnalysis.step1.googlebotRequests * 0.3 && (
                      <div className="mt-4 text-sm text-yellow-600 dark:text-yellow-400">
                        ⚠️ Более 30% запросов - редиректы
                      </div>
                    )}
                  </div>
                </div>

                {/* Шаг 7: Глубина обхода */}
                <div className="mb-8">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                    Шаг 7. Глубина обхода
                  </h3>
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Корень (/)</div>
                        <div className="text-xl font-bold text-gray-900 dark:text-white">
                          {result.detailedAnalysis.step7.root.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Уровень 1</div>
                        <div className="text-xl font-bold text-gray-900 dark:text-white">
                          {result.detailedAnalysis.step7.level1.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Уровень 2</div>
                        <div className="text-xl font-bold text-gray-900 dark:text-white">
                          {result.detailedAnalysis.step7.level2.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Глубже</div>
                        <div className="text-xl font-bold text-gray-900 dark:text-white">
                          {result.detailedAnalysis.step7.deeper.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Шаг 8: Скорость ответа */}
                {result.detailedAnalysis.step8.timingDataAvailable && (
                  <div className="mb-8">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                      Шаг 8. Скорость ответа
                    </h3>
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">Среднее время ответа</div>
                          <div className="text-2xl font-bold text-gray-900 dark:text-white">
                            {result.detailedAnalysis.step8.avgResponseTime?.toFixed(2)} мс
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">Максимальное время</div>
                          <div className="text-2xl font-bold text-gray-900 dark:text-white">
                            {result.detailedAnalysis.step8.maxResponseTime?.toFixed(2)} мс
                          </div>
                        </div>
                      </div>
                      {result.detailedAnalysis.step8.avgResponseTime && result.detailedAnalysis.step8.avgResponseTime > 1000 && (
                        <div className="mt-4 text-sm text-red-600 dark:text-red-400">
                          ⚠️ Среднее время ответа превышает 1 секунду
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Шаг 9: Поведение во времени */}
                {Object.keys(result.detailedAnalysis.step9.byHour).length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                      Шаг 9. Активность по часам
                    </h3>
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                      <div className="grid grid-cols-6 md:grid-cols-12 gap-2">
                        {Array.from({ length: 24 }, (_, i) => i).map((hour) => {
                          const count = result.detailedAnalysis.step9.byHour[hour] || 0;
                          const maxCount = Math.max(...Object.values(result.detailedAnalysis.step9.byHour));
                          return (
                            <div key={hour} className="text-center">
                              <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">{hour}:00</div>
                              <div className="bg-blue-200 dark:bg-blue-800 rounded h-24 flex items-end justify-center p-1">
                                <div
                                  className="bg-blue-600 dark:bg-blue-400 w-full rounded"
                                  style={{ height: maxCount > 0 ? `${(count / maxCount) * 100}%` : '0%' }}
                                  title={`${count} запросов`}
                                />
                              </div>
                              <div className="text-xs text-gray-700 dark:text-gray-300 mt-1">{count}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Краткое резюме */}
                <div className="mt-8 bg-blue-50 dark:bg-blue-900/30 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                    Краткое резюме
                  </h3>
                  <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                    <li>• Googlebot выполнил {result.detailedAnalysis.step1.googlebotRequests.toLocaleString()} запросов из {result.detailedAnalysis.step1.totalRequests.toLocaleString()} ({result.detailedAnalysis.step1.googlebotPercentage.toFixed(2)}%)</li>
                    <li>• Обнаружено {result.detailedAnalysis.step2.uniqueUrls.toLocaleString()} уникальных URL</li>
                    <li>• Среднее {result.detailedAnalysis.step2.avgRequestsPerUrl.toFixed(2)} запросов на URL</li>
                    <li>• {result.detailedAnalysis.step5.status200.toLocaleString()} успешных ответов (200), {result.detailedAnalysis.step5.status404.toLocaleString()} ошибок 404</li>
                    <li>• {result.detailedAnalysis.step6.totalRedirects.toLocaleString()} редиректов ({result.detailedAnalysis.step1.googlebotRequests > 0 ? ((result.detailedAnalysis.step6.totalRedirects / result.detailedAnalysis.step1.googlebotRequests) * 100).toFixed(1) : 0}%)</li>
                    {result.detailedAnalysis.step8.timingDataAvailable && result.detailedAnalysis.step8.avgResponseTime && (
                      <li>• Среднее время ответа: {result.detailedAnalysis.step8.avgResponseTime.toFixed(2)} мс</li>
                    )}
                    {result.detailedAnalysis.step4.notFound + result.detailedAnalysis.step4.service > 0 && (
                      <li>• {(result.detailedAnalysis.step4.notFound + result.detailedAnalysis.step4.service).toLocaleString()} запросов к несуществующим или служебным URL</li>
                    )}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
