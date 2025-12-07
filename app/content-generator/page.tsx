'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function ContentGeneratorPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Параметры формы
  const [topic, setTopic] = useState('');
  const [language, setLanguage] = useState('RU');
  const [audience, setAudience] = useState('general');
  const [persona, setPersona] = useState('expert');
  const [angle, setAngle] = useState('informative');
  const [contentGoal, setContentGoal] = useState('SEO article');
  const [desiredLength, setDesiredLength] = useState('2000');
  const [complexity, setComplexity] = useState('medium');
  const [debug, setDebug] = useState(false);

  // Состояние генерации
  const [generating, setGenerating] = useState(false);
  const [article, setArticle] = useState<string | null>(null);
  const [debugSources, setDebugSources] = useState<string | null>(null);
  const [debugRewritePrompt, setDebugRewritePrompt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState('');
  const [threadId, setThreadId] = useState<string | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [captchaHtml, setCaptchaHtml] = useState<string | null>(null);
  const [parsingSerp, setParsingSerp] = useState(false);
  
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (generating && startTime) {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    } else if (!generating) {
      setElapsedTime(0);
      setStartTime(null);
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [generating, startTime]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
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

  // Polling статуса генерации статьи
  const pollArticleStatus = async (threadId: string, runId: string, debugMode: boolean): Promise<{ completed: boolean; article?: string; debugSources?: string; debugRewritePrompt?: string }> => {
    try {
      const debugParam = debugMode ? '1' : '0';
      const res = await fetch(`/api/article/status?threadId=${threadId}&runId=${runId}&debug=${debugParam}`);
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Ошибка проверки статуса генерации');
      }

      if (data.status === 'completed' && data.article) {
        return { 
          completed: true, 
          article: data.article,
          debugSources: data.debugSources || undefined,
          debugRewritePrompt: data.debugRewritePrompt || undefined,
        };
      }

      // Генерация ещё выполняется
      return { completed: false };
    } catch (error: any) {
      console.error('[POLL STATUS] Ошибка:', error);
      throw error;
    }
  };

  // Создание статьи после успешного парсинга
  const handleGenerateAfterParsing = async (serpResults: any[]) => {
    try {
      // Создаём задачу и запускаем ассистента
      const createRes = await fetch('/api/article/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic,
          language,
          audience,
          authorPersona: persona,
          angle,
          contentGoal,
          desiredLength,
          complexity,
          debug,
          serpResults, // Передаём результаты парсинга
        }),
      });

      const createData = await createRes.json();

      if (!createRes.ok || !createData.success) {
        throw new Error(createData.error || 'Ошибка создания задачи генерации статьи');
      }

      const { threadId: newThreadId, runId: newRunId } = createData;
      setThreadId(newThreadId);
      setRunId(newRunId);
      setProgress('Ассистент ищет статьи в Google, выбирает лучшие, парсит контент и создаёт статью...');

      // Polling статуса генерации
      const maxPollAttempts = 300; // Максимум 300 попыток (10 минут при проверке каждые 2 секунды)
      let pollAttempts = 0;

      pollingIntervalRef.current = setInterval(async () => {
        pollAttempts++;
        
        try {
          const { completed, article: articleHtml, debugSources: sources, debugRewritePrompt: rewritePrompt } = await pollArticleStatus(newThreadId, newRunId, debug);
          
          if (completed && articleHtml) {
            // Генерация завершена
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }

            setArticle(articleHtml);
            if (debug) {
              setDebugSources(sources || null);
              setDebugRewritePrompt(rewritePrompt || null);
            }
            setProgress('Статья готова! ✓');
            setGenerating(false);
          } else if (pollAttempts >= maxPollAttempts) {
            // Таймаут polling
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
            setError('Превышено время ожидания генерации. Статья может быть готова позже. Проверьте статус позже.');
            setGenerating(false);
          } else {
            // Обновляем прогресс
            const statusMessages: Record<string, string> = {
              'queued': 'Задача в очереди...',
              'in_progress': 'Ассистент работает: ищет статьи в Google, анализирует источники, создаёт контент...',
              'requires_action': 'Требуется действие...',
            };
            const statusMessage = statusMessages[createData.status] || 'Генерация статьи...';
            setProgress(statusMessage);
          }
        } catch (error: any) {
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          setError(error.message || 'Ошибка при проверке статуса генерации');
          setGenerating(false);
        }
      }, 2000); // Проверяем каждые 2 секунды
    } catch (err: any) {
      console.error('Ошибка генерации контента:', err);
      setError(err.message || 'Ошибка генерации контента');
      setGenerating(false);
      
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!topic.trim()) {
      setError('Тема обязательна');
      return;
    }

    setGenerating(true);
    setError(null);
    setArticle(null);
    setDebugSources(null);
    setDebugRewritePrompt(null);
    setCaptchaHtml(null);
    setProgress('Парсинг топ-10 результатов из веба...');
    setStartTime(Date.now());
    setElapsedTime(0);
    setThreadId(null);
    setRunId(null);
    setParsingSerp(true);

    try {
      // Сначала парсим топ-10 результатов из веба
      const parseRes = await fetch('/api/article/parse-serp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: topic,
          language,
        }),
      });

      const parseData = await parseRes.json();
      setParsingSerp(false);

      // Если обнаружена CAPTCHA, отображаем её
      if (parseData.captchaHtml) {
        setCaptchaHtml(parseData.captchaHtml);
        setProgress('Обнаружена CAPTCHA. Пожалуйста, решите её ниже.');
        setGenerating(false);
        return;
      }

      if (!parseRes.ok || !parseData.success) {
        throw new Error(parseData.error || 'Ошибка парсинга SERP');
      }

      // Если парсинг успешен, продолжаем с созданием статьи
      await handleGenerateAfterParsing(parseData.results);

    } catch (err: any) {
      console.error('Ошибка генерации контента:', err);
      setError(err.message || 'Ошибка генерации контента');
      setGenerating(false);
      
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('Статья скопирована в буфер обмена');
    } catch (error) {
      console.error('Ошибка копирования:', error);
      alert('Не удалось скопировать статью');
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
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
          Content Generator
        </h1>

        {/* Форма параметров */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Параметры генерации
          </h2>

          <form onSubmit={handleGenerate} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Topic *
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                required
                className="w-full px-2 py-1.5 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Тема статьи"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Language
                </label>
                <input
                  type="text"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full px-2 py-1.5 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="EN, DE, RU, UA..."
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Desired length (words)
                </label>
                <input
                  type="text"
                  value={desiredLength}
                  onChange={(e) => setDesiredLength(e.target.value)}
                  className="w-full px-2 py-1.5 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="1000, 2000, 3000..."
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Audience
                </label>
                <select
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  className="w-full px-2 py-1.5 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="general">General</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                  <option value="professionals">Professionals</option>
                  <option value="marketers">Marketers</option>
                  <option value="developers">Developers</option>
                  <option value="business owners">Business Owners</option>
                  <option value="students">Students</option>
                  <option value="entrepreneurs">Entrepreneurs</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Persona
                </label>
                <select
                  value={persona}
                  onChange={(e) => setPersona(e.target.value)}
                  className="w-full px-2 py-1.5 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="expert">Expert</option>
                  <option value="beginner">Beginner</option>
                  <option value="practitioner">Practitioner</option>
                  <option value="researcher">Researcher</option>
                  <option value="industry insider">Industry Insider</option>
                  <option value="thought leader">Thought Leader</option>
                  <option value="educator">Educator</option>
                  <option value="consultant">Consultant</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Angle
                </label>
                <select
                  value={angle}
                  onChange={(e) => setAngle(e.target.value)}
                  className="w-full px-2 py-1.5 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="informative">Informative</option>
                  <option value="practical">Practical</option>
                  <option value="analytical">Analytical</option>
                  <option value="educational">Educational</option>
                  <option value="comparative">Comparative</option>
                  <option value="case study">Case Study</option>
                  <option value="how-to">How-To Guide</option>
                  <option value="opinion">Opinion</option>
                  <option value="review">Review</option>
                  <option value="news">News</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Content Goal
                </label>
                <select
                  value={contentGoal}
                  onChange={(e) => setContentGoal(e.target.value)}
                  className="w-full px-2 py-1.5 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option>SEO article</option>
                  <option>Landing page</option>
                  <option>Blog post</option>
                  <option>Review</option>
                  <option>Guide</option>
                  <option>FAQ page</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Complexity
                </label>
                <select
                  value={complexity}
                  onChange={(e) => setComplexity(e.target.value)}
                  className="w-full px-2 py-1.5 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="low">Low - быстрые короткие статьи</option>
                  <option value="medium">Medium - качественный блоговый контент</option>
                  <option value="high">High - экспертные лонгриды уровня редакторов</option>
                </select>
              </div>
            </div>

            <div className="text-xs text-gray-500 dark:text-gray-400 -mt-2">
              Алгоритм автоматически регулирует глубину, количество секций, насыщенность структуры, уровень противоречий и плотность инсайтов.
            </div>

            <div className="flex items-center pt-2">
              <input
                type="checkbox"
                id="debug"
                checked={debug}
                onChange={(e) => setDebug(e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
              />
              <label htmlFor="debug" className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Show debug info (source URLs + rewrite prompt)
              </label>
            </div>

            {error && (
              <div className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {progress && (
              <div className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-4 py-3 rounded">
                <div className="flex items-center justify-between">
                  <div>{progress}</div>
                  {generating && elapsedTime > 0 && (
                    <div className="text-sm font-mono ml-4">
                      {Math.floor(elapsedTime / 60) > 0 
                        ? `${Math.floor(elapsedTime / 60)}м ${elapsedTime % 60}с`
                        : `${elapsedTime}с`}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Отображение CAPTCHA */}
            {captchaHtml && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-300 dark:border-yellow-700 rounded-lg p-6 mb-4">
                <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200 mb-4">
                  Обнаружена CAPTCHA
                </h3>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-4">
                  Пожалуйста, решите CAPTCHA ниже, чтобы продолжить парсинг результатов:
                </p>
                <div 
                  className="bg-white dark:bg-gray-800 p-4 rounded border border-yellow-300 dark:border-yellow-700"
                  dangerouslySetInnerHTML={{ __html: captchaHtml }}
                />
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={async () => {
                      // Повторная попытка парсинга после решения CAPTCHA
                      setParsingSerp(true);
                      setProgress('Повторный парсинг топ-10 результатов...');
                      setCaptchaHtml(null);
                      
                      try {
                        const parseRes = await fetch('/api/article/parse-serp', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({
                            query: topic,
                            language,
                          }),
                        });

                        const parseData = await parseRes.json();
                        setParsingSerp(false);

                        if (parseData.captchaHtml) {
                          setCaptchaHtml(parseData.captchaHtml);
                          setProgress('CAPTCHA всё ещё присутствует. Пожалуйста, решите её снова.');
                          return;
                        }

                        if (!parseRes.ok || !parseData.success) {
                          throw new Error(parseData.error || 'Ошибка парсинга SERP');
                        }

                        // Если парсинг успешен, продолжаем с созданием статьи
                        setProgress('Создание задачи генерации статьи...');
                        await handleGenerateAfterParsing(parseData.results);
                      } catch (err: any) {
                        setError(err.message || 'Ошибка при повторном парсинге');
                        setParsingSerp(false);
                      }
                    }}
                    className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white font-semibold rounded-lg transition-colors"
                  >
                    Продолжить после решения CAPTCHA
                  </button>
                  <button
                    onClick={() => {
                      setCaptchaHtml(null);
                      setGenerating(false);
                      setProgress('');
                    }}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors"
                  >
                    Отмена
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={generating}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? 'Генерация...' : 'Generate article'}
            </button>
          </form>
        </div>


        {/* Результат - готовая статья */}
        {article && (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Сгенерированная статья
              </h2>
              <div className="space-x-2">
                <button
                  onClick={() => copyToClipboard(article)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                >
                  Copy HTML
                </button>
                <button
                  onClick={() => {
                    const plainText = article.replace(/<[^>]*>/g, '');
                    copyToClipboard(plainText);
                  }}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
                >
                  Copy Plain Text
                </button>
              </div>
            </div>

            {/* Debug информация */}
            {debugSources && (
              <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Debug: Source URLs
                </h3>
                <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono">
                  {debugSources}
                </pre>
              </div>
            )}

            {debugRewritePrompt && (
              <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Debug: Rewrite Prompt
                </h3>
                <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono">
                  {debugRewritePrompt}
                </pre>
              </div>
            )}

            {/* HTML контент статьи */}
            <div
              className="p-6 bg-white dark:bg-gray-900 rounded-lg border-2 border-gray-200 dark:border-gray-700 shadow-sm"
              style={{
                fontFamily: 'system-ui, -apple-system, sans-serif',
              }}
            >
              <div
                className="prose prose-lg dark:prose-invert max-w-none
                  prose-headings:font-bold prose-headings:text-gray-900 dark:prose-headings:text-white
                  prose-h1:text-4xl prose-h1:mt-8 prose-h1:mb-4 prose-h1:border-b-2 prose-h1:border-gray-300 dark:prose-h1:border-gray-600 prose-h1:pb-3
                  prose-h2:text-3xl prose-h2:mt-6 prose-h2:mb-3 prose-h2:text-gray-800 dark:prose-h2:text-gray-100
                  prose-h3:text-2xl prose-h3:mt-5 prose-h3:mb-2 prose-h3:text-gray-700 dark:prose-h3:text-gray-200
                  prose-h4:text-xl prose-h4:mt-4 prose-h4:mb-2 prose-h4:text-gray-700 dark:prose-h4:text-gray-200
                  prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-p:leading-relaxed prose-p:mb-4
                  prose-ul:list-disc prose-ul:pl-6 prose-ul:mb-4 prose-ul:text-gray-700 dark:prose-ul:text-gray-300
                  prose-ol:list-decimal prose-ol:pl-6 prose-ol:mb-4 prose-ol:text-gray-700 dark:prose-ol:text-gray-300
                  prose-li:mb-2 prose-li:leading-relaxed
                  prose-strong:text-gray-900 dark:prose-strong:text-white prose-strong:font-semibold
                  prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-a:underline
                  prose-blockquote:border-l-4 prose-blockquote:border-gray-300 dark:prose-blockquote:border-gray-600 prose-blockquote:pl-4 prose-blockquote:italic
                  prose-code:text-sm prose-code:bg-gray-100 dark:prose-code:bg-gray-800 prose-code:px-1 prose-code:py-0.5 prose-code:rounded
                  prose-pre:bg-gray-100 dark:prose-pre:bg-gray-800 prose-pre:p-4 prose-pre:rounded-lg prose-pre:overflow-x-auto"
                dangerouslySetInnerHTML={{ __html: article }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
