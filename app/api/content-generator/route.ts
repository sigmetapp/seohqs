import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-utils';
import { getSetting, setSetting } from '@/lib/db-settings';
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

interface Section {
  id: string;
  title: string;
  description: string;
}

interface OutlineResponse {
  title: string;
  sections: Section[];
}

async function getOpenAIClient(): Promise<OpenAI> {
  const apiKeySetting = await getSetting('openai_api_key');
  const apiKey = apiKeySetting?.value || process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('OpenAI API Key не настроен. Обратитесь к администратору.');
  }

  return new OpenAI({ apiKey });
}

async function getOrCreateAssistant(openai: OpenAI, assistantType: 'outline' | 'section'): Promise<string> {
  const settingKey = assistantType === 'outline' ? 'openai_outline_assistant_id' : 'openai_section_assistant_id';
  const existingId = await getSetting(settingKey);
  
  if (existingId?.value) {
    try {
      await openai.beta.assistants.retrieve(existingId.value);
      return existingId.value;
    } catch (error) {
      console.warn(`Assistant ${assistantType} не найден, создаем нового`);
    }
  }

  const instructions = assistantType === 'outline' 
    ? `Ты помощник для создания структуры (outline) статей. Твоя задача - создать логичную структуру статьи на основе темы и параметров.

Создай структуру статьи с 5-12 секциями. Каждая секция должна иметь:
- Заголовок (H2)
- Краткое описание содержания секции (1-2 предложения)

Верни ТОЛЬКО валидный JSON:
{
  "title": "Заголовок статьи (H1)",
  "sections": [
    {
      "id": "section-1",
      "title": "Заголовок секции",
      "description": "Краткое описание содержания секции"
    },
    ...
  ]
}`
    : `Ты Content Section Writer - эксперт по написанию компактных секций статей.

ТВОЯ ЗАДАЧА: Написать ОДНУ секцию статьи (800-1500 слов) высокого качества.

ПРАВИЛА:
- Это часть большой статьи, поэтому не повторяй общую информацию
- Сфокусируйся на конкретной теме секции
- Используй естественный, человеческий стиль без AI-штампов
- Структурируй текст с подзаголовками H3 где нужно
- Уложись в 800-1500 слов
- Пиши как опытный эксперт

Верни ТОЛЬКО HTML контент секции (без H1, начинай с H2 для заголовка секции):
<h2>Заголовок секции</h2>
<p>Текст секции...</p>
<h3>Подзаголовок</h3>
<p>Продолжение...</p>`;

  const assistant = await openai.beta.assistants.create({
    name: assistantType === 'outline' ? 'Content Outline Generator' : 'Content Section Writer',
    instructions,
    model: 'gpt-4o',
    tools: [],
  });

  await setSetting(settingKey, assistant.id, `ID ассистента для ${assistantType}`);
  return assistant.id;
}

async function generateOutline(
  openai: OpenAI,
  assistantId: string,
  params: {
    mainQuery: string;
    language: string;
    targetAudience: string;
    contentGoal: string;
    desiredLength: string;
    toneOfVoice: string;
    additionalConstraints?: string;
  }
): Promise<OutlineResponse> {
  const prompt = `Создай структуру статьи:

Тема: ${params.mainQuery}
Язык: ${params.language}
Целевая аудитория: ${params.targetAudience}
Цель контента: ${params.contentGoal}
Желаемый размер: ${params.desiredLength} слов
Тон: ${params.toneOfVoice}
${params.additionalConstraints ? `Дополнительные ограничения: ${params.additionalConstraints}` : ''}

Создай логичную структуру из 5-12 секций. Верни ТОЛЬКО валидный JSON.`;

  const thread = await openai.beta.threads.create();
  await openai.beta.threads.messages.create(thread.id, {
    role: 'user',
    content: prompt,
  });

  const run = await openai.beta.threads.runs.create(thread.id, {
    assistant_id: assistantId,
  });

  let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
  let attempts = 0;
  const maxAttempts = 20;

  while (runStatus.status === 'queued' || runStatus.status === 'in_progress') {
    if (attempts >= maxAttempts) {
      throw new Error('Превышено время ожидания генерации outline');
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
    runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    attempts++;
  }

  if (runStatus.status === 'failed') {
    throw new Error(runStatus.last_error?.message || 'Ошибка генерации outline');
  }

  const messages = await openai.beta.threads.messages.list(thread.id, {
    limit: 1,
    order: 'desc',
  });

  const assistantMessage = messages.data[0];
  if (!assistantMessage || assistantMessage.role !== 'assistant') {
    throw new Error('Ответ от ассистента не получен');
  }

  const content = assistantMessage.content[0];
  if (content.type !== 'text') {
    throw new Error('Неожиданный формат ответа от ассистента');
  }

  const responseText = content.text.value.trim();
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('JSON не найден в ответе ассистента');
  }

  return JSON.parse(jsonMatch[0]);
}

