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
  
  // Проверяем формат API ключа (обычно это строка из 32+ символов)
  const trimmedKey = apiKey.trim();
  if (trimmedKey.length < 10) {
    console.warn('[Ahrefs API] Предупреждение: API ключ очень короткий, возможно неверный формат');
  }

  // Очищаем домен от протокола и лишних символов
  const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '').trim();
  
  // Удаляем www. если есть, так как Ahrefs может требовать домен без www
  // Но также пробуем с www, если без него не работает
  const domainWithoutWww = cleanDomain.replace(/^www\./, '');

  try {
    // Ahrefs API endpoint для получения метрик сайта
    // Согласно документации Ahrefs API v3, для Site Explorer используется endpoint:
    // POST https://api.ahrefs.com/v3/site-explorer/metrics
    // Токен передается в query параметре token
    const url = `https://api.ahrefs.com/v3/site-explorer/metrics`;
    
    // Пробуем сначала без www
    // Согласно документации Ahrefs API, некоторые метрики требуют date, а некоторые нет
    // Метрики без date: domain_rating, backlinks, referring_domains (текущие метрики)
    // Метрики с date: organic_keywords, organic_traffic (исторические метрики)
    const today = new Date();
    const dateString = today.toISOString().split('T')[0]; // YYYY-MM-DD
    
    // Сначала получаем метрики без date
    const metricsWithoutDate = [
      'domain_rating',
      'backlinks',
      'referring_domains',
    ];
    
    // Затем получаем метрики с date
    const metricsWithDate = [
      'organic_keywords',
      'organic_traffic',
    ];
    
    // Создаем requestBody для метрик без date
    const requestBodyWithoutDate: {
      target: string;
      mode: string;
      output: string;
      metrics: string[];
    } = {
      target: domainWithoutWww,
      mode: 'domain',
      output: 'json',
      metrics: metricsWithoutDate,
    };
    
    // Создаем requestBody для метрик с date
    const requestBodyWithDate: {
      target: string;
      mode: string;
      output: string;
      date: string;
      metrics: string[];
    } = {
      target: domainWithoutWww,
      mode: 'domain',
      output: 'json',
      date: dateString,
      metrics: metricsWithDate,
    };
    
    // Ahrefs API v3 требует токен в query параметре token
    // Параметр date должен быть в body запроса, а не в query
    const urlWithToken = `${url}?token=${encodeURIComponent(trimmedKey)}`;

    // Логируем запрос для отладки (без полного ключа)
    console.log('[Ahrefs API] Запрос к Site Explorer:', {
      url: url,
      method: 'POST',
      originalDomain: domain,
      cleanDomain: cleanDomain,
      domainWithoutWww: domainWithoutWww,
      target: requestBodyWithoutDate.target,
      mode: requestBodyWithoutDate.mode,
      output: requestBodyWithoutDate.output,
      metricsWithoutDate: requestBodyWithoutDate.metrics,
      metricsWithDate: requestBodyWithDate.metrics,
      date: requestBodyWithDate.date,
      apiKeyLength: trimmedKey.length,
      apiKeyPrefix: trimmedKey.substring(0, 6) + '...' + trimmedKey.substring(trimmedKey.length - 4),
      hasTokenInUrl: true,
    });
    
    // Сначала получаем метрики без date
    console.log('[Ahrefs API] Запрос метрик без date:', JSON.stringify(requestBodyWithoutDate));
    let responseWithoutDate = await fetch(urlWithToken, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(requestBodyWithoutDate),
    });
    
    let metricsWithoutDateData: any = {};
    let errorWithoutDate: string | null = null;
    if (responseWithoutDate.ok) {
      const data = await responseWithoutDate.json();
      metricsWithoutDateData = data.metrics || (data as any).data?.metrics || {};
      console.log('[Ahrefs API] Метрики без date получены:', Object.keys(metricsWithoutDateData));
    } else {
      const errorText = await responseWithoutDate.text();
      errorWithoutDate = `Status ${responseWithoutDate.status}: ${errorText}`;
      console.error('[Ahrefs API] Ошибка при получении метрик без date:', responseWithoutDate.status, errorText);
      
      // Пробуем альтернативную авторизацию
      if (responseWithoutDate.status === 403) {
        console.log('[Ahrefs API] Пробуем альтернативную авторизацию для метрик без date...');
        try {
          const responseAlt = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'Authorization': `Bearer ${trimmedKey}`,
            },
            body: JSON.stringify(requestBodyWithoutDate),
          });
          
          if (responseAlt.ok) {
            const data = await responseAlt.json();
            metricsWithoutDateData = data.metrics || (data as any).data?.metrics || {};
            console.log('[Ahrefs API] Метрики без date получены через Authorization Bearer');
            errorWithoutDate = null;
          }
        } catch (altError) {
          console.error('[Ahrefs API] Ошибка при альтернативной авторизации:', altError);
        }
      }
    }
    
    // Затем получаем метрики с date
    console.log('[Ahrefs API] Запрос метрик с date:', JSON.stringify(requestBodyWithDate));
    let responseWithDate = await fetch(urlWithToken, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(requestBodyWithDate),
    });
    
    let metricsWithDateData: any = {};
    let errorWithDate: string | null = null;
    if (responseWithDate.ok) {
      const data = await responseWithDate.json();
      metricsWithDateData = data.metrics || (data as any).data?.metrics || {};
      console.log('[Ahrefs API] Метрики с date получены:', Object.keys(metricsWithDateData));
    } else {
      const errorText = await responseWithDate.text();
      errorWithDate = `Status ${responseWithDate.status}: ${errorText}`;
      console.error('[Ahrefs API] Ошибка при получении метрик с date:', responseWithDate.status, errorText);
      
      // Если получили ошибку о date, пробуем более ранние даты
      if (responseWithDate.status === 400 && errorText.includes('date')) {
        console.log('[Ahrefs API] Пробуем более ранние даты для метрик с date...');
        
        // Пробуем последние 7 дней
        for (let daysAgo = 1; daysAgo <= 7; daysAgo++) {
          try {
            const pastDate = new Date();
            pastDate.setDate(pastDate.getDate() - daysAgo);
            const pastDateString = pastDate.toISOString().split('T')[0];
            
            const requestBodyWithPastDate = {
              ...requestBodyWithDate,
              date: pastDateString,
            };
            
            console.log(`[Ahrefs API] Пробуем дату: ${pastDateString} (${daysAgo} дней назад)`);
            
            const responsePastDate = await fetch(urlWithToken, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
              },
              body: JSON.stringify(requestBodyWithPastDate),
            });
            
            if (responsePastDate.ok) {
              console.log(`[Ahrefs API] Успешно получены данные за дату: ${pastDateString}`);
              const data = await responsePastDate.json();
              metricsWithDateData = data.metrics || (data as any).data?.metrics || {};
              errorWithDate = null;
              break;
            }
          } catch (pastDateError) {
            console.error(`[Ahrefs API] Ошибка при попытке даты ${daysAgo} дней назад:`, pastDateError);
          }
        }
      }
      
      // Пробуем альтернативную авторизацию для метрик с date
      if (responseWithDate.status === 403) {
        console.log('[Ahrefs API] Пробуем альтернативную авторизацию для метрик с date...');
        try {
          const responseAlt = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'Authorization': `Bearer ${trimmedKey}`,
            },
            body: JSON.stringify(requestBodyWithDate),
          });
          
          if (responseAlt.ok) {
            const data = await responseAlt.json();
            metricsWithDateData = data.metrics || (data as any).data?.metrics || {};
            console.log('[Ahrefs API] Метрики с date получены через Authorization Bearer');
            errorWithDate = null;
          }
        } catch (altError) {
          console.error('[Ahrefs API] Ошибка при альтернативной авторизации:', altError);
        }
      }
    }
    
    // Объединяем результаты
    const allMetrics = {
      ...metricsWithoutDateData,
      ...metricsWithDateData,
    };
    
    // Проверяем, что мы получили хотя бы какие-то данные
    if (Object.keys(allMetrics).length === 0) {
      const errorMessages: string[] = [];
      if (errorWithoutDate) {
        errorMessages.push(`Метрики без date: ${errorWithoutDate}`);
      }
      if (errorWithDate) {
        errorMessages.push(`Метрики с date: ${errorWithDate}`);
      }
      if (errorMessages.length === 0) {
        errorMessages.push('Оба запроса не вернули данные');
      }
      
      throw new Error(
        `Ahrefs API не вернул данные. Ошибки: ${errorMessages.join('; ')}. Проверьте API ключ и доступ к Site Explorer API.`
      );
    }
    
    // Возвращаем объединенные метрики
    return {
      domainRating: allMetrics.domain_rating || 0,
      backlinks: allMetrics.backlinks || 0,
      referringDomains: allMetrics.referring_domains || 0,
      organicKeywords: allMetrics.organic_keywords || 0,
      organicTraffic: allMetrics.organic_traffic || 0,
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
