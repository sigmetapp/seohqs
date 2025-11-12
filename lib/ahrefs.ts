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
  try {
    // Ahrefs API endpoint для получения метрик сайта
    const url = `https://api.ahrefs.com/v3/site-explorer/site-metrics`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        target: domain,
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
      const errorText = await response.text();
      throw new Error(
        `Ahrefs API error: ${response.status} ${response.statusText}. ${errorText}`
      );
    }

    const data: AhrefsApiResponse = await response.json();

    // Извлекаем метрики из ответа
    const metrics = data.metrics || {};

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
