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

async function getSeoAssistantId(openai: OpenAI): Promise<string> {
  const assistantIdSetting = await getSetting('openai_seo_assistant_id');
  const assistantId = assistantIdSetting?.value;
  
  if (!assistantId) {
    throw new Error('SEO Packaging Assistant ID не настроен. Укажите его в настройках администратора.');
  }
  
  // Проверяем, что ассистент существует
  try {
    await openai.beta.assistants.retrieve(assistantId);
    return assistantId;
  } catch (error) {
    throw new Error(`SEO Packaging Assistant с ID ${assistantId} не найден. Проверьте настройки.`);
  }
}

export async function POST(request: Request) {
  const startTime = Date.now();
  
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Не авторизован' }, { status: 401 });
    }

    const body = await request.json();
    const { fullArticleHtml, topic, language, authorPersona, angle } = body;

    if (!fullArticleHtml) {
      return NextResponse.json(
        { success: false, error: 'HTML статьи обязателен' },
        { status: 400 }
      );
    }

    const openai = await getOpenAIClient();
    const assistantId = await getSeoAssistantId(openai);

    const prompt = `Создай SEO метаданные для статьи:

Тема: ${topic || 'Статья'}
Язык: ${language || 'RU'}
Авторская персона: ${authorPersona || 'эксперт'}
Угол подачи: ${angle || 'информативный'}

Полный HTML статьи:
${fullArticleHtml}

Верни ТОЛЬКО валидный JSON:
{
  "meta_title": "...",
  "meta_description": "...",
  "h1": "...",
  "faq": [...],
  "semantic_topics": [...]
}`;

    // Таймаут 30 секунд для SEO
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 30000);

    try {
      // Используем Assistants API
      const thread = await openai.beta.threads.create();
      await openai.beta.threads.messages.create(thread.id, {
        role: 'user',
        content: prompt,
      });

      const run = await openai.beta.threads.runs.create(thread.id, {
        assistant_id: assistantId,
      });

      // Ждем завершения с таймаутом
      let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      let attempts = 0;
      const maxAttempts = 30; // 30 секунд максимум (1 сек * 30 попыток)

      while ((runStatus.status === 'queued' || runStatus.status === 'in_progress') && attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
        attempts++;
        
        // Проверяем таймаут
        if (Date.now() - startTime > 30000) {
          throw new Error('Превышено время ожидания генерации SEO метаданных (30 секунд)');
        }
      }

      if (runStatus.status === 'failed') {
        throw new Error(runStatus.last_error?.message || 'Ошибка генерации SEO метаданных');
      }

      if (runStatus.status !== 'completed') {
        throw new Error(`Генерация SEO метаданных не завершена. Статус: ${runStatus.status}`);
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

      const responseText = content.text.value.trim();
      
      // Извлекаем JSON из ответа
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('JSON не найден в ответе ассистента');
      }

      const result = JSON.parse(jsonMatch[0]);

      const duration = Date.now() - startTime;
      console.log(`[SEO] Генерация SEO метаданных завершена за ${duration}ms`);

      // Возвращаем без изменений, как требует спецификация
      return NextResponse.json({
        success: true,
        meta_title: result.meta_title || '',
        meta_description: result.meta_description || '',
        h1: result.h1 || '',
        faq: result.faq || [],
        semantic_topics: result.semantic_topics || [],
      });
    } catch (abortError: any) {
      clearTimeout(timeoutId);
      if (abortError.name === 'AbortError' || abortError.message?.includes('aborted') || abortError.message?.includes('timeout')) {
        throw new Error('Превышено время ожидания генерации SEO метаданных (30 секунд)');
      }
      throw abortError;
    }
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`[SEO] Ошибка через ${duration}ms:`, error.message);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Ошибка генерации SEO метаданных',
      },
      { status: 500 }
    );
  }
}
