import { google } from 'googleapis';
import { storage } from './storage';
import { getIntegrations, updateIntegrations, getGoogleAccountById, updateGoogleAccount } from './db-adapter';

/**
 * TypeScript types for Google Search Console API
 */

/**
 * Request body for GSC Search Analytics API query
 * POST https://searchconsole.googleapis.com/webmasters/v3/sites/{siteUrl}/searchAnalytics/query
 */
export interface GSCQueryRequest {
  startDate: string; // Format: YYYY-MM-DD
  endDate: string; // Format: YYYY-MM-DD
  dimensions: string[]; // ["date", "query", "page", "country", "device", "searchAppearance"]
  rowLimit: number; // Maximum 25000
  startRow?: number; // For pagination
  dimensionFilterGroups?: Array<{
    groupType?: string;
    filters: Array<{
      dimension: string;
      operator: string;
      expression: string;
    }>;
  }>;
}

/**
 * Response row from GSC Search Analytics API
 */
export interface GSCRow {
  keys: string[]; // Dimension values (e.g., ["2024-01-01"] for date, ["query text"] for query)
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

/**
 * Response from GSC Search Analytics API
 */
export interface GSCQueryResponse {
  responseAggregationType?: string;
  rows?: GSCRow[];
}

/**
 * Date range object
 */
export interface DateRange {
  startDate: string; // Format: YYYY-MM-DD
  endDate: string; // Format: YYYY-MM-DD
}

/**
 * Сервис для работы с Google Search Console API
 * Получает данные о производительности сайта в поиске Google
 * Использует OAuth 2.0 для аутентификации
 * 
 * IMPORTANT: Uses Search Analytics API only, NOT URL Inspection API
 * Endpoint: POST https://searchconsole.googleapis.com/webmasters/v3/sites/{siteUrl}/searchAnalytics/query
 */
export class GoogleSearchConsoleService {
  private auth: any;
  private searchConsole: any;
  private accountId: number | null;
  private userId: number | null;

  constructor(accountId?: number, userId?: number) {
    // Инициализация будет выполнена асинхронно
    this.accountId = accountId || null;
    this.userId = userId || null;
  }

