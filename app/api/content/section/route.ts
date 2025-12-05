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
      goal,
      tone,
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

    const prompt = `Напиши секцию для большой статьи.

ОБЩАЯ ИНФОРМАЦИЯ О СТАТЬЕ:
Тема статьи: ${topic}
Язык: ${language || 'RU'}
Целевая аудитория: ${audience || 'general'}
Цель контента: ${goal || 'SEO article'}
Тон: ${tone || 'neutral'}

СЕКЦИЯ, КОТОРУЮ НУЖНО НАПИСАТЬ:
Заголовок секции: ${sectionTitle}
Описание: ${sectionDescription || ''}

ВАЖНО:
- Это часть большой статьи, не повторяй общую информацию
- Сфокусируйся на теме этой секции
- ЖЕСТКИЙ ЛИМИТ: 800-1500 слов максимум
- Используй естественный стиль без AI-штампов
- Структурируй текст с подзаголовками H3 где нужно
- Начни с H2 заголовка секции

Верни ТОЛЬКО HTML контент секции (без оберток, без JSON, только HTML):
<h2>Заголовок секции</h2>
<p>Текст секции...</p>`;

    // Таймаут 50 секунд для секции (запас для Vercel, но в пределах 60 сек)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 50000);

    try {
      const completion = await openai.chat.completions.create(
        {
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `Ты Content Section Writer - эксперт по написанию компактных секций статей.

ПРАВИЛА:
- Это часть большой статьи, не повторяй общую информацию
- Сфокусируйся на конкретной теме секции
- Используй естественный, человеческий стиль без AI-штампов
- Структурируй текст с подзаголовками H3 где нужно
- ЖЕСТКИЙ ЛИМИТ: 800-1500 слов максимум
- Верни ТОЛЬКО HTML контент секции, начинай с H2 для заголовка секции`,
            },
            { role: 'user', content: prompt },
          ],
          temperature: 0.7,
          max_tokens: 3000, // Ограничиваем токены для быстрой генерации
        },
        {
          signal: controller.signal,
          timeout: 45000, // Таймаут на уровне OpenAI клиента
        }
      );

      clearTimeout(timeoutId);

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Ответ от OpenAI не получен');
      }

      let sectionHtml = content.trim();
      
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

      const duration = Date.now() - startTime;
      console.log(`[SECTION] Генерация секции "${sectionTitle}" завершена за ${duration}ms`);

      return NextResponse.json({
        success: true,
        sectionHtml,
      });
    } catch (abortError: any) {
      clearTimeout(timeoutId);
      if (abortError.name === 'AbortError' || abortError.message?.includes('aborted')) {
        throw new Error(`Превышено время ожидания генерации секции "${sectionTitle}" (50 секунд)`);
      }
      throw abortError;
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
