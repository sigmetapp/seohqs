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
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Пользователь не авторизован' },
        { status: 401 }
      );
    }

    let body: ContentGenerationRequest;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Неверный формат запроса' },
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

    if (!mainQuery) {
      return NextResponse.json(
        { success: false, error: 'Основной запрос обязателен' },
        { status: 400 }
      );
    }

    const openai = await getOpenAIClient();
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
    
    // Создаем AbortController для контроля таймаута (55 сек для безопасности, меньше лимита Vercel 60 сек)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 55000);
    
    try {
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
      
      clearTimeout(timeoutId);

      const assistantMessage = completion.choices[0]?.message?.content;
      if (!assistantMessage) {
        throw new Error('Ответ от OpenAI не получен');
      }

      // Парсим JSON ответ (response_format гарантирует JSON формат)
      let result: any;
      try {
        result = JSON.parse(assistantMessage.trim());
        
        // Нормализуем формат ответа: поддерживаем как новый формат (article_html, seo, editor_summary),
        // так и старый формат (html, metaTitle, metaDescription, faqQuestions, summary) для обратной совместимости
        if (result.article_html) {
          // Новый формат
          const html = result.article_html;
          if (html.length > 40000) {
            console.warn(`HTML контент превышает лимит: ${html.length} символов, обрезаем до 40000`);
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
          const html = result.html || result.content;
          if (html.length > 40000) {
            console.warn(`HTML контент превышает лимит: ${html.length} символов, обрезаем до 40000`);
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
          let fallbackHtml = assistantMessage.trim();
          if (fallbackHtml.length > 40000) {
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
      } catch (error) {
        console.error('Ошибка парсинга JSON:', error);
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

      const duration = Date.now() - startTime;
      console.log(`Content generation completed in ${duration}ms, tokens: ${maxTokens}, model: ${model}`);

      return NextResponse.json({
        success: true,
        result,
      });
    } catch (abortError: any) {
      clearTimeout(timeoutId);
      if (abortError.name === 'AbortError') {
        throw new Error('Превышено время ожидания ответа от OpenAI. Попробуйте уменьшить желаемый размер статьи или упростить запрос.');
      }
      throw abortError;
    }
  } catch (error: any) {
    console.error('Ошибка генерации контента:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Ошибка генерации контента',
      },
      { status: 500 }
    );
  }
}
