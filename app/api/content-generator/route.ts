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

async function getAssistantId(): Promise<string> {
  const assistantIdSetting = await getSetting('openai_assistant_id');
  return assistantIdSetting?.value || '';
}

async function createOrGetAssistant(openai: OpenAI): Promise<string> {
  const existingId = await getAssistantId();
  
  if (existingId) {
    try {
      await openai.beta.assistants.retrieve(existingId);
      return existingId;
    } catch (error) {
      console.warn('Ассистент не найден, создаем нового');
    }
  }

  const assistant = await openai.beta.assistants.create({
    name: 'Multi-Step Content Generator',
    instructions: `Ты опытный SEO-копирайтер, редактор и контент-стратег. Твоя задача - создавать высококачественный контент через многоступенчатый процесс.

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

Всегда возвращай только валидный JSON без дополнительных комментариев.`,
    model: 'gpt-4o',
    tools: [{ type: 'code_interpreter' }],
  });

  // Сохраняем ID ассистента
  const { setSetting } = await import('@/lib/db-settings');
  await setSetting('openai_assistant_id', assistant.id, 'ID ассистента OpenAI');

  return assistant.id;
}

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
    const assistantId = await createOrGetAssistant(openai);

    // Создаем thread
    const thread = await openai.beta.threads.create();

    // Формируем промпт для ассистента
    const prompt = `Создай контент по следующему запросу:

Основной запрос/тема: ${mainQuery}
Язык: ${language}
Целевая аудитория: ${targetAudience}
Цель контента: ${contentGoal}
Желаемый размер: ${desiredLength} слов
Тон: ${toneOfVoice}
${additionalConstraints ? `Дополнительные ограничения: ${additionalConstraints}` : ''}

Выполни все 6 этапов обработки и верни результат в формате JSON для каждого этапа.`;

    // Отправляем сообщение в thread
    await openai.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: prompt,
    });

    // Запускаем run
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: assistantId,
    });

    // Ждем завершения
    let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    let attempts = 0;
    const maxAttempts = 60; // максимум 60 попыток (5 минут)

    while (runStatus.status === 'queued' || runStatus.status === 'in_progress') {
      if (attempts >= maxAttempts) {
        throw new Error('Превышено время ожидания ответа от ассистента');
      }
      await new Promise((resolve) => setTimeout(resolve, 5000)); // ждем 5 секунд
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      attempts++;
    }

    if (runStatus.status === 'failed') {
      throw new Error(runStatus.last_error?.message || 'Ошибка выполнения ассистента');
    }

    // Получаем сообщения
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

    // Парсим ответ
    let result: any;
    const responseText = content.text.value.trim();
    
    // Пытаемся найти JSON в ответе
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        result = JSON.parse(jsonMatch[0]);
      } catch (error) {
        console.error('Ошибка парсинга JSON:', error);
        // Если не удалось распарсить, возвращаем как есть
        result = {
          html: responseText,
          metaTitle: '',
          metaDescription: '',
          faqQuestions: [],
          summary: '',
        };
      }
    } else {
      // Если JSON не найден, возвращаем весь текст как HTML
      result = {
        html: responseText,
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
