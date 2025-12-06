// Утилиты для работы с OpenAI Assistants для генерации статей

import OpenAI from 'openai';
import { getSetting } from './db-settings';

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
 * Получает или создаёт ассистента ARTICLE_CREATOR_ASSISTANT
 * Этот ассистент выполняет всю работу по генерации статьи:
 * - поиск статей в Google
 * - выбор лучших 2-3 статей из топ-10
 * - парсинг и извлечение основного контента
 * - рерайт и объединение структур в одну статью
 */
export async function getArticleCreatorAssistant(openai: OpenAI): Promise<string> {
  const assistantIdSetting = await getSetting('openai_article_creator_assistant_id');
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
    name: 'Article Creator Assistant',
    instructions: `Ты эксперт по созданию SEO-статей. Твоя задача - создать полноценную статью на основе поиска и анализа существующих материалов.

ПРОЦЕСС РАБОТЫ:

1. ПОИСК СТАТЕЙ:
   - Используй web_search для поиска статей по заданной теме
   - Изучи топ-10 результатов поиска

2. ВЫБОР ЛУЧШИХ СТАТЕЙ:
   - Выбери 2-3 лучшие статьи из топ-10 результатов
   - Критерии выбора: релевантность, качество контента, авторитетность источника

3. АНАЛИЗ И ИЗВЛЕЧЕНИЕ КОНТЕНТА:
   - Используй результаты web_search для анализа содержания выбранных статей
   - На основе сниппетов и описаний из результатов поиска извлеки ключевые идеи и структуру
   - Сфокусируйся на основном контенте, игнорируя второстепенные элементы

4. СОЗДАНИЕ СТАТЬИ:
   - Напиши одну новую статью путем рерайта и объединения структур из выбранных статей
   - Используй параметры из запроса: язык, желаемая длина, аудитория, персона, угол подачи, цель контента, сложность
   - Создай уникальный контент, не копируй текст дословно
   - Структурируй статью с заголовками H1, H2, H3 где необходимо
   - Используй естественный, человеческий стиль без AI-штампов
   - Избегай длинных тире (—), используй обычные дефисы или запятые

ФОРМАТ ОТВЕТА:
Верни ТОЛЬКО HTML контент статьи без дополнительного текста, без JSON обёрток:

<h1>Заголовок статьи</h1>
<p>Введение...</p>
<h2>Заголовок секции</h2>
<p>Текст секции...</p>
<h3>Подзаголовок</h3>
<p>Продолжение текста...</p>

ВАЖНО:
- Вся работа по поиску, выбору статей, парсингу и объединению делается через твои web-инструменты
- Не проси пользователя предоставить источники - найди их сам
- Создавай уникальный контент на основе анализа источников
- Соблюдай заданную длину статьи
- Используй указанный язык
- Учитывай целевую аудиторию и стиль подачи`,
    model: 'gpt-4o',
    tools: [{ type: 'web_search' }],
  });

  // Сохраняем ID ассистента в настройках
  const { setSetting } = await import('./db-settings');
  await setSetting('openai_article_creator_assistant_id', assistant.id, 'ID ассистента для создания статей (поиск, парсинг, рерайт)');

  return assistant.id;
}

/**
 * Получает текущий статус run без ожидания (для polling на клиенте)
 */
export async function getRunStatus(
  openai: OpenAI,
  threadId: string,
  runId: string
): Promise<{ status: string; result?: string }> {
  const run = await openai.beta.threads.runs.retrieve(threadId, runId);
  
  if (run.status === 'completed') {
    // Получаем результат - последнее сообщение ассистента
    const messages = await openai.beta.threads.messages.list(threadId, {
      limit: 10,
      order: 'desc',
    });

    // Ищем последнее сообщение от ассистента
    for (const message of messages.data) {
      if (message.role === 'assistant') {
        const content = message.content[0];
        if (content.type === 'text') {
          return {
            status: 'completed',
            result: content.text.value,
          };
        }
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