async function generateSection(
  openai: OpenAI,
  assistantId: string,
  params: {
    mainQuery: string;
    language: string;
    targetAudience: string;
    contentGoal: string;
    toneOfVoice: string;
    additionalConstraints?: string;
    sectionTitle: string;
    sectionDescription: string;
    sectionNumber: number;
    totalSections: number;
  }
): Promise<string> {
  const prompt = `Напиши секцию для большой статьи.

ОБЩАЯ ИНФОРМАЦИЯ О СТАТЬЕ:
Тема статьи: ${params.mainQuery}
Язык: ${params.language}
Целевая аудитория: ${params.targetAudience}
Цель контента: ${params.contentGoal}
Тон: ${params.toneOfVoice}
${params.additionalConstraints ? `Дополнительные ограничения: ${params.additionalConstraints}` : ''}

СЕКЦИЯ, КОТОРУЮ НУЖНО НАПИСАТЬ:
Заголовок секции: ${params.sectionTitle}
Описание: ${params.sectionDescription}
Это секция ${params.sectionNumber} из ${params.totalSections}.

ВАЖНО:
- Это часть большой статьи, не повторяй общую информацию
- Сфокусируйся на теме этой секции
- Уложись в 800-1500 слов
- Используй естественный стиль без AI-штампов
- Начни с H2 заголовка секции

Верни ТОЛЬКО HTML контент секции.`;

  const thread = await openai.beta.threads.create();
  await openai.beta.threads.messages.create(thread.id, {
    role: 'user',
    content: prompt,
  });

  const run = await openai.beta.threads.runs.create(thread.id, {
    assistant_id: assistantId,
  });

  let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
  let attempts = 0;
  const maxAttempts = 30;

  while (runStatus.status === 'queued' || runStatus.status === 'in_progress') {
    if (attempts >= maxAttempts) {
      throw new Error(`Превышено время ожидания генерации секции ${params.sectionNumber}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
    runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    attempts++;
  }

  if (runStatus.status === 'failed') {
    throw new Error(runStatus.last_error?.message || `Ошибка генерации секции ${params.sectionNumber}`);
  }

  const messages = await openai.beta.threads.messages.list(thread.id, {
    limit: 1,
    order: 'desc',
  });

  const assistantMessage = messages.data[0];
  if (!assistantMessage || assistantMessage.role !== 'assistant') {
    throw new Error(`Ответ от ассистента не получен для секции ${params.sectionNumber}`);
  }

  const content = assistantMessage.content[0];
  if (content.type !== 'text') {
    throw new Error(`Неожиданный формат ответа для секции ${params.sectionNumber}`);
  }

  return content.text.value.trim();
}

async function generateSEOMeta(
  openai: OpenAI,
  params: {
    mainQuery: string;
    language: string;
    html: string;
  }
): Promise<{ metaTitle: string; metaDescription: string; faqQuestions: string[] }> {
  const prompt = `На основе статьи создай SEO метаданные:

Тема: ${params.mainQuery}
Язык: ${params.language}
Контент статьи (первые 5000 символов): ${params.html.substring(0, 5000)}

Верни ТОЛЬКО валидный JSON:
{
  "metaTitle": "Meta title 55-60 символов",
  "metaDescription": "Meta description 155-160 символов",
  "faqQuestions": ["Вопрос 1", "Вопрос 2", "Вопрос 3", "Вопрос 4"]
}`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: 'Ты SEO-специалист. Создавай качественные метаданные для статей.',
      },
      { role: 'user', content: prompt },
    ],
    temperature: 0.7,
    max_tokens: 500,
    response_format: { type: 'json_object' },
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error('Ответ от OpenAI не получен для SEO метаданных');
  }

  const result = JSON.parse(content.trim());
  return {
    metaTitle: result.metaTitle || '',
    metaDescription: result.metaDescription || '',
    faqQuestions: result.faqQuestions || [],
  };
}

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
    log('=== Content Generator API: Начало многошаговой генерации ===');

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
    } catch (error: any) {
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

    log(`Параметры: mainQuery="${mainQuery.substring(0, 50)}...", desiredLength=${desiredLength}`);

    const openai = await getOpenAIClient();

    // ШАГ A: OUTLINE
    log('ШАГ A: Генерация outline');
    const outlineStartTime = Date.now();
    const outlineAssistantId = await getOrCreateAssistant(openai, 'outline');
    const outline = await generateOutline(openai, outlineAssistantId, {
      mainQuery,
      language,
      targetAudience,
      contentGoal,
      desiredLength,
      toneOfVoice,
      additionalConstraints,
    });
    log(`Outline создан: ${outline.sections.length} секций за ${Date.now() - outlineStartTime}ms`);

    // ШАГ B: SECTION GENERATION
    log(`ШАГ B: Генерация ${outline.sections.length} секций`);
    const sectionAssistantId = await getOrCreateAssistant(openai, 'section');
    const sections: string[] = [];

    for (let i = 0; i < outline.sections.length; i++) {
      const section = outline.sections[i];
      log(`Генерация секции ${i + 1}/${outline.sections.length}: "${section.title}"`);
      const sectionStartTime = Date.now();

      const sectionHtml = await generateSection(openai, sectionAssistantId, {
        mainQuery,
        language,
        targetAudience,
        contentGoal,
        toneOfVoice,
        additionalConstraints,
        sectionTitle: section.title,
        sectionDescription: section.description,
        sectionNumber: i + 1,
        totalSections: outline.sections.length,
      });

      sections.push(sectionHtml);
      log(`Секция ${i + 1} завершена за ${Date.now() - sectionStartTime}ms`);
    }

    // ШАГ C: MERGE
    log('ШАГ C: Объединение секций');
    const mergeStartTime = Date.now();
    const mergedHtml = `<h1>${outline.title}</h1>\n\n${sections.join('\n\n')}`;
    log(`Объединение завершено за ${Date.now() - mergeStartTime}ms, размер: ${mergedHtml.length} символов`);

    // Генерация SEO метаданных
    log('Генерация SEO метаданных');
    const seoStartTime = Date.now();
    const seoMeta = await generateSEOMeta(openai, {
      mainQuery,
      language,
      html: mergedHtml,
    });
    log(`SEO метаданные созданы за ${Date.now() - seoStartTime}ms`);

    const totalDuration = Date.now() - requestStartTime;
    log(`=== Генерация завершена успешно за ${totalDuration}ms ===`);

    return NextResponse.json({
      success: true,
      result: {
        html: mergedHtml,
        metaTitle: seoMeta.metaTitle,
        metaDescription: seoMeta.metaDescription,
        faqQuestions: seoMeta.faqQuestions,
        summary: `Статья "${outline.title}" состоит из ${outline.sections.length} секций. Целевая аудитория: ${targetAudience}.`,
      },
      debug: {
        logs: debugLog,
        timing: { total: totalDuration },
        outline: {
          title: outline.title,
          sectionsCount: outline.sections.length,
        },
      },
    });
  } catch (error: any) {
    const errorTime = Date.now() - requestStartTime;
    log(`ОШИБКА: ${error.message || 'Неизвестная ошибка'}`);
    log(`Stack: ${error.stack}`);
    log(`Время до ошибки: ${errorTime}ms`);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Ошибка генерации контента',
        debug: {
          logs: debugLog,
          timing: { total: errorTime },
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
