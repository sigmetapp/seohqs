import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-utils';
import { getJob } from '@/lib/db-article-jobs';

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

    // Подсчитываем прогресс по секциям
    const totalSections = job.outline?.sections?.length || 0;
    const completedSections = job.sections?.filter((s: any) => s.status === 'completed').length || 0;
    const sectionsProgress = job.sections || [];

    return NextResponse.json({
      success: true,
      job: {
        jobId: job.job_id,
        status: job.status,
        topic: job.topic,
        outline: job.outline,
        sources: job.sources,
        progress: {
          totalSections,
          completedSections,
          sections: sectionsProgress.map((s: any) => ({
            sectionId: s.sectionId,
            status: s.status,
            completedAt: s.completed_at,
          })),
        },
        finalHtml: job.final_html,
        metaTitle: job.meta_title,
        metaDescription: job.meta_description,
        createdAt: job.created_at,
        updatedAt: job.updated_at,
      },
    });
  } catch (error: any) {
    console.error('[ARTICLE/STATUS] Ошибка:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Ошибка получения статуса задачи',
      },
      { status: 500 }
    );
  }
}
