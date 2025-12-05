'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Step {
  id: number;
  name: string;
  description: string;
  status: 'pending' | 'in_progress' | 'done' | 'error';
  result?: string;
  error?: string;
}

interface FinalResult {
  html?: string;
  metaTitle?: string;
  metaDescription?: string;
  faqQuestions?: string[];
  summary?: string;
}

const STEPS: Omit<Step, 'status' | 'result' | 'error'>[] = [
  {
    id: 1,
    name: 'Draft generation',
    description: 'Создание развернутого черновика статьи на основе входных параметров',
  },
  {
    id: 2,
    name: 'SEO structuring',
    description: 'Улучшение структуры под SEO: H2/H3, логика блоков, покрытие подзапросов',
  },
  {
    id: 3,
    name: 'Humanization / Natural style',
    description: 'Переписывание текста для естественного, человеческого стиля без AI-штампов',
  },
  {
    id: 4,
    name: 'Uniqueness & variation',
    description: 'Изменение формулировок и переходов для стилистической уникальности',
  },
  {
    id: 5,
    name: 'Quality & coherence check',
    description: 'Проверка на повторы, логические разрывы, вода и противоречия',
  },
  {
    id: 6,
    name: 'Final HTML + SEO meta',
    description: 'Оформление в HTML-формате и генерация SEO-метаданных',
  },
];