  private async initializeAuth() {
    let accessToken: string = '';
    let refreshToken: string = '';
    let tokenExpiry: string = '';

    // Если указан accountId и userId, используем конкретный аккаунт
    if (this.accountId !== null && this.userId !== null) {
      try {
        const accountId = this.accountId;
        const userId = this.userId;
        const account = await getGoogleAccountById(accountId, userId);
        if (account) {
          accessToken = account.googleAccessToken || '';
          refreshToken = account.googleRefreshToken || '';
          tokenExpiry = account.googleTokenExpiry || '';
        }
      } catch (error) {
        console.warn('Не удалось получить аккаунт из БД:', error);
      }
    }

    // Если токены не получены из аккаунта, используем старый способ (для обратной совместимости)
    if ((!accessToken || !refreshToken) && this.userId) {
      let integrations;
      try {
        integrations = await getIntegrations(this.userId);
      } catch (error) {
        console.warn('Не удалось получить integrations из БД, используем storage:', error);
        integrations = storage.integrations;
      }

      accessToken = integrations.googleAccessToken || storage.integrations.googleAccessToken;
      refreshToken = integrations.googleRefreshToken || storage.integrations.googleRefreshToken;
      tokenExpiry = integrations.googleTokenExpiry || storage.integrations.googleTokenExpiry;
    }
    
    // Если есть OAuth токены (не пустые строки), используем их
    if (accessToken && accessToken.trim() && refreshToken && refreshToken.trim()) {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/google/callback`;

      if (!clientId || !clientSecret) {
        throw new Error(
          'GOOGLE_CLIENT_ID и GOOGLE_CLIENT_SECRET должны быть установлены для использования OAuth'
        );
      }

      this.auth = new google.auth.OAuth2(
        clientId,
        clientSecret,
        redirectUri
      );

      this.auth.setCredentials({
        access_token: accessToken,
        refresh_token: refreshToken,
        expiry_date: tokenExpiry && tokenExpiry.trim()
          ? new Date(tokenExpiry).getTime() 
          : undefined,
      });

      // Автоматически обновляем токен при истечении
      this.auth.on('tokens', async (tokens: any) => {
        const updates: any = {};
        if (tokens.refresh_token) {
          updates.googleRefreshToken = tokens.refresh_token;
          storage.integrations.googleRefreshToken = tokens.refresh_token;
        }
        if (tokens.access_token) {
          updates.googleAccessToken = tokens.access_token;
          storage.integrations.googleAccessToken = tokens.access_token;
        }
        if (tokens.expiry_date) {
          updates.googleTokenExpiry = new Date(tokens.expiry_date).toISOString();
          storage.integrations.googleTokenExpiry = updates.googleTokenExpiry;
        }
        storage.integrations.updatedAt = new Date().toISOString();
        
        // Сохраняем обновленные токены в БД
        try {
          if (this.accountId && this.userId) {
            // Обновляем конкретный аккаунт
            await updateGoogleAccount(this.accountId, updates, this.userId);
          } else if (this.userId) {
            // Обновляем старую таблицу для обратной совместимости
            await updateIntegrations(updates, this.userId);
          }
        } catch (error) {
          console.error('Ошибка сохранения обновленных токенов в БД:', error);
        }
      });
    } else {
      // OAuth токены отсутствуют
      throw new Error(
        'Для работы с Google Search Console необходимо авторизоваться через OAuth. Перейдите в раздел Интеграции и нажмите "Авторизоваться через Google".'
      );
    }

    // Инициализируем Search Console API
    this.searchConsole = google.webmasters({
      version: 'v3',
      auth: this.auth,
    });
  }

  private async ensureInitialized() {
    if (!this.auth) {
      await this.initializeAuth();
    }
  }

  /**
   * Validates and normalizes siteUrl to ensure it's in the exact format required by GSC API
   * GSC accepts formats like:
   * - sc-domain:example.com
   * - https://example.com/
   * - https://www.example.com/
   * 
   * @param siteUrl URL from GSC or user input
   * @returns Normalized siteUrl or throws error if invalid
   */
  private validateAndNormalizeSiteUrl(siteUrl: string): string {
    if (!siteUrl || typeof siteUrl !== 'string') {
      throw new Error('siteUrl must be a non-empty string');
    }

    const trimmed = siteUrl.trim();

    // If it's already a valid GSC format, return as is
    if (trimmed.startsWith('sc-domain:')) {
      return trimmed;
    }

    // If it's an HTTP(S) URL, ensure it has trailing slash if it's a domain root
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      try {
        const url = new URL(trimmed);
        // If path is empty or just '/', return with trailing slash
        if (url.pathname === '' || url.pathname === '/') {
          return `${url.protocol}//${url.host}/`;
        }
        return trimmed;
      } catch (error) {
        // If URL parsing fails, try to fix it
        if (!trimmed.endsWith('/')) {
          return `${trimmed}/`;
        }
        return trimmed;
      }
    }

    // If it's just a domain, try to convert to sc-domain format
    if (trimmed.includes('.') && !trimmed.includes('/')) {
      return `sc-domain:${trimmed}`;
    }

