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

async function getOutlineAssistantId(openai: OpenAI): Promise<string> {
  const assistantIdSetting = await getSetting('openai_outline_assistant_id');
  const assistantId = assistantIdSetting?.value;
  
  if (!assistantId) {
    throw new Error('Outline Assistant ID не настроен. Укажите его в настройках администратора.');
  }
  
  // Проверяем, что ассистент существует
  try {
    await openai.beta.assistants.retrieve(assistantId);
    return assistantId;
  } catch (error) {
    throw new Error(`Outline Assistant с ID ${assistantId} не найден. Проверьте настройки.`);
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
      desiredLength,
      complexity,
      constraints
    } = body;

    if (!topic) {
      return NextResponse.json({ success: false, error: 'Тема обязательна' }, { status: 400 });
    }

    // Парсим desiredLength как число (желаемая длина в словах)
    const desiredLengthWords = parseInt(String(desiredLength || '2000'), 10);
    if (isNaN(desiredLengthWords) || desiredLengthWords <= 0) {
      return NextResponse.json({ success: false, error: 'Некорректное значение desiredLength' }, { status: 400 });
    }

    const openai = await getOpenAIClient();
    const assistantId = await getOutlineAssistantId(openai);

    // Определяем целевое количество секций на основе desiredLengthWords
    let targetSectionsMin: number;
    let targetSectionsMax: number;
    if (desiredLengthWords <= 700) {
      targetSectionsMin = 3;
      targetSectionsMax = 4;
    } else if (desiredLengthWords <= 1500) {
      targetSectionsMin = 4;
      targetSectionsMax = 6;
    } else {
      targetSectionsMin = 6;
      targetSectionsMax = 10;
    }

    // Определяем параметры структуры на основе complexity
    let structureParams = '';
    if (complexity === 'low') {
      structureParams = 'Стиль структуры: Low (быстрые короткие статьи). Создай простую структуру с минимальным количеством секций, поверхностной глубиной, без сложных противоречий и минимальными инсайтами.';
    } else if (complexity === 'high') {
      structureParams = 'Стиль структуры: High (экспертные лонгриды уровня редакторов). Создай глубокую структуру с большим количеством секций, глубокой проработкой тем, включая противоречивые точки зрения и плотные инсайты.';
    } else {
      structureParams = 'Стиль структуры: Medium (качественный блоговый контент). Создай сбалансированную структуру с умеренным количеством секций, средней глубиной проработки, некоторыми противоречиями и полезными инсайтами.';
    }

    const prompt = `Создай структуру статьи:

Тема: ${topic}
Язык: ${language || 'RU'}
Аудитория: ${audience || 'general'}
Авторская персона: ${authorPersona || 'эксперт'}
Угол подачи: ${angle || 'информативный'}
Цель контента: ${contentGoal || 'SEO article'}
Желаемый размер статьи: ${desiredLengthWords} слов (всего)
Целевое количество секций: ${targetSectionsMin}-${targetSectionsMax} секций
${structureParams}
ВАЖНО: complexityLevel влияет на количество секций, но количество секций должно соответствовать желаемой длине статьи. Для статьи в ${desiredLengthWords} слов создай ${targetSectionsMin}-${targetSectionsMax} секций.
${constraints ? `Дополнительные ограничения: ${constraints}` : ''}

Верни ТОЛЬКО JSON без дополнительного текста:
{
  "sections": [
    {
      "id": "section-1",
      "title": "Заголовок секции",
      "description": "Описание секции"
    }
  ]
}`;

    // Таймаут 30 секунд для outline (Assistants API может работать медленнее)
    const controller = new AbortController();
    const timeoutMs = 30000; // 30 секунд
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
      let attempts = 0;
      const maxAttempts = 60; // 30 секунд максимум (0.5 сек * 60 попыток)
      const pollInterval = 500; // Проверяем каждые 500мс для более быстрой реакции

      while ((runStatus.status === 'queued' || runStatus.status === 'in_progress') && attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, pollInterval));
        runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
        attempts++;
        
        // Проверяем таймаут
        const elapsed = Date.now() - startTime;
        if (elapsed > timeoutMs) {
          throw new Error(`Превышено время ожидания генерации структуры (${Math.round(elapsed / 1000)} секунд)`);
        }
      }

      if (runStatus.status === 'failed') {
        throw new Error(runStatus.last_error?.message || 'Ошибка генерации структуры');
      }

      if (runStatus.status !== 'completed') {
        throw new Error(`Генерация структуры не завершена. Статус: ${runStatus.status}`);
      }

      const messages = await openai.beta.threads.messages.list(thread.id, {
        limit: 1,
        order: 'desc',
      });

      const assistantMessage = messages.data[0];
      if (!assistantMessage || assistantMessage.role !== 'assistant') {
        throw new Error('Ответ от ассистента не получен');
      }

      const content = assistantMessage.content[0];
      if (content.type !== 'text') {
        throw new Error('Неожиданный формат ответа');
      }

      const responseText = content.text.value.trim();
      
      // Извлекаем JSON из ответа
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('JSON не найден в ответе ассистента');
      }

      let outline = JSON.parse(jsonMatch[0]);
      
      // Валидация структуры
      if (!Array.isArray(outline.sections)) {
        throw new Error('Неверный формат ответа от OpenAI: отсутствует массив sections');
      }

      let sectionsCount = outline.sections.length;
      let needsRebuild = false;

      // Проверяем соответствие количества секций желаемой длине
      if (desiredLengthWords <= 700 && sectionsCount > 4) {
        needsRebuild = true;
      } else if (desiredLengthWords > 700 && desiredLengthWords <= 1500 && (sectionsCount < 4 || sectionsCount > 6)) {
        needsRebuild = true;
      } else if (desiredLengthWords > 1500 && sectionsCount < 6) {
        needsRebuild = true;
      }

      // Если количество секций не соответствует, пытаемся пересобрать outline
      if (needsRebuild) {
        console.log(`[OUTLINE] Количество секций (${sectionsCount}) не соответствует желаемой длине (${desiredLengthWords} слов). Пересобираем outline...`);
        
        const rebuildPrompt = `Пересобери структуру статьи с правильным количеством секций:

Тема: ${topic}
Язык: ${language || 'RU'}
Аудитория: ${audience || 'general'}
Авторская персона: ${authorPersona || 'эксперт'}
Угол подачи: ${angle || 'информативный'}
Цель контента: ${contentGoal || 'SEO article'}
Желаемый размер статьи: ${desiredLengthWords} слов (всего)
Целевое количество секций: ${targetSectionsMin}-${targetSectionsMax} секций (ОБЯЗАТЕЛЬНО)
${structureParams}
ВАЖНО: Создай РОВНО ${targetSectionsMin}-${targetSectionsMax} секций. Не больше и не меньше. Количество секций должно соответствовать желаемой длине статьи.
${constraints ? `Дополнительные ограничения: ${constraints}` : ''}

Верни ТОЛЬКО JSON без дополнительного текста:
{
  "sections": [
    {
      "id": "section-1",
      "title": "Заголовок секции",
      "description": "Описание секции"
    }
  ]
}`;

        try {
          const rebuildThread = await openai.beta.threads.create();
          await openai.beta.threads.messages.create(rebuildThread.id, {
            role: 'user',
            content: rebuildPrompt,
          });

          const rebuildRun = await openai.beta.threads.runs.create(rebuildThread.id, {
            assistant_id: assistantId,
          });

          let rebuildRunStatus = await openai.beta.threads.runs.retrieve(rebuildThread.id, rebuildRun.id);
          let rebuildAttempts = 0;
          const rebuildMaxAttempts = 60;

          while ((rebuildRunStatus.status === 'queued' || rebuildRunStatus.status === 'in_progress') && rebuildAttempts < rebuildMaxAttempts) {
            await new Promise((resolve) => setTimeout(resolve, 500));
            rebuildRunStatus = await openai.beta.threads.runs.retrieve(rebuildThread.id, rebuildRun.id);
            rebuildAttempts++;
            
            const elapsed = Date.now() - startTime;
            if (elapsed > timeoutMs) {
              throw new Error(`Превышено время ожидания пересборки структуры (${Math.round(elapsed / 1000)} секунд)`);
            }
          }

          if (rebuildRunStatus.status === 'completed') {
            const rebuildMessages = await openai.beta.threads.messages.list(rebuildThread.id, {
              limit: 1,
              order: 'desc',
            });

            const rebuildAssistantMessage = rebuildMessages.data[0];
            if (rebuildAssistantMessage && rebuildAssistantMessage.role === 'assistant') {
              const rebuildContent = rebuildAssistantMessage.content[0];
              if (rebuildContent.type === 'text') {
                const rebuildResponseText = rebuildContent.text.value.trim();
                const rebuildJsonMatch = rebuildResponseText.match(/\{[\s\S]*\}/);
                if (rebuildJsonMatch) {
                  outline = JSON.parse(rebuildJsonMatch[0]);
                  if (Array.isArray(outline.sections)) {
                    sectionsCount = outline.sections.length;
                    console.log(`[OUTLINE] Outline пересобран, секций: ${sectionsCount}`);
                  }
                }
              }
            }
          }
        } catch (rebuildError: any) {
          console.warn(`[OUTLINE] Не удалось пересобрать outline: ${rebuildError.message}. Используем исходный outline.`);
        }

        // Если после пересборки все еще не соответствует, сокращаем секции (оставляем самые важные)
        if (desiredLengthWords <= 700 && sectionsCount > 4) {
          outline.sections = outline.sections.slice(0, 4);
          sectionsCount = 4;
          console.log(`[OUTLINE] Сократили количество секций до 4 (оставили первые 4)`);
        } else if (desiredLengthWords > 700 && desiredLengthWords <= 1500 && sectionsCount > 6) {
          outline.sections = outline.sections.slice(0, 6);
          sectionsCount = 6;
          console.log(`[OUTLINE] Сократили количество секций до 6 (оставили первые 6)`);
        }
      }

      const duration = Date.now() - startTime;
      console.log(`[OUTLINE] Генерация завершена за ${duration}ms, секций: ${sectionsCount}, желаемая длина: ${desiredLengthWords} слов`);

      return NextResponse.json({
        success: true,
        sections: outline.sections.map((s: any, i: number) => ({
          id: s.id || `section-${i + 1}`,
          title: s.title || '',
          description: s.description || '',
        })),
      });
    } catch (abortError: any) {
      clearTimeout(timeoutId);
      const elapsed = Date.now() - startTime;
      if (abortError.name === 'AbortError' || abortError.message?.includes('aborted') || abortError.message?.includes('timeout')) {
        throw new Error(`Превышено время ожидания генерации структуры (${Math.round(elapsed / 1000)} секунд)`);
      }
      throw abortError;
    }
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`[OUTLINE] Ошибка через ${duration}ms:`, error.message);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Ошибка генерации outline',
      },
      { status: 500 }
    );
  }
}
