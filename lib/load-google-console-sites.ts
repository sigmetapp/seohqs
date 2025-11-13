import { createSearchConsoleService } from './google-search-console';
import { getAllSites, insertSite, updateSite, bulkInsertGoogleSearchConsoleData } from './db-adapter';

/**
 * Загружает все сайты из Google Search Console и их данные
 * @returns Результат загрузки
 */
export async function loadGoogleConsoleSites() {
  const searchConsoleService = createSearchConsoleService();
  
  // Получаем все сайты из Google Search Console
  const googleSites = await searchConsoleService.getSites();
  
  if (!googleSites || googleSites.length === 0) {
    return {
      success: true,
      message: 'Сайты в Google Search Console не найдены',
      sitesLoaded: 0,
      sitesUpdated: 0,
      dataLoaded: 0,
      totalGoogleSites: 0,
    };
  }

  // Получаем существующие сайты из БД
  const existingSites = await getAllSites();
  
  // Функция для нормализации домена
  const normalizeDomain = (siteUrl: string): string => {
    let domain = siteUrl.replace(/^sc-domain:/, '');
    domain = domain.replace(/^https?:\/\//, '');
    domain = domain.replace(/^www\./, '');
    domain = domain.split('/')[0];
    return domain.toLowerCase().trim();
  };

  // Функция для извлечения названия из домена
  const extractNameFromDomain = (domain: string): string => {
    const parts = domain.split('.');
    if (parts.length >= 2) {
      return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    }
    return domain;
  };

  let sitesLoaded = 0;
  let sitesUpdated = 0;
  let dataLoaded = 0;

  // Обрабатываем каждый сайт из Google Console
  for (const googleSite of googleSites) {
    const normalizedDomain = normalizeDomain(googleSite.siteUrl);
    
    // Ищем существующий сайт по домену
    const existingSite = existingSites.find(site => {
      const siteDomain = normalizeDomain(site.domain);
      return siteDomain === normalizedDomain || 
             siteDomain === `www.${normalizedDomain}` ||
             normalizedDomain === `www.${siteDomain}`;
    });

    if (existingSite) {
      // Обновляем существующий сайт, если нужно
      if (!existingSite.googleSearchConsoleUrl || existingSite.googleSearchConsoleUrl !== googleSite.siteUrl) {
        await updateSite(existingSite.id, {
          googleSearchConsoleUrl: googleSite.siteUrl,
        });
        sitesUpdated++;
      }
    } else {
      // Создаем новый сайт
      const siteName = extractNameFromDomain(normalizedDomain);
      await insertSite({
        name: siteName,
        domain: normalizedDomain,
        googleSearchConsoleUrl: googleSite.siteUrl,
      });
      sitesLoaded++;
    }

    // Загружаем данные производительности за последние 30 дней
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      const performanceData = await searchConsoleService.getPerformanceData(
        googleSite.siteUrl,
        startDateStr,
        endDateStr,
        ['date']
      );

      if (performanceData.rows && performanceData.rows.length > 0) {
        // Находим ID сайта (новый или существующий)
        // Обновляем список сайтов после возможного добавления нового
        const updatedSites = await getAllSites();
        const siteId = updatedSites.find(site => {
          const siteDomain = normalizeDomain(site.domain);
          return siteDomain === normalizedDomain || 
                 siteDomain === `www.${normalizedDomain}` ||
                 normalizedDomain === `www.${siteDomain}`;
        })?.id;

        if (siteId) {
          // Подготавливаем данные для вставки
          const dataRows = performanceData.rows.map((row: any) => ({
            siteId: siteId,
            date: row.keys[0],
            clicks: row.clicks || 0,
            impressions: row.impressions || 0,
            ctr: row.ctr || 0,
            position: row.position || 0,
          }));

          // Вставляем данные (bulk insert)
          await bulkInsertGoogleSearchConsoleData(dataRows);
          dataLoaded += dataRows.length;
        }
      }
    } catch (dataError: any) {
      console.warn(`Ошибка загрузки данных для сайта ${googleSite.siteUrl}:`, dataError.message);
      // Продолжаем обработку других сайтов
    }
  }

  return {
    success: true,
    message: `Загружено ${sitesLoaded} новых сайтов, обновлено ${sitesUpdated} существующих, загружено ${dataLoaded} записей данных`,
    sitesLoaded,
    sitesUpdated,
    dataLoaded,
    totalGoogleSites: googleSites.length,
  };
}