export default function ContentGeneratorPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [mainQuery, setMainQuery] = useState('');
  const [language, setLanguage] = useState('RU');
  const [targetAudience, setTargetAudience] = useState('');
  const [contentGoal, setContentGoal] = useState('SEO article');
  const [desiredLength, setDesiredLength] = useState('2000');
  const [toneOfVoice, setToneOfVoice] = useState('neutral');
  const [additionalConstraints, setAdditionalConstraints] = useState('');

  const [steps, setSteps] = useState<Step[]>(STEPS.map(s => ({ ...s, status: 'pending' })));
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());
  const [generating, setGenerating] = useState(false);
  const [finalResult, setFinalResult] = useState<FinalResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/user/me');
      
      if (res.status === 401) {
        // Пользователь не авторизован - это нормально
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

  const toggleStep = (stepId: number) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(stepId)) {
      newExpanded.delete(stepId);
    } else {
      newExpanded.add(stepId);
    }
    setExpandedSteps(newExpanded);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!mainQuery.trim()) {
      setError('Основной запрос обязателен');
      return;
    }

    setGenerating(true);
    setError(null);
    setFinalResult(null);
    setSteps(STEPS.map(s => ({ ...s, status: 'pending' })));

    let progressInterval: NodeJS.Timeout | null = null;
    
    try {
      // Запускаем первый шаг
      setSteps(prev => {
        const newSteps = [...prev];
        newSteps[0] = { ...newSteps[0], status: 'in_progress' };
        return newSteps;
      });

      // Запускаем запрос асинхронно
      const fetchPromise = fetch('/api/content-generator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mainQuery,
          language,
          targetAudience,
          contentGoal,
          desiredLength,
          toneOfVoice,
          additionalConstraints: additionalConstraints || undefined,
        }),
      });

      // Симулируем прогресс по шагам во время ожидания ответа
      let currentStep = 0;
      progressInterval = setInterval(() => {
        if (currentStep < steps.length - 1) {
          setSteps(prev => {
            const newSteps = [...prev];
            if (currentStep >= 0) {
              newSteps[currentStep] = { ...newSteps[currentStep], status: 'done' };
            }
            currentStep++;
            if (currentStep < newSteps.length) {
              newSteps[currentStep] = { ...newSteps[currentStep], status: 'in_progress' };
            }
            return newSteps;
          });
        }
      }, 8000); // Каждые 8 секунд переходим к следующему шагу

      const res = await fetchPromise;
      if (progressInterval) clearInterval(progressInterval);

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Ошибка генерации контента');
      }

      // Обновляем все шаги как завершенные
      setSteps(prev => prev.map(s => ({ ...s, status: 'done' })));

      // Устанавливаем финальный результат
      if (data.result) {
        setFinalResult({
          html: data.result.html || data.result.content,
          metaTitle: data.result.metaTitle,
          metaDescription: data.result.metaDescription,
          faqQuestions: data.result.faqQuestions || [],
          summary: data.result.summary,
        });
      }
    } catch (err: any) {
      if (progressInterval) clearInterval(progressInterval);
      setError(err.message || 'Ошибка генерации контента');
      setSteps(prev => prev.map(s => ({ ...s, status: 'error', error: err.message })));
    } finally {
      setGenerating(false);
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
          Multi-Step Content Generator
        </h1>

        {/* Форма параметров */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
            Параметры генерации
          </h2>

          <form onSubmit={handleGenerate} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Main query / Topic *
              </label>
              <input
                type="text"
                value={mainQuery}
                onChange={(e) => setMainQuery(e.target.value)}
                required
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Основной запрос или тема статьи"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Language
                </label>
                <input
                  type="text"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="EN, DE, RU, UA..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Desired length (words)
                </label>
                <input
                  type="text"
                  value={desiredLength}
                  onChange={(e) => setDesiredLength(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="1000, 2000, 3000..."
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Target audience
              </label>
              <input
                type="text"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="beginner, advanced, marketers, developers..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Content goal
              </label>
              <select
                value={contentGoal}
                onChange={(e) => setContentGoal(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tone of voice
              </label>
              <select
                value={toneOfVoice}
                onChange={(e) => setToneOfVoice(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option>neutral</option>
                <option>expert</option>
                <option>friendly</option>
                <option>casual</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Additional constraints
              </label>
              <textarea
                value={additionalConstraints}
                onChange={(e) => setAdditionalConstraints(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Без длинных тире, без воды, добавлять примеры..."
              />
            </div>

            {error && (
              <div className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={generating}
              className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? 'Генерация...' : 'Generate multi-step content'}
            </button>
          </form>
        </div>

        {/* Визуализация этапов */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
            Этапы обработки
          </h2>

          <div className="space-y-4">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`border rounded-lg p-4 ${
                  step.status === 'done'
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                    : step.status === 'in_progress'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : step.status === 'error'
                    ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
                        step.status === 'done'
                          ? 'bg-green-500 text-white'
                          : step.status === 'in_progress'
                          ? 'bg-blue-500 text-white'
                          : step.status === 'error'
                          ? 'bg-red-500 text-white'
                          : 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                      }`}
                    >
                      {step.status === 'done' ? '✓' : step.status === 'error' ? '✗' : step.id}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {step.name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {step.description}
                      </p>
                    </div>
                  </div>
                  {step.status === 'done' && (
                    <button
                      onClick={() => toggleStep(step.id)}
                      className="px-4 py-2 text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded transition-colors"
                    >
                      {expandedSteps.has(step.id) ? 'Скрыть' : 'Показать результат'}
                    </button>
                  )}
                </div>

                {expandedSteps.has(step.id) && step.result && (
                  <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700">
                    <pre className="whitespace-pre-wrap text-sm text-gray-900 dark:text-white">
                      {step.result}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Финальный результат */}
        {finalResult && (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
              Final Output
            </h2>

            {/* SEO данные */}
            <div className="mb-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Meta Title
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={finalResult.metaTitle || ''}
                    readOnly
                    className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white"
                  />
                  <button
                    onClick={() => copyToClipboard(finalResult.metaTitle || '', 'Meta Title')}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
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
                    value={finalResult.metaDescription || ''}
                    readOnly
                    rows={3}
                    className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white"
                  />
                  <button
                    onClick={() => copyToClipboard(finalResult.metaDescription || '', 'Meta Description')}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                  >
                    Copy
                  </button>
                </div>
              </div>

              {finalResult.faqQuestions && finalResult.faqQuestions.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    FAQ Questions
                  </label>
                  <ul className="list-disc list-inside space-y-1 text-gray-900 dark:text-white">
                    {finalResult.faqQuestions.map((q, i) => (
                      <li key={i}>{q}</li>
                    ))}
                  </ul>
                </div>
              )}

              {finalResult.summary && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Summary
                  </label>
                  <p className="text-gray-900 dark:text-white">{finalResult.summary}</p>
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
                className="p-4 bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700 prose dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: finalResult.html || '' }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
