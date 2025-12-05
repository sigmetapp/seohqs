'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import SectionStatusCard, { SectionStatusData, SectionStatus } from '@/app/components/content-generator/SectionStatusCard';

interface FinalResult {
  html?: string;
  meta_title?: string;
  meta_description?: string;
  h1?: string;
  faq?: string[];
  semantic_topics?: string[];
  summary?: string;
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
  const [step, setStep] = useState<'idle' | 'outline' | 'sections' | 'seo' | 'done'>('idle');
  const [currentSection, setCurrentSection] = useState<number>(0);
  const [totalSections, setTotalSections] = useState<number>(0);
  const [failedSections, setFailedSections] = useState<Array<{ index: number; title: string; error: string }>>([]);
  const [lowComplexitySections, setLowComplexitySections] = useState<Set<number>>(new Set());
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [sectionStatuses, setSectionStatuses] = useState<SectionStatusData[]>([]);
  const [currentTargetSectionWords, setCurrentTargetSectionWords] = useState<number | undefined>(undefined);

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
    
    if (!topic.trim()) {
      setError('Тема обязательна');
      return;
    }

    setGenerating(true);
    setError(null);
    setFinalResult(null);
    setOutlineSections([]);
    setFailedSections([]);
    setLowComplexitySections(new Set());
    setSectionStatuses([]);
    setStep('outline');
    setProgress('Generating outline…');
    setStartTime(Date.now());
    setElapsedTime(0);

    try {
      // ШАГ 1: Outline
      setProgress('Generating outline…');
      
      const outlineController = new AbortController();
      const outlineTimeout = setTimeout(() => outlineController.abort(), 35000); // 35 секунд на клиенте (запас для серверных 30 секунд)
      
      let outlineRes;
      try {
        outlineRes = await fetch('/api/content/outline', {
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
          signal: outlineController.signal,
        });
        clearTimeout(outlineTimeout);
      } catch (fetchError: any) {
        clearTimeout(outlineTimeout);
        if (fetchError.name === 'AbortError') {
          throw new Error('Превышено время ожидания генерации структуры (35 секунд). Попробуйте еще раз.');
        }
        throw fetchError;
      }

      const outlineText = await outlineRes.text();
      
      if (!outlineText || outlineText.length > 10000) {
        throw new Error('Сервер вернул неожиданный ответ при генерации структуры');
      }
      
      let outlineData;
      try {
        outlineData = JSON.parse(outlineText);
      } catch (jsonError) {
        const preview = outlineText.length > 200 ? outlineText.substring(0, 200) + '...' : outlineText;
        throw new Error(`Ошибка: сервер вернул не-JSON ответ при генерации структуры. Ответ: ${preview}`);
      }

      if (!outlineRes.ok || !outlineData.success) {
        throw new Error(outlineData.error || 'Ошибка генерации структуры');
      }

      const sections = outlineData.sections || [];
      setOutlineSections(sections);

      // Вычисляем целевую длину секции на основе желаемой длины статьи
      const desiredLengthNum = parseInt(String(desiredLength || '2000'), 10);
      const sectionsCount = sections.length;
      const targetSectionWords = sectionsCount > 0 
        ? Math.round(desiredLengthNum / sectionsCount)
        : undefined;

      // Сохраняем targetSectionWords в состояние для использования при перегенерации
      setCurrentTargetSectionWords(targetSectionWords);

      console.log(`[FRONTEND] Желаемая длина: ${desiredLengthNum} слов, секций: ${sectionsCount}, целевая длина секции: ${targetSectionWords} слов`);

      // ШАГ 2: Sections - последовательная генерация
      const sectionsHtml: string[] = [];
      const totalSections = sections.length;
      const failed: Array<{ index: number; title: string; error: string }> = [];
      const lowComplexity: Set<number> = new Set();
      const statuses: SectionStatusData[] = [];
      setTotalSections(totalSections);
      setStep('sections');
      setFailedSections([]);
      setLowComplexitySections(new Set());

      for (let i = 0; i < totalSections; i++) {
        const section = sections[i];
        const sectionStartTime = Date.now();
        setCurrentSection(i + 1);
        setProgress(`Генерация секции ${i + 1} из ${totalSections}: ${section.title}...`);

        // Инициализируем статус секции
        let sectionStatus: SectionStatus = 'skipped';
        let sectionHtml: string | null = null;
        let rawHtmlSection: string | null = null;
        let cleanHtmlSection: string | null = null;
        let cleaned = false;
        let cleanupTime: number | undefined = undefined;
        let complexityLevel: 'medium' | 'low' | 'high' = 'medium';
        let retryCount = 0;
        let errorMessage: string | undefined = undefined;
        const technicalLogs: string[] = [];

        try {
          const sectionController = new AbortController();
          // Таймаут 60 секунд на клиенте (запас для серверных 55 секунд)
          const sectionTimeout = setTimeout(() => sectionController.abort(), 60000);
          
          let sectionRes;
          try {
            technicalLogs.push(`[${new Date().toISOString()}] Начало запроса к API для секции ${i + 1}`);
            sectionRes = await fetch('/api/content/section', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                sectionTitle: section.title,
                sectionDescription: section.description,
                targetSectionWords: targetSectionWords,
                complexityLevel: complexity,
                authorPersona,
                angle,
                contentGoal,
              }),
              signal: sectionController.signal,
            });
            clearTimeout(sectionTimeout);
            technicalLogs.push(`[${new Date().toISOString()}] Ответ получен, статус: ${sectionRes.status}`);
          } catch (fetchError: any) {
            clearTimeout(sectionTimeout);
            if (fetchError.name === 'AbortError') {
              const timeoutError = `Превышено время ожидания генерации секции ${i + 1}: "${section.title}"`;
              technicalLogs.push(`[${new Date().toISOString()}] Таймаут: ${timeoutError}`);
              throw new Error(timeoutError);
            }
            technicalLogs.push(`[${new Date().toISOString()}] Ошибка запроса: ${fetchError.message}`);
            throw fetchError;
          }

