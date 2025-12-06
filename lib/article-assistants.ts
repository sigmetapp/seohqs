// Утилиты для работы с OpenAI Assistants для генерации статей

import OpenAI from 'openai';
import { getSetting } from './db-settings';

export interface ResearchResult {
  outline: {
    title: string;
    sections: Array<{
      id: string;
      title: string;
      description: string;
    }>;
  };
  sectionNotes: Record<string, string>; // sectionId -> notes
  sources: Array<{
    url: string;
    title: string;
    snippet: string;
  }>;
}

/**
 * Получает клиент OpenAI
 */
export async function getOpenAIClient(): Promise<OpenAI> {
  const apiKeySetting = await getSetting('openai_api_key');
  const apiKey = apiKeySetting?.value || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenAI API Key не настроен. Обратитесь к администратору.');
  }
  return new OpenAI({ apiKey });
}

/**
 * Получает или создаёт ассистента RESEARCH_OUTLINE_ASSISTANT
 */
export async function getResearchOutlineAssistant(openai: OpenAI): Promise<string> {
  const assistantIdSetting = await getSetting('openai_outline_assistant_id');
  let assistantId = assistantIdSetting?.value;

  if (assistantId) {
    try {
      await openai.beta.assistants.retrieve(assistantId);
      return assistantId;
    } catch (error) {
      console.warn(`[ASSISTANTS] Ассистент ${assistantId} не найден, создаём нового`);
    }
  }

  // Создаём нового ассистента
  const assistant = await openai.beta.assistants.create({
    name: 'Research Outline Assistant',
    instructions: `Ты эксперт по исследованию тем и созданию SEO-структур статей.

Твоя задача:
1. По теме и параметрам формы запросить Google через web_search
2. Выбрать 2-3 лучшие статьи по теме
3. На основе этих статей построить SEO-outline с секциями
4. Для каждой секции создать краткие notes (ключевые моменты для написания)
5. Вернуть структурированный JSON с outline, sectionNotes и sources

Формат ответа (ТОЛЬКО JSON, без дополнительного текста):
{
  "outline": {
    "title": "Заголовок статьи (H1)",
    "sections": [
      {
        "id": "section-1",
        "title": "Заголовок секции",
        "description": "Краткое описание содержания секции"
      }
    ]
  },
  "sectionNotes": {
    "section-1": "Ключевые моменты для написания этой секции: ...",
    "section-2": "..."
  },
  "sources": [
    {
      "url": "https://example.com/article",
      "title": "Название статьи",
      "snippet": "Краткое описание статьи"
    }
  ]
}

ВАЖНО:
- Используй web_search для поиска актуальной информации
- Выбирай качественные источники
- Создавай логичную структуру с 5-10 секциями
- Notes должны быть конкретными и полезными для написания`,
    model: 'gpt-4o',
    tools: [{ type: 'web_search' }],
  });

  // Сохраняем ID ассистента в настройках
  const { setSetting } = await import('./db-settings');
  await setSetting('openai_outline_assistant_id', assistant.id, 'ID ассистента для исследования и создания структуры статей');

  return assistant.id;
}

/**
 * Получает или создаёт ассистента SECTION_WRITER_FROM_RESEARCH
 */
export async function getSectionWriterAssistant(openai: OpenAI): Promise<string> {
  const assistantIdSetting = await getSetting('openai_section_assistant_id');
  let assistantId = assistantIdSetting?.value;

  if (assistantId) {
    try {
      await openai.beta.assistants.retrieve(assistantId);
      return assistantId;
    } catch (error) {
      console.warn(`[ASSISTANTS] Ассистент ${assistantId} не найден, создаём нового`);
    }
  }

  // Создаём нового ассистента
  const assistant = await openai.beta.assistants.create({
    name: 'Section Writer from Research',
    instructions: `Ты эксперт по написанию секций статей на русском языке.

Твоя задача:
1. Получить информацию о секции (заголовок, описание, notes из research)
2. Написать полную HTML-секцию на русском языке
3. Использовать естественный, человеческий стиль без AI-штампов
4. Структурировать текст с подзаголовками H3 где нужно
5. Начинать с H2 заголовка секции

Формат ответа (ТОЛЬКО HTML, без дополнительного текста, без JSON обёрток):
<h2>Заголовок секции</h2>
<p>Текст секции...</p>
<h3>Подзаголовок</h3>
<p>Продолжение текста...</p>

ВАЖНО:
- Это часть большой статьи, не повторяй общую информацию
- Сфокусируйся на теме этой секции
- Используй notes из research для структурирования контента
- Естественный стиль, без длинных тире
- 800-1500 слов максимум`,
    model: 'gpt-4o',
    tools: [], // Без web_search, используем только research notes
  });

  // Сохраняем ID ассистента в настройках
  const { setSetting } = await import('./db-settings');
  await setSetting('openai_section_assistant_id', assistant.id, 'ID ассистента для написания секций статей');

  return assistant.id;
}

