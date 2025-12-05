import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-utils';
import { getSetting } from '@/lib/db-settings';
import OpenAI from 'openai';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface ContentGenerationRequest {
  mainQuery: string;
  language: string;
  targetAudience: string;
  contentGoal: string;
  desiredLength: string;
  toneOfVoice: string;
  additionalConstraints?: string;
}

interface StepResult {
  step: string;
  status: 'pending' | 'in_progress' | 'done' | 'error';
  result?: string;
  error?: string;
}

async function getOpenAIClient(): Promise<OpenAI> {
  const apiKeySetting = await getSetting('openai_api_key');
  const apiKey = apiKeySetting?.value || process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('OpenAI API Key не настроен. Обратитесь к администратору.');
  }

  return new OpenAI({ apiKey });
}

const SYSTEM_PROMPT = `Ты SEO-копирайтер. Создай качественный контент через 6 этапов:
1. DRAFT - развернутый черновик с логичной структурой
2. SEO STRUCTURING - улучши структуру (H2/H3, блоки, подзапросы)
3. HUMANIZATION - естественный стиль, без AI-штампов
4. UNIQUENESS - уникальные формулировки и переходы
5. QUALITY CHECK - убери повторы, воду, противоречия
6. HTML PACKAGING - HTML формат (h1, h2, h3, p), Meta title (55-60 символов), Meta description (155-160 символов), FAQ (4-8 вопросов)

ВАЖНО - ПРАВИЛА CHUNKING:
- Если запрошенный размер превышает 3000 слов, создавай контент размером примерно 3000-3500 слов (максимум 40000 символов в HTML)
- Не генерируй экстремально длинные ответы - следуй указанному размеру или ограничению в 40000 символов
- Разбивай длинный контент на логические блоки с четкой структурой
- Каждый раздел должен быть самодостаточным и информативным

Верни ТОЛЬКО валидный JSON:
{
  "html": "HTML контент с тегами h1, h2, h3, p (максимум 40000 символов)",
  "metaTitle": "Meta title до 60 символов",
  "metaDescription": "Meta description до 160 символов",
  "faqQuestions": ["Вопрос 1", "Вопрос 2", ...],
  "summary": "Краткий summary с ключевой идеей"
}`;

/**
 * POST /api/content-generator
 * Генерирует контент через многоступенчатый pipeline
 */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Пользователь не авторизован' },
        { status: 401 }
      );
    }

    let body: ContentGenerationRequest;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Неверный формат запроса' },
        { status: 400 }
      );
    }
    const {
      mainQuery,
      language,
      targetAudience,
      contentGoal,
      desiredLength,
      toneOfVoice,
      additionalConstraints,
    } = body;

    if (!mainQuery) {
      return NextResponse.json(
        { success: false, error: 'Основной запрос обязателен' },
        { status: 400 }
      );
    }

    const openai = await getOpenAIClient();
    const startTime = Date.now();

    // Используем Chat Completions API с оптимизированными параметрами
    const model = 'gpt-4o'; // Модель gpt-4o
    const desiredLengthNum = parseInt(desiredLength) || 2000;
    
    // Ограничиваем размер контента: максимум 40000 символов (примерно 3000-3500 слов)
    // Вычисляем max_tokens на основе желаемой длины, но с ограничением
    const maxWords = Math.min(desiredLengthNum, 3500);
    const maxTokens = Math.min(8000, Math.max(2000, Math.floor(maxWords * 1.5)));

    // Формируем промпт для генерации контента
    const userPrompt = `Создай контент по следующему запросу:

Основной запрос/тема: ${mainQuery}
Язык: ${language}
Целевая аудитория: ${targetAudience}
Цель контента: ${contentGoal}
Желаемый размер: ${maxWords} слов (максимум 40000 символов в HTML)
Тон: ${toneOfVoice}
${additionalConstraints ? `Дополнительные ограничения: ${additionalConstraints}` : ''}

Выполни все 6 этапов обработки и верни результат в формате JSON. Следуй правилам chunking - не превышай 40000 символов в HTML.`;
    
    // Создаем AbortController для контроля таймаута (50 сек для безопасности)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 50000);
    
    try {
      const completion = await openai.chat.completions.create(
        {
          model,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.7,
          max_tokens: maxTokens,
          response_format: { type: 'json_object' }, // Принудительно JSON формат
          // Оптимизация для скорости
          stream: false, // Явно отключаем streaming для простоты
        },
        {
          signal: controller.signal,
        }
      );
      
      clearTimeout(timeoutId);

      const assistantMessage = completion.choices[0]?.message?.content;
      if (!assistantMessage) {
        throw new Error('Ответ от OpenAI не получен');
      }

      // Парсим JSON ответ (response_format гарантирует JSON формат)
      let result: any;
      try {
        result = JSON.parse(assistantMessage.trim());
        
        // Проверяем наличие обязательных полей
        if (!result.html && !result.content) {
          // Если нет html или content, используем весь ответ как HTML
          result = {
            html: assistantMessage.trim(),
            metaTitle: result.metaTitle || '',
            metaDescription: result.metaDescription || '',
            faqQuestions: result.faqQuestions || [],
            summary: result.summary || '',
          };
        }
        
        // Если есть content вместо html, переименовываем
        if (result.content && !result.html) {
          result.html = result.content;
          delete result.content;
        }
        
        // Проверка размера HTML - не должен превышать 40000 символов
        if (result.html && result.html.length > 40000) {
          console.warn(`HTML контент превышает лимит: ${result.html.length} символов, обрезаем до 40000`);
          result.html = result.html.substring(0, 40000) + '...';
        }
      } catch (error) {
        console.error('Ошибка парсинга JSON:', error);
        // Fallback: возвращаем весь текст как HTML
        let fallbackHtml = assistantMessage.trim();
        if (fallbackHtml.length > 40000) {
          fallbackHtml = fallbackHtml.substring(0, 40000) + '...';
        }
        result = {
          html: fallbackHtml,
          metaTitle: '',
          metaDescription: '',
          faqQuestions: [],
          summary: '',
        };
      }

      const duration = Date.now() - startTime;
      console.log(`Content generation completed in ${duration}ms, tokens: ${maxTokens}, model: ${model}`);

      return NextResponse.json({
        success: true,
        result,
      });
    } catch (abortError: any) {
      clearTimeout(timeoutId);
      if (abortError.name === 'AbortError') {
        throw new Error('Превышено время ожидания ответа от OpenAI. Попробуйте уменьшить желаемый размер статьи или упростить запрос.');
      }
      throw abortError;
    }
  } catch (error: any) {
    console.error('Ошибка генерации контента:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Ошибка генерации контента',
      },
      { status: 500 }
    );
  }
}