          const sectionText = await sectionRes.text();
          technicalLogs.push(`[${new Date().toISOString()}] Размер ответа: ${sectionText.length} символов`);
          
          // Проверяем, что ответ не пустой и не слишком большой перед парсингом
          if (!sectionText || sectionText.length > 50000) {
            const error = `Сервер вернул неожиданный ответ при генерации секции ${i + 1}`;
            technicalLogs.push(`[${new Date().toISOString()}] Ошибка: ${error}`);
            throw new Error(error);
          }
          
          let sectionData;
          try {
            sectionData = JSON.parse(sectionText);
            technicalLogs.push(`[${new Date().toISOString()}] JSON распарсен успешно, success: ${sectionData.success}`);
          } catch (jsonError) {
            const preview = sectionText.length > 200 ? sectionText.substring(0, 200) + '...' : sectionText;
            const error = `Ошибка: сервер вернул не-JSON ответ при генерации секции ${i + 1}. Ответ: ${preview}`;
            technicalLogs.push(`[${new Date().toISOString()}] Ошибка парсинга JSON: ${error}`);
            throw new Error(error);
          }

          if (!sectionRes.ok || !sectionData.success) {
            const error = sectionData.error || `Ошибка генерации секции ${i + 1}: ${section.title}`;
            technicalLogs.push(`[${new Date().toISOString()}] Ошибка от API: ${error}`);
            
            // Определяем тип ошибки
            if (error.includes('OpenAI') || error.includes('openai')) {
              sectionStatus = 'openai_error';
            } else {
              sectionStatus = 'backend_error';
            }
            errorMessage = error;
            throw new Error(error);
          }