/**
 * Получает или создаёт ассистента CLEANUP_HUMANIZER
 */
export async function getCleanupHumanizerAssistant(openai: OpenAI): Promise<string> {
  const assistantIdSetting = await getSetting('openai_cleanup_assistant_id');
  let assistantId = assistantIdSetting?.value;

  if (assistantId) {
    try {
      await openai.beta.assistants.retrieve(assistantId);
      return assistantId;
    } catch (error) {
      console.warn(`[ASSISTANTS] Ассистент ${assistantId} не найден, создаём нового`);
    }
  }

  // Создаём нового ассистента
  const assistant = await openai.beta.assistants.create({
    name: 'Cleanup Humanizer',
    instructions: `Ты эксперт по финальной обработке статей для придания им человеческого стиля.

Твоя задача:
1. Получить готовый HTML статьи
2. Сделать финальный human-like cleanup:
   - Убрать AI-штампы и неестественные фразы
   - Улучшить плавность переходов между секциями
   - Убрать длинные тире (—) и заменить на обычные дефисы или запятые
   - Проверить согласованность стиля
   - Улучшить читаемость
3. Вернуть очищенный HTML

Формат ответа (ТОЛЬКО HTML, без дополнительного текста, без JSON обёрток):
<h1>Заголовок</h1>
<p>Текст...</p>

ВАЖНО:
- Сохраняй структуру HTML
- Улучшай стиль, но не меняй содержание
- Убирай длинные тире (—)
- Делай текст более естественным и читаемым`,
    model: 'gpt-4o',
    tools: [],
  });

  // Сохраняем ID ассистента в настройках
  const { setSetting } = await import('./db-settings');
  await setSetting('openai_cleanup_assistant_id', assistant.id, 'ID ассистента для финальной очистки статей');

  return assistant.id;
}

/**
 * Получает текущий статус run без ожидания (для polling на клиенте)
 */
export async function getRunStatus(
  openai: OpenAI,
  threadId: string,
  runId: string
): Promise<{ status: string; result?: any }> {
  const run = await openai.beta.threads.runs.retrieve(threadId, runId);
  
  if (run.status === 'completed') {
    // Получаем результат
    const messages = await openai.beta.threads.messages.list(threadId, {
      limit: 1,
      order: 'desc',
    });

    const assistantMessage = messages.data[0];
    if (assistantMessage && assistantMessage.role === 'assistant') {
      const content = assistantMessage.content[0];
      if (content.type === 'text') {
        return {
          status: 'completed',
          result: content.text.value,
        };
      }
    }
    
    return { status: 'completed' };
  }

  if (run.status === 'failed') {
    throw new Error(run.last_error?.message || 'Run failed');
  }

  if (run.status === 'cancelled' || run.status === 'expired') {
    throw new Error(`Run ${run.status}`);
  }

  // Run ещё выполняется
  return { status: run.status };
}

/**
 * Опрашивает статус run у ассистента с ожиданием завершения
 */
export async function pollRunStatus(
  openai: OpenAI,
  threadId: string,
  runId: string,
  timeoutMs: number = 300000 // 5 минут по умолчанию
): Promise<{ status: string; result?: any }> {
  const startTime = Date.now();
  const pollInterval = 1000; // 1 секунда

  while (true) {
    const { status, result } = await getRunStatus(openai, threadId, runId);
    
    if (status === 'completed') {
      return { status, result };
    }

    // Проверяем таймаут
    const elapsed = Date.now() - startTime;
    if (elapsed > timeoutMs) {
      throw new Error(`Timeout: run не завершился за ${timeoutMs}ms`);
    }

    // Ждём перед следующей проверкой
    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }
}

/**
 * Парсит результат research из ответа ассистента
 */
export function parseResearchResult(text: string): ResearchResult {
  // Извлекаем JSON из ответа
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('JSON не найден в ответе ассистента');
  }

  const parsed = JSON.parse(jsonMatch[0]);

  return {
    outline: parsed.outline || { title: '', sections: [] },
    sectionNotes: parsed.sectionNotes || {},
    sources: parsed.sources || [],
  };
}
