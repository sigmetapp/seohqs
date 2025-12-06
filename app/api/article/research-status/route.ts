import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-utils';
import { getJob, updateJob } from '@/lib/db-article-jobs';
import { getOpenAIClient, pollRunStatus, parseResearchResult } from '@/lib/article-assistants';

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
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json(
        { success: false, error: 'jobId обязателен' },
        { status: 400 }
      );
    }

    // Получаем задачу
    const job = await getJob(jobId);
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

    if (!job.thread_id || !job.research_run_id) {
      return NextResponse.json({
        success: true,
        status: 'pending',
        message: 'Run ещё не запущен',
      });
    }

    // Опрашиваем статус run (без ожидания, просто проверяем текущий статус)
    const openai = await getOpenAIClient();
    const { getRunStatus } = await import('@/lib/article-assistants');
    
    try {
      const { status, result } = await getRunStatus(
        openai,
        job.thread_id,
        job.research_run_id
      );

      if (status === 'completed' && result) {
        // Парсим результат
        const researchResult = parseResearchResult(result);

        // Сохраняем результат в БД
        await updateJob(jobId, {
          status: 'research_completed',
          outline: researchResult.outline,
          section_notes: researchResult.sectionNotes,
          sources: researchResult.sources,
        });

        return NextResponse.json({
          success: true,
          status: 'completed',
          result: researchResult,
        });
      }

      // Если run ещё выполняется
      return NextResponse.json({
        success: true,
        status: 'in_progress',
        message: 'Research ещё выполняется',
      });
    } catch (error: any) {
      // Если таймаут или run ещё не завершён
      if (error.message?.includes('Timeout') || error.message?.includes('не завершился')) {
        return NextResponse.json({
          success: true,
          status: 'in_progress',
          message: 'Research ещё выполняется, попробуйте позже',
        });
      }

      // Если run завершился с ошибкой
      await updateJob(jobId, {
        status: 'failed',
      });

      throw error;
    }
  } catch (error: any) {
    console.error('[ARTICLE/RESEARCH-STATUS] Ошибка:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Ошибка проверки статуса research',
      },
      { status: 500 }
    );
  }
}
