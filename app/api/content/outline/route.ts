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

async function getOutlineAssistantId(openai: OpenAI): Promise<string> {
  const assistantIdSetting = await getSetting('openai_outline_assistant_id');
  const assistantId = assistantIdSetting?.value;
  
  if (!assistantId) {
    throw new Error('Outline Assistant ID не настроен. Укажите его в настройках администратора.');
  }
  
  // Проверяем, что ассистент существует
  try {
    await openai.beta.assistants.retrieve(assistantId);
    return assistantId;
  } catch (error) {
    throw new Error(`Outline Assistant с ID ${assistantId} не найден. Проверьте настройки.`);
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
    const { 
      topic, 
      language, 
      audience, 
      authorPersona,
      angle,
      contentGoal, 
      desiredLength,
      constraints
    } = body;

    if (!topic) {
      return NextResponse.json({ success: false, error: 'Тема обязательна' }, { status: 400 });
    }

    const openai = await getOpenAIClient();
    const assistantId = await getOutlineAssistantId(openai);

    const prompt = `Создай структуру статьи:

Тема: ${topic}
Язык: ${language || 'RU'}
Аудитория: ${audience || 'general'}
Авторская персона: ${authorPersona || 'эксперт'}
Угол подачи: ${angle || 'информативный'}
Цель контента: ${contentGoal || 'SEO article'}
Желаемый размер: ${desiredLength || '2000'} слов
${constraints ? `Дополнительные ограничения: ${constraints}` : ''}

Верни ТОЛЬКО JSON без дополнительного текста:
{
  "sections": [
    {
      "id": "section-1",
      "title": "Заголовок секции",
      "description": "Описание секции"
    }
  ]
}`;

    // Таймаут 10 секунд для outline (быстрый запрос)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 10000);

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
      const maxAttempts = 10; // 10 секунд максимум (1 сек * 10 попыток)

      while ((runStatus.status === 'queued' || runStatus.status === 'in_progress') && attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
        attempts++;
        
        // Проверяем таймаут
        if (Date.now() - startTime > 10000) {
          throw new Error('Превышено время ожидания генерации структуры (10 секунд)');
        }
      }

      if (runStatus.status === 'failed') {
        throw new Error(runStatus.last_error?.message || 'Ошибка генерации структуры');
      }

      if (runStatus.status !== 'completed') {
        throw new Error(`Генерация структуры не завершена. Статус: ${runStatus.status}`);
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

      const outline = JSON.parse(jsonMatch[0]);
      
      // Валидация структуры
      if (!Array.isArray(outline.sections)) {
        throw new Error('Неверный формат ответа от OpenAI: отсутствует массив sections');
      }

      const duration = Date.now() - startTime;
      console.log(`[OUTLINE] Генерация завершена за ${duration}ms, секций: ${outline.sections.length}`);

      // Возвращаем без модификаций, как требует спецификация
      return NextResponse.json({
        success: true,
        sections: outline.sections.map((s: any, i: number) => ({
          id: s.id || `section-${i + 1}`,
          title: s.title || '',
          description: s.description || '',
        })),
      });
    } catch (abortError: any) {
      clearTimeout(timeoutId);
      if (abortError.name === 'AbortError' || abortError.message?.includes('aborted') || abortError.message?.includes('timeout')) {
        throw new Error('Превышено время ожидания генерации структуры (10 секунд)');
      }
      throw abortError;
    }
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`[OUTLINE] Ошибка через ${duration}ms:`, error.message);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Ошибка генерации outline',
      },
      { status: 500 }
    );
  }
}
