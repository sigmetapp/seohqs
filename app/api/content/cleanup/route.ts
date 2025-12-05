import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-utils';
import { getSetting } from '@/lib/db-settings';
import OpenAI from 'openai';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function getOpenAIClient(): Promise<OpenAI> {
  const apiKeySetting = await getSetting('openai_api_key');
  const apiKey = apiKeySetting?.value || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenAI API Key не настроен.');
  }
  return new OpenAI({ apiKey });
}

async function getCleanupAssistantId(openai: OpenAI): Promise<string> {
  const assistantIdSetting = await getSetting('openai_cleanup_assistant_id');
  const assistantId = assistantIdSetting?.value;
  
  if (!assistantId) {
    throw new Error('Cleanup Assistant ID не настроен. Укажите его в настройках администратора.');
  }
  
  // Проверяем, что ассистент существует
  try {
    await openai.beta.assistants.retrieve(assistantId);
    return assistantId;
  } catch (error) {
    throw new Error(`Cleanup Assistant с ID ${assistantId} не найден. Проверьте настройки.`);
  }
}

/**
 * Нормализует контент: заменяет длинные тире на обычные дефисы
 */
function normalizeContent(text: string): string {
  return text
    .replace(/—/g, '-')  // em dash (—) → hyphen (-)
    .replace(/–/g, '-');  // en dash (–) → hyphen (-)
}

export async function POST(request: Request) {
  const startTime = Date.now();
  
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Не авторизован' }, { status: 401 });
    }

    const body = await request.json();
    const {
      htmlSection,
      language,
      authorPersona,
      angle,
      editIntensity,
    } = body;

    if (!htmlSection || typeof htmlSection !== 'string') {
      return NextResponse.json(
        { success: false, error: 'htmlSection обязателен и должен быть строкой' },
        { status: 400 }
      );
    }

    if (!language || typeof language !== 'string') {
      return NextResponse.json(
        { success: false, error: 'language обязателен' },
        { status: 400 }
      );
    }

    const openai = await getOpenAIClient();
    const assistantId = await getCleanupAssistantId(openai);

    // Параметры по умолчанию
    const finalAuthorPersona = authorPersona || 'consultant';
    const finalAngle = angle || 'practical';
    const finalEditIntensity = editIntensity || 'medium';

    // Формируем user input для ассистента
    // НЕ передаем system prompt - он уже задан у ассистента
    const userInput = `htmlSection: ${htmlSection}
language: ${language}
authorPersona: ${finalAuthorPersona}
angle: ${finalAngle}
editIntensity: ${finalEditIntensity}`;

    // Таймаут 25 секунд для cleanup (легче, чем генерация секции)
    const timeoutMs = 25000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    try {
      // Используем Assistants API
      const thread = await openai.beta.threads.create();
      await openai.beta.threads.messages.create(thread.id, {
        role: 'user',
        content: userInput,
      });

      const run = await openai.beta.threads.runs.create(thread.id, {
        assistant_id: assistantId,
      });

      // Ждем завершения с таймаутом
      let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      const maxAttempts = Math.floor(timeoutMs / 1000); // количество секунд

      while ((runStatus.status === 'queued' || runStatus.status === 'in_progress')) {
        // Проверяем таймаут перед каждой итерацией
        if (Date.now() - startTime > timeoutMs) {
          clearTimeout(timeoutId);
          throw new Error(`Превышено время ожидания очистки секции (${Math.floor(timeoutMs / 1000)} секунд)`);
        }
        
        await new Promise((resolve) => setTimeout(resolve, 1000));
        runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      }

      clearTimeout(timeoutId);

      if (runStatus.status === 'failed') {
        throw new Error(runStatus.last_error?.message || 'Ошибка очистки секции');
      }

      if (runStatus.status !== 'completed') {
        throw new Error(`Очистка секции не завершена. Статус: ${runStatus.status}`);
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
        throw new Error('Неожиданный формат ответа');
      }

      let cleanHtmlSection = content.text.value.trim();
      
      // Убираем markdown код блоки, если есть
      cleanHtmlSection = cleanHtmlSection.replace(/^```html\n?/i, '').replace(/^```\n?/i, '').replace(/\n?```$/i, '');
      
      // Убираем JSON обертки, если есть
      if (cleanHtmlSection.startsWith('{')) {
        try {
          const parsed = JSON.parse(cleanHtmlSection);
          cleanHtmlSection = parsed.html || parsed.cleanHtmlSection || parsed.htmlSection || cleanHtmlSection;
        } catch {
          // Не JSON, оставляем как есть
        }
      }

      // Проверяем, что получили валидный HTML
      if (!cleanHtmlSection || typeof cleanHtmlSection !== 'string' || cleanHtmlSection.trim().length === 0) {
        throw new Error('Ассистент вернул пустой HTML');
      }

      // Применяем normalizeContent как последний слой защиты
      cleanHtmlSection = normalizeContent(cleanHtmlSection);

      const duration = Date.now() - startTime;
      console.log(`[CLEANUP] Очистка секции завершена за ${duration}ms`);

      return NextResponse.json({
        success: true,
        cleanHtmlSection,
      });
    } catch (abortError: any) {
      clearTimeout(timeoutId);
      if (abortError.name === 'AbortError' || abortError.message?.includes('aborted') || abortError.message?.includes('timeout') || abortError.message?.includes('Превышено время')) {
        throw new Error(`Превышено время ожидания очистки секции (${Math.floor(timeoutMs / 1000)} секунд)`);
      }
      throw abortError;
    }
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`[CLEANUP] Ошибка через ${duration}ms:`, error.message);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Ошибка очистки секции',
      },
      { status: 500 }
    );
  }
}
