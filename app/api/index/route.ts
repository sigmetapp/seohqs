import { NextRequest, NextResponse } from 'next/server';
import { indexUrl, indexUrls } from '@/lib/google-indexing';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, urls, type = 'URL_UPDATED' } = body;

    // Валидация типа
    if (type !== 'URL_UPDATED' && type !== 'URL_DELETED') {
      return NextResponse.json(
        { success: false, error: 'Тип должен быть URL_UPDATED или URL_DELETED' },
        { status: 400 }
      );
    }

    // Если передан массив URL
    if (urls && Array.isArray(urls)) {
      if (urls.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Массив URL не может быть пустым' },
          { status: 400 }
        );
      }

      const results = await indexUrls(urls, type);
      const successCount = results.filter(r => r.success).length;
      const failCount = results.length - successCount;

      return NextResponse.json({
        success: true,
        message: `Обработано ${successCount} из ${results.length} URL`,
        results,
        summary: {
          total: results.length,
          success: successCount,
          failed: failCount,
        },
      });
    }

    // Если передан один URL
    if (url) {
      if (typeof url !== 'string' || !isValidUrl(url)) {
        return NextResponse.json(
          { success: false, error: 'Некорректный URL' },
          { status: 400 }
        );
      }

      const result = await indexUrl(url, type);
      
      if (result.success) {
        return NextResponse.json({
          success: true,
          message: 'URL успешно отправлен на индексацию',
          url,
          data: result.data,
        });
      } else {
        return NextResponse.json(
          {
            success: false,
            error: result.error,
            details: result.details,
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { success: false, error: 'Необходимо указать url или urls' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Внутренняя ошибка сервера',
      },
      { status: 500 }
    );
  }
}

function isValidUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}
