import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-utils';
import { getOpenAIClient } from '@/lib/article-assistants';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const STRATEGY_PROMPTS: Record<string, string> = {
  mode1: `[РЕЖИМ 1: мягкий перефраз]
Цель: сделать текст более человеческим и плавным, не меняя структуру и логику.
Правила:
- Сохрани структуру абзацев.
- Сохрани смысл каждого предложения.
- Перепиши текст более простым и живым языком.
- Не добавляй новых идей и примеров.
- Не меняй порядок абзацев.`,

  mode2: `[РЕЖИМ 2: чистка штампов]
Цель: убрать "запах ИИ" и канцелярит.
Правила:
- Найди и переформулируй все штампованные или слишком общие фразы.
- Убери обороты вроде:
  "в современном мире",
  "на сегодняшний день",
  "не секрет, что",
  "подводя итог",
  "в заключение стоит отметить" и подобные.
- Сохрани смысл, но сделай формулировки более конкретными и естественными.
- Не добавляй новые примеры и истории, работай только с тем, что уже есть.`,

  mode3: `[РЕЖИМ 3: конкретизация]
Цель: сделать мысли более ясными и конкретными без придуманных фактов.
Правила:
- Найди слишком размытые формулировки и сделай их более понятными.
- Можно:
  - заменять общие слова на более точные, если это очевидно из контекста,
  - разбивать слишком длинные предложения на два,
  - объединять слишком мелко нарезанные предложения, если так читается легче.
- Нельзя придумывать новые истории, кейсы, цифры, факты.
- Общий объем текста должен остаться примерно таким же.`,

  mode4: `[РЕЖИМ 4: диалоговый ритм]
Цель: сделать текст более живым за счет ритма и легкого диалога.
Правила:
- Сохрани структуру и смысл текста.
- Сделай ритм более живым:
  - разбивай чрезмерно длинные предложения,
  - объединяй слишком рубленые, если это улучшает читабельность.
- Можно аккуратно добавить нейтральные риторические вопросы или мягкие обращения к читателю, но только если это логично по контексту.
- Не добавляй новые смысловые блоки и примеры.`,

  mode5: `[РЕЖИМ 5: финальная хуманизация]
Цель: финальная вычитка против "роботности".
Правила:
- Пройди по тексту как финальный редактор.
- Найди:
  - повторяющиеся конструкции в начале предложений и абзацев,
  - несколько однотипных по структуре предложений подряд,
  - слишком формальные и "канцелярские" фрагменты.
- Перепиши их более естественно.
- Смысл и структура разделов должны сохраниться.
- Не добавляй новые примеры и факты, только меняй формулировку.`,
};

const SYSTEM_PROMPT = `Ты редактор человеческих текстов.

Твоя роль:
- Ты НИКОГДА не пишешь текст с нуля.
- Ты ВСЕГДА редактируешь только тот текст, который дал пользователь.
- Ты не добавляешь новые смысловые блоки, которых явно нет в исходнике.
- Ты можешь:
  - упрощать формулировки,
  - перефразировать,
  - менять структуру предложений,
  - убирать штампы и канцелярит,
  - делать стиль более живым и человеческим,
  - немного менять порядок фраз, если смысл сохраняется.

Жесткие правила:
- Не придумывай новые факты, данные, кейсы, цифры, истории.
- Если пользователь дал только тему, а текста нет, попроси у него исходный текст для редактуры.
- Сохраняй общий объем текста плюс минус 20 процентов, не раздувай его.
- Не используй длинные тире, только обычный дефис "-".
- Язык ответа должен совпадать с языком исходного текста, если пользователь явно не просит перевод.
- Избегай штампов вроде: "в современном мире", "на сегодняшний день", "не секрет, что", "подводя итог", "в заключение стоит отметить" и любых подобных.

Пользователь может задавать режим работы в квадратных скобках: [РЕЖИМ 1], [РЕЖИМ 2] и т.д.
После режима пользователь дает текст в блоке между <<< и >>>.
Ты строго следуешь описанию выбранного режима.

Если пользователь не указал режим явно, веди себя как [РЕЖИМ 1] с элементами [РЕЖИМ 2] и обязательно НЕ пиши текст с нуля, а редактируй только то, что он прислал.`;

