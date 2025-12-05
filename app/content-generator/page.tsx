'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface FinalResult {
  html?: string;
  metaTitle?: string;
  metaDescription?: string;
  faqQuestions?: string[];
  summary?: string;
}

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

  const [generating, setGenerating] = useState(false);
  const [finalResult, setFinalResult] = useState<FinalResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState('');
  const [outline, setOutline] = useState<{ title: string; sections: Array<{ id: string; title: string; description: string }> } | null>(null);
  const [step, setStep] = useState<'idle' | 'outline' | 'sections' | 'seo' | 'done'>('idle');
  const [currentSection, setCurrentSection] = useState<number>(0);
  const [totalSections, setTotalSections] = useState<number>(0);
  const [failedSections, setFailedSections] = useState<Array<{ index: number; title: string; error: string }>>([]);

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

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!mainQuery.trim()) {
      setError('Основной запрос обязателен');
      return;
    }

    setGenerating(true);
    setError(null);
    setFinalResult(null);
    setOutline(null);
    setFailedSections([]);
    setStep('outline');
    setProgress('Генерация структуры статьи...');

    try {
      // ШАГ 1: Генерация структуры
      setProgress('Генерация структуры статьи...');
      
      const outlineController = new AbortController();
      const outlineTimeout = setTimeout(() => outlineController.abort(), 12000); // 12 секунд на клиенте (запас)
      
      let outlineRes;
      try {
        outlineRes = await fetch('/api/content/outline', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            topic: mainQuery,
            language,
            audience: targetAudience,
            goal: contentGoal,
            length: desiredLength,
            tone: toneOfVoice,
          }),
          signal: outlineController.signal,
        });
        clearTimeout(outlineTimeout);
      } catch (fetchError: any) {
        clearTimeout(outlineTimeout);
        if (fetchError.name === 'AbortError') {
          throw new Error('Превышено время ожидания генерации структуры. Попробуйте еще раз.');
        }
        throw fetchError;
      }

      const outlineText = await outlineRes.text();
      
      // Проверяем, что ответ не пустой и не слишком большой перед парсингом
      if (!outlineText || outlineText.length > 10000) {
        throw new Error('Сервер вернул неожиданный ответ при генерации структуры');
      }
      
      let outlineData;
      try {
        outlineData = JSON.parse(outlineText);
      } catch (jsonError) {
        // Не пытаемся парсить большой JSON после ошибки
        const preview = outlineText.length > 200 ? outlineText.substring(0, 200) + '...' : outlineText;
        throw new Error(`Ошибка: сервер вернул не-JSON ответ при генерации структуры. Ответ: ${preview}`);
      }

      if (!outlineRes.ok || !outlineData.success) {
        throw new Error(outlineData.error || 'Ошибка генерации структуры');
      }

      const outline = outlineData.outline;
      setOutline(outline);
      setStep('article');

      // ШАГ 2: Генерация секций по очереди с retry и пропуском ошибок
      const sectionsHtml: string[] = [];
      const totalSections = outline.sections.length;
      const failed: Array<{ index: number; title: string; error: string }> = [];
      setTotalSections(totalSections);
      setStep('sections');
      setFailedSections([]);

      for (let i = 0; i < totalSections; i++) {
        const section = outline.sections[i];
        setCurrentSection(i + 1);
        
        let sectionHtml = null;
        let lastError = '';
        const maxRetries = 2; // Максимум 2 попытки (всего 3 попытки)

        // Пытаемся сгенерировать секцию с retry
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
          try {
            if (attempt > 0) {
              setProgress(`Повторная попытка (${attempt + 1}/${maxRetries + 1}) генерации секции ${i + 1} из ${totalSections}: ${section.title}...`);
              // Небольшая задержка перед повтором
              await new Promise(resolve => setTimeout(resolve, 1000));
            } else {
              setProgress(`Генерация секции ${i + 1} из ${totalSections}: ${section.title}...`);
            }

            const sectionController = new AbortController();
            const sectionTimeout = setTimeout(() => sectionController.abort(), 35000); // 35 секунд на клиенте (запас)
            
            let sectionRes;
            try {
              sectionRes = await fetch('/api/content/section', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  topic: mainQuery,
                  language,
                  audience: targetAudience,
                  goal: contentGoal,
                  tone: toneOfVoice,
                  sectionTitle: section.title,
                  sectionDescription: section.description,
                  sectionIndex: i,
                  totalSections: totalSections,
                  desiredArticleLength: parseInt(desiredLength) || 2000,
                }),
                signal: sectionController.signal,
              });
              clearTimeout(sectionTimeout);
            } catch (fetchError: any) {
              clearTimeout(sectionTimeout);
              if (fetchError.name === 'AbortError') {
                lastError = `Превышено время ожидания генерации секции ${i + 1}: "${section.title}"`;
                if (attempt < maxRetries) {
                  continue; // Пробуем еще раз
                }
                throw new Error(lastError);
              }
              throw fetchError;
            }

            const sectionText = await sectionRes.text();
            
            // Проверяем, что ответ не пустой и не слишком большой перед парсингом
            if (!sectionText || sectionText.length > 50000) {
              lastError = `Сервер вернул неожиданный ответ при генерации секции ${i + 1}`;
              if (attempt < maxRetries) {
                continue; // Пробуем еще раз
              }
              throw new Error(lastError);
            }
            
            let sectionData;
            try {
              sectionData = JSON.parse(sectionText);
            } catch (jsonError) {
              // Не пытаемся парсить большой JSON после ошибки
              const preview = sectionText.length > 200 ? sectionText.substring(0, 200) + '...' : sectionText;
              lastError = `Ошибка: сервер вернул не-JSON ответ при генерации секции ${i + 1}. Ответ: ${preview}`;
              if (attempt < maxRetries) {
                continue; // Пробуем еще раз
              }
              throw new Error(lastError);
            }

            if (!sectionRes.ok || !sectionData.success) {
              lastError = sectionData.error || `Ошибка генерации секции ${i + 1}: ${section.title}`;
              if (attempt < maxRetries) {
                continue; // Пробуем еще раз
              }
              throw new Error(lastError);
            }

            // Успешно получили секцию
            sectionHtml = sectionData.sectionHtml;
            break; // Выходим из цикла retry
          } catch (error: any) {
            lastError = error.message || `Ошибка генерации секции ${i + 1}: ${section.title}`;
            
            // Если это последняя попытка, записываем ошибку и продолжаем
            if (attempt >= maxRetries) {
              console.error(`Не удалось сгенерировать секцию ${i + 1} после ${maxRetries + 1} попыток:`, lastError);
              failed.push({
                index: i + 1,
                title: section.title,
                error: lastError,
              });
              // Добавляем placeholder вместо секции
              sectionHtml = `<h2>${section.title}</h2><p><em>Не удалось сгенерировать содержимое этой секции после нескольких попыток. ${lastError}</em></p>`;
              break;
            }
            // Иначе продолжаем попытки
          }
        }

        // Добавляем секцию (либо успешно сгенерированную, либо placeholder)
        if (sectionHtml) {
          sectionsHtml.push(sectionHtml);
        } else {
          // Если даже placeholder не получился, добавляем минимальный
          sectionsHtml.push(`<h2>${section.title}</h2><p><em>Не удалось сгенерировать содержимое этой секции.</em></p>`);
        }
      }

      // Обновляем список неудачных секций
      setFailedSections(failed);

      // Склеиваем секции в одну статью
      const articleHtml = `<h1>${outline.title}</h1>\n${sectionsHtml.join('\n')}`;

      // ШАГ 3: Генерация SEO метаданных
      setStep('seo');
      setProgress('Генерация SEO метаданных...');
      
      const seoController = new AbortController();
      const seoTimeout = setTimeout(() => seoController.abort(), 12000); // 12 секунд на клиенте (запас)
      
      let seoRes;
      try {
        seoRes = await fetch('/api/content/seo', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            articleHtml,
            topic: mainQuery,
            language,
          }),
          signal: seoController.signal,
        });
        clearTimeout(seoTimeout);
      } catch (fetchError: any) {
        clearTimeout(seoTimeout);
        if (fetchError.name === 'AbortError') {
          // SEO не критично, продолжаем без него
          console.warn('Таймаут генерации SEO, продолжаем без SEO метаданных');
          seoRes = null;
        } else {
          throw fetchError;
        }
      }

      let seo = {
        metaTitle: '',
        metaDescription: '',
        faqQuestions: [],
      };

      if (seoRes) {
        const seoText = await seoRes.text();
        let seoData;
        try {
          seoData = JSON.parse(seoText);
          if (seoData.success && seoData.seo) {
            seo = seoData.seo;
          }
        } catch (jsonError) {
          // SEO не критично, продолжаем без него
          console.warn('Не удалось распарсить SEO ответ:', seoText.substring(0, 200));
        }
      }

      setStep('done');
      
      // Формируем сообщение о результате
      let summaryMessage = `Статья "${outline.title}" состоит из ${totalSections} секций.`;
      if (failed.length > 0) {
        summaryMessage += ` ${failed.length} секций не удалось сгенерировать после нескольких попыток.`;
      }
      
      setProgress(failed.length > 0 ? `Статья готова! (${failed.length} секций пропущено)` : 'Статья готова!');
      setFinalResult({
        html: articleHtml,
        metaTitle: seo.metaTitle,
        metaDescription: seo.metaDescription,
        faqQuestions: seo.faqQuestions,
        summary: summaryMessage,
      });
      setCurrentSection(0);
      setTotalSections(0);
    } catch (err: any) {
      let errorMessage = 'Ошибка генерации контента';
      
      if (err.name === 'AbortError' || err.message?.includes('aborted') || err.message?.includes('abort')) {
        errorMessage = 'Запрос был прерван. Возможно, превышено время ожидания. Попробуйте еще раз или уменьшите размер статьи.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      console.error('Ошибка генерации контента:', err);
      setError(errorMessage);
      setStep('idle');
      setCurrentSection(0);
      setTotalSections(0);
      setFailedSections([]);
    } finally {
      setGenerating(false);
      // Не очищаем прогресс если была ошибка, чтобы пользователь видел что произошло
      if (!error) {
        setTimeout(() => setProgress(''), 2000);
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

            {progress && (
              <div className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-4 py-3 rounded">
                {progress}
                {step === 'outline' && ' (Шаг 1/3)'}
                {step === 'sections' && totalSections > 0 && ` (Шаг 2/3: ${currentSection}/${totalSections})`}
                {step === 'seo' && ' (Шаг 3/3)'}
                {step === 'done' && ' ✓'}
              </div>
            )}

            {outline && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <h3 className="font-semibold text-green-900 dark:text-green-200 mb-2">
                  Структура статьи: {outline.title}
                </h3>
                <ol className="list-decimal list-inside space-y-2 text-sm text-green-800 dark:text-green-300">
                  {outline.sections.map((section, index) => (
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
              className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? 'Генерация...' : 'Generate article'}
            </button>
          </form>
        </div>

        {/* Финальный результат */}
        {finalResult && (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
              Результат
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
                  <p className="mt-2 text-sm text-yellow-800 dark:text-yellow-300">
                    Эти секции были пропущены, но процесс генерации статьи продолжен. Вы можете попробовать сгенерировать статью еще раз или отредактировать эти секции вручную.
                  </p>
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
