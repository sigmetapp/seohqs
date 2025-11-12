/**
 * Ahrefs API Integration
 * 
 * Документация: https://ahrefs.com/api/documentation
 */

export interface AhrefsSiteMetrics {
  domainRating: number;
  backlinks: number;
  referringDomains: number;
  organicKeywords: number;
  organicTraffic: number;
}

export interface AhrefsApiResponse {
  metrics: {
    domain_rating?: number;
    backlinks?: number;
    referring_domains?: number;
    organic_keywords?: number;
    organic_traffic?: number;
  };
}

/**
 * Получает метрики сайта из Ahrefs API
 */
export async function fetchAhrefsSiteMetrics(
  domain: string,
  apiKey: string
): Promise<AhrefsSiteMetrics> {
  // Валидация входных параметров
  if (!apiKey || apiKey.trim().length === 0) {
    throw new Error('Ahrefs API ключ не указан или пуст');
  }

  if (!domain || domain.trim().length === 0) {
    throw new Error('Домен не указан или пуст');
  }

  // Очищаем домен от протокола и лишних символов
  const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '').trim();

  try {
    // Ahrefs API endpoint для получения метрик сайта
    const url = `https://api.ahrefs.com/v3/site-explorer/metrics`;
    
    // Ahrefs API использует token в query параметре
    // Также можно использовать заголовок Authorization, но query параметр более стандартный
    const urlWithToken = `${url}?token=${encodeURIComponent(apiKey)}`;
    
    const response = await fetch(urlWithToken, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        target: cleanDomain,
        mode: 'domain',
        output: 'json',
        metrics: [
          'domain_rating',
          'backlinks',
          'referring_domains',
          'organic_keywords',
          'organic_traffic',
        ],
      }),
    });

    if (!response.ok) {
      let errorText = '';
      let errorData: any = null;
      
      try {
        errorText = await response.text();
        // Пытаемся распарсить JSON ответ, если это возможно
        try {
          errorData = JSON.parse(errorText);
        } catch {
          // Если не JSON, используем текст как есть
        }
      } catch {
        errorText = 'Не удалось получить детали ошибки';
      }

      // Специальная обработка для 403 Forbidden
      if (response.status === 403) {
        const errorMessage = errorData 
          ? (Array.isArray(errorData) ? errorData.join(', ') : JSON.stringify(errorData))
          : errorText;
        
        throw new Error(
          `Ahrefs API error: 403 Forbidden. ${errorMessage}. Возможные причины: неправильный API ключ, ключ не имеет доступа к домену "${cleanDomain}", или ключ был отозван.`
        );
      }

      // Для других ошибок
      const errorMessage = errorData 
        ? (Array.isArray(errorData) ? errorData.join(', ') : JSON.stringify(errorData))
        : errorText;
      
      throw new Error(
        `Ahrefs API error: ${response.status} ${response.statusText}. ${errorMessage}`
      );
    }

    let data: AhrefsApiResponse;
    try {
      data = await response.json();
    } catch (parseError) {
      throw new Error(
        `Ahrefs API вернул невалидный JSON ответ. Возможно, API ключ неверен или произошла ошибка на стороне сервера.`
      );
    }

    // Извлекаем метрики из ответа
    // Ahrefs API может возвращать данные в разных форматах
    const metrics = data.metrics || (data as any).data?.metrics || {};

    // Проверяем, что мы получили хотя бы какие-то данные
    if (Object.keys(metrics).length === 0 && !data.metrics) {
      console.warn('Ahrefs API вернул пустой ответ метрик. Возможно, домен не найден в базе Ahrefs.');
    }

    return {
      domainRating: metrics.domain_rating || 0,
      backlinks: metrics.backlinks || 0,
      referringDomains: metrics.referring_domains || 0,
      organicKeywords: metrics.organic_keywords || 0,
      organicTraffic: metrics.organic_traffic || 0,
    };
  } catch (error: any) {
    // Если это ошибка API, пробрасываем её дальше
    if (error.message?.includes('Ahrefs API error')) {
      throw error;
    }

    // Для других ошибок (сеть, парсинг и т.д.) пробрасываем с контекстом
    throw new Error(`Ошибка при запросе к Ahrefs API: ${error.message}`);
  }
}
