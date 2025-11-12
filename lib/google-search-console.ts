import { google } from 'googleapis';
import { storage } from './storage';
import { getIntegrations, updateIntegrations } from './db-adapter';

/**
 * Сервис для работы с Google Search Console API
 * Получает данные о производительности сайта в поиске Google
 * Использует OAuth 2.0 для аутентификации
 */
export class GoogleSearchConsoleService {
  private auth: any;
  private searchConsole: any;

  constructor() {
    // Инициализация будет выполнена асинхронно
  }

  private async initializeAuth() {
    // Пробуем использовать OAuth токены (новый способ)
    // Сначала пытаемся получить из БД
    let integrations;
    try {
      integrations = await getIntegrations();
    } catch (error) {
      console.warn('Не удалось получить integrations из БД, используем storage:', error);
      integrations = storage.integrations;
    }

    const accessToken = integrations.googleAccessToken || storage.integrations.googleAccessToken;
    const refreshToken = integrations.googleRefreshToken || storage.integrations.googleRefreshToken;
    const tokenExpiry = integrations.googleTokenExpiry || storage.integrations.googleTokenExpiry;
    
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
          await updateIntegrations(updates);
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
  private extractSiteUrl(searchConsoleUrl: string): string | null {
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
      throw new Error(
        error.response?.data?.error?.message || 
        'Ошибка получения списка сайтов из Google Search Console'
      );
    }
  }

  /**
   * Получает данные о производительности сайта за период
   * @param siteUrl URL сайта в Search Console (sc-domain:example.com или https://example.com)
   * @param startDate Начальная дата (формат: YYYY-MM-DD)
   * @param endDate Конечная дата (формат: YYYY-MM-DD)
   * @param dimensions Размерности для группировки (query, page, country, device, searchAppearance)
   * @returns Данные о производительности
   */
  async getPerformanceData(
    siteUrl: string,
    startDate: string,
    endDate: string,
    dimensions: string[] = []
  ): Promise<any> {
    await this.ensureInitialized();
    try {
      const request: any = {
        siteUrl: siteUrl,
        requestBody: {
          startDate: startDate,
          endDate: endDate,
          dimensions: dimensions.length > 0 ? dimensions : undefined,
          rowLimit: 25000, // Максимальное количество строк
        },
      };

      const response = await this.searchConsole.searchanalytics.query(request);
      return response.data;
    } catch (error: any) {
      console.error('Ошибка получения данных производительности:', error);
      
      if (error.response?.data?.error?.code === 403) {
        throw new Error(
          'Доступ запрещен. Убедитесь, что ваш Google аккаунт имеет доступ к сайту в Google Search Console.'
        );
      }
      
      throw new Error(
        error.response?.data?.error?.message || 
        'Ошибка получения данных из Google Search Console'
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

      // Вычисляем даты
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      // Получаем данные по дням
      const data = await this.getPerformanceData(siteUrl, startDateStr, endDateStr, ['date']);

      if (!data.rows || data.rows.length === 0) {
        return [];
      }

      // Преобразуем данные в удобный формат
      return data.rows.map((row: any) => ({
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

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      const data = await this.getPerformanceData(siteUrl, startDateStr, endDateStr, ['query']);

      if (!data.rows || data.rows.length === 0) {
        return [];
      }

      return data.rows
        .slice(0, limit)
        .map((row: any) => ({
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

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      const data = await this.getPerformanceData(siteUrl, startDateStr, endDateStr, ['page']);

      if (!data.rows || data.rows.length === 0) {
        return [];
      }

      return data.rows
        .slice(0, limit)
        .map((row: any) => ({
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

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      const data = await this.getPerformanceData(siteUrl, startDateStr, endDateStr, ['country']);

      if (!data.rows || data.rows.length === 0) {
        return [];
      }

      return data.rows.map((row: any) => ({
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

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      const data = await this.getPerformanceData(siteUrl, startDateStr, endDateStr, ['device']);

      if (!data.rows || data.rows.length === 0) {
        return [];
      }

      return data.rows.map((row: any) => ({
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
 * Создает экземпляр сервиса Google Search Console
 * @returns Экземпляр GoogleSearchConsoleService
 */
export function createSearchConsoleService(): GoogleSearchConsoleService {
  return new GoogleSearchConsoleService();
}
