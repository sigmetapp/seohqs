import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-utils';
import { getJob, updateJob } from '@/lib/db-article-jobs';
import { getOpenAIClient, getRunStatus } from '@/lib/article-assistants';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Пользователь не авторизован' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const threadId = searchParams.get('threadId');
    const runId = searchParams.get('runId');
    const jobId = searchParams.get('jobId'); // Для обратной совместимости

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

      // Проверяем права доступа
      if (job.user_id !== user.id) {
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
        // Очищаем HTML от markdown блоков и JSON обёрток
        let articleHtml = result.trim();
        articleHtml = articleHtml.replace(/^```html\n?/i, '').replace(/^```\n?/i, '').replace(/\n?```$/i, '');
        
        if (articleHtml.startsWith('{')) {
          try {
            const parsed = JSON.parse(articleHtml);
            articleHtml = parsed.html || parsed.articleHtml || parsed.article || articleHtml;
          } catch {
            // Не JSON, оставляем как есть
          }
        }

        // Если есть job, обновляем его в БД
        if (job) {
          await updateJob(job.job_id, {
            status: 'completed',
            final_html: articleHtml,
          });
        }

        return NextResponse.json({
          success: true,
          status: 'completed',
          article: articleHtml,
        });
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
