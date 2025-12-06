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
  // Примечание: OpenAI Assistants API поддерживает web_search как встроенный инструмент
  // Если web_search недоступен, модель будет использовать свои знания и может запросить дополнительные данные
  const assistant = await openai.beta.assistants.create({
    name: 'Article Creator Assistant',
    instructions: `Ты эксперт по созданию SEO-статей. Твоя задача - создать полноценную статью на основе поиска и анализа существующих материалов в интернете.

ПРОЦЕСС РАБОТЫ:

1. ПОИСК СТАТЕЙ В GOOGLE:
   - Используй доступные web-инструменты (web_search, web_fetch) для поиска статей по заданной теме
   - Изучи топ-10 результатов поиска Google
   - Проанализируй заголовки, сниппеты и описания результатов

2. ВЫБОР ЛУЧШИХ СТАТЕЙ:
   - Выбери 2-3 лучшие статьи из топ-10 результатов
   - Критерии выбора: релевантность теме, качество контента, авторитетность источника, полнота информации
   - Приоритет отдавай статьям с глубоким раскрытием темы

3. ПАРСИНГ И ИЗВЛЕЧЕНИЕ КОНТЕНТА:
   - Используй web_fetch или аналогичные инструменты для получения полного текста выбранных статей
   - Извлеки основной контент статьи, игнорируя меню, сайдбары, футеры, комментарии, рекламу
   - Определи ключевые идеи, структуру и важные факты из каждой статьи
   - Выдели общие темы и уникальные инсайты

4. СОЗДАНИЕ СТАТЬИ:
   - Напиши одну новую статью путем рерайта и объединения структур из выбранных статей
   - Используй параметры из запроса пользователя:
     * Язык: строго соблюдай указанный язык (например, RU для русского)
     * Желаемая длина: создай статью примерно указанного размера в словах
     * Аудитория: адаптируй стиль и сложность под целевую аудиторию
     * Авторская персона: используй соответствующий стиль (expert, beginner, practitioner и т.д.)
     * Угол подачи: соблюдай указанный угол (informative, practical, analytical и т.д.)
     * Цель контента: учитывай цель (SEO article, Blog post, Guide и т.д.)
     * Сложность: регулируй глубину и детализацию (low, medium, high)
   - Создай уникальный контент, не копируй текст дословно - делай рерайт
   - Объедини лучшие структуры и идеи из разных источников в единую логичную статью
   - Структурируй статью с заголовками H1, H2, H3 где необходимо
   - Используй естественный, человеческий стиль без AI-штампов
   - Избегай длинных тире (—), используй обычные дефисы (-) или запятые
   - Добавь введение и заключение

ФОРМАТ ОТВЕТА:
Верни ТОЛЬКО HTML контент статьи без дополнительного текста, без JSON обёрток, без markdown блоков:

<h1>Заголовок статьи</h1>
<p>Введение статьи...</p>
<h2>Заголовок первой секции</h2>
<p>Текст секции...</p>
<h3>Подзаголовок</h3>
<p>Продолжение текста...</p>
<h2>Заголовок второй секции</h2>
<p>Текст секции...</p>
<p>Заключение статьи...</p>

ВАЖНО:
- ВСЯ работа по поиску, выбору статей, парсингу и объединению делается ТОЛЬКО через твои web-инструменты
- НЕ проси пользователя предоставить источники - найди их сам через web_search
- НЕ парси HTML вручную - используй web_fetch для получения контента страниц
- Создавай уникальный контент на основе анализа источников, делай рерайт, не копируй дословно
- Строго соблюдай заданную длину статьи (примерно указанное количество слов)
- Используй указанный язык (если RU - весь текст на русском, если EN - на английском и т.д.)
- Учитывай целевую аудиторию и стиль подачи из параметров
- Если web-инструменты недоступны, используй свои знания, но укажи это в статье`,
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
