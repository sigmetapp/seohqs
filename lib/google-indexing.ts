import { google } from 'googleapis';

/**
 * Инициализация Google Indexing API клиента
 * Требует переменные окружения:
 * - GOOGLE_SERVICE_ACCOUNT_EMAIL: email сервисного аккаунта
 * - GOOGLE_PRIVATE_KEY: приватный ключ сервисного аккаунта (с экранированными переносами строк)
 */
export async function getGoogleIndexingClient() {
  const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!serviceAccountEmail || !privateKey) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_EMAIL и GOOGLE_PRIVATE_KEY должны быть установлены');
  }

  const auth = new google.auth.JWT(
    serviceAccountEmail,
    undefined,
    privateKey,
    ['https://www.googleapis.com/auth/indexing'],
    undefined
  );

  return google.indexing({ version: 'v3', auth });
}

/**
 * Отправляет URL на индексацию в Google
 * @param url - URL для индексации
 * @param type - Тип операции: 'URL_UPDATED' или 'URL_DELETED'
 */
export async function indexUrl(url: string, type: 'URL_UPDATED' | 'URL_DELETED' = 'URL_UPDATED') {
  try {
    const indexing = await getGoogleIndexingClient();
    
    const response = await indexing.urlNotifications.publish({
      requestBody: {
        url,
        type,
      },
    });

    return {
      success: true,
      data: response.data,
    };
  } catch (error: any) {
    console.error('Google Indexing API Error:', error);
    return {
      success: false,
      error: error.message || 'Ошибка при отправке URL на индексацию',
      details: error.response?.data || error,
    };
  }
}

/**
 * Отправляет несколько URL на индексацию
 * @param urls - Массив URL для индексации
 * @param type - Тип операции
 */
export async function indexUrls(
  urls: string[],
  type: 'URL_UPDATED' | 'URL_DELETED' = 'URL_UPDATED'
) {
  const results = await Promise.allSettled(
    urls.map(url => indexUrl(url, type))
  );

  return results.map((result, index) => ({
    url: urls[index],
    ...(result.status === 'fulfilled' ? result.value : { success: false, error: result.reason }),
  }));
}
