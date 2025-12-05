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

async function getOrCreateSectionAssistant(openai: OpenAI): Promise<string> {
  const existingId = await getSetting('openai_section_assistant_id');
  
  if (existingId?.value) {
    try {
      await openai.beta.assistants.retrieve(existingId.value);
      return existingId.value;
    } catch (error) {
      console.warn('Section assistant не найден, создаем нового');
    }
  }

  const assistant = await openai.beta.assistants.create({
    name: 'Content Section Writer',
    instructions: `Ты Content Section Writer - эксперт по написанию компактных секций статей (800-1500 слов).

ПРАВИЛА:
- Это часть большой статьи, не повторяй общую информацию
- Сфокусируйся на конкретной теме секции
- Используй естественный, человеческий стиль без AI-штампов
- Структурируй текст с подзаголовками H3 где нужно
- Уложись в 800-1500 слов

Верни ТОЛЬКО HTML контент секции (начинай с H2 для заголовка секции):
<h2>Заголовок секции</h2>
<p>Текст секции...</p>`,
    model: 'gpt-4o',
    tools: [],
  });

  await setSetting('openai_section_assistant_id', assistant.id, 'ID ассистента для секций');
  return assistant.id;
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Не авторизован' }, { status: 401 });
    }

    const body = await request.json();
    const {
      mainQuery,
      language,
      targetAudience,
      contentGoal,
      toneOfVoice,
      additionalConstraints,
      sectionTitle,
      sectionDescription,
      sectionNumber,
      totalSections,
    } = body;

    const openai = await getOpenAIClient();
    const assistantId = await getOrCreateSectionAssistant(openai);

    const prompt = `Напиши секцию для большой статьи.

ОБЩАЯ ИНФОРМАЦИЯ О СТАТЬЕ:
Тема статьи: ${mainQuery}
Язык: ${language}
Целевая аудитория: ${targetAudience}
Цель контента: ${contentGoal}
Тон: ${toneOfVoice}
${additionalConstraints ? `Дополнительные ограничения: ${additionalConstraints}` : ''}

СЕКЦИЯ, КОТОРУЮ НУЖНО НАПИСАТЬ:
Заголовок секции: ${sectionTitle}
Описание: ${sectionDescription}
Это секция ${sectionNumber} из ${totalSections}.

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
        throw new Error(`Превышено время ожидания генерации секции ${sectionNumber}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 2000));
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      attempts++;
    }

    if (runStatus.status === 'failed') {
      throw new Error(runStatus.last_error?.message || `Ошибка генерации секции ${sectionNumber}`);
    }

    const messages = await openai.beta.threads.messages.list(thread.id, {
      limit: 1,
      order: 'desc',
    });

    const assistantMessage = messages.data[0];
    if (!assistantMessage || assistantMessage.role !== 'assistant') {
      throw new Error(`Ответ от ассистента не получен для секции ${sectionNumber}`);
    }

    const content = assistantMessage.content[0];
    if (content.type !== 'text') {
      throw new Error(`Неожиданный формат ответа для секции ${sectionNumber}`);
    }

    const sectionHtml = content.text.value.trim();

    return NextResponse.json({
      success: true,
      sectionHtml,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Ошибка генерации секции',
      },
      { status: 500 }
    );
  }
}