          // Проверяем успешность и наличие HTML
          if (sectionData.success && sectionData.sectionHtml && typeof sectionData.sectionHtml === 'string') {
            rawHtmlSection = sectionData.sectionHtml.trim();
            technicalLogs.push(`[${new Date().toISOString()}] HTML получен, длина: ${rawHtmlSection.length} символов`);
            
            // Проверяем, что HTML не пустой
            if (rawHtmlSection.length === 0) {
              const error = `Ассистент вернул пустой HTML для секции ${i + 1}: ${section.title}`;
              technicalLogs.push(`[${new Date().toISOString()}] Ошибка: ${error}`);
              sectionStatus = 'backend_error';
              errorMessage = error;
              throw new Error(error);
            }
            
            // Определяем статус и complexityLevel
            complexityLevel = sectionData.complexityLevel || 'medium';
            if (complexityLevel === 'low') {
              sectionStatus = 'success_light';
              lowComplexity.add(i);
            } else {
              sectionStatus = 'success';
            }
            
            // ШАГ 2.5: Cleanup - очистка секции через Cleanup Assistant
            const cleanupStartTime = Date.now();
            
            try {
              setProgress(`Очистка секции ${i + 1} из ${totalSections}: ${section.title}...`);
              technicalLogs.push(`[${new Date().toISOString()}] Начало очистки секции через Cleanup Assistant`);
              
              const cleanupController = new AbortController();
              const cleanupTimeout = setTimeout(() => cleanupController.abort(), 30000); // 30 секунд на клиенте (запас для серверных 25 секунд)
              
              let cleanupRes;
              try {
                cleanupRes = await fetch('/api/content/cleanup', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    htmlSection: rawHtmlSection,
                    language,
                    authorPersona,
                    angle,
                    editIntensity: 'medium',
                  }),
                  signal: cleanupController.signal,
                });
                clearTimeout(cleanupTimeout);
                technicalLogs.push(`[${new Date().toISOString()}] Ответ от cleanup получен, статус: ${cleanupRes.status}`);
              } catch (fetchError: any) {
                clearTimeout(cleanupTimeout);
                if (fetchError.name === 'AbortError') {
                  technicalLogs.push(`[${new Date().toISOString()}] Таймаут cleanup: превышено время ожидания`);
                  throw new Error('Превышено время ожидания очистки секции');
                }
                throw fetchError;
              }

              const cleanupText = await cleanupRes.text();
              technicalLogs.push(`[${new Date().toISOString()}] Размер ответа cleanup: ${cleanupText.length} символов`);
              
              if (!cleanupText || cleanupText.length > 50000) {
                technicalLogs.push(`[${new Date().toISOString()}] Ошибка: неожиданный размер ответа cleanup`);
                throw new Error('Сервер вернул неожиданный ответ при очистке секции');
              }
              
              let cleanupData;
              try {
                cleanupData = JSON.parse(cleanupText);
                technicalLogs.push(`[${new Date().toISOString()}] JSON cleanup распарсен, success: ${cleanupData.success}`);
              } catch (jsonError) {
                const preview = cleanupText.length > 200 ? cleanupText.substring(0, 200) + '...' : cleanupText;
                technicalLogs.push(`[${new Date().toISOString()}] Ошибка парсинга JSON cleanup: ${preview}`);
                throw new Error(`Ошибка: сервер вернул не-JSON ответ при очистке секции. Ответ: ${preview}`);
              }

              if (cleanupRes.ok && cleanupData.success && cleanupData.cleanHtmlSection) {
                cleanHtmlSection = cleanupData.cleanHtmlSection.trim();
                cleaned = true;
                cleanupTime = Math.floor((Date.now() - cleanupStartTime) / 1000);
                technicalLogs.push(`[${new Date().toISOString()}] Секция успешно очищена за ${cleanupTime}с, длина: ${cleanHtmlSection.length} символов`);
                
                // Используем очищенный HTML
                sectionHtml = cleanHtmlSection;
                sectionsHtml.push(sectionHtml);
              } else {
                // Cleanup не удался, используем raw как fallback
                const cleanupError = cleanupData.error || 'Ошибка очистки секции';
                technicalLogs.push(`[${new Date().toISOString()}] Cleanup не удался: ${cleanupError}. Используем raw HTML как fallback`);
                sectionHtml = rawHtmlSection;
                sectionsHtml.push(sectionHtml);
              }
            } catch (cleanupError: any) {
              // При ошибке cleanup используем raw HTML как fallback
              const cleanupErrorMsg = cleanupError.message || 'Ошибка очистки секции';
              technicalLogs.push(`[${new Date().toISOString()}] Ошибка cleanup: ${cleanupErrorMsg}. Используем raw HTML как fallback`);
              sectionHtml = rawHtmlSection;
              sectionsHtml.push(sectionHtml);
            }
            
            technicalLogs.push(`[${new Date().toISOString()}] Секция успешно сгенерирована, статус: ${sectionStatus}, очищена: ${cleaned}`);
          } else {
            // Если success=true, но HTML отсутствует или невалиден
            const error = `Не получен валидный HTML для секции ${i + 1}: ${section.title}`;
            technicalLogs.push(`[${new Date().toISOString()}] Ошибка: ${error}`);
            sectionStatus = 'backend_error';
            errorMessage = error;
            throw new Error(error);
          }
        } catch (error: any) {
          const lastError = error.message || `Ошибка генерации секции ${i + 1}: ${section.title}`;
          console.error(`Не удалось сгенерировать секцию ${i + 1}:`, lastError);
          
          // Определяем статус ошибки
          if (sectionStatus === 'skipped') {
            if (lastError.includes('Превышено время') || lastError.includes('timeout') || lastError.includes('aborted')) {
              sectionStatus = 'timeout';
            } else if (lastError.includes('OpenAI') || lastError.includes('openai')) {
              sectionStatus = 'openai_error';
            } else {
              sectionStatus = 'backend_error';
            }
          }
          
          errorMessage = lastError;
          failed.push({
            index: i + 1,
            title: section.title,
            error: lastError,
          });
          technicalLogs.push(`[${new Date().toISOString()}] Финальная ошибка: ${lastError}`);
        } finally {
          const generationTime = Math.floor((Date.now() - sectionStartTime) / 1000);
          
          // Подсчет слов (приблизительно) - используем финальный HTML (clean или raw)
          const wordCount = sectionHtml 
            ? sectionHtml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().split(' ').filter(w => w.length > 0).length
            : undefined;

          statuses.push({
            index: i + 1,
            title: section.title,
            status: sectionStatus,
            sectionHtml: sectionHtml || undefined, // финальный HTML (clean если есть, иначе raw)
            rawHtmlSection: rawHtmlSection || undefined,
            cleanHtmlSection: cleanHtmlSection || undefined,
            cleaned: cleaned,
            cleanupTime: cleanupTime,
            generationTime,
            wordCount,
            complexityLevel,
            retryCount,
            error: errorMessage,
            technicalLogs: technicalLogs.length > 0 ? technicalLogs : undefined,
          });

          // Обновляем статусы в реальном времени
          setSectionStatuses([...statuses]);
        }
      }

      // Сохраняем информацию о секциях с low complexity
      setLowComplexitySections(lowComplexity);

      // Обновляем список неудачных секций
      setFailedSections(failed);

      // Финальное обновление статусов
      setSectionStatuses(statuses);

      // ШАГ 3: Assembling - склеиваем секции на фронте с отметками для low complexity
      const assembledHtmlParts: string[] = [];
      for (let i = 0; i < sectionsHtml.length; i++) {
        // Всегда проверяем, что sectionHtml существует и является строкой
        const sectionHtml = sectionsHtml[i];
        if (!sectionHtml || typeof sectionHtml !== 'string') {
          // Пропускаем секции с невалидным HTML
          console.warn(`Пропущена секция ${i + 1}: невалидный HTML`);
          continue;
        }
        
        let finalSectionHtml = sectionHtml;
        // Добавляем визуальную отметку для секций в режиме "low"
        if (lowComplexity.has(i)) {
          const lowBadge = '<div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 8px 12px; margin-bottom: 16px; border-radius: 4px; font-size: 14px; color: #92400e;"><strong>⚠️ Упрощённый режим:</strong> Эта секция была сгенерирована в упрощённом режиме из-за таймаута. Вы можете доработать её вручную или перегенерировать позже.</div>';
          finalSectionHtml = lowBadge + finalSectionHtml;
        }
        assembledHtmlParts.push(finalSectionHtml);
      }
      const assembledHtml = assembledHtmlParts.join('\n');

      // ШАГ 4: SEO Packaging
      setStep('seo');
      setProgress('Creating SEO metadata…');
      
      const seoController = new AbortController();
      const seoTimeout = setTimeout(() => seoController.abort(), 35000); // 35 секунд на клиенте (запас для серверных 30 секунд)
      
      let seoRes;
      try {
        seoRes = await fetch('/api/content/seo', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fullArticleHtml: assembledHtml,
            topic,
            language,
            authorPersona,
            angle,
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

      let seoData: any = {
        meta_title: '',
        meta_description: '',
        h1: '',
        faq: [],
        semantic_topics: [],
      };
      let seoError: string | null = null;

      if (seoRes) {
        const seoText = await seoRes.text();
        try {
          const parsed = JSON.parse(seoText);
          if (parsed.success) {
            seoData = {
              meta_title: parsed.meta_title || '',
              meta_description: parsed.meta_description || '',
              h1: parsed.h1 || '',
              faq: parsed.faq || [],
              semantic_topics: parsed.semantic_topics || [],
            };
          } else {
            // SEO ассистент вернул ошибку
            seoError = parsed.error || 'Ошибка генерации SEO метаданных';
            console.error('[SEO] Ошибка от API:', seoError);
          }
        } catch (jsonError) {
          seoError = 'Не удалось обработать ответ SEO ассистента';
          console.warn('[SEO] Не удалось распарсить SEO ответ:', seoText.substring(0, 200));
        }
      } else {
        seoError = 'Не удалось получить ответ от SEO ассистента (таймаут или ошибка сети)';
      }

      // ШАГ 5: Показ результата
      setStep('done');
      
      let summaryMessage = `Статья состоит из ${totalSections} секций.`;
      if (lowComplexity.size > 0) {
        summaryMessage += ` ${lowComplexity.size} секций сгенерировано в упрощённом режиме (из-за таймаута).`;
      }
      if (failed.length > 0) {
        summaryMessage += ` ${failed.length} секций не удалось сгенерировать.`;
      }
      
      let finalSummaryMessage = summaryMessage;
      if (seoError) {
        finalSummaryMessage += ` ⚠️ SEO метаданные не были сгенерированы: ${seoError}`;
      }

      setProgress(failed.length > 0 ? `Статья готова! (${failed.length} секций пропущено)` : 'Статья готова!');
      setFinalResult({
        html: assembledHtml,
        meta_title: seoData.meta_title,
        meta_description: seoData.meta_description,
        h1: seoData.h1,
        faq: seoData.faq,
        semantic_topics: seoData.semantic_topics,
        summary: finalSummaryMessage,
      });

      // Показываем ошибку SEO, если она есть
      if (seoError) {
        setError(`⚠️ SEO метаданные не были сгенерированы: ${seoError}. Статья сгенерирована, но поля Meta Title и Meta Description пустые.`);
      }
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
      setLowComplexitySections(new Set());
      setSectionStatuses([]);
    } finally {
      setGenerating(false);
      setStartTime(null);
      // Не очищаем прогресс если была ошибка, чтобы пользователь видел что произошло
      if (!error) {
        setTimeout(() => {
          setProgress('');
          setElapsedTime(0);
        }, 2000);
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
    const section = sectionStatuses.find(s => s.index === index);
    if (!section) return;

    const sectionStartTime = Date.now();
    const technicalLogs: string[] = [];
    let sectionStatus: SectionStatus = 'skipped';
    let sectionHtml: string | null = null;
    let rawHtmlSection: string | null = null;
    let cleanHtmlSection: string | null = null;
    let cleaned = false;
    let cleanupTime: number | undefined = undefined;
    let complexityLevel: 'medium' | 'low' | 'high' = complexity;
    let retryCount = (section.retryCount || 0) + 1;
    let errorMessage: string | undefined = undefined;

    // Обновляем статус на "в процессе"
    setSectionStatuses(prev => prev.map(s => 
      s.index === index 
        ? { ...s, status: 'skipped' as SectionStatus } // Временно показываем как skipped
        : s
    ));

    try {
      technicalLogs.push(`[${new Date().toISOString()}] Начало перегенерации секции ${index} с уровнем ${complexity}`);
      
      const sectionController = new AbortController();
      const sectionTimeout = setTimeout(() => sectionController.abort(), 60000);
      
      let sectionRes;
      try {
        sectionRes = await fetch('/api/content/section', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sectionTitle: section.title,
            sectionDescription: outlineSections.find(s => s.title === section.title)?.description || '',
            targetSectionWords: currentTargetSectionWords,
            complexityLevel: complexity,
            authorPersona,
            angle,
            contentGoal,
          }),
          signal: sectionController.signal,
        });
        clearTimeout(sectionTimeout);
        technicalLogs.push(`[${new Date().toISOString()}] Ответ получен, статус: ${sectionRes.status}`);
      } catch (fetchError: any) {
        clearTimeout(sectionTimeout);
        if (fetchError.name === 'AbortError') {
          const timeoutError = `Превышено время ожидания перегенерации секции ${index}`;
          technicalLogs.push(`[${new Date().toISOString()}] Таймаут: ${timeoutError}`);
          throw new Error(timeoutError);
        }
        throw fetchError;
      }

      const sectionText = await sectionRes.text();
      technicalLogs.push(`[${new Date().toISOString()}] Размер ответа: ${sectionText.length} символов`);
      
      if (!sectionText || sectionText.length > 50000) {
        throw new Error(`Сервер вернул неожиданный ответ при перегенерации секции ${index}`);
      }
      
      let sectionData;
      try {
        sectionData = JSON.parse(sectionText);
        technicalLogs.push(`[${new Date().toISOString()}] JSON распарсен успешно, success: ${sectionData.success}`);
      } catch (jsonError) {
        const preview = sectionText.length > 200 ? sectionText.substring(0, 200) + '...' : sectionText;
        throw new Error(`Ошибка: сервер вернул не-JSON ответ. Ответ: ${preview}`);
      }

      if (!sectionRes.ok || !sectionData.success) {
        const error = sectionData.error || `Ошибка перегенерации секции ${index}`;
        technicalLogs.push(`[${new Date().toISOString()}] Ошибка от API: ${error}`);
        
        if (error.includes('OpenAI') || error.includes('openai')) {
          sectionStatus = 'openai_error';
        } else {
          sectionStatus = 'backend_error';
        }
        errorMessage = error;
        throw new Error(error);
      }

      if (sectionData.success && sectionData.sectionHtml && typeof sectionData.sectionHtml === 'string') {
        rawHtmlSection = sectionData.sectionHtml.trim();
        technicalLogs.push(`[${new Date().toISOString()}] HTML получен, длина: ${rawHtmlSection.length} символов`);
        
        if (rawHtmlSection.length === 0) {
          throw new Error(`Ассистент вернул пустой HTML для секции ${index}`);
        }
        
        complexityLevel = sectionData.complexityLevel || complexity;
        if (complexityLevel === 'low') {
          sectionStatus = 'success_light';
        } else {
          sectionStatus = 'success';
        }
        
        // Cleanup после перегенерации
        const cleanupStartTime = Date.now();
        try {
          technicalLogs.push(`[${new Date().toISOString()}] Начало очистки перегенерированной секции через Cleanup Assistant`);
          
          const cleanupController = new AbortController();
          const cleanupTimeout = setTimeout(() => cleanupController.abort(), 30000);
          
          let cleanupRes;
          try {
            cleanupRes = await fetch('/api/content/cleanup', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                htmlSection: rawHtmlSection,
                language,
                authorPersona,
                angle,
                editIntensity: 'medium',
              }),
              signal: cleanupController.signal,
            });
            clearTimeout(cleanupTimeout);
          } catch (fetchError: any) {
            clearTimeout(cleanupTimeout);
            if (fetchError.name === 'AbortError') {
              technicalLogs.push(`[${new Date().toISOString()}] Таймаут cleanup при перегенерации`);
              throw new Error('Превышено время ожидания очистки секции');
            }
            throw fetchError;
          }

          const cleanupText = await cleanupRes.text();
          if (cleanupText && cleanupText.length <= 50000) {
            let cleanupData;
            try {
              cleanupData = JSON.parse(cleanupText);
              if (cleanupRes.ok && cleanupData.success && cleanupData.cleanHtmlSection) {
                cleanHtmlSection = cleanupData.cleanHtmlSection.trim();
                cleaned = true;
                cleanupTime = Math.floor((Date.now() - cleanupStartTime) / 1000);
                technicalLogs.push(`[${new Date().toISOString()}] Секция успешно очищена за ${cleanupTime}с`);
                sectionHtml = cleanHtmlSection;
              } else {
                technicalLogs.push(`[${new Date().toISOString()}] Cleanup не удался, используем raw HTML`);
                sectionHtml = rawHtmlSection;
              }
            } catch {
              sectionHtml = rawHtmlSection;
            }
          } else {
            sectionHtml = rawHtmlSection;
          }
        } catch (cleanupError: any) {
          technicalLogs.push(`[${new Date().toISOString()}] Ошибка cleanup при перегенерации: ${cleanupError.message}. Используем raw HTML`);
          sectionHtml = rawHtmlSection;
        }
        
        technicalLogs.push(`[${new Date().toISOString()}] Секция успешно перегенерирована, статус: ${sectionStatus}, очищена: ${cleaned}`);
      } else {
        const error = `Не получен валидный HTML для секции ${index}`;
        sectionStatus = 'backend_error';
        errorMessage = error;
        throw new Error(error);
      }
    } catch (error: any) {
      const lastError = error.message || `Ошибка перегенерации секции ${index}`;
      console.error(`Не удалось перегенерировать секцию ${index}:`, lastError);
      
      if (lastError.includes('Превышено время') || lastError.includes('timeout') || lastError.includes('aborted')) {
        sectionStatus = 'timeout';
      } else if (lastError.includes('OpenAI') || lastError.includes('openai')) {
        sectionStatus = 'openai_error';
      } else {
        sectionStatus = 'backend_error';
      }
      
      errorMessage = lastError;
      technicalLogs.push(`[${new Date().toISOString()}] Финальная ошибка: ${lastError}`);
    }

    const generationTime = Math.floor((Date.now() - sectionStartTime) / 1000);
    const wordCount = sectionHtml 
      ? sectionHtml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().split(' ').filter(w => w.length > 0).length
      : undefined;

    // Обновляем статус секции и пересобираем финальный результат если нужно
    setSectionStatuses(prev => {
      const updated = prev.map(s => 
        s.index === index 
          ? {
              ...s,
              status: sectionStatus,
              sectionHtml: sectionHtml || undefined,
              rawHtmlSection: rawHtmlSection || undefined,
              cleanHtmlSection: cleanHtmlSection || undefined,
              cleaned: cleaned,
              cleanupTime: cleanupTime,
              generationTime,
              wordCount,
              complexityLevel,
              retryCount,
              error: errorMessage,
              technicalLogs: technicalLogs.length > 0 ? technicalLogs : undefined,
            }
          : s
      );
      
      // Если секция успешно перегенерирована, пересобираем финальный HTML
      if (sectionHtml && finalResult) {
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
                    {step === 'outline' && ' (Шаг 1/3)'}
                    {step === 'sections' && totalSections > 0 && ` (Шаг 2/3: ${currentSection}/${totalSections})`}
                    {step === 'seo' && ' (Шаг 3/3)'}
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
                {!finalResult.meta_title && (
                  <div className="mb-2 text-sm text-yellow-600 dark:text-yellow-400">
                    ⚠️ Meta Title не был сгенерирован. SEO ассистент вернул ошибку или не был вызван.
                  </div>
                )}
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={finalResult.meta_title || ''}
                    readOnly
                    placeholder={finalResult.meta_title ? '' : 'Meta Title не был сгенерирован'}
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
                {!finalResult.meta_description && (
                  <div className="mb-2 text-sm text-yellow-600 dark:text-yellow-400">
                    ⚠️ Meta Description не был сгенерирован. SEO ассистент вернул ошибку или не был вызван.
                  </div>
                )}
                <div className="flex space-x-2">
                  <textarea
                    value={finalResult.meta_description || ''}
                    readOnly
                    rows={3}
                    placeholder={finalResult.meta_description ? '' : 'Meta Description не был сгенерирован'}
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

              {finalResult.faq && finalResult.faq.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    FAQ
                  </label>
                  <ul className="list-disc list-inside space-y-1 text-gray-900 dark:text-white">
                    {finalResult.faq.map((item: any, i: number) => {
                      // Handle both string and object formats {q: "...", a: "..."}
                      const question = typeof item === 'string' ? item : (item?.q || item?.question || '');
                      const answer = typeof item === 'object' ? (item?.a || item?.answer || '') : '';
                      return (
                        <li key={i}>
                          {question}
                          {answer && <span className="text-gray-600 dark:text-gray-400"> - {answer}</span>}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {finalResult.semantic_topics && finalResult.semantic_topics.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Semantic Topics
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {finalResult.semantic_topics.map((item: any, i: number) => {
                      // Handle both string and object formats
                      const topic = typeof item === 'string' ? item : (item?.topic || item?.name || String(item));
                      return (
                        <span
                          key={i}
                          className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm"
                        >
                          {topic}
                        </span>
                      );
                    })}
                  </div>
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
