import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-utils';
import { getJob, updateJob } from '@/lib/db-article-jobs';
import { getOpenAIClient, getSectionWriterAssistant, pollRunStatus } from '@/lib/article-assistants';

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
    const { jobId, sectionId } = body;

    if (!jobId || !sectionId) {
      return NextResponse.json(
        { success: false, error: 'jobId и sectionId обязательны' },
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

    // Проверяем, что research завершён
    if (job.status !== 'research_completed' && job.status !== 'writing_sections') {
      return NextResponse.json(
        { success: false, error: `Research ещё не завершён. Текущий статус: ${job.status}` },
        { status: 400 }
      );
    }

    // Находим секцию в outline
    if (!job.outline || !job.outline.sections) {
      return NextResponse.json(
        { success: false, error: 'Outline не найден' },
        { status: 400 }
      );
    }

    const section = job.outline.sections.find((s: any) => s.id === sectionId);
    if (!section) {
      return NextResponse.json(
        { success: false, error: 'Секция не найдена в outline' },
        { status: 400 }
      );
    }

    // Получаем notes для этой секции
    const sectionNotes = job.section_notes?.[sectionId] || section.description || '';

    // Обновляем статус задачи на writing_sections
    if (job.status === 'research_completed') {
      await updateJob(jobId, {
        status: 'writing_sections',
        sections: [], // Инициализируем массив секций
      });
    }

    // Получаем OpenAI клиент и ассистента
    const openai = await getOpenAIClient();
    const assistantId = await getSectionWriterAssistant(openai);

    // Создаём thread для генерации секции
    const thread = await openai.beta.threads.create();

    const prompt = `Напиши секцию для большой статьи на русском языке.

ОБЩАЯ ИНФОРМАЦИЯ О СТАТЬЕ:
Тема статьи: ${job.topic}
Язык: ${job.language || 'RU'}
Целевая аудитория: ${job.audience || 'general'}
Авторская персона: ${job.author_persona || 'expert'}
Угол подачи: ${job.angle || 'informative'}
Цель контента: ${job.content_goal || 'SEO article'}
Сложность: ${job.complexity || 'medium'}

СЕКЦИЯ, КОТОРУЮ НУЖНО НАПИСАТЬ:
Заголовок секции: ${section.title}
Описание: ${section.description}
Notes из research: ${sectionNotes}

ВАЖНО:
- Это часть большой статьи, не повторяй общую информацию
- Сфокусируйся на теме этой секции
- Используй notes из research для структурирования контента
- Естественный стиль без AI-штампов
- Структурируй текст с подзаголовками H3 где нужно
- Начни с H2 заголовка секции
- 800-1500 слов максимум
- Без длинных тире (—)

Верни ТОЛЬКО HTML контент секции (без оберток, без JSON, только HTML):
<h2>Заголовок секции</h2>
<p>Текст секции...</p>`;

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
      let sectionHtml = result.trim();
      sectionHtml = sectionHtml.replace(/^```html\n?/i, '').replace(/^```\n?/i, '').replace(/\n?```$/i, '');
      
      if (sectionHtml.startsWith('{')) {
        try {
          const parsed = JSON.parse(sectionHtml);
          sectionHtml = parsed.html || parsed.sectionHtml || sectionHtml;
        } catch {
          // Не JSON, оставляем как есть
        }
      }

      // Обновляем массив секций в задаче
      const currentSections = job.sections || [];
      const sectionIndex = currentSections.findIndex((s: any) => s.sectionId === sectionId);
      
      const sectionData = {
        sectionId,
        html: sectionHtml,
        status: 'completed',
        completed_at: new Date().toISOString(),
      };

      let updatedSections;
      if (sectionIndex >= 0) {
        updatedSections = [...currentSections];
        updatedSections[sectionIndex] = sectionData;
      } else {
        updatedSections = [...currentSections, sectionData];
      }

      await updateJob(jobId, {
        sections: updatedSections,
      });

      return NextResponse.json({
        success: true,
        sectionHtml,
        sectionId,
      });
    }

    throw new Error('Run не завершился успешно');
  } catch (error: any) {
    console.error('[ARTICLE/WRITE-SECTION] Ошибка:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Ошибка генерации секции',
      },
      { status: 500 }
    );
  }
}
