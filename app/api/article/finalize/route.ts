import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-utils';
import { getJob, updateJob } from '@/lib/db-article-jobs';
import { getOpenAIClient, getCleanupHumanizerAssistant, pollRunStatus } from '@/lib/article-assistants';

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
    const { jobId } = body;

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

    // Проверяем, что все секции готовы
    if (!job.sections || job.sections.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Нет готовых секций для финализации' },
        { status: 400 }
      );
    }

    // Склеиваем все секции
    const sectionsHtml = job.sections
      .filter((s: any) => s.status === 'completed' && s.html)
      .sort((a: any, b: any) => {
        // Сортируем по порядку в outline
        const aIndex = job.outline?.sections?.findIndex((os: any) => os.id === a.sectionId) ?? -1;
        const bIndex = job.outline?.sections?.findIndex((os: any) => os.id === b.sectionId) ?? -1;
        return aIndex - bIndex;
      })
      .map((s: any) => s.html)
      .join('\n');

    if (!sectionsHtml) {
      return NextResponse.json(
        { success: false, error: 'Нет валидного HTML для финализации' },
        { status: 400 }
      );
    }

    // Обновляем статус на finalizing
    await updateJob(jobId, {
      status: 'finalizing',
    });

    // Получаем OpenAI клиент и ассистента для cleanup
    const openai = await getOpenAIClient();
    const assistantId = await getCleanupHumanizerAssistant(openai);

    // Создаём thread для cleanup
    const thread = await openai.beta.threads.create();

    const prompt = `Сделай финальный human-like cleanup статьи:

${sectionsHtml}

ВАЖНО:
- Сохрани структуру HTML
- Улучши стиль, но не меняй содержание
- Убери длинные тире (—) и замени на обычные дефисы или запятые
- Сделай текст более естественным и читаемым
- Убери AI-штампы и неестественные фразы
- Улучши плавность переходов между секциями

Верни ТОЛЬКО HTML без дополнительного текста, без JSON обёрток:`;

    await openai.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: prompt,
    });

    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: assistantId,
    });

    // Опрашиваем статус run (таймаут 30 секунд)
    const { status, result } = await pollRunStatus(
      openai,
      thread.id,
      run.id,
      30000
    );

    if (status === 'completed' && result) {
      // Очищаем HTML от markdown блоков и JSON обёрток
      let finalHtml = result.trim();
      finalHtml = finalHtml.replace(/^```html\n?/i, '').replace(/^```\n?/i, '').replace(/\n?```$/i, '');
      
      if (finalHtml.startsWith('{')) {
        try {
          const parsed = JSON.parse(finalHtml);
          finalHtml = parsed.html || parsed.finalHtml || finalHtml;
        } catch {
          // Не JSON, оставляем как есть
        }
      }

      // Обновляем задачу
      await updateJob(jobId, {
        status: 'completed',
        final_html: finalHtml,
      });

      return NextResponse.json({
        success: true,
        finalHtml,
      });
    }

    throw new Error('Run не завершился успешно');
  } catch (error: any) {
    console.error('[ARTICLE/FINALIZE] Ошибка:', error);
    
    // Обновляем статус на failed при ошибке
    try {
      await updateJob(body.jobId, {
        status: 'failed',
      });
    } catch (updateError) {
      // Игнорируем ошибку обновления
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Ошибка финализации статьи',
      },
      { status: 500 }
    );
  }
}
