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

const SYSTEM_PROMPT = `Ты опытный SEO-копирайтер, редактор и контент-стратег. Твоя задача - создавать высококачественный контент через многоступенчатый процесс.

Ты должен строго следовать этапам обработки:

1. DRAFT GENERATION - создай развернутый черновик на основе входных параметров (topic, language, audience, goal, length, tone). Полностью раскрой тему, дай логичную структуру, пиши как опытный эксперт.

2. SEO STRUCTURING - проанализируй draft, улучшь структуру под SEO (H2/H3, логика блоков, покрытие подзапросов), добавь недостающие разделы, учти поисковый интент, но не превращай в "ключепих".

3. HUMANIZATION - перепиши текст так, чтобы он выглядел как работа живого эксперта: вариативная длина предложений, естественные связки, микросюжеты, отсутствие AI-штампов, учитывай дополнительные ограничения.

4. UNIQUENESS - измени формулировки, порядок объяснений, переходы для стилистической уникальности, снижения вероятности детектирования как AI-контент, сохраняя смысл и SEO-пользу.

5. QUALITY CHECK - проверь текст на повторы мыслей, логические разрывы, ненужную воду, противоречия. Убери повторы, сократи лишнее, выровняй тон и структуру.

6. HTML PACKAGING - оформи финальный текст в HTML-подобном формате (h1, h2, h3, p, списки, таблицы), сгенерируй Meta title (55-60 символов), Meta description (155-160 символов), FAQ-вопросы (4-8 штук).

ВАЖНО: Всегда возвращай финальный результат в формате JSON с полями:
{
  "html": "финальный HTML контент с тегами h1, h2, h3, p и т.д.",
  "metaTitle": "Meta title до 60 символов",
  "metaDescription": "Meta description до 160 символов",
  "faqQuestions": ["Вопрос 1", "Вопрос 2", "Вопрос 3", ...],
  "summary": "Краткий summary для автора/редактора с ключевой идеей, целевой аудиторией и основным интентом"
}

Всегда возвращай только валидный JSON без дополнительных комментариев.`;

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

    // Формируем промпт для генерации контента
    const userPrompt = `Создай контент по следующему запросу:

Основной запрос/тема: ${mainQuery}
Язык: ${language}
Целевая аудитория: ${targetAudience}
Цель контента: ${contentGoal}
Желаемый размер: ${desiredLength} слов
Тон: ${toneOfVoice}
${additionalConstraints ? `Дополнительные ограничения: ${additionalConstraints}` : ''}

Выполни все 6 этапов обработки и верни результат в формате JSON.`;

    // Используем Chat Completions API вместо Assistants API для быстрой работы
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 8000, // Увеличиваем лимит для длинных статей
      response_format: { type: 'json_object' }, // Принудительно JSON формат
    });

    const assistantMessage = completion.choices[0]?.message?.content;
    if (!assistantMessage) {
      throw new Error('Ответ от OpenAI не получен');
    }

    // Парсим JSON ответ (response_format гарантирует JSON формат)
    let result: any;
    try {
      result = JSON.parse(assistantMessage.trim());
      
      // Проверяем наличие обязательных полей
      if (!result.html && !result.content) {
        // Если нет html или content, используем весь ответ как HTML
        result = {
          html: assistantMessage.trim(),
          metaTitle: result.metaTitle || '',
          metaDescription: result.metaDescription || '',
          faqQuestions: result.faqQuestions || [],
          summary: result.summary || '',
        };
      }
      
      // Если есть content вместо html, переименовываем
      if (result.content && !result.html) {
        result.html = result.content;
        delete result.content;
      }
    } catch (error) {
      console.error('Ошибка парсинга JSON:', error);
      // Fallback: возвращаем весь текст как HTML
      result = {
        html: assistantMessage.trim(),
        metaTitle: '',
        metaDescription: '',
        faqQuestions: [],
        summary: '',
      };
    }

    return NextResponse.json({
      success: true,
      result,
    });
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