    // Return as is if we can't determine format (let API handle validation)
    return trimmed;
  }

  /**
   * Извлекает домен из URL сайта Google Search Console
   * @param siteUrl URL сайта (sc-domain:example.com или https://example.com)
   * @returns Домен без протокола и префиксов
   */
  private extractDomain(siteUrl: string): string {
    try {
      // Убираем префикс sc-domain:
      let domain = siteUrl.replace(/^sc-domain:/, '');
      
      // Убираем протокол
      domain = domain.replace(/^https?:\/\//, '');
      
      // Убираем www.
      domain = domain.replace(/^www\./, '');
      
      // Убираем путь после домена
      domain = domain.split('/')[0];
      
      // Убираем порт
      domain = domain.split(':')[0];
      
      return domain.toLowerCase().trim();
    } catch (error) {
      return siteUrl;
    }
  }

  /**
   * Сопоставляет домен сайта с сайтами из Google Search Console
   * @param domain Домен сайта (например, example.com)
   * @returns URL сайта из Google Search Console или null
   */
  async findSiteByDomain(domain: string): Promise<string | null> {
    await this.ensureInitialized();
    try {
      const sites = await this.getSites();
      
      // Нормализуем домен для сравнения
      const normalizedDomain = domain.toLowerCase().trim().replace(/^www\./, '');
      
      // Ищем точное совпадение
      for (const site of sites) {
        const siteDomain = this.extractDomain(site.siteUrl);
        if (siteDomain === normalizedDomain) {
          return site.siteUrl;
        }
      }
      
      // Если точного совпадения нет, ищем частичное (например, example.com и www.example.com)
      for (const site of sites) {
        const siteDomain = this.extractDomain(site.siteUrl);
        // Проверяем, содержит ли один домен другой
        if (siteDomain === normalizedDomain || 
            siteDomain === `www.${normalizedDomain}` ||
            normalizedDomain === `www.${siteDomain}`) {
          return site.siteUrl;
        }
      }
      
      return null;
    } catch (error: any) {
      console.error('Ошибка поиска сайта по домену:', error);
      return null;
    }
  }

  /**
   * Извлекает URL сайта из URL Search Console
   * @param searchConsoleUrl URL из Google Search Console (например, https://search.google.com/search-console/...)
   * @returns URL сайта (например, sc-domain:example.com или https://example.com)
   */
  extractSiteUrl(searchConsoleUrl: string): string | null {
    try {
      // Если это прямой URL сайта, возвращаем как есть
      if (searchConsoleUrl.startsWith('sc-domain:') || 
          searchConsoleUrl.startsWith('http://') || 
          searchConsoleUrl.startsWith('https://')) {
        return searchConsoleUrl;
      }

      // Пытаемся извлечь из URL Search Console
      // Формат: https://search.google.com/search-console/...?resource_id=sc-domain%3Aexample.com
      const url = new URL(searchConsoleUrl);
      const resourceId = url.searchParams.get('resource_id');
      if (resourceId) {
        return decodeURIComponent(resourceId);
      }

      // Пытаемся извлечь из пути
      // Формат: https://search.google.com/search-console/.../sc-domain:example.com
      const pathMatch = searchConsoleUrl.match(/sc-domain:([^/]+)/);
      if (pathMatch) {
        return `sc-domain:${pathMatch[1]}`;
      }

      // Если это просто домен, добавляем префикс
      if (searchConsoleUrl.includes('.')) {
        // Проверяем, есть ли протокол
        if (!searchConsoleUrl.startsWith('http')) {
          return `sc-domain:${searchConsoleUrl.replace(/^https?:\/\//, '')}`;
        }
        return searchConsoleUrl;
      }

      return null;
    } catch (error) {
      console.error('Ошибка извлечения URL сайта:', error);
      return null;
    }
  }

  /**
   * Получает список сайтов в Search Console
   * @returns Массив сайтов
   */
  async getSites(): Promise<Array<{ siteUrl: string; permissionLevel: string }>> {
    await this.ensureInitialized();
    try {
      const response = await this.searchConsole.sites.list();
      return response.data.siteEntry || [];
    } catch (error: any) {
      console.error('Ошибка получения списка сайтов:', error);
      
      const errorMessage = error.response?.data?.error?.message || error.message || '';
      const errorCode = error.response?.data?.error?.code;
      
      // Проверяем, не включен ли API
      if (errorMessage.includes('has not been used') || 
          errorMessage.includes('is disabled') ||
          errorMessage.includes('Enable it by visiting')) {
        // Извлекаем project ID из сообщения, если есть
        const projectMatch = errorMessage.match(/project (\d+)/);
        const projectId = projectMatch ? projectMatch[1] : null;
        
        let enableUrl = 'https://console.developers.google.com/apis/api/searchconsole.googleapis.com/overview';
        if (projectId) {
          enableUrl += `?project=${projectId}`;
        }
        
        throw new Error(
          `Google Search Console API не включен в вашем проекте Google Cloud. ` +
          `Пожалуйста, включите API по ссылке: ${enableUrl} ` +
          `После включения API подождите несколько минут и попробуйте снова.`
        );
      }
      
      // Проверяем другие типы ошибок
      if (errorCode === 403) {
        throw new Error(
          'Доступ запрещен. Убедитесь, что ваш Google аккаунт имеет доступ к Google Search Console API.'
        );
      }
      
      throw new Error(
        errorMessage || 
        'Ошибка получения списка сайтов из Google Search Console'
      );
    }
  }

  /**
   * Получает данные о производительности сайта за период
   * Uses Search Analytics API: POST /webmasters/v3/sites/{siteUrl}/searchAnalytics/query
   * 
   * @param siteUrl URL сайта в Search Console (sc-domain:example.com или https://example.com)
   * @param startDate Начальная дата (формат: YYYY-MM-DD)
   * @param endDate Конечная дата (формат: YYYY-MM-DD)
   * @param dimensions Размерности для группировки (date, query, page, country, device, searchAppearance)
   * @returns Данные о производительности
   */
  async getPerformanceData(
    siteUrl: string,
    startDate: string,
    endDate: string,
    dimensions: string[] = []
  ): Promise<GSCQueryResponse> {
    await this.ensureInitialized();
    
    // Validate and normalize siteUrl
    const normalizedSiteUrl = this.validateAndNormalizeSiteUrl(siteUrl);
    
    // Ensure dimensions array is always provided (default to ["date", "query", "page", "country"])
    const requestDimensions = dimensions.length > 0 
      ? dimensions 
      : ["date", "query", "page", "country"];

    // Build request body with all required fields
    const requestBody: GSCQueryRequest = {
      startDate: startDate,
      endDate: endDate,
      dimensions: requestDimensions,
      rowLimit: 25000, // Maximum allowed by GSC API
    };

    const request: any = {
      siteUrl: normalizedSiteUrl,
      requestBody: requestBody,
    };

    try {
      // Log request for debugging
      console.log('[GSC API] Request:', {
        siteUrl: normalizedSiteUrl,
        startDate,
        endDate,
        dimensions: requestDimensions,
        rowLimit: requestBody.rowLimit,
      });
      
      // Вычисляем ожидаемое количество дней
      const start = new Date(startDate);
      const end = new Date(endDate);
      const expectedDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      console.log(`[GSC API] Expected days in range: ${expectedDays} days`);

      const response = await this.searchConsole.searchanalytics.query(request);
      
      // Log response summary
      const rowCount = response.data?.rows?.length || 0;
      console.log(`[GSC API] Response: ${rowCount} rows returned`);
      
      // Логируем диапазон дат в ответе
      if (rowCount > 0 && response.data?.rows) {
        const firstRow = response.data.rows[0];
        const lastRow = response.data.rows[response.data.rows.length - 1];
        const firstDate = firstRow.keys[0];
        const lastDate = lastRow.keys[0];
        const actualDays = Math.ceil((new Date(lastDate).getTime() - new Date(firstDate).getTime()) / (1000 * 60 * 60 * 24));
        console.log(`[GSC API] Response date range: ${firstDate} - ${lastDate} (${actualDays} days)`);
        
        if (actualDays < expectedDays * 0.7) {
          console.warn(`[GSC API] WARNING: Received only ${actualDays} days of data, but ${expectedDays} days were requested`);
        }
      }

      // Check for empty results
      if (!response.data?.rows || response.data.rows.length === 0) {
        console.warn('[GSC API] Empty results returned', {
          siteUrl: normalizedSiteUrl,
          startDate,
          endDate,
          dimensions: requestDimensions,
          requestBody: JSON.stringify(requestBody),
        });
      }

      return response.data as GSCQueryResponse;
    } catch (error: any) {
      const errorCode = error.response?.data?.error?.code;
      const errorMessage = error.response?.data?.error?.message || error.message || 'Unknown error';
      const errorDetails = error.response?.data?.error || {};

      // Comprehensive error logging
      console.error('[GSC API] Error:', {
        code: errorCode,
        message: errorMessage,
        siteUrl: normalizedSiteUrl,
        requestBody: JSON.stringify(requestBody),
        fullError: JSON.stringify(errorDetails),
        status: error.response?.status,
      });

      // Handle specific error codes
      if (errorCode === 403) {
        const permissionHint = 'This may indicate that the user does not have OWNER permissions for this site in Google Search Console.';
        console.error('[GSC API] 403 Forbidden:', permissionHint);
        throw new Error(
          `Доступ запрещен (403). Убедитесь, что ваш Google аккаунт имеет права OWNER для сайта "${normalizedSiteUrl}" в Google Search Console. ${permissionHint}`
        );
      }

      if (errorCode === 400) {
        console.error('[GSC API] 400 Bad Request:', errorDetails);
        throw new Error(
          `Неверный запрос (400): ${errorMessage}. Проверьте формат siteUrl и даты.`
        );
      }

      // Generic error
      throw new Error(
        errorMessage || 'Ошибка получения данных из Google Search Console'
      );
    }
  }

  /**
   * Получает агрегированные данные за период (по дням)
   * @param searchConsoleUrl URL из настроек сайта или домен для автоматического поиска
   * @param days Количество дней назад (по умолчанию 30)
   * @param domain Домен сайта для автоматического поиска, если searchConsoleUrl не указан
   * @returns Массив данных по дням
   */
  async getAggregatedData(
    searchConsoleUrl: string | null,
    days: number = 30,
    domain?: string
  ): Promise<Array<{
    date: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }>> {
    await this.ensureInitialized();
    try {
      let siteUrl: string | null = null;
      
      // Если URL не указан, пытаемся найти автоматически по домену
      if (!searchConsoleUrl && domain) {
        siteUrl = await this.findSiteByDomain(domain);
        if (!siteUrl) {
          throw new Error(
            `Не удалось автоматически найти сайт "${domain}" в Google Search Console. Убедитесь, что сайт добавлен в Google Search Console и у вас есть к нему доступ.`
          );
        }
      } else if (searchConsoleUrl) {
        siteUrl = this.extractSiteUrl(searchConsoleUrl);
        if (!siteUrl) {
          throw new Error('Не удалось извлечь URL сайта из настроек Search Console');
        }
      } else {
        throw new Error('Не указан URL сайта и домен для автоматического поиска');
      }

      // Use reusable date range function
      const dateRange = getLastNDaysRange(days);
      
      console.log(`[GSC getAggregatedData] Requesting ${days} days of data for site: ${siteUrl}`);
      console.log(`[GSC getAggregatedData] Date range: ${dateRange.startDate} - ${dateRange.endDate}`);

      // Получаем данные по дням (only date dimension for aggregation)
      const data = await this.getPerformanceData(siteUrl, dateRange.startDate, dateRange.endDate, ['date']);
      
      console.log(`[GSC getAggregatedData] Received ${data.rows?.length || 0} rows from API`);

      if (!data.rows || data.rows.length === 0) {
        return [];
      }

      // Преобразуем данные в удобный формат
      return data.rows.map((row: GSCRow) => ({
        date: row.keys[0], // Дата в формате YYYY-MM-DD
        clicks: row.clicks || 0,
        impressions: row.impressions || 0,
        ctr: row.ctr || 0,
        position: row.position || 0,
      }));
    } catch (error: any) {
      console.error('Ошибка получения агрегированных данных:', error);
      throw error;
    }
  }

  /**
   * Получает данные по запросам (топ запросов)
   * @param searchConsoleUrl URL из настроек сайта
   * @param days Количество дней назад (по умолчанию 30)
   * @param limit Количество запросов (по умолчанию 100)
   * @returns Массив данных по запросам
   */
  async getQueryData(
    searchConsoleUrl: string,
    days: number = 30,
    limit: number = 100
  ): Promise<Array<{
    query: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }>> {
    await this.ensureInitialized();
    try {
      const siteUrl = this.extractSiteUrl(searchConsoleUrl);
      if (!siteUrl) {
        throw new Error('Не удалось извлечь URL сайта из настроек Search Console');
      }

      // Use reusable date range function
      const dateRange = getLastNDaysRange(days);

      const data = await this.getPerformanceData(siteUrl, dateRange.startDate, dateRange.endDate, ['query']);

      if (!data.rows || data.rows.length === 0) {
        return [];
      }

      return data.rows
        .slice(0, limit)
        .map((row: GSCRow) => ({
          query: row.keys[0],
          clicks: row.clicks || 0,
          impressions: row.impressions || 0,
          ctr: row.ctr || 0,
          position: row.position || 0,
        }));
    } catch (error: any) {
      console.error('Ошибка получения данных по запросам:', error);
      throw error;
    }
  }

  /**
   * Получает данные по страницам (топ страниц)
   * @param searchConsoleUrl URL из настроек сайта
   * @param days Количество дней назад (по умолчанию 30)
   * @param limit Количество страниц (по умолчанию 100)
   * @returns Массив данных по страницам
   */
  async getPageData(
    searchConsoleUrl: string,
    days: number = 30,
    limit: number = 100
  ): Promise<Array<{
    page: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }>> {
    await this.ensureInitialized();
    try {
      const siteUrl = this.extractSiteUrl(searchConsoleUrl);
      if (!siteUrl) {
        throw new Error('Не удалось извлечь URL сайта из настроек Search Console');
      }

      // Use reusable date range function
      const dateRange = getLastNDaysRange(days);

      const data = await this.getPerformanceData(siteUrl, dateRange.startDate, dateRange.endDate, ['page']);

      if (!data.rows || data.rows.length === 0) {
        return [];
      }

      return data.rows
        .slice(0, limit)
        .map((row: GSCRow) => ({
          page: row.keys[0],
          clicks: row.clicks || 0,
          impressions: row.impressions || 0,
          ctr: row.ctr || 0,
          position: row.position || 0,
        }));
    } catch (error: any) {
      console.error('Ошибка получения данных по страницам:', error);
      throw error;
    }
  }

  /**
   * Получает данные по странам
   * @param searchConsoleUrl URL из настроек сайта
   * @param days Количество дней назад (по умолчанию 30)
   * @returns Массив данных по странам
   */
  async getCountryData(
    searchConsoleUrl: string,
    days: number = 30
  ): Promise<Array<{
    country: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }>> {
    await this.ensureInitialized();
    try {
      const siteUrl = this.extractSiteUrl(searchConsoleUrl);
      if (!siteUrl) {
        throw new Error('Не удалось извлечь URL сайта из настроек Search Console');
      }

      // Use reusable date range function
      const dateRange = getLastNDaysRange(days);

      const data = await this.getPerformanceData(siteUrl, dateRange.startDate, dateRange.endDate, ['country']);

      if (!data.rows || data.rows.length === 0) {
        return [];
      }

      return data.rows.map((row: GSCRow) => ({
        country: row.keys[0],
        clicks: row.clicks || 0,
        impressions: row.impressions || 0,
        ctr: row.ctr || 0,
        position: row.position || 0,
      }));
    } catch (error: any) {
      console.error('Ошибка получения данных по странам:', error);
      throw error;
    }
  }

  /**
   * Получает данные по устройствам
   * @param searchConsoleUrl URL из настроек сайта
   * @param days Количество дней назад (по умолчанию 30)
   * @returns Массив данных по устройствам
   */
  async getDeviceData(
    searchConsoleUrl: string,
    days: number = 30
  ): Promise<Array<{
    device: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }>> {
    await this.ensureInitialized();
    try {
      const siteUrl = this.extractSiteUrl(searchConsoleUrl);
      if (!siteUrl) {
        throw new Error('Не удалось извлечь URL сайта из настроек Search Console');
      }

      // Use reusable date range function
      const dateRange = getLastNDaysRange(days);

      const data = await this.getPerformanceData(siteUrl, dateRange.startDate, dateRange.endDate, ['device']);

      if (!data.rows || data.rows.length === 0) {
        return [];
      }

      return data.rows.map((row: GSCRow) => ({
        device: row.keys[0],
        clicks: row.clicks || 0,
        impressions: row.impressions || 0,
        ctr: row.ctr || 0,
        position: row.position || 0,
      }));
    } catch (error: any) {
      console.error('Ошибка получения данных по устройствам:', error);
      throw error;
    }
  }
}

