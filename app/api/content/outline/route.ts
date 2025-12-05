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

export async function POST(request: Request) {
  const startTime = Date.now();
  
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Не авторизован' }, { status: 401 });
    }

    const body = await request.json();
    const { topic, language, audience, goal, desiredLength, tone } = body;

    if (!topic) {
      return NextResponse.json({ success: false, error: 'Тема обязательна' }, { status: 400 });
    }

    const openai = await getOpenAIClient();

    const prompt = `Создай структуру (outline) статьи:

Тема: ${topic}
Язык: ${language || 'RU'}
Целевая аудитория: ${audience || 'general'}
Цель контента: ${goal || 'SEO article'}
Желаемый размер: ${desiredLength || '2000'} слов
Тон: ${tone || 'neutral'}

Создай логичную структуру из 5-12 секций. Каждая секция должна иметь заголовок и краткое описание (1-2 предложения).

Верни ТОЛЬКО валидный JSON:
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

    // Таймаут 15 секунд для outline (запас для Vercel)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 15000);

    try {
      const completion = await openai.chat.completions.create(
        {
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'Ты помощник для создания структуры статей. Создавай логичную структуру с секциями. Верни ТОЛЬКО валидный JSON без дополнительного текста.',
            },
            { role: 'user', content: prompt },
          ],
          temperature: 0.7,
          max_tokens: 2000,
          response_format: { type: 'json_object' },
        },
        {
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Ответ от OpenAI не получен');
      }

      const outline = JSON.parse(content.trim());
      
      // Валидация структуры
      if (!outline.title || !Array.isArray(outline.sections)) {
        throw new Error('Неверный формат ответа от OpenAI');
      }

      const duration = Date.now() - startTime;
      console.log(`[OUTLINE] Генерация завершена за ${duration}ms`);

      return NextResponse.json({
        success: true,
        outline: {
          title: outline.title,
          sections: outline.sections.map((s: any, i: number) => ({
            id: s.id || `section-${i + 1}`,
            title: s.title,
            description: s.description || '',
          })),
        },
      });
    } catch (abortError: any) {
      clearTimeout(timeoutId);
      if (abortError.name === 'AbortError' || abortError.message?.includes('aborted')) {
        throw new Error('Превышено время ожидания генерации структуры (15 секунд)');
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
