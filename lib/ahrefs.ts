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
    // Ahrefs API требует параметр date в формате YYYY-MM-DD
    // Используем текущую дату или недавнюю дату для получения последних данных
    const today = new Date();
    const dateString = today.toISOString().split('T')[0]; // YYYY-MM-DD
    
    const requestBody = {
      target: domainWithoutWww,
      mode: 'domain',
      output: 'json',
      date: dateString,
      metrics: [
        'domain_rating',
        'backlinks',
        'referring_domains',
        'organic_keywords',
        'organic_traffic',
      ],
    };
    
    // Ahrefs API v3 требует токен в query параметре token
    const urlWithToken = `${url}?token=${encodeURIComponent(trimmedKey)}`;

    // Логируем запрос для отладки (без полного ключа)
    console.log('[Ahrefs API] Запрос к Site Explorer:', {
      url: url,
      method: 'POST',
      originalDomain: domain,
      cleanDomain: cleanDomain,
      domainWithoutWww: domainWithoutWww,
      target: requestBody.target,
      mode: requestBody.mode,
      output: requestBody.output,
      date: requestBody.date,
      metrics: requestBody.metrics,
      apiKeyLength: trimmedKey.length,
      apiKeyPrefix: trimmedKey.substring(0, 6) + '...' + trimmedKey.substring(trimmedKey.length - 4),
      hasTokenInUrl: true,
    });
    
    // Пробуем сначала стандартный способ с токеном в query
    let response = await fetch(urlWithToken, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    
    // Если получили 403, пробуем без токена в URL, а в заголовке Authorization
    if (!response.ok && response.status === 403) {
      console.log('[Ahrefs API] Пробуем авторизацию через заголовок Authorization...');
      try {
        response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${trimmedKey}`,
          },
          body: JSON.stringify(requestBody),
        });
      } catch (authError) {
        console.error('[Ahrefs API] Ошибка при попытке Authorization:', authError);
        // Продолжаем с оригинальным ответом
      }
    }

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

      // Специальная обработка для 400 Bad Request
      if (response.status === 400) {
        const errorMessage = errorData 
          ? (Array.isArray(errorData) ? errorData.join(', ') : (typeof errorData === 'object' ? JSON.stringify(errorData) : String(errorData)))
          : errorText;
        
        // Если ошибка связана с датой, пробуем более ранние даты
        if (errorMessage.includes('date') || errorMessage.includes('Date')) {
          console.log('[Ahrefs API] Пробуем более ранние даты...');
          
          // Пробуем последние 7 дней
          for (let daysAgo = 1; daysAgo <= 7; daysAgo++) {
            try {
              const pastDate = new Date();
              pastDate.setDate(pastDate.getDate() - daysAgo);
              const pastDateString = pastDate.toISOString().split('T')[0];
              
              const requestBodyWithPastDate = {
                ...requestBody,
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
                const metrics = data.metrics || (data as any).data?.metrics || {};
                
                return {
                  domainRating: metrics.domain_rating || 0,
                  backlinks: metrics.backlinks || 0,
                  referringDomains: metrics.referring_domains || 0,
                  organicKeywords: metrics.organic_keywords || 0,
                  organicTraffic: metrics.organic_traffic || 0,
                };
              }
            } catch (pastDateError) {
              console.error(`[Ahrefs API] Ошибка при попытке даты ${daysAgo} дней назад:`, pastDateError);
            }
          }
        }
        
        // Если не помогло, пробрасываем ошибку
        throw new Error(
          `Ahrefs API error: 400 Bad Request. ${errorMessage}. Проверьте формат запроса и параметры.`
        );
      }
      
      // Специальная обработка для 403 Forbidden
      if (response.status === 403) {
        const errorMessage = errorData 
          ? (Array.isArray(errorData) ? errorData.join(', ') : (typeof errorData === 'object' ? JSON.stringify(errorData) : String(errorData)))
          : errorText;
        
        // Логируем детали ошибки для отладки
        console.error('[Ahrefs API] 403 Forbidden - Детали ошибки:', {
          originalDomain: domain,
          cleanDomain: cleanDomain,
          domainWithoutWww: domainWithoutWww,
          target: requestBody.target,
          requestBody: JSON.stringify(requestBody),
          errorText: errorText.substring(0, 500), // Ограничиваем длину для логов
          errorData,
          url: url,
          responseStatus: response.status,
          responseStatusText: response.statusText,
          responseHeaders: Object.fromEntries(response.headers.entries()),
        });
        
        // Проверяем, может быть проблема в формате API ключа или доступа
        console.error('[Ahrefs API] Возможные причины 403:');
        console.error('1. API ключ неверный или неактивен');
        console.error('2. API ключ не имеет доступа к Site Explorer API');
        console.error('3. У аккаунта нет подписки с доступом к API');
        console.error('4. Формат запроса неверный');
        console.error('5. Домен не найден в базе Ahrefs (но это не должно блокировать запрос)');
        
        // Пробуем альтернативные варианты домена
        // Если использовали без www, пробуем с www, и наоборот
        const alternativeDomains = [];
        if (domainWithoutWww !== cleanDomain) {
          // Если убрали www, пробуем с www
          alternativeDomains.push(cleanDomain);
        } else if (!cleanDomain.startsWith('www.')) {
          // Если не было www, пробуем с www
          alternativeDomains.push(`www.${cleanDomain}`);
        }
        
        for (const altDomain of alternativeDomains) {
          console.log(`[Ahrefs API] Пробуем альтернативный домен: ${altDomain}...`);
          try {
            const requestBodyAlt = {
              ...requestBody,
              target: altDomain,
            };
            
            const responseAlt = await fetch(urlWithToken, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
              },
              body: JSON.stringify(requestBodyAlt),
            });
            
            if (responseAlt.ok) {
              console.log(`[Ahrefs API] Успешно использован домен: ${altDomain}`);
              const data = await responseAlt.json();
              const metrics = data.metrics || (data as any).data?.metrics || {};
              
              return {
                domainRating: metrics.domain_rating || 0,
                backlinks: metrics.backlinks || 0,
                referringDomains: metrics.referring_domains || 0,
                organicKeywords: metrics.organic_keywords || 0,
                organicTraffic: metrics.organic_traffic || 0,
              };
            }
          } catch (altError) {
            console.error(`[Ahrefs API] Ошибка при попытке домена ${altDomain}:`, altError);
          }
        }
        
        // Пробуем альтернативные способы авторизации
        // Это может помочь, если query параметр не работает
        console.log('[Ahrefs API] Пробуем альтернативные способы авторизации...');
        
        // Список доменов для попыток (включая оригинальный и альтернативные)
        const domainsToTry = [requestBody.target, ...alternativeDomains];
        
        // Способ 1: Authorization Bearer
        for (const tryDomain of domainsToTry) {
          try {
            const requestBodyWithDomain = {
              ...requestBody,
              target: tryDomain,
            };
            
            const responseWithBearer = await fetch(url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${trimmedKey}`,
              },
              body: JSON.stringify(requestBodyWithDomain),
            });
            
            if (responseWithBearer.ok) {
              console.log(`[Ahrefs API] Успешно использован заголовок Authorization Bearer с доменом: ${tryDomain}`);
              const data = await responseWithBearer.json();
              const metrics = data.metrics || (data as any).data?.metrics || {};
              
              return {
                domainRating: metrics.domain_rating || 0,
                backlinks: metrics.backlinks || 0,
                referringDomains: metrics.referring_domains || 0,
                organicKeywords: metrics.organic_keywords || 0,
                organicTraffic: metrics.organic_traffic || 0,
              };
            }
          } catch (bearerError) {
            console.error(`[Ahrefs API] Ошибка при попытке Authorization Bearer с доменом ${tryDomain}:`, bearerError);
          }
        }
        
        // Способ 2: X-API-Key заголовок
        for (const tryDomain of domainsToTry) {
          try {
            const requestBodyWithDomain = {
              ...requestBody,
              target: tryDomain,
            };
            
            const responseWithApiKey = await fetch(url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-API-Key': trimmedKey,
              },
              body: JSON.stringify(requestBodyWithDomain),
            });
            
            if (responseWithApiKey.ok) {
              console.log(`[Ahrefs API] Успешно использован заголовок X-API-Key с доменом: ${tryDomain}`);
              const data = await responseWithApiKey.json();
              const metrics = data.metrics || (data as any).data?.metrics || {};
              
              return {
                domainRating: metrics.domain_rating || 0,
                backlinks: metrics.backlinks || 0,
                referringDomains: metrics.referring_domains || 0,
                organicKeywords: metrics.organic_keywords || 0,
                organicTraffic: metrics.organic_traffic || 0,
              };
            }
          } catch (apiKeyError) {
            console.error(`[Ahrefs API] Ошибка при попытке X-API-Key с доменом ${tryDomain}:`, apiKeyError);
          }
        }
        
        throw new Error(
          `Ahrefs API error: 403 Forbidden. ${errorMessage}. Возможные причины: 1) API ключ неверный или неактивен, 2) API ключ не имеет доступа к Site Explorer API (проверьте настройки API ключа в Ahrefs), 3) У аккаунта нет подписки с доступом к API, 4) Формат запроса неверный. Для получения данных из Site Explorer не нужно добавлять домен в проект - API должен работать для любого домена, если у API ключа есть доступ к Site Explorer API. Проверьте настройки API ключа в Ahrefs и убедитесь, что у него включен доступ к Site Explorer API.`
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
