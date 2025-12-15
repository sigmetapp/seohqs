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

interface AnalysisResult {
  totalGoogleVisits: number;
  bots: BotVisit[];
  uniqueBots: number;
  errors: GoogleError[];
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

      // Паттерны для поиска рефереров от Google (любые домены google.*)
      const googleRefererPatterns = [
        /https?:\/\/[^\s"']*google\.[^\s"']*/i,
        /referer[:\s]+[^\s"']*google\.[^\s"']*/i,
        /referrer[:\s]+[^\s"']*google\.[^\s"']*/i,
      ];

      // Разбиваем логи на строки
      const lines = logs.split('\n').filter(line => line.trim());
      
      // Словарь для хранения информации о ботах
      const botsMap = new Map<string, BotVisit>();
      
      // Массив для хранения ошибок Google ботов
      const errorsMap = new Map<string, GoogleError>();

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

        // Если не нашли по User-Agent, проверяем рефереры от Google
        if (!foundBot) {
          for (const pattern of googleRefererPatterns) {
            if (pattern.test(line)) {
              foundBot = true;
              botName = 'Googlebot (по рефереру)';
              
              // Пытаемся извлечь User-Agent, если он есть
              const uaMatch = line.match(/User-Agent[:\s]+([^\s]+)/i) ||
                             line.match(/["']([^"']*User-Agent[^"']*)["']/i);
              
              if (uaMatch) {
                userAgent = uaMatch[1].substring(0, 100);
              } else {
                // Извлекаем реферер как идентификатор
                const refererMatch = line.match(/(https?:\/\/[^\s"']*google[^\s"']*)/i);
                userAgent = refererMatch ? `Referer: ${refererMatch[1]}` : 'Google Referer';
              }
              break;
            }
          }
        }

        // Если нашли бота, сохраняем информацию
        if (foundBot) {
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
          
          // Если это ошибка, сохраняем информацию об ошибке
          if (isError && statusCode !== null) {
            // Сохраняем в общий список ошибок
            const errorKey = `${botName}-${statusCode}`;
            if (!errorsMap.has(errorKey)) {
              // Извлекаем URL из строки, если возможно
              const urlMatch = line.match(/(?:GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\s+([^\s"']+)/i) ||
                              line.match(/["']([^"']+)["']/) ||
                              line.match(/(https?:\/\/[^\s"']+)/i);
              const url = urlMatch ? urlMatch[1].substring(0, 150) : undefined;
              
              errorsMap.set(errorKey, {
                statusCode,
                botName,
                userAgent: userAgent.substring(0, 100),
                count: 0,
                sampleLines: [],
                url,
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

      setResult({
        totalGoogleVisits: totalVisits,
        bots: botsArray,
        uniqueBots: botsArray.length,
        errors: errorsArray,
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
                Анализируются заходы Google и всех его ботов (Googlebot, Google-InspectionTool, Googlebot-Image и др.)
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

            {/* Таблица ботов */}
            {result.bots.length > 0 ? (
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
          </div>
        )}
      </div>
    </div>
  );
}
