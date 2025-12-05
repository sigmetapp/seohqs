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
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Не авторизован' }, { status: 401 });
    }

    const body = await request.json();
    const { mainQuery, language, html } = body;

    const openai = await getOpenAIClient();

    const prompt = `На основе статьи создай SEO метаданные:

Тема: ${mainQuery}
Язык: ${language}
Контент статьи (первые 5000 символов): ${html.substring(0, 5000)}

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

    return NextResponse.json({
      success: true,
      seo: {
        metaTitle: result.metaTitle || '',
        metaDescription: result.metaDescription || '',
        faqQuestions: result.faqQuestions || [],
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Ошибка генерации SEO метаданных',
      },
      { status: 500 }
    );
  }
}