/**
 * Получает диапазон дат за последние N дней от сегодня
 * @param days Количество дней назад
 * @returns Объект с startDate и endDate в формате YYYY-MM-DD
 */
export function getLastNDaysRange(days: number): DateRange {
  if (days <= 0) {
    throw new Error('days must be greater than 0');
  }

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Format dates as YYYY-MM-DD
  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return {
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
  };
}

/**
 * Получает данные из Google Search Console за указанное количество дней
 * Uses Search Analytics API with all required dimensions: ["date", "query", "page", "country"]
 * 
 * @param siteUrl Exact URL from Google Search Console (e.g., sc-domain:example.com or https://example.com/)
 * @param days Number of days to fetch (e.g., 90 or 180)
 * @param accountId Optional Google account ID
 * @param userId Optional user ID
 * @returns GSC Query Response with rows containing all dimensions
 */
export async function fetchGSCData(
  siteUrl: string,
  days: number,
  accountId?: number,
  userId?: number
): Promise<GSCQueryResponse> {
  const service = createSearchConsoleService(accountId, userId);
  
  // Get date range for the specified number of days
  const dateRange = getLastNDaysRange(days);
  
  // Fetch data with all required dimensions
  const response = await service.getPerformanceData(
    siteUrl,
    dateRange.startDate,
    dateRange.endDate,
    ["date", "query", "page", "country"] // All required dimensions
  );
  
  return response;
}

/**
 * Создает экземпляр сервиса Google Search Console
 * @param accountId ID Google аккаунта (опционально)
 * @param userId ID пользователя (опционально, но рекомендуется)
 * @returns Экземпляр GoogleSearchConsoleService
 */
export function createSearchConsoleService(accountId?: number, userId?: number): GoogleSearchConsoleService {
  return new GoogleSearchConsoleService(accountId, userId);
}
