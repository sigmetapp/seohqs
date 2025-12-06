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
    
    // Формируем промпт с параметрами
    const prompt = `Создай SEO-статью на основе поиска и анализа существующих материалов.

ПАРАМЕТРЫ:
Тема: ${topic}
Язык: ${language || 'RU'}
Аудитория: ${audience || 'general'}
Авторская персона: ${authorPersona || 'expert'}
Угол подачи: ${angle || 'informative'}
Цель контента: ${contentGoal || 'SEO article'}
Желаемый размер: ${desiredLength || '2000'} слов
Сложность: ${complexity || 'medium'}
${constraints ? `Дополнительные ограничения: ${constraints}` : ''}

ИНСТРУКЦИИ:
1. Используй web_search для поиска статей по теме "${topic}"
2. Изучи топ-10 результатов поиска и выбери 2-3 лучшие статьи на основе релевантности и качества
3. На основе результатов поиска (сниппетов, описаний, заголовков) извлеки ключевые идеи и структуру
4. Напиши новую статью путем рерайта и объединения структур из выбранных источников
5. Используй указанные параметры (язык, длина, аудитория, стиль)
6. Создай уникальный контент, не копируй текст дословно
7. Структурируй статью с заголовками H1, H2, H3
8. Используй естественный стиль без AI-штампов
9. Избегай длинных тире (—)

Верни ТОЛЬКО HTML контент статьи без дополнительного текста, без JSON обёрток:
<h1>Заголовок статьи</h1>
<p>Текст статьи...</p>`;

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
      research_run_id: run.id, // Используем это поле для хранения runId
      status: 'researching', // Начальный статус
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
