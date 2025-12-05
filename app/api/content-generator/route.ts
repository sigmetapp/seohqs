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

interface OutlineSection {
  id: string;
  title: string;
  description: string;
}

interface Outline {
  title: string;
  sections: OutlineSection[];
}

async function getOpenAIClient(): Promise<OpenAI> {
  const apiKeySetting = await getSetting('openai_api_key');
  const apiKey = apiKeySetting?.value || process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('OpenAI API Key не настроен. Обратитесь к администратору.');
  }

  return new OpenAI({ apiKey });
}

// ШАГ 1: Генерация структуры/содержания
async function generateOutline(
  openai: OpenAI,
  params: {
    mainQuery: string;
    language: string;
    targetAudience: string;
    contentGoal: string;
    desiredLength: string;
    toneOfVoice: string;
    additionalConstraints?: string;
  }
): Promise<Outline> {
  const startTime = Date.now();
  console.log(`[OUTLINE] Начало генерации структуры в ${new Date().toISOString()}`);
  
  const outlinePrompt = `Создай структуру (содержание) статьи:

Тема: ${params.mainQuery}
Язык: ${params.language}
Аудитория: ${params.targetAudience}
Цель: ${params.contentGoal}
Размер: ${params.desiredLength} слов
Тон: ${params.toneOfVoice}
${params.additionalConstraints ? `Ограничения: ${params.additionalConstraints}` : ''}

Создай логичную структуру из 5-10 секций. Каждая секция должна иметь заголовок и краткое описание (1-2 предложения).

Верни ТОЛЬКО JSON:
{
  "title": "Заголовок статьи (H1)",
  "sections": [
    {
      "id": "section-1",
      "title": "Заголовок секции",
      "description": "Краткое описание содержания секции"
    }
  ]
}`;

  // Таймаут 50 секунд (меньше лимита Vercel 60 секунд)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    console.log(`[OUTLINE] ТАЙМАУТ: Превышено время ожидания структуры`);
    controller.abort();
  }, 50000);

  try {
    console.log(`[OUTLINE] Отправка запроса к OpenAI, max_tokens: 10000`);
    const requestStartTime = Date.now();
    
    const completion = await openai.chat.completions.create(
      {
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Ты помощник для создания структуры статей. Создавай логичную структуру с секциями.',
          },
          { role: 'user', content: outlinePrompt },
        ],
        temperature: 0.7,
        max_tokens: 10000,
        response_format: { type: 'json_object' },
      },
      {
        signal: controller.signal,
      }
    );

    const requestDuration = Date.now() - requestStartTime;
    console.log(`[OUTLINE] Ответ получен за ${requestDuration}ms`);
    clearTimeout(timeoutId);

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Ответ от OpenAI не получен для структуры');
    }

    const parseStartTime = Date.now();
    const result = JSON.parse(content.trim());
    console.log(`[OUTLINE] JSON распарсен за ${Date.now() - parseStartTime}ms`);
    console.log(`[OUTLINE] Всего времени: ${Date.now() - startTime}ms`);
    
    return {
      title: result.title || params.mainQuery,
      sections: result.sections || [],
    };
  } catch (abortError: any) {
    clearTimeout(timeoutId);
    const errorDuration = Date.now() - startTime;
    console.error(`[OUTLINE] ОШИБКА через ${errorDuration}ms:`, abortError.message);
    if (abortError.name === 'AbortError') {
      throw new Error(`Превышено время ожидания генерации структуры (${errorDuration}ms).`);
    }
    throw abortError;
  }

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error('Ответ от OpenAI не получен для структуры');
  }

  const result = JSON.parse(content.trim());
  return {
    title: result.title || params.mainQuery,
    sections: result.sections || [],
  };
}