export async function POST(request: Request) {
  const startTime = Date.now();
  const debugInfo: any = {
    timestamp: new Date().toISOString(),
    user: null,
    input: {},
    prompt: {},
    openai: {},
    timing: {},
  };

  try {
    const authStartTime = Date.now();
    const user = await getCurrentUser();
    debugInfo.timing.authTime = `${Date.now() - authStartTime}ms`;
    
    if (user) {
      debugInfo.user = {
        id: user.id,
        email: user.email,
      };
    }

    const parseStartTime = Date.now();
    const body = await request.json();
    const { text, strategy } = body;
    debugInfo.timing.parseTime = `${Date.now() - parseStartTime}ms`;

    debugInfo.input = {
      textLength: text?.length || 0,
      textPreview: text?.substring(0, 200) + (text?.length > 200 ? '...' : '') || '',
      strategy: strategy || 'mode1',
      hasText: !!text && !!text.trim(),
    };

    console.log('[HUMANIZE DEBUG] Входные данные:', {
      textLength: debugInfo.input.textLength,
      strategy: debugInfo.input.strategy,
      userId: debugInfo.user.id,
    });

    if (!text || !text.trim()) {
      debugInfo.error = 'Текст обязателен';
      console.log('[HUMANIZE DEBUG]', JSON.stringify(debugInfo, null, 2));
      return NextResponse.json(
        { success: false, error: 'Текст обязателен', debug: debugInfo },
        { status: 400 }
      );
    }

    const selectedStrategy = strategy || 'mode1';
    const strategyPrompt = STRATEGY_PROMPTS[selectedStrategy] || STRATEGY_PROMPTS.mode1;

    debugInfo.prompt = {
      strategy: selectedStrategy,
      strategyPromptLength: strategyPrompt.length,
      systemPromptLength: SYSTEM_PROMPT.length,
      userPromptLength: 0, // будет заполнено после создания
    };

    // Получаем OpenAI клиент
    const clientStartTime = Date.now();
    const openai = await getOpenAIClient();
    debugInfo.timing.clientInitTime = `${Date.now() - clientStartTime}ms`;

    // Формируем промпт для пользователя
    const userPrompt = `${strategyPrompt}

Текст:
<<<
${text}
>>>`;

    debugInfo.prompt.userPromptLength = userPrompt.length;
    debugInfo.prompt.userPromptPreview = userPrompt.substring(0, 300) + (userPrompt.length > 300 ? '...' : '');

    // Вызываем OpenAI API
    const openaiStartTime = Date.now();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 4000,
    });
    const openaiTime = Date.now() - openaiStartTime;
    debugInfo.timing.openaiTime = `${openaiTime}ms`;

    debugInfo.openai = {
      model: 'gpt-4o',
      usage: {
        promptTokens: completion.usage?.prompt_tokens || 0,
        completionTokens: completion.usage?.completion_tokens || 0,
        totalTokens: completion.usage?.total_tokens || 0,
      },
      finishReason: completion.choices[0]?.finish_reason || 'unknown',
      hasContent: !!completion.choices[0]?.message?.content,
    };

    const result = completion.choices[0]?.message?.content;

    if (!result) {
      debugInfo.error = 'Не удалось получить результат от OpenAI';
      debugInfo.openai.choices = completion.choices;
      console.error('[HUMANIZE DEBUG]', JSON.stringify(debugInfo, null, 2));
      return NextResponse.json(
        { success: false, error: 'Не удалось получить результат от OpenAI', debug: debugInfo },
        { status: 500 }
      );
    }

    const totalTime = Date.now() - startTime;
    debugInfo.timing.totalTime = `${totalTime}ms`;
    debugInfo.output = {
      resultLength: result.trim().length,
      resultPreview: result.trim().substring(0, 200) + (result.trim().length > 200 ? '...' : ''),
    };

    console.log('[HUMANIZE DEBUG] Успешная обработка:', {
      textLength: debugInfo.input.textLength,
      resultLength: debugInfo.output.resultLength,
      tokens: debugInfo.openai.usage.totalTokens,
      totalTime: debugInfo.timing.totalTime,
    });

    return NextResponse.json({
      success: true,
      result: result.trim(),
      debug: debugInfo,
    });
  } catch (error: any) {
    const totalTime = Date.now() - startTime;
    debugInfo.timing.totalTime = `${totalTime}ms`;
    debugInfo.error = {
      message: error.message,
      stack: error.stack,
      name: error.name,
    };

    console.error('[HUMANIZE DEBUG] Ошибка:', error);
    console.error('[HUMANIZE DEBUG]', JSON.stringify(debugInfo, null, 2));
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Ошибка обработки текста',
        debug: debugInfo,
      },
      { status: 500 }
    );
  }
}
