import { google } from 'googleapis';
import { storage } from './storage';

/**
 * Сервис для работы с Google Search Console API
 * Получает данные о производительности сайта в поиске Google
 */
export class GoogleSearchConsoleService {
  private auth: any;
  private searchConsole: any;

  constructor() {
    // Получаем учетные данные из настроек интеграций
    const serviceAccountEmail = storage.integrations.googleServiceAccountEmail || 
                                process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = (storage.integrations.googlePrivateKey || 
                       process.env.GOOGLE_PRIVATE_KEY)?.replace(/\\n/g, '\n');

    if (!serviceAccountEmail || !privateKey) {
      throw new Error(
        'GOOGLE_SERVICE_ACCOUNT_EMAIL и GOOGLE_PRIVATE_KEY должны быть установлены в настройках интеграций или переменных окружения'
      );
    }

    // Создаем JWT клиент для аутентификации
    // Для Search Console API нужен scope: https://www.googleapis.com/auth/webmasters.readonly
    this.auth = new google.auth.JWT({
      email: serviceAccountEmail,
      key: privateKey,
      scopes: [
        'https://www.googleapis.com/auth/webmasters.readonly',
        'https://www.googleapis.com/auth/webmasters',
      ],
    });

    // Инициализируем Search Console API
    this.searchConsole = google.webmasters({
      version: 'v3',
      auth: this.auth,
    });
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
          'Доступ запрещен. Убедитесь, что Service Account имеет доступ к сайту в Google Search Console и настроено делегирование домена (для Google Workspace).'
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
   * @param searchConsoleUrl URL из настроек сайта
   * @param days Количество дней назад (по умолчанию 30)
   * @returns Массив данных по дням
   */
  async getAggregatedData(
    searchConsoleUrl: string,
    days: number = 30
  ): Promise<Array<{
    date: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }>> {
    try {
      const siteUrl = this.extractSiteUrl(searchConsoleUrl);
      if (!siteUrl) {
        throw new Error('Не удалось извлечь URL сайта из настроек Search Console');
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
