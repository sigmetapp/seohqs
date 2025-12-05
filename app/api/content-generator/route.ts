import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-utils';
import { getSetting } from '@/lib/db-settings';
import OpenAI from 'openai';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface ContentGenerationRequest {
  mainQuery: string;
  language: string;
  targetAudience: string;
  contentGoal: string;
  desiredLength: string;
  toneOfVoice: string;
  additionalConstraints?: string;
}

interface StepResult {
  step: string;
  status: 'pending' | 'in_progress' | 'done' | 'error';
  result?: string;
  error?: string;
}

async function getOpenAIClient(): Promise<OpenAI> {
  const apiKeySetting = await getSetting('openai_api_key');
  const apiKey = apiKeySetting?.value || process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('OpenAI API Key не настроен. Обратитесь к администратору.');
  }

  return new OpenAI({ apiKey });
}

const SYSTEM_PROMPT = `Ты Multi-Stage Content Generator - ассистент для создания высококачественного SEO-контента.

ТВОЯ ЗАДАЧА: Выполнить весь пайплайн генерации контента в ОДНОМ ответе, последовательно проходя через 6 внутренних стадий:

СТАДИЯ 1 - DRAFT GENERATION:
- Создай развернутый черновик на основе входных параметров
- Полностью раскрой тему, дай логичную структуру
- Пиши как опытный эксперт в данной области

СТАДИЯ 2 - SEO STRUCTURING:
- Проанализируй созданный draft
- Улучшь структуру под SEO: добавь H2/H3 заголовки, логичные блоки, покрытие подзапросов
- Добавь недостающие разделы, учти поисковый интент
- НЕ превращай в "ключепих" - сохраняй естественность

СТАДИЯ 3 - HUMANIZATION:
- Перепиши текст так, чтобы он выглядел как работа живого эксперта
- Вариативная длина предложений, естественные связки, микросюжеты
- Убери все AI-штампы и клише
- Учитывай дополнительные ограничения из запроса

СТАДИЯ 4 - UNIQUENESS:
- Измени формулировки, порядок объяснений, переходы
- Добейся стилистической уникальности
- Снизь вероятность детектирования как AI-контент
- Сохрани смысл и SEO-пользу

СТАДИЯ 5 - QUALITY CHECK:
- Проверь текст на повторы мыслей, логические разрывы, ненужную воду, противоречия
- Убери повторы, сократи лишнее
- Выровняй тон и структуру

СТАДИЯ 6 - HTML PACKAGING:
- Оформи финальный текст в HTML-формате (h1, h2, h3, p, списки, таблицы)
- Сгенерируй Meta title (55-60 символов)
- Сгенерируй Meta description (155-160 символов)
- Создай FAQ-вопросы (4-8 штук)
- Подготовь краткий summary для редактора

ВАЖНО:
- Выполни ВСЕ 6 стадий последовательно внутри одного ответа
- Не делай отдельные запросы - весь процесс в одном ответе
- Если запрошенный размер превышает 3500 слов, ограничь до 3500 слов (максимум 40000 символов в HTML)
- Разбивай длинный контент на логические блоки с четкой структурой

Верни ТОЛЬКО валидный JSON без дополнительных комментариев:
{
  "article_html": "HTML контент с тегами h1, h2, h3, p (максимум 40000 символов)",
  "seo": {
    "metaTitle": "Meta title до 60 символов",
    "metaDescription": "Meta description до 160 символов",
    "faqQuestions": ["Вопрос 1", "Вопрос 2", "Вопрос 3", ...]
  },
  "editor_summary": "Краткий summary для редактора с ключевой идеей, целевой аудиторией и основным интентом"
}`;

/**
 * POST /api/content-generator
 * Генерирует контент через многоступенчатый pipeline
 */
