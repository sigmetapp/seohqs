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
    const { articleHtml, topic, language } = body;

    if (!articleHtml) {
      return NextResponse.json(
        { success: false, error: 'HTML статьи обязателен' },
        { status: 400 }
      );
    }

    const openai = await getOpenAIClient();

    // Берем первые 5000 символов для анализа
    const contentPreview = articleHtml.substring(0, 5000);

    const prompt = `На основе статьи создай SEO метаданные:

Тема: ${topic || 'Статья'}
Язык: ${language || 'RU'}
Контент статьи (первые 5000 символов): ${contentPreview}

Верни ТОЛЬКО валидный JSON:
{
  "metaTitle": "Meta title 55-60 символов",
  "metaDescription": "Meta description 155-160 символов",
  "faqQuestions": ["Вопрос 1", "Вопрос 2", "Вопрос 3", "Вопрос 4"]
}`;

    // Таймаут 15 секунд для SEO (запас для Vercel)
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
              content: 'Ты SEO-специалист. Создавай качественные метаданные для статей. Верни ТОЛЬКО валидный JSON без дополнительного текста.',
            },
            { role: 'user', content: prompt },
          ],
          temperature: 0.7,
          max_tokens: 500,
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

      const result = JSON.parse(content.trim());

      const duration = Date.now() - startTime;
      console.log(`[SEO] Генерация SEO метаданных завершена за ${duration}ms`);

      return NextResponse.json({
        success: true,
        seo: {
          metaTitle: result.metaTitle || '',
          metaDescription: result.metaDescription || '',
          faqQuestions: result.faqQuestions || [],
        },
      });
    } catch (abortError: any) {
      clearTimeout(timeoutId);
      if (abortError.name === 'AbortError' || abortError.message?.includes('aborted')) {
        throw new Error('Превышено время ожидания генерации SEO метаданных (15 секунд)');
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
