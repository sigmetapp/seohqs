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

    const prompt = `Напиши секцию для большой статьи.

КОНТЕКСТ СТАТЬИ:
Тема статьи: ${topic}
Язык: ${language || 'RU'}
Целевая аудитория: ${audience || 'general'}
Авторская персона: ${authorPersona || 'эксперт'}
Угол подачи: ${angle || 'информативный'}
Цель контента: ${contentGoal || 'SEO article'}

СЕКЦИЯ, КОТОРУЮ НУЖНО НАПИСАТЬ:
Заголовок секции: ${sectionTitle}
Описание: ${sectionDescription || ''}
Индекс секции: ${sectionIndex !== undefined ? sectionIndex : 0}

ВАЖНО:
- Это часть большой статьи, не повторяй общую информацию
- Сфокусируйся на теме этой секции
- ЛИМИТ: 800-1500 слов для этой секции
- Используй естественный стиль без AI-штампов
- Структурируй текст с подзаголовками H3 где нужно
- Начни с H2 заголовка секции

Верни ТОЛЬКО HTML контент секции (без оберток, без JSON, только HTML):
<h2>Заголовок секции</h2>
<p>Текст секции...</p>`;

    // Максимум 1 повтор при ошибке, чтобы избежать 3 тяжелых ретраев подряд
    const maxRetries = 1;
    let lastError: Error | null = null;

    for (let retryAttempt = 0; retryAttempt <= maxRetries; retryAttempt++) {
      try {
        // Таймаут 50 секунд для секции (всегда <60 сек для Vercel)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          controller.abort();
        }, 50000);

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
          let attempts = 0;
          const maxAttempts = 50; // 50 секунд максимум (1 сек * 50 попыток)

          while ((runStatus.status === 'queued' || runStatus.status === 'in_progress') && attempts < maxAttempts) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
            attempts++;
            
            // Проверяем таймаут
            if (Date.now() - startTime > 50000) {
              throw new Error(`Превышено время ожидания генерации секции "${sectionTitle}" (50 секунд)`);
            }
          }

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

          clearTimeout(timeoutId);
          const duration = Date.now() - startTime;
          console.log(`[SECTION] Генерация секции "${sectionTitle}" завершена за ${duration}ms`);

          return NextResponse.json({
            success: true,
            sectionHtml,
          });
        } catch (abortError: any) {
          clearTimeout(timeoutId);
          if (abortError.name === 'AbortError' || abortError.message?.includes('aborted') || abortError.message?.includes('timeout')) {
            throw new Error(`Превышено время ожидания генерации секции "${sectionTitle}" (50 секунд)`);
          }
          throw abortError;
        }
      } catch (error: any) {
        lastError = error;
        
        // Если это последняя попытка или ошибка не подлежит повтору, выбрасываем ошибку
        if (retryAttempt >= maxRetries) {
          break;
        }
        
        // Не повторяем при таймауте или критических ошибках
        if (error.message?.includes('timeout') || 
            error.message?.includes('50 секунд') ||
            error.message?.includes('не настроен') ||
            error.message?.includes('не найден')) {
          break;
        }
        
        // Небольшая задержка перед повтором
        await new Promise((resolve) => setTimeout(resolve, 1000));
        console.log(`[SECTION] Повторная попытка генерации секции "${sectionTitle}" (попытка ${retryAttempt + 1}/${maxRetries + 1})`);
      }
    }

    // Если дошли сюда, значит все попытки исчерпаны
    throw lastError || new Error(`Не удалось сгенерировать секцию "${sectionTitle}" после ${maxRetries + 1} попыток`);
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
