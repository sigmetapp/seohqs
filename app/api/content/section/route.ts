import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-utils';
import { getSetting } from '@/lib/db-settings';
import OpenAI from 'openai';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function getOpenAIClient(): Promise<OpenAI> {
  const apiKeySetting = await getSetting('openai_api_key');
  const apiKey = apiKeySetting?.value || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenAI API Key не настроен.');
  }
  return new OpenAI({ apiKey });
}

async function getSectionAssistantId(openai: OpenAI): Promise<string> {
  const assistantIdSetting = await getSetting('openai_section_assistant_id');
  const assistantId = assistantIdSetting?.value;
  
  if (!assistantId) {
    throw new Error('Content Section Writer ID не настроен. Укажите его в настройках администратора.');
  }
  
  // Проверяем, что ассистент существует
  try {
    await openai.beta.assistants.retrieve(assistantId);
    return assistantId;
  } catch (error) {
    throw new Error(`Content Section Writer с ID ${assistantId} не найден. Проверьте настройки.`);
  }
}

async function generateSection(
  openai: OpenAI,
  assistantId: string,
  topic: string,
  language: string,
  audience: string,
  authorPersona: string,
  angle: string,
  contentGoal: string,
  sectionTitle: string,
  sectionDescription: string,
  sectionIndex: number,
  complexityLevel: 'medium' | 'low',
  startTime: number,
  timeoutMs: number
): Promise<string> {
  // Определяем параметры стиля на основе complexityLevel
  let styleParams = '';
  let wordLimit = '800-1500';
  if (complexityLevel === 'low') {
    styleParams = 'Стиль: Low (быстрая короткая статья). Пиши кратко, поверхностно, без глубокого анализа. Минимум деталей и примеров.';
    wordLimit = '400-800';
  } else {
    // medium
    styleParams = 'Стиль: Medium (качественный блоговый контент). Пиши сбалансированно, с умеренной глубиной, включай примеры и полезные инсайты.';
    wordLimit = '800-1500';
  }

  // Промпт содержит только необходимые поля, без больших текстов статьи
  const prompt = `Напиши секцию для большой статьи.

КОНТЕКСТ СТАТЬИ:
Тема статьи: ${topic}
Язык: ${language || 'RU'}
Целевая аудитория: ${audience || 'general'}
Авторская персона: ${authorPersona || 'эксперт'}
Угол подачи: ${angle || 'информативный'}
Цель контента: ${contentGoal || 'SEO article'}
${styleParams}

СЕКЦИЯ, КОТОРУЮ НУЖНО НАПИСАТЬ:
Заголовок секции: ${sectionTitle}
Описание: ${sectionDescription || ''}
Индекс секции: ${sectionIndex !== undefined ? sectionIndex : 0}
Уровень сложности: ${complexityLevel}

ВАЖНО:
- Это часть большой статьи, не повторяй общую информацию
- Сфокусируйся на теме этой секции
- ЛИМИТ: ${wordLimit} слов для этой секции (примерно 900-1100 токенов на выходе)
- Используй естественный стиль без AI-штампов
- Структурируй текст с подзаголовками H3 где нужно
- Начни с H2 заголовка секции

Верни ТОЛЬКО HTML контент секции (без оберток, без JSON, только HTML):
<h2>Заголовок секции</h2>
<p>Текст секции...</p>`;

  // Таймаут для запроса
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    // Используем Assistants API
    const thread = await openai.beta.threads.create();
    await openai.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: prompt,
    });

    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: assistantId,
    });

    // Ждем завершения с таймаутом
    let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    const maxAttempts = Math.floor(timeoutMs / 1000); // количество секунд

    while ((runStatus.status === 'queued' || runStatus.status === 'in_progress')) {
      // Проверяем таймаут перед каждой итерацией
      if (Date.now() - startTime > timeoutMs) {
        clearTimeout(timeoutId);
        throw new Error(`Превышено время ожидания генерации секции "${sectionTitle}" (${Math.floor(timeoutMs / 1000)} секунд)`);
      }
      
      await new Promise((resolve) => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    }

    clearTimeout(timeoutId);

    if (runStatus.status === 'failed') {
      throw new Error(runStatus.last_error?.message || `Ошибка генерации секции "${sectionTitle}"`);
    }

    if (runStatus.status !== 'completed') {
      throw new Error(`Генерация секции не завершена. Статус: ${runStatus.status}`);
    }

    const messages = await openai.beta.threads.messages.list(thread.id, {
      limit: 1,
      order: 'desc',
    });

    const assistantMessage = messages.data[0];
    if (!assistantMessage || assistantMessage.role !== 'assistant') {
      throw new Error(`Ответ от ассистента не получен для секции "${sectionTitle}"`);
    }

    const content = assistantMessage.content[0];
    if (content.type !== 'text') {
      throw new Error(`Неожиданный формат ответа для секции "${sectionTitle}"`);
    }

    let sectionHtml = content.text.value.trim();
    
    // Убираем markdown код блоки, если есть
    sectionHtml = sectionHtml.replace(/^```html\n?/i, '').replace(/^```\n?/i, '').replace(/\n?```$/i, '');
    
    // Убираем JSON обертки, если есть
    if (sectionHtml.startsWith('{')) {
      try {
        const parsed = JSON.parse(sectionHtml);
        sectionHtml = parsed.html || parsed.sectionHtml || sectionHtml;
      } catch {
        // Не JSON, оставляем как есть
      }
    }

    return sectionHtml;
  } catch (abortError: any) {
    clearTimeout(timeoutId);
    if (abortError.name === 'AbortError' || abortError.message?.includes('aborted') || abortError.message?.includes('timeout') || abortError.message?.includes('Превышено время')) {
      throw new Error(`Превышено время ожидания генерации секции "${sectionTitle}" (${Math.floor(timeoutMs / 1000)} секунд)`);
    }
    throw abortError;
  }
}

export async function POST(request: Request) {
  const startTime = Date.now();
  
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Не авторизован' }, { status: 401 });
    }

    const body = await request.json();
    const {
      topic,
      language,
      audience,
      authorPersona,
      angle,
      contentGoal,
      sectionTitle,
      sectionDescription,
      sectionIndex,
    } = body;

    if (!topic || !sectionTitle) {
      return NextResponse.json(
        { success: false, error: 'Тема и заголовок секции обязательны' },
        { status: 400 }
      );
    }

    const openai = await getOpenAIClient();
    const assistantId = await getSectionAssistantId(openai);

    // Таймаут: ~55 секунд, но не больше 57 секунд (чтобы не упираться в лимит Vercel 60 секунд)
    const timeoutMs = 55000;

    // Первая попытка: всегда "medium"
    try {
      sectionHtml = await generateSection(
        openai,
        assistantId,
        topic,
        language || 'RU',
        audience || 'general',
        authorPersona || 'эксперт',
        angle || 'информативный',
        contentGoal || 'SEO article',
        sectionTitle,
        sectionDescription || '',
        sectionIndex !== undefined ? sectionIndex : 0,
        'medium',
        startTime,
        timeoutMs
      );

      const duration = Date.now() - startTime;
      console.log(`[SECTION] Генерация секции "${sectionTitle}" завершена за ${duration}ms (medium)`);

      return NextResponse.json({
        success: true,
        sectionHtml,
        complexityLevel: 'medium',
      });
    } catch (error: any) {
      // Проверяем, является ли ошибка таймаутом
      const isTimeout = error.message?.includes('Превышено время') || 
                       error.message?.includes('timeout') ||
                       error.message?.includes('aborted');

      if (!isTimeout) {
        // Если это не таймаут, возвращаем ошибку сразу
        throw error;
      }

      // Если это таймаут, делаем одну повторную попытку с "low"
      console.log(`[SECTION] Таймаут при генерации секции "${sectionTitle}" в режиме medium, повторяем с low`);
      
      try {
        const sectionHtml = await generateSection(
          openai,
          assistantId,
          topic,
          language || 'RU',
          audience || 'general',
          authorPersona || 'эксперт',
          angle || 'информативный',
          contentGoal || 'SEO article',
          sectionTitle,
          sectionDescription || '',
          sectionIndex !== undefined ? sectionIndex : 0,
          'low',
          startTime,
          timeoutMs
        );

        const duration = Date.now() - startTime;
        console.log(`[SECTION] Генерация секции "${sectionTitle}" завершена за ${duration}ms (low, после таймаута medium)`);

        return NextResponse.json({
          success: true,
          sectionHtml,
          complexityLevel: 'low',
        });
      } catch (retryError: any) {
        // Если и "low" не успел, возвращаем понятную ошибку
        const duration = Date.now() - startTime;
        console.error(`[SECTION] Ошибка генерации секции "${sectionTitle}" через ${duration}ms (medium -> low):`, retryError.message);
        
        throw new Error(`Не удалось сгенерировать секцию "${sectionTitle}" в отведенное время. Попробуйте уменьшить сложность или перегенерировать секцию позже.`);
      }
    }
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`[SECTION] Ошибка через ${duration}ms:`, error.message);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Ошибка генерации секции',
      },
      { status: 500 }
    );
  }
}
