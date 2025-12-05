import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-utils';
import { getSetting, setSetting } from '@/lib/db-settings';
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

async function getOrCreateOutlineAssistant(openai: OpenAI): Promise<string> {
  const existingId = await getSetting('openai_outline_assistant_id');
  
  if (existingId?.value) {
    try {
      await openai.beta.assistants.retrieve(existingId.value);
      return existingId.value;
    } catch (error) {
      console.warn('Outline assistant не найден, создаем нового');
    }
  }

  const assistant = await openai.beta.assistants.create({
    name: 'Content Outline Generator',
    instructions: `Ты помощник для создания структуры (outline) статей. Создай логичную структуру статьи с 5-12 секциями.

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
}`,
    model: 'gpt-4o',
    tools: [],
  });

  await setSetting('openai_outline_assistant_id', assistant.id, 'ID ассистента для outline');
  return assistant.id;
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Не авторизован' }, { status: 401 });
    }

    const body = await request.json();
    const { mainQuery, language, targetAudience, contentGoal, desiredLength, toneOfVoice, additionalConstraints } = body;

    const openai = await getOpenAIClient();
    const assistantId = await getOrCreateOutlineAssistant(openai);

    const prompt = `Создай структуру статьи:

Тема: ${mainQuery}
Язык: ${language}
Целевая аудитория: ${targetAudience}
Цель контента: ${contentGoal}
Желаемый размер: ${desiredLength} слов
Тон: ${toneOfVoice}
${additionalConstraints ? `Дополнительные ограничения: ${additionalConstraints}` : ''}

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
      throw new Error('Неожиданный формат ответа');
    }

    const responseText = content.text.value.trim();
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('JSON не найден в ответе');
    }

    const outline = JSON.parse(jsonMatch[0]);

    return NextResponse.json({
      success: true,
      outline,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Ошибка генерации outline',
      },
      { status: 500 }
    );
  }
}