// ШАГ 2: Генерация статьи на основе структуры
async function generateArticle(
  openai: OpenAI,
  outline: Outline,
  params: {
    mainQuery: string;
    language: string;
    targetAudience: string;
    contentGoal: string;
    desiredLength: string;
    toneOfVoice: string;
    additionalConstraints?: string;
  }
): Promise<{ html: string; metaTitle: string; metaDescription: string; faqQuestions: string[] }> {
  const startTime = Date.now();
  console.log(`[ARTICLE] Начало генерации статьи в ${new Date().toISOString()}, секций: ${outline.sections.length}`);
  
  const sectionsText = outline.sections
    .map((s, i) => `${i + 1}. ${s.title}: ${s.description}`)
    .join('\n');

  const articlePrompt = `Создай статью на основе следующей структуры:

ОБЩАЯ ИНФОРМАЦИЯ:
Тема: ${params.mainQuery}
Язык: ${params.language}
Аудитория: ${params.targetAudience}
Цель: ${params.contentGoal}
Размер: ${params.desiredLength} слов
Тон: ${params.toneOfVoice}
${params.additionalConstraints ? `Ограничения: ${params.additionalConstraints}` : ''}

СТРУКТУРА СТАТЬИ:
${sectionsText}

Создай полную статью, следуя этой структуре. Каждая секция должна быть раскрыта полностью.

Верни ТОЛЬКО JSON:
{
  "html": "HTML с h1, h2, h3, p (макс 200000 символов)",
  "metaTitle": "55-60 символов",
  "metaDescription": "155-160 символов",
  "faqQuestions": ["Вопрос 1", "Вопрос 2", "Вопрос 3", "Вопрос 4"]
}`;

  // Таймаут 50 секунд (меньше лимита Vercel 60 секунд)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    console.log(`[ARTICLE] ТАЙМАУТ: Превышено время ожидания статьи`);
    controller.abort();
  }, 50000);

  try {
    console.log(`[ARTICLE] Отправка запроса к OpenAI, max_tokens: 30000`);
    const requestStartTime = Date.now();
    
    const completion = await openai.chat.completions.create(
      {
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Ты SEO-копирайтер. Создавай качественные статьи с естественным стилем без AI-штампов.',
          },
          { role: 'user', content: articlePrompt },
        ],
        temperature: 0.7,
        max_tokens: 30000,
        response_format: { type: 'json_object' },
      },
      {
        signal: controller.signal,
      }
    );

    const requestDuration = Date.now() - requestStartTime;
    console.log(`[ARTICLE] Ответ получен за ${requestDuration}ms`);
    clearTimeout(timeoutId);

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Ответ от OpenAI не получен для статьи');
    }

    const parseStartTime = Date.now();
    const result = JSON.parse(content.trim());
    console.log(`[ARTICLE] JSON распарсен за ${Date.now() - parseStartTime}ms`);

    // Ограничиваем размер HTML
    if (result.html && result.html.length > 200000) {
      console.log(`[ARTICLE] HTML превышает лимит: ${result.html.length} символов, обрезаем`);
      result.html = result.html.substring(0, 200000) + '...';
    }

    console.log(`[ARTICLE] Всего времени: ${Date.now() - startTime}ms, размер HTML: ${result.html?.length || 0} символов`);

    return {
      html: result.html || '',
      metaTitle: result.metaTitle || '',
      metaDescription: result.metaDescription || '',
      faqQuestions: result.faqQuestions || [],
    };
  } catch (abortError: any) {
    clearTimeout(timeoutId);
    const errorDuration = Date.now() - startTime;
    console.error(`[ARTICLE] ОШИБКА через ${errorDuration}ms:`, abortError.message);
    if (abortError.name === 'AbortError') {
      throw new Error(`Превышено время ожидания генерации статьи (${errorDuration}ms). Попробуйте уменьшить желаемый размер.`);
    }
    throw abortError;
  }
}

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
    const totalStartTime = Date.now();
    console.log(`[TOTAL] Начало генерации контента в ${new Date().toISOString()}`);

    // ШАГ 1: Генерация структуры
    console.log(`[TOTAL] ШАГ 1: Генерация структуры`);
    const outline = await generateOutline(openai, {
      mainQuery,
      language,
      targetAudience,
      contentGoal,
      desiredLength,
      toneOfVoice,
      additionalConstraints,
    });

    // ШАГ 2: Генерация статьи на основе структуры
    console.log(`[TOTAL] ШАГ 2: Генерация статьи`);
    const article = await generateArticle(openai, outline, {
      mainQuery,
      language,
      targetAudience,
      contentGoal,
      desiredLength,
      toneOfVoice,
      additionalConstraints,
    });

    const totalDuration = Date.now() - totalStartTime;
    console.log(`[TOTAL] Генерация завершена успешно за ${totalDuration}ms`);

    return NextResponse.json({
      success: true,
      result: {
        html: article.html,
        metaTitle: article.metaTitle,
        metaDescription: article.metaDescription,
        faqQuestions: article.faqQuestions,
        summary: `Статья "${outline.title}" состоит из ${outline.sections.length} секций.`,
        outline: outline,
      },
      debug: {
        totalTime: totalDuration,
        outlineSections: outline.sections.length,
        htmlLength: article.html.length,
      },
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
