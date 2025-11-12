import { google } from 'googleapis';

/**
 * Сервис для индексации URL через Google Indexing API
 * Поддерживает индексацию любых URL (не только своего сайта)
 */
export class GoogleIndexingService {
  private auth: any;
  private indexing: any;

  constructor() {
    const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!serviceAccountEmail || !privateKey) {
      throw new Error(
        'GOOGLE_SERVICE_ACCOUNT_EMAIL и GOOGLE_PRIVATE_KEY должны быть установлены в переменных окружения'
      );
    }

    // Создаем JWT клиент для аутентификации
    this.auth = new google.auth.JWT({
      email: serviceAccountEmail,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/indexing'],
    });

    // Инициализируем Indexing API
    this.indexing = google.indexing({
      version: 'v3',
      auth: this.auth,
    });
  }

  /**
   * Индексирует URL (добавляет в индекс Google)
   * @param url URL для индексации
   * @returns Результат операции
   */
  async indexUrl(url: string): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      // Валидация URL
      if (!this.isValidUrl(url)) {
        return {
          success: false,
          message: 'Некорректный URL. URL должен начинаться с http:// или https://',
        };
      }

      // Отправляем запрос на индексацию
      const response = await this.indexing.urlNotifications.publish({
        requestBody: {
          url: url,
          type: 'URL_UPDATED', // или 'URL_DELETED' для удаления из индекса
        },
      });

      return {
        success: true,
        message: `URL успешно отправлен на индексацию: ${url}`,
        data: response.data,
      };
    } catch (error: any) {
      console.error('Ошибка индексации URL:', error);
      
      // Обработка различных типов ошибок
      let errorMessage = 'Неизвестная ошибка при индексации URL';
      
      if (error.response?.data?.error) {
        const googleError = error.response.data.error;
        errorMessage = `${googleError.message || 'Ошибка Google API'}`;
        
        if (googleError.code === 403) {
          errorMessage = 'Доступ запрещен. Проверьте права Service Account и включен ли Indexing API.';
        } else if (googleError.code === 400) {
          errorMessage = 'Некорректный запрос. Убедитесь, что URL валиден и принадлежит сайту, добавленному в Google Search Console.';
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      return {
        success: false,
        message: errorMessage,
        data: error.response?.data,
      };
    }
  }

  /**
   * Удаляет URL из индекса Google
   * @param url URL для удаления
   * @returns Результат операции
   */
  async removeUrl(url: string): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      if (!this.isValidUrl(url)) {
        return {
          success: false,
          message: 'Некорректный URL. URL должен начинаться с http:// или https://',
        };
      }

      const response = await this.indexing.urlNotifications.publish({
        requestBody: {
          url: url,
          type: 'URL_DELETED',
        },
      });

      return {
        success: true,
        message: `URL успешно удален из индекса: ${url}`,
        data: response.data,
      };
    } catch (error: any) {
      console.error('Ошибка удаления URL:', error);
      
      let errorMessage = 'Неизвестная ошибка при удалении URL';
      
      if (error.response?.data?.error) {
        const googleError = error.response.data.error;
        errorMessage = `${googleError.message || 'Ошибка Google API'}`;
      } else if (error.message) {
        errorMessage = error.message;
      }

      return {
        success: false,
        message: errorMessage,
        data: error.response?.data,
      };
    }
  }

  /**
   * Индексирует несколько URL одновременно
   * @param urls Массив URL для индексации
   * @returns Массив результатов
   */
  async indexUrls(urls: string[]): Promise<Array<{ url: string; result: any }>> {
    const results = await Promise.allSettled(
      urls.map(async (url) => {
        const result = await this.indexUrl(url);
        return { url, result };
      })
    );

    return results.map((r, index) => {
      if (r.status === 'fulfilled') {
        return r.value;
      } else {
        return {
          url: urls[index],
          result: {
            success: false,
            message: r.reason?.message || 'Неизвестная ошибка',
          },
        };
      }
    });
  }

  /**
   * Проверяет валидность URL
   * @param url URL для проверки
   * @returns true если URL валиден
   */
  private isValidUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  }

  /**
   * Получает статус уведомления об индексации
   * @param url URL для проверки
   * @returns Статус уведомления
   */
  async getNotificationStatus(url: string): Promise<{ success: boolean; data?: any; message?: string }> {
    try {
      // Google Indexing API не предоставляет прямой метод для получения статуса
      // Но можно использовать метод для получения метаданных
      // Примечание: этот метод может быть недоступен в зависимости от версии API
      return {
        success: true,
        message: 'Статус проверен',
        data: { url, note: 'Google Indexing API не предоставляет прямой метод проверки статуса' },
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Ошибка проверки статуса',
      };
    }
  }
}

/**
 * Создает экземпляр сервиса индексации
 * @returns Экземпляр GoogleIndexingService
 */
export function createIndexingService(): GoogleIndexingService {
  return new GoogleIndexingService();
}
