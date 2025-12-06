import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-utils';
import { createJob, updateJob } from '@/lib/db-article-jobs';
import { getOpenAIClient, getArticleCreatorAssistant } from '@/lib/article-assistants';

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
    const assistantId = await getArticleCreatorAssistant(openai);

    // Создаём thread
    const thread = await openai.beta.threads.create();
    
    // Формируем промпт с параметрами для ассистента
    // Ассистент сам выполнит поиск, выбор статей, парсинг и создание статьи
    const prompt = `Создай SEO-статью на основе поиска и анализа существующих материалов в интернете.

ПАРАМЕТРЫ СТАТЬИ:
Тема: ${topic}
Язык: ${language || 'RU'}
Аудитория: ${audience || 'general'}
Авторская персона: ${authorPersona || 'expert'}
Угол подачи: ${angle || 'informative'}
Цель контента: ${contentGoal || 'SEO article'}
Желаемый размер: ${desiredLength || '2000'} слов
Сложность: ${complexity || 'medium'}
${constraints ? `Дополнительные ограничения: ${constraints}` : ''}

Выполни весь процесс: поиск статей в Google через web_search, выбор 2-3 лучших из топ-10, получение их контента через web_fetch, анализ и извлечение основного контента (игнорируя меню, сайдбары, комментарии), создание новой статьи путем рерайта и объединения структур.

Верни ТОЛЬКО HTML контент готовой статьи без дополнительного текста, без JSON обёрток.`;

    // Создаём сообщение пользователя
    await openai.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: prompt,
    });

    // Запускаем run ассистента
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: assistantId,
    });

    // Обновляем задачу с threadId и runId
    await updateJob(jobId, {
      thread_id: thread.id,
      research_run_id: run.id, // Используем это поле для хранения runId основного run
      status: 'generating', // Статус генерации статьи
    });

    return NextResponse.json({
      success: true,
      jobId,
      threadId: thread.id,
      runId: run.id,
    });
  } catch (error: any) {
    console.error('[ARTICLE/CREATE] Ошибка:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Ошибка создания задачи генерации статьи',
      },
      { status: 500 }
    );
  }
}
