'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import SectionStatusCard, { SectionStatusData, SectionStatus } from '@/app/components/content-generator/SectionStatusCard';

interface FinalResult {
  html?: string;
  meta_title?: string;
  meta_description?: string;
  h1?: string;
  summary?: string;
}

interface ArticleJob {
  jobId: string;
  status: string;
  topic: string;
  outline?: {
    title: string;
    sections: Array<{ id: string; title: string; description: string }>;
  };
  sources?: Array<{ url: string; title: string; snippet: string }>;
  progress?: {
    totalSections: number;
    completedSections: number;
    sections: Array<{ sectionId: string; status: string; completedAt?: string }>;
  };
  finalHtml?: string;
  metaTitle?: string;
  metaDescription?: string;
}

export default function ContentGeneratorPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [topic, setTopic] = useState('');
  const [language, setLanguage] = useState('RU');
  const [audience, setAudience] = useState('general');
  const [authorPersona, setAuthorPersona] = useState('expert');
  const [angle, setAngle] = useState('informative');
  const [contentGoal, setContentGoal] = useState('SEO article');
  const [desiredLength, setDesiredLength] = useState('2000');
  const [complexity, setComplexity] = useState('medium');
  const [constraints, setConstraints] = useState('');

  const [generating, setGenerating] = useState(false);
  const [finalResult, setFinalResult] = useState<FinalResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState('');
  const [outlineSections, setOutlineSections] = useState<Array<{ id: string; title: string; description: string }>>([]);
  const [step, setStep] = useState<'idle' | 'researching' | 'writing' | 'finalizing' | 'done'>('idle');
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [sectionStatuses, setSectionStatuses] = useState<SectionStatusData[]>([]);
  const [failedSections, setFailedSections] = useState<Array<{ index: number; title: string; error: string }>>([]);
  
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const sectionGenerationRef = useRef<boolean>(false);

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

  // Polling статуса research
  const pollResearchStatus = async (jobId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/article/research-status?jobId=${jobId}`);
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Ошибка проверки статуса research');
      }

      if (data.status === 'completed') {
        // Research завершён, сохраняем outline
        const result = data.result;
        setOutlineSections(result.outline.sections || []);
        setStep('writing');
        setProgress('Research завершён. Начинаем генерацию секций...');
        return true;
      }

      // Research ещё выполняется
      return false;
    } catch (error: any) {
      console.error('[POLL RESEARCH] Ошибка:', error);
      throw error;
    }
  };

  // Polling общего статуса задачи
  const pollJobStatus = async (jobId: string): Promise<ArticleJob | null> => {
    try {
      const res = await fetch(`/api/article/status?jobId=${jobId}`);
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Ошибка получения статуса задачи');
      }

      return data.job;
    } catch (error: any) {
      console.error('[POLL STATUS] Ошибка:', error);
      return null;
    }
  };

  // Генерация всех секций последовательно
  const generateAllSections = async (jobId: string, sections: Array<{ id: string; title: string; description: string }>) => {
    if (sectionGenerationRef.current) {
      return; // Уже генерируем
    }

    sectionGenerationRef.current = true;
    const failed: Array<{ index: number; title: string; error: string }> = [];
    const statuses: SectionStatusData[] = [];

    // Инициализируем статусы секций
    sections.forEach((section, index) => {
      statuses.push({
        index: index + 1,
        title: section.title,
        status: 'skipped',
      });
    });
    setSectionStatuses([...statuses]);

    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      const sectionStartTime = Date.now();
      setProgress(`Генерация секции ${i + 1} из ${sections.length}: ${section.title}...`);

      // Обновляем статус на "в процессе"
      statuses[i].status = 'skipped';
      setSectionStatuses([...statuses]);

      try {
        const res = await fetch('/api/article/write-section', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            jobId,
            sectionId: section.id,
          }),
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.error || `Ошибка генерации секции ${i + 1}`);
        }

        const generationTime = Math.floor((Date.now() - sectionStartTime) / 1000);
        const wordCount = data.sectionHtml
          ? data.sectionHtml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().split(' ').filter((w: string) => w.length > 0).length
          : undefined;

        statuses[i] = {
          index: i + 1,
          title: section.title,
          status: 'success',
          sectionHtml: data.sectionHtml,
          generationTime,
          wordCount,
          complexityLevel: 'medium',
        };
      } catch (error: any) {
        const errorMsg = error.message || `Ошибка генерации секции ${i + 1}`;
        failed.push({
          index: i + 1,
          title: section.title,
          error: errorMsg,
        });

        statuses[i] = {
          index: i + 1,
          title: section.title,
          status: 'backend_error',
          error: errorMsg,
        };
      }

      setSectionStatuses([...statuses]);
      setFailedSections([...failed]);
    }

    sectionGenerationRef.current = false;

    // После генерации всех секций вызываем finalize
    if (failed.length < sections.length) {
      await finalizeArticle(jobId);
    } else {
      setError('Не удалось сгенерировать ни одной секции');
      setGenerating(false);
    }
  };

  // Финализация статьи
  const finalizeArticle = async (jobId: string) => {
    setStep('finalizing');
    setProgress('Финализация статьи...');

    try {
      const res = await fetch('/api/article/finalize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ jobId }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Ошибка финализации статьи');
      }

      // Получаем финальный статус задачи
      const job = await pollJobStatus(jobId);
      if (job) {
        setFinalResult({
          html: job.finalHtml || data.finalHtml,
          meta_title: job.metaTitle || '',
          meta_description: job.metaDescription || '',
          h1: job.outline?.title || '',
          summary: `Статья "${job.outline?.title || job.topic}" состоит из ${job.progress?.totalSections || 0} секций.`,
        });
      } else {
        setFinalResult({
          html: data.finalHtml,
          summary: 'Статья успешно сгенерирована.',
        });
      }

      setStep('done');
      setProgress('Статья готова! ✓');
      setGenerating(false);
    } catch (error: any) {
      console.error('[FINALIZE] Ошибка:', error);
      setError(error.message || 'Ошибка финализации статьи');
      setGenerating(false);
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
    setFinalResult(null);
    setOutlineSections([]);
    setFailedSections([]);
    setSectionStatuses([]);
    setStep('researching');
    setProgress('Запуск генерации статьи...');
    setStartTime(Date.now());
    setElapsedTime(0);
    sectionGenerationRef.current = false;

    try {
      // ШАГ 1: Запускаем задачу
      const startRes = await fetch('/api/article/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic,
          language,
          audience,
          authorPersona,
          angle,
          contentGoal,
          desiredLength,
          complexity,
          constraints: constraints || undefined,
        }),
      });

      const startData = await startRes.json();

      if (!startRes.ok || !startData.success) {
        throw new Error(startData.error || 'Ошибка запуска генерации статьи');
      }

      const jobId = startData.jobId;
      setCurrentJobId(jobId);
      setProgress('Research выполняется...');

      // ШАГ 2: Polling статуса research
      const maxPollAttempts = 60; // Максимум 60 попыток (1 минута)
      let pollAttempts = 0;
      let researchCompleted = false;

      pollingIntervalRef.current = setInterval(async () => {
        pollAttempts++;
        
        try {
          researchCompleted = await pollResearchStatus(jobId);
          
          if (researchCompleted) {
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }

            // Начинаем генерацию секций
            const job = await pollJobStatus(jobId);
            if (job && job.outline) {
              await generateAllSections(jobId, job.outline.sections);
            }
          } else if (pollAttempts >= maxPollAttempts) {
            // Таймаут polling
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
            throw new Error('Превышено время ожидания research. Попробуйте позже проверить статус задачи.');
          }
        } catch (error: any) {
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          setError(error.message || 'Ошибка при проверке статуса research');
          setGenerating(false);
        }
      }, 2000); // Проверяем каждые 2 секунды

    } catch (err: any) {
      console.error('Ошибка генерации контента:', err);
      setError(err.message || 'Ошибка генерации контента');
      setStep('idle');
      setGenerating(false);
      
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    }
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert(`${type} скопирован в буфер обмена`);
    } catch (error) {
      console.error('Ошибка копирования:', error);
    }
  };

  const handleRegenerateSection = async (index: number, complexity: 'medium' | 'low' | 'high') => {
    if (!currentJobId || !outlineSections.length) return;

    const section = outlineSections[index - 1];
    if (!section) return;

    // Обновляем статус на "в процессе"
    setSectionStatuses(prev => prev.map(s => 
      s.index === index 
        ? { ...s, status: 'skipped' as SectionStatus }
        : s
    ));

    try {
      const res = await fetch('/api/article/write-section', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobId: currentJobId,
          sectionId: section.id,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || `Ошибка перегенерации секции ${index}`);
      }

      const wordCount = data.sectionHtml
        ? data.sectionHtml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().split(' ').filter((w: string) => w.length > 0).length
        : undefined;

      // Обновляем статус секции
      setSectionStatuses(prev => {
        const updated = prev.map(s => 
          s.index === index 
            ? {
                ...s,
                status: 'success' as SectionStatus,
                sectionHtml: data.sectionHtml,
                wordCount,
                complexityLevel: complexity,
              }
            : s
        );

        // Пересобираем финальный HTML если есть результат
        if (finalResult) {
          const successfulSections = updated
            .filter(s => s.sectionHtml && (s.status === 'success' || s.status === 'success_light'))
            .sort((a, b) => a.index - b.index)
            .map(s => s.sectionHtml!);
        
          const assembledHtml = successfulSections.join('\n');
          setFinalResult({
            ...finalResult,
            html: assembledHtml,
          });
        }

        return updated;
      });
    } catch (error: any) {
      console.error(`Не удалось перегенерировать секцию ${index}:`, error);
      setSectionStatuses(prev => prev.map(s => 
        s.index === index 
          ? { ...s, status: 'backend_error' as SectionStatus, error: error.message }
          : s
      ));
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
                  Author Persona
                </label>
                <select
                  value={authorPersona}
                  onChange={(e) => setAuthorPersona(e.target.value)}
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

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Additional Constraints
              </label>
              <textarea
                value={constraints}
                onChange={(e) => setConstraints(e.target.value)}
                rows={2}
                className="w-full px-2 py-1.5 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Без длинных тире, без воды, добавлять примеры..."
              />
            </div>

            {error && (
              <div className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {progress && (
              <div className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-4 py-3 rounded">
                <div className="flex items-center justify-between">
                  <div>
                    {progress}
                    {step === 'researching' && ' (Шаг 1/4)'}
                    {step === 'writing' && ' (Шаг 2/4)'}
                    {step === 'finalizing' && ' (Шаг 3/4)'}
                    {step === 'done' && ' ✓'}
                  </div>
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

            {outlineSections.length > 0 && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <h3 className="font-semibold text-green-900 dark:text-green-200 mb-2">
                  Структура статьи ({outlineSections.length} секций)
                </h3>
                <ol className="list-decimal list-inside space-y-2 text-sm text-green-800 dark:text-green-300">
                  {outlineSections.map((section, index) => (
                    <li key={section.id}>
                      <strong>{section.title}</strong>
                      {section.description && (
                        <span className="ml-2 text-gray-600 dark:text-gray-400">
                          - {section.description}
                        </span>
                      )}
                    </li>
                  ))}
                </ol>
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

        {/* Карточки статусов секций */}
        {sectionStatuses.length > 0 && (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
              Статусы генерации секций
            </h2>
            <div className="space-y-3">
              {sectionStatuses.map((section) => (
                <SectionStatusCard
                  key={section.index}
                  section={section}
                  onRegenerate={handleRegenerateSection}
                />
              ))}
            </div>
          </div>
        )}

        {/* Финальный результат */}
        {finalResult && (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
              Результат
            </h2>

            {/* SEO данные */}
            <div className="mb-6 space-y-4">
              {finalResult.h1 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    H1
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={finalResult.h1}
                      readOnly
                      className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white"
                    />
                    <button
                      onClick={() => copyToClipboard(finalResult.h1 || '', 'H1')}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Meta Title
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={finalResult.meta_title || ''}
                    readOnly
                    placeholder="Meta Title не был сгенерирован"
                    className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white"
                  />
                  <button
                    onClick={() => copyToClipboard(finalResult.meta_title || '', 'Meta Title')}
                    disabled={!finalResult.meta_title}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Meta Description
                </label>
                <div className="flex space-x-2">
                  <textarea
                    value={finalResult.meta_description || ''}
                    readOnly
                    rows={3}
                    placeholder="Meta Description не был сгенерирован"
                    className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white"
                  />
                  <button
                    onClick={() => copyToClipboard(finalResult.meta_description || '', 'Meta Description')}
                    disabled={!finalResult.meta_description}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Copy
                  </button>
                </div>
              </div>

              {finalResult.summary && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Summary
                  </label>
                  <p className="text-gray-900 dark:text-white">{finalResult.summary}</p>
                </div>
              )}

              {failedSections.length > 0 && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <h3 className="font-semibold text-yellow-900 dark:text-yellow-200 mb-2">
                    ⚠️ Секции, которые не удалось сгенерировать ({failedSections.length}):
                  </h3>
                  <ul className="list-disc list-inside space-y-2 text-sm text-yellow-800 dark:text-yellow-300">
                    {failedSections.map((failed, idx) => (
                      <li key={idx}>
                        <strong>Секция {failed.index}: {failed.title}</strong>
                        <br />
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          {failed.error}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* HTML контент */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  HTML Content
                </label>
                <div className="space-x-2">
                  <button
                    onClick={() => copyToClipboard(finalResult.html || '', 'HTML')}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                  >
                    Copy HTML
                  </button>
                  <button
                    onClick={() => {
                      const plainText = finalResult.html?.replace(/<[^>]*>/g, '') || '';
                      copyToClipboard(plainText, 'Plain Text');
                    }}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
                  >
                    Copy Plain Text
                  </button>
                </div>
              </div>
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
                  dangerouslySetInnerHTML={{ __html: finalResult.html || '' }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
