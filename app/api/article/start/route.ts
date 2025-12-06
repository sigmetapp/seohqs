import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-utils';
import { createJob } from '@/lib/db-article-jobs';
import { getOpenAIClient, getResearchOutlineAssistant } from '@/lib/article-assistants';
// Генерируем UUID без внешней библиотеки
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Пользователь не авторизован' },
        { status: 401 }
      );
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
      complexity,
      constraints,
    } = body;

    if (!topic) {
      return NextResponse.json(
        { success: false, error: 'Тема обязательна' },
        { status: 400 }
      );
    }

    // Генерируем уникальный jobId
    const jobId = generateUUID();

    // Создаём задачу в БД
    const job = await createJob({
      jobId,
      userId: user.id,
      topic,
      language,
      audience,
      authorPersona,
      angle,
      contentGoal,
      desiredLength: desiredLength ? parseInt(String(desiredLength), 10) : undefined,
      complexity,
      constraints,
    });

    // Получаем OpenAI клиент и ассистента
    const openai = await getOpenAIClient();
    const assistantId = await getResearchOutlineAssistant(openai);

    // Создаём thread и запускаем run
    const thread = await openai.beta.threads.create();
    
    const prompt = `Создай структуру статьи:

Тема: ${topic}
Язык: ${language || 'RU'}
Аудитория: ${audience || 'general'}
Авторская персона: ${authorPersona || 'expert'}
Угол подачи: ${angle || 'informative'}
Цель контента: ${contentGoal || 'SEO article'}
Желаемый размер: ${desiredLength || '2000'} слов
Сложность: ${complexity || 'medium'}
${constraints ? `Дополнительные ограничения: ${constraints}` : ''}

Используй web_search для поиска актуальной информации по теме. Выбери 2-3 лучшие статьи и на их основе создай SEO-outline с секциями. Для каждой секции создай краткие notes (ключевые моменты для написания).

Верни ТОЛЬКО JSON без дополнительного текста:
{
  "outline": {
    "title": "Заголовок статьи (H1)",
    "sections": [
      {
        "id": "section-1",
        "title": "Заголовок секции",
        "description": "Краткое описание содержания секции"
      }
    ]
  },
  "sectionNotes": {
    "section-1": "Ключевые моменты для написания этой секции: ...",
    "section-2": "..."
  },
  "sources": [
    {
      "url": "https://example.com/article",
      "title": "Название статьи",
      "snippet": "Краткое описание статьи"
    }
  ]
}`;

    await openai.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: prompt,
    });

    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: assistantId,
    });

    // Обновляем задачу с threadId и runId
    const { updateJob } = await import('@/lib/db-article-jobs');
    await updateJob(jobId, {
      thread_id: thread.id,
      research_run_id: run.id,
    });

    return NextResponse.json({
      success: true,
      jobId,
      threadId: thread.id,
      runId: run.id,
    });
  } catch (error: any) {
    console.error('[ARTICLE/START] Ошибка:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Ошибка запуска генерации статьи',
      },
      { status: 500 }
    );
  }
}
