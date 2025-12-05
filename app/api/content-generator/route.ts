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

async function getOpenAIClient(): Promise<OpenAI> {
  const apiKeySetting = await getSetting('openai_api_key');
  const apiKey = apiKeySetting?.value || process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('OpenAI API Key не настроен. Обратитесь к администратору.');
  }

  return new OpenAI({ apiKey });
}

const SYSTEM_PROMPT = `Ты SEO-копирайтер. Создай качественную статью.

Требования:
- Раскрой тему полностью
- Естественный стиль без AI-штампов
- Структура: H1, H2, H3, параграфы
- Максимум 1200 слов (15000 символов)

Верни ТОЛЬКО JSON:
{
  "html": "HTML с h1, h2, h3, p (макс 15000 символов)",
  "metaTitle": "55-60 символов",
  "metaDescription": "155-160 символов",
  "faqQuestions": ["Вопрос 1", "Вопрос 2", "Вопрос 3", "Вопрос 4"]
}`;

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

    // Ограничиваем размер для избежания таймаутов
    const desiredLengthNum = parseInt(desiredLength) || 2000;
    const maxWords = Math.min(desiredLengthNum, 1200); // Максимум 1200 слов для быстрой генерации
    const maxTokens = 2000; // Фиксированный лимит 2000 токенов для гарантии быстрой генерации

    const userPrompt = `Создай статью:

Тема: ${mainQuery}
Язык: ${language}
Аудитория: ${targetAudience}
Цель: ${contentGoal}
Размер: ${maxWords} слов
Тон: ${toneOfVoice}
${additionalConstraints ? `Ограничения: ${additionalConstraints}` : ''}

Верни JSON с HTML статьей.`;

    // Используем Chat Completions API с таймаутом
    // Используем gpt-4o-mini для более быстрой генерации
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000); // 45 секунд

    try {
      const completion = await openai.chat.completions.create(
        {
          model: 'gpt-4o-mini', // Более быстрая модель
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.7,
          max_tokens: maxTokens,
          response_format: { type: 'json_object' },
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

      // Парсим JSON ответ
      let result: any;
      try {
        result = JSON.parse(assistantMessage.trim());
      } catch (error) {
        // Если не удалось распарсить, возвращаем весь текст как HTML
        result = {
          html: assistantMessage.trim(),
          metaTitle: '',
          metaDescription: '',
          faqQuestions: [],
        };
      }

      // Ограничиваем размер HTML
      if (result.html && result.html.length > 15000) {
        result.html = result.html.substring(0, 15000) + '...';
      }

      return NextResponse.json({
        success: true,
        result: {
          html: result.html || '',
          metaTitle: result.metaTitle || '',
          metaDescription: result.metaDescription || '',
          faqQuestions: result.faqQuestions || [],
          summary: `Статья на тему "${mainQuery}" для аудитории: ${targetAudience}`,
        },
      });
    } catch (abortError: any) {
      clearTimeout(timeoutId);
      if (abortError.name === 'AbortError') {
        throw new Error('Превышено время ожидания ответа от OpenAI. Попробуйте уменьшить желаемый размер статьи.');
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
