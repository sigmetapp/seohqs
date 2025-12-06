import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-utils';
import { createJob, updateJob } from '@/lib/db-article-jobs';
import { getOpenAIClient, getArticleCreatorAssistant } from '@/lib/article-assistants';
import { fetchGoogleSerpTop10, type SerpResult } from '@/lib/googleSerp';

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

/**
 * Builds the GOOGLE_SERP_TOP10 block for the assistant user message
 */
function buildGoogleSerpBlock(results: SerpResult[]): string {
  return [
    'GOOGLE_SERP_TOP10:',
    ...results.map((r, index) =>
      `${index + 1}) ${r.url} - ${r.title || ''} - ${r.snippet || ''}`
    ),
    '',
  ].join('\n');
}

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
      debug,
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

    // Fetch Google SERP top 10 results
    let serpResults: SerpResult[];
    try {
      serpResults = await fetchGoogleSerpTop10({
        query: topic,
        language: language || undefined,
        country: undefined, // Can be extended if needed
      });
    } catch (error: any) {
      console.error('[ARTICLE/CREATE] SERP request failed:', error);
      return NextResponse.json(
        { success: false, error: 'SERP request failed' },
        { status: 500 }
      );
    }

    // Validate that we have at least 2 SERP results with non-empty URLs
    const validResults = serpResults.filter((r) => r.url && r.url.trim().length > 0);
    if (validResults.length < 2) {
      return NextResponse.json(
        { success: false, error: 'Not enough Google SERP results' },
        { status: 400 }
      );
    }

    // Use only valid results (max 10)
    const top10Results = validResults.slice(0, 10);

    // Получаем OpenAI клиент и ассистента
    const openai = await getOpenAIClient();
    const assistantId = await getArticleCreatorAssistant(openai);

    // Создаём thread
    const thread = await openai.beta.threads.create();
    
    // Build the GOOGLE_SERP_TOP10 block
    const serpBlock = buildGoogleSerpBlock(top10Results);
    const debugFlag = debug ? 'DEBUG_MODE_ON' : '';

    // Формируем промпт с параметрами для ассистента
    // Ассистент должен использовать только URLs из GOOGLE_SERP_TOP10 блока
    const userContent = [
      `topic: ${topic}`,
      `language: ${language || 'RU'}`,
      `desired length: ${desiredLength || '2000'}`,
      `audience: ${audience || 'general'}`,
      `persona: ${authorPersona || 'expert'}`,
      `angle: ${angle || 'informative'}`,
      `content goal: ${contentGoal || 'SEO article'}`,
      `complexity: ${complexity || 'medium'}`,
      constraints ? `constraints: ${constraints}` : '',
      '',
      serpBlock,
      debugFlag,
    ]
      .filter((line) => line !== '')
      .join('\n');

    // Создаём сообщение пользователя
    await openai.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: userContent,
    });

    // Запускаем run ассистента
    let run;
    try {
      run = await openai.beta.threads.runs.create(thread.id, {
        assistant_id: assistantId,
      });
    } catch (error: any) {
      console.error('[ARTICLE/CREATE] Assistant run failed:', error);
      // Update job status to failed
      await updateJob(jobId, {
        status: 'failed',
      });
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to start assistant run',
        },
        { status: 500 }
      );
    }

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
