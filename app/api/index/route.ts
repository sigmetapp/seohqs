import { NextResponse } from 'next/server';
import { createIndexingService } from '@/lib/google-indexing';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/index
 * Индексирует один или несколько URL через Google Indexing API
 * 
 * Body:
 * {
 *   "url": "https://example.com/page" - для одного URL
 *   или
 *   "urls": ["https://example.com/page1", "https://example.com/page2"] - для нескольких URL
 *   "action": "index" | "remove" (по умолчанию "index")
 * }
 */
export async function POST(request: Request) {
  const debug: any = {
    timestamp: new Date().toISOString(),
    steps: [],
    errors: [],
  };

  try {
    debug.steps.push('Начало обработки запроса на индексацию');

    // Проверяем наличие учетных данных
    const hasCredentials = !!(
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY
    );

    if (!hasCredentials) {
      debug.errors.push('Отсутствуют учетные данные Google Service Account');
      return NextResponse.json(
        {
          success: false,
          error: 'Google Service Account не настроен. Установите GOOGLE_SERVICE_ACCOUNT_EMAIL и GOOGLE_PRIVATE_KEY',
          debug: debug,
        },
        { status: 400 }
      );
    }

    debug.steps.push('Учетные данные найдены');

    // Парсим тело запроса
    const body = await request.json();
    const { url, urls, action = 'index' } = body;

    // Валидация входных данных
    if (!url && !urls) {
      debug.errors.push('Не указан URL или массив URLs');
      return NextResponse.json(
        {
          success: false,
          error: 'Необходимо указать "url" (строка) или "urls" (массив строк)',
          debug: debug,
        },
        { status: 400 }
      );
    }

    if (url && urls) {
      debug.errors.push('Указаны и url, и urls одновременно');
      return NextResponse.json(
        {
          success: false,
          error: 'Укажите либо "url", либо "urls", но не оба одновременно',
          debug: debug,
        },
        { status: 400 }
      );
    }

    debug.steps.push(`Действие: ${action}, URL(ы) получены`);

    // Создаем сервис индексации
    const indexingService = createIndexingService();
    debug.steps.push('Сервис индексации создан');

    // Обрабатываем один URL
    if (url) {
      debug.steps.push(`Обработка одного URL: ${url}`);
      
      let result;
      if (action === 'remove') {
        result = await indexingService.removeUrl(url);
      } else {
        result = await indexingService.indexUrl(url);
      }

      debug.steps.push(`Результат: ${result.success ? 'успех' : 'ошибка'}`);
      if (!result.success) {
        debug.errors.push(result.message);
      }

      return NextResponse.json({
        success: result.success,
        message: result.message,
        data: result.data,
        debug: debug,
      });
    }

    // Обрабатываем несколько URL
    if (urls && Array.isArray(urls)) {
      debug.steps.push(`Обработка ${urls.length} URL`);
      
      if (urls.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'Массив URLs пуст',
            debug: debug,
          },
          { status: 400 }
        );
      }

      if (urls.length > 100) {
        debug.errors.push('Слишком много URL (максимум 100)');
        return NextResponse.json(
          {
            success: false,
            error: 'Максимум 100 URL за один запрос',
            debug: debug,
          },
          { status: 400 }
        );
      }

      const results = await indexingService.indexUrls(urls);
      debug.steps.push(`Обработано ${results.length} URL`);

      const successCount = results.filter((r) => r.result.success).length;
      const failCount = results.length - successCount;

      return NextResponse.json({
        success: failCount === 0,
        message: `Обработано ${results.length} URL: ${successCount} успешно, ${failCount} с ошибками`,
        results: results,
        summary: {
          total: results.length,
          success: successCount,
          failed: failCount,
        },
        debug: debug,
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Некорректный формат данных',
        debug: debug,
      },
      { status: 400 }
    );
  } catch (error: any) {
    debug.errors.push(error.message || 'Unknown error');
    debug.steps.push(`Ошибка: ${error.message}`);
    console.error('Error in index API:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Ошибка обработки запроса на индексацию',
        debug: debug,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/index
 * Проверяет статус сервиса индексации
 */
export async function GET() {
  const debug: any = {
    timestamp: new Date().toISOString(),
    steps: [],
    errors: [],
  };

  try {
    const hasEmail = !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const hasKey = !!process.env.GOOGLE_PRIVATE_KEY;

    debug.steps.push('Проверка конфигурации');
    
    return NextResponse.json({
      success: true,
      configured: hasEmail && hasKey,
      hasEmail,
      hasKey,
      message: hasEmail && hasKey 
        ? 'Сервис индексации настроен' 
        : 'Сервис индексации не настроен. Установите GOOGLE_SERVICE_ACCOUNT_EMAIL и GOOGLE_PRIVATE_KEY',
      debug: debug,
    });
  } catch (error: any) {
    debug.errors.push(error.message || 'Unknown error');
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Ошибка проверки статуса',
        debug: debug,
      },
      { status: 500 }
    );
  }
}