export async function POST(request: Request) {
  const requestStartTime = Date.now();
  const debugLog: string[] = [];
  
  const log = (message: string) => {
    const timestamp = Date.now() - requestStartTime;
    const logMessage = `[${timestamp}ms] ${message}`;
    debugLog.push(logMessage);
    console.log(logMessage);
  };

  try {
    log('=== Content Generator API: Начало обработки запроса ===');
    
    const authStartTime = Date.now();
    const user = await getCurrentUser();
    log(`Авторизация: ${Date.now() - authStartTime}ms, пользователь: ${user ? user.email : 'не авторизован'}`);
    
    if (!user) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Пользователь не авторизован',
          debug: { logs: debugLog, totalTime: Date.now() - requestStartTime }
        },
        { status: 401 }
      );
    }

    let body: ContentGenerationRequest;
    try {
      const parseBodyStartTime = Date.now();
      body = await request.json();
      log(`Парсинг тела запроса: ${Date.now() - parseBodyStartTime}ms`);
    } catch (error: any) {
      log(`Ошибка парсинга тела запроса: ${error.message}`);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Неверный формат запроса',
          debug: { logs: debugLog, error: error.message, totalTime: Date.now() - requestStartTime }
        },
        { status: 400 }
      );
    }
    
    const {
      mainQuery,
      language,
      targetAudience,
      contentGoal,
      desiredLength,
      toneOfVoice,
      additionalConstraints,
    } = body;

    log(`Параметры запроса: mainQuery="${mainQuery?.substring(0, 50)}...", language="${language}", desiredLength="${desiredLength}", contentGoal="${contentGoal}"`);

    if (!mainQuery) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Основной запрос обязателен',
          debug: { logs: debugLog, totalTime: Date.now() - requestStartTime }
        },
        { status: 400 }
      );
    }

    const clientStartTime = Date.now();
    const openai = await getOpenAIClient();
    log(`Инициализация OpenAI клиента: ${Date.now() - clientStartTime}ms`);
    
    const startTime = Date.now();

    // Используем Chat Completions API - один запрос для всего пайплайна
    const model = 'gpt-4o';
    const desiredLengthNum = parseInt(desiredLength) || 2000;
    
    // Ограничиваем размер контента: максимум 40000 символов (примерно 3000-3500 слов)
    const maxWords = Math.min(desiredLengthNum, 3500);
    
    // Вычисляем max_tokens: для поддержки 10-30k символов нужно примерно 2500-7500 токенов
    // Учитываем что HTML содержит теги, поэтому умножаем на коэффициент
    // Для 3500 слов (примерно 42000 символов с HTML тегами) нужно около 10000-12000 токенов
    const maxTokens = Math.min(12000, Math.max(4000, Math.floor(maxWords * 2.5)));

    log(`Параметры генерации: maxWords=${maxWords}, maxTokens=${maxTokens}, model=${model}`);

    // Формируем промпт для генерации контента
    // Ассистент выполнит все 6 стадий внутри одного запроса
    const userPrompt = `Создай контент по следующему запросу:

Основной запрос/тема: ${mainQuery}
Язык: ${language}
Целевая аудитория: ${targetAudience}
Цель контента: ${contentGoal}
Желаемый размер: ${maxWords} слов (максимум 40000 символов в HTML)
Тон: ${toneOfVoice}
${additionalConstraints ? `Дополнительные ограничения: ${additionalConstraints}` : ''}

Выполни весь Multi-Stage пайплайн (Draft → SEO Structuring → Humanization → Uniqueness → Quality Check → HTML Packaging) внутри одного ответа и верни результат в формате JSON.`;
    
    const systemPromptLength = SYSTEM_PROMPT.length;
    const userPromptLength = userPrompt.length;
    const totalPromptLength = systemPromptLength + userPromptLength;
    log(`Размеры промптов: system=${systemPromptLength} символов, user=${userPromptLength} символов, total=${totalPromptLength} символов (~${Math.ceil(totalPromptLength / 4)} токенов)`);
    
    // Создаем AbortController для контроля таймаута (55 сек для безопасности, меньше лимита Vercel 60 сек)
    const controller = new AbortController();
    const timeoutMs = 55000;
    const timeoutId = setTimeout(() => {
      log(`ТАЙМАУТ: Превышено время ожидания ${timeoutMs}ms, прерываем запрос`);
      controller.abort();
    }, timeoutMs);
    
    log(`Таймаут установлен: ${timeoutMs}ms (лимит Vercel: 60s)`);
    
    try {
      const openaiRequestStartTime = Date.now();
      log(`Отправка запроса к OpenAI API: model=${model}, max_tokens=${maxTokens}`);
      
      const completion = await openai.chat.completions.create(
        {
          model,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.7,
          max_tokens: maxTokens,
          response_format: { type: 'json_object' }, // Принудительно JSON формат
          // Не используем дополнительные инструменты - весь пайплайн в одном запросе
          stream: false,
        },
        {
          signal: controller.signal,
        }
      );
      
      const openaiRequestDuration = Date.now() - openaiRequestStartTime;
      log(`Запрос к OpenAI API завершен: ${openaiRequestDuration}ms`);
      
      clearTimeout(timeoutId);

      const usage = completion.usage;
      log(`Использование токенов: prompt_tokens=${usage?.prompt_tokens || 'N/A'}, completion_tokens=${usage?.completion_tokens || 'N/A'}, total_tokens=${usage?.total_tokens || 'N/A'}`);

      const assistantMessage = completion.choices[0]?.message?.content;
      if (!assistantMessage) {
        log('ОШИБКА: Ответ от OpenAI не содержит контента');
        throw new Error('Ответ от OpenAI не получен');
      }
      
      const responseLength = assistantMessage.length;
      log(`Получен ответ от OpenAI: ${responseLength} символов (~${Math.ceil(responseLength / 4)} токенов)`);

      // Парсим JSON ответ (response_format гарантирует JSON формат)
      const parseStartTime = Date.now();
      let result: any;
      let parsingDuration = 0;
      try {
        log('Начало парсинга JSON ответа');
        result = JSON.parse(assistantMessage.trim());
        parsingDuration = Date.now() - parseStartTime;
        log(`Парсинг JSON завершен: ${parsingDuration}ms`);
        
        // Нормализуем формат ответа: поддерживаем как новый формат (article_html, seo, editor_summary),
        // так и старый формат (html, metaTitle, metaDescription, faqQuestions, summary) для обратной совместимости
        const normalizeStartTime = Date.now();
        log('Начало нормализации формата ответа');
        
        if (result.article_html) {
          // Новый формат
          log('Обнаружен новый формат ответа (article_html, seo, editor_summary)');
          const html = result.article_html;
          if (html.length > 40000) {
            log(`ПРЕДУПРЕЖДЕНИЕ: HTML контент превышает лимит: ${html.length} символов, обрезаем до 40000`);
            result.article_html = html.substring(0, 40000) + '...';
          }
          
          // Преобразуем в формат для фронтенда
          result = {
            html: result.article_html,
            metaTitle: result.seo?.metaTitle || '',
            metaDescription: result.seo?.metaDescription || '',
            faqQuestions: result.seo?.faqQuestions || [],
            summary: result.editor_summary || '',
          };
        } else if (result.html || result.content) {
          // Старый формат - нормализуем
          log('Обнаружен старый формат ответа (html, metaTitle, etc.)');
          const html = result.html || result.content;
          if (html.length > 40000) {
            log(`ПРЕДУПРЕЖДЕНИЕ: HTML контент превышает лимит: ${html.length} символов, обрезаем до 40000`);
            result.html = html.substring(0, 40000) + '...';
          }
          
          result = {
            html: result.html || result.content,
            metaTitle: result.metaTitle || '',
            metaDescription: result.metaDescription || '',
            faqQuestions: result.faqQuestions || [],
            summary: result.summary || '',
          };
        } else {
          // Если нет HTML, используем весь ответ как HTML
          log('ПРЕДУПРЕЖДЕНИЕ: HTML не найден в ответе, используем весь ответ как HTML');
          let fallbackHtml = assistantMessage.trim();
          if (fallbackHtml.length > 40000) {
            log(`HTML контент превышает лимит: ${fallbackHtml.length} символов, обрезаем до 40000`);
            fallbackHtml = fallbackHtml.substring(0, 40000) + '...';
          }
          result = {
            html: fallbackHtml,
            metaTitle: result.metaTitle || '',
            metaDescription: result.metaDescription || '',
            faqQuestions: result.faqQuestions || [],
            summary: result.summary || '',
          };
        }
        
        log(`Нормализация формата завершена: ${Date.now() - normalizeStartTime}ms, размер HTML: ${result.html?.length || 0} символов`);
      } catch (error: any) {
        log(`ОШИБКА парсинга JSON: ${error.message}, stack: ${error.stack}`);
        // Fallback: возвращаем весь текст как HTML
        let fallbackHtml = assistantMessage.trim();
        if (fallbackHtml.length > 40000) {
          fallbackHtml = fallbackHtml.substring(0, 40000) + '...';
        }
        result = {
          html: fallbackHtml,
          metaTitle: '',
          metaDescription: '',
          faqQuestions: [],
          summary: '',
        };
      }

      const totalDuration = Date.now() - startTime;
      const requestTotalDuration = Date.now() - requestStartTime;
      log(`=== Генерация контента завершена успешно ===`);
      log(`Время выполнения OpenAI запроса: ${totalDuration}ms`);
      log(`Общее время обработки запроса: ${requestTotalDuration}ms`);
      log(`Параметры: maxTokens=${maxTokens}, model=${model}, maxWords=${maxWords}`);

      return NextResponse.json({
        success: true,
        result,
        debug: {
          logs: debugLog,
          timing: {
            total: requestTotalDuration,
            openaiRequest: totalDuration,
            parsing: parsingDuration,
          },
          tokens: {
            maxTokens,
            used: usage?.total_tokens,
            prompt: usage?.prompt_tokens,
            completion: usage?.completion_tokens,
          },
          responseSize: {
            characters: assistantMessage.length,
            htmlLength: result.html?.length || 0,
          },
        },
      });
    } catch (abortError: any) {
      clearTimeout(timeoutId);
      const errorTime = Date.now() - requestStartTime;
      
      if (abortError.name === 'AbortError' || abortError.message?.includes('aborted')) {
        log(`ОШИБКА ТАЙМАУТА: Запрос прерван через ${errorTime}ms`);
        log(`Детали ошибки: name=${abortError.name}, message=${abortError.message}`);
        log(`Stack: ${abortError.stack}`);
        
        return NextResponse.json(
          {
            success: false,
            error: `Превышено время ожидания ответа от OpenAI (${errorTime}ms из ${timeoutMs}ms). Попробуйте уменьшить желаемый размер статьи (текущий: ${desiredLength} слов, ограничен до ${maxWords}) или упростить запрос.`,
            debug: {
              logs: debugLog,
              timing: {
                total: errorTime,
                timeoutLimit: timeoutMs,
              },
              error: {
                name: abortError.name,
                message: abortError.message,
                stack: abortError.stack,
              },
              requestParams: {
                maxWords,
                maxTokens,
                model,
                desiredLength,
              },
            },
          },
          { status: 500 }
        );
      }
      
      log(`ОШИБКА OpenAI API: ${abortError.message}, stack: ${abortError.stack}`);
      throw abortError;
    }
  } catch (error: any) {
    const errorTime = Date.now() - requestStartTime;
    log(`ОШИБКА ОБРАБОТКИ: ${error.message || 'Неизвестная ошибка'}`);
    log(`Stack: ${error.stack}`);
    log(`Время до ошибки: ${errorTime}ms`);
    
    console.error('Ошибка генерации контента:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Ошибка генерации контента',
        debug: {
          logs: debugLog,
          timing: {
            total: errorTime,
          },
          error: {
            name: error.name,
            message: error.message,
            stack: error.stack,
          },
        },
      },
      { status: 500 }
    );
  }
}
