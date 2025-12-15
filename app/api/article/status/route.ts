import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-utils';
import { getJob, updateJob } from '@/lib/db-article-jobs';
import { getOpenAIClient, getRunStatus } from '@/lib/article-assistants';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Извлекает блоки из ответа ассистента в debug режиме
 */
function extractBlocks(text: string): { sources: string; rewrite: string; article: string } {
  const sourcesMatch = text.match(/\[DEBUG_SOURCES\]([\s\S]*?)(?=\[DEBUG_REWRITE_PROMPT\]|$)/);
  const rewriteMatch = text.match(/\[DEBUG_REWRITE_PROMPT\]([\s\S]*?)(?=\[ARTICLE\]|$)/);
  const articleMatch = text.match(/\[ARTICLE\]([\s\S]*?)$/);
  
  const sources = sourcesMatch ? sourcesMatch[1].trim() : '';
  const rewrite = rewriteMatch ? rewriteMatch[1].trim() : '';
  // Если есть блок [ARTICLE], используем его, иначе пытаемся извлечь статью без debug блоков
  let article = articleMatch ? articleMatch[1].trim() : '';
  
  // Если статья не найдена в блоке [ARTICLE], но есть debug блоки, значит статья отсутствует
  // В этом случае возвращаем пустую строку, чтобы показать ошибку
  if (!article && (sources || rewrite)) {
    article = '';
  } else if (!article) {
    // Если нет debug блоков, значит это обычный режим - возвращаем весь текст
    article = extractArticleOnly(text);
  }
  
  return { sources, rewrite, article };
}

/**
 * Извлекает только статью из ответа (без debug блоков)
 */
function extractArticleOnly(text: string): string {
  // Если есть debug блоки, извлекаем только [ARTICLE]
  const articleMatch = text.match(/\[ARTICLE\]([\s\S]*?)$/);
  if (articleMatch) {
    return articleMatch[1].trim();
  }
  
  // Иначе возвращаем весь текст, очищенный от markdown и JSON
  let articleHtml = text.trim();
  articleHtml = articleHtml.replace(/^```html\n?/i, '').replace(/^```\n?/i, '').replace(/\n?```$/i, '');
  
  if (articleHtml.startsWith('{')) {
    try {
      const parsed = JSON.parse(articleHtml);
      articleHtml = parsed.html || parsed.articleHtml || parsed.article || articleHtml;
    } catch {
      // Не JSON, оставляем как есть
    }
  }
  
  return articleHtml;
}

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    // Используем user_id = 0 для неавторизованных пользователей
    const userId = user?.id || 0;

    const { searchParams } = new URL(request.url);
    const threadId = searchParams.get('threadId');
    const runId = searchParams.get('runId');
    const jobId = searchParams.get('jobId'); // Для обратной совместимости
    const debugParam = searchParams.get('debug');
    const debug = debugParam === '1' || debugParam === 'true';

    // Поддерживаем оба варианта: по threadId/runId или по jobId
    let job = null;
    let actualThreadId = threadId;
    let actualRunId = runId;

    if (jobId) {
      job = await getJob(jobId);
      if (!job) {
        return NextResponse.json(
          { success: false, error: 'Задача не найдена' },
          { status: 404 }
        );
      }

      // Проверяем права доступа только если пользователь авторизован
      if (user && job.user_id !== user.id && job.user_id !== 0) {
        return NextResponse.json(
          { success: false, error: 'Нет доступа к этой задаче' },
          { status: 403 }
        );
      }

      actualThreadId = job.thread_id || threadId;
      actualRunId = job.research_run_id || runId;
    } else if (!threadId || !runId) {
      return NextResponse.json(
        { success: false, error: 'threadId и runId обязательны (или jobId)' },
        { status: 400 }
      );
    }

    if (!actualThreadId || !actualRunId) {
      return NextResponse.json({
        success: true,
        status: 'pending',
        message: 'Run ещё не запущен',
      });
    }

    // Проверяем статус run
    const openai = await getOpenAIClient();
    
    try {
      const { status, result } = await getRunStatus(
        openai,
        actualThreadId,
        actualRunId
      );

      if (status === 'completed' && result) {
        let responseData: any = {
          success: true,
          status: 'completed',
        };

        if (debug) {
          // Debug режим: парсим все три блока
          const blocks = extractBlocks(result);
          responseData.debugSources = blocks.sources;
          responseData.debugRewritePrompt = blocks.rewrite;
          responseData.article = blocks.article || extractArticleOnly(result);
        } else {
          // Production режим: только статья
          responseData.article = extractArticleOnly(result);
        }

        // Если есть job, обновляем его в БД
        if (job) {
          await updateJob(job.job_id, {
            status: 'completed',
            final_html: responseData.article,
          });
        }

        return NextResponse.json(responseData);
      }

      // Run ещё выполняется
      return NextResponse.json({
        success: true,
        status: status, // queued, in_progress, etc.
      });
    } catch (error: any) {
      // Если run завершился с ошибкой
      if (job) {
        await updateJob(job.job_id, {
          status: 'failed',
        });
      }

      // Если это ошибка о том, что run ещё не завершён, возвращаем статус
      if (error.message?.includes('Run') && !error.message?.includes('failed')) {
        return NextResponse.json({
          success: true,
          status: 'in_progress',
        });
      }

      throw error;
    }
  } catch (error: any) {
    console.error('[ARTICLE/STATUS] Ошибка:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Ошибка проверки статуса задачи',
      },
      { status: 500 }
    );
  }
}
