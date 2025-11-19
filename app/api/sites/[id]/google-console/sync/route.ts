import { NextResponse } from 'next/server';
import { getSiteById, bulkInsertGoogleSearchConsoleData, getAllGoogleAccounts, getGoogleSearchConsoleDataBySiteId, getExistingDatesForSite } from '@/lib/db-adapter';
import { createSearchConsoleService } from '@/lib/google-search-console';
import { requireAuth } from '@/lib/middleware-auth';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Функция для проверки, нужно ли синхронизировать данные (кеш на 12 часов)
// Теперь также проверяет наличие данных за последние дни
async function shouldSync(siteId: number): Promise<{ needsSync: boolean; missingDays?: number }> {
  try {
    const maxDays = 90; // Максимальный период для хранения данных
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - maxDays);
    startDate.setHours(0, 0, 0, 0);

    // Получаем существующие даты из БД
    const existingDates = await getExistingDatesForSite(siteId, startDate, endDate);
    
    // Проверяем, есть ли данные за последние 3 дня (для инкрементального обновления)
    const recentDays = 3;
    const recentEndDate = new Date();
    recentEndDate.setHours(23, 59, 59, 999);
    const recentStartDate = new Date();
    recentStartDate.setDate(recentStartDate.getDate() - recentDays);
    recentStartDate.setHours(0, 0, 0, 0);

    // Подсчитываем отсутствующие дни за последние 3 дня
    let missingRecentDays = 0;
    for (let d = new Date(recentStartDate); d <= recentEndDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      if (!existingDates.has(dateStr)) {
        missingRecentDays++;
      }
    }

    // Если нет данных вообще, нужно синхронизировать
    if (existingDates.size === 0) {
      return { needsSync: true, missingDays: maxDays };
    }

    // Если отсутствуют данные за последние 3 дня, нужно синхронизировать
    if (missingRecentDays > 0) {
      return { needsSync: true, missingDays: missingRecentDays };
    }

    // Проверяем время последней синхронизации (для обратной совместимости)
    const recentData = await getGoogleSearchConsoleDataBySiteId(siteId, 100);
    if (recentData.length > 0) {
      const maxCreatedAt = recentData.reduce((max, item) => {
        const itemTime = new Date(item.createdAt).getTime();
        return itemTime > max ? itemTime : max;
      }, 0);
      
      const now = Date.now();
      const hoursSinceSync = (now - maxCreatedAt) / (1000 * 60 * 60);
      
      // Если прошло больше 12 часов, нужно синхронизировать
      if (hoursSinceSync >= 12) {
        // Подсчитываем общее количество отсутствующих дней за последние 14 дней
        const checkDays = 14;
        const checkEndDate = new Date();
        checkEndDate.setHours(23, 59, 59, 999);
        const checkStartDate = new Date();
        checkStartDate.setDate(checkStartDate.getDate() - checkDays);
        checkStartDate.setHours(0, 0, 0, 0);

        let missingDays = 0;
        for (let d = new Date(checkStartDate); d <= checkEndDate; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().split('T')[0];
          if (!existingDates.has(dateStr)) {
            missingDays++;
          }
        }

        return { needsSync: true, missingDays: Math.min(missingDays, checkDays) };
      }
    }

    return { needsSync: false };
  } catch (error) {
    // В случае ошибки синхронизируем для безопасности
    console.warn('Error checking sync cache:', error);
    return { needsSync: true, missingDays: 90 };
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;
    
    const siteId = parseInt(params.id);
    if (isNaN(siteId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Неверный ID сайта',
        },
        { status: 400 }
      );
    }
    
    console.log(`[Sync] Starting sync for site ${siteId}, user ${user.id}`);
    
    const site = await getSiteById(siteId, user.id);

    if (!site) {
      console.error(`[Sync] Site ${siteId} not found for user ${user.id}`);
      return NextResponse.json(
        {
          success: false,
          error: 'Сайт не найден',
        },
        { status: 404 }
      );
    }

    console.log(`[Sync] Site found: ${site.domain}, GSC URL: ${site.googleSearchConsoleUrl || 'not set'}`);

    // Проверяем кеш перед синхронизацией
    console.log(`[Sync] Checking cache for site ${siteId}...`);
    const syncCheck = await shouldSync(siteId);
    console.log(`[Sync] Cache check result: needsSync=${syncCheck.needsSync}, missingDays=${syncCheck.missingDays || 0}`);
    
    if (!syncCheck.needsSync) {
      // Данные свежие (менее 12 часов и все последние дни присутствуют), возвращаем успех без синхронизации
      console.log(`[Sync] Data is fresh (12h cache), skipping sync for site ${siteId}`);
      const existingData = await getGoogleSearchConsoleDataBySiteId(siteId, 1000);
      return NextResponse.json({
        success: true,
        message: 'Данные актуальны (кеш 12 часов), синхронизация не требуется',
        data: existingData.slice(0, 90).map(item => ({
          date: item.date,
          clicks: item.clicks,
          impressions: item.impressions,
          ctr: item.ctr,
          position: item.position,
        })),
        count: existingData.length,
        cached: true,
      });
    }

    // Получаем Google аккаунты пользователя
    // Используем первый доступный аккаунт с токенами
    console.log(`[Sync] Loading Google accounts for user ${user.id}...`);
    let accounts;
    try {
      accounts = await getAllGoogleAccounts(user.id);
      console.log(`[Sync] Found ${accounts.length} Google accounts`);
    } catch (error: any) {
      console.error(`[Sync] Error loading Google accounts:`, error);
      return NextResponse.json(
        {
          success: false,
          error: `Ошибка загрузки Google аккаунтов: ${error.message || 'Неизвестная ошибка'}`,
        },
        { status: 500 }
      );
    }
    
    let accountId: number | undefined = undefined;
    
    // Ищем первый аккаунт с валидными токенами
    for (const account of accounts) {
      if (account.googleAccessToken && account.googleRefreshToken) {
        accountId = account.id;
        console.log(`[Sync] Using Google account ${accountId}`);
        break;
      }
    }
    
    if (!accountId) {
      console.warn(`[Sync] No Google account with valid tokens found for user ${user.id}`);
      // Продолжаем с undefined, fallback к старой таблице integrations
    }
    
    // Получаем данные из Google Search Console API
    console.log(`[Sync] Creating Search Console service with accountId=${accountId}, userId=${user.id}`);
    let searchConsoleService;
    try {
      searchConsoleService = createSearchConsoleService(accountId, user.id);
    } catch (error: any) {
      console.error(`[Sync] Error creating Search Console service:`, error);
      return NextResponse.json(
        {
          success: false,
          error: `Ошибка создания сервиса Google Search Console: ${error.message || 'Неизвестная ошибка'}`,
        },
        { status: 500 }
      );
    }
    
    // Если URL не указан, пытаемся найти автоматически по домену
    let foundSiteUrl: string | null = null;
    if (!site.googleSearchConsoleUrl && site.domain) {
      try {
        foundSiteUrl = await searchConsoleService.findSiteByDomain(site.domain);
        if (foundSiteUrl) {
          console.log(`Автоматически найден сайт в GSC: ${foundSiteUrl} для домена ${site.domain}`);
        }
      } catch (error) {
        console.warn('Не удалось автоматически найти сайт в GSC:', error);
      }
    }

    // Определяем период для загрузки данных
    // Если есть информация о недостающих днях, загружаем только их + небольшой буфер
    // Иначе загружаем за последние 90 дней (для первой синхронизации или полного обновления)
    const maxDays = 90;
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    const startDate = new Date();
    
    let daysToLoad = maxDays;
    let incrementalSync = false;

    if (syncCheck.missingDays !== undefined && syncCheck.missingDays < maxDays) {
      // Инкрементальная синхронизация: загружаем только недостающие дни + небольшой буфер
      // Загружаем на 7 дней больше, чтобы покрыть возможные пропуски
      daysToLoad = Math.min(syncCheck.missingDays + 7, maxDays);
      incrementalSync = true;
      startDate.setDate(startDate.getDate() - daysToLoad);
      startDate.setHours(0, 0, 0, 0);
      console.log(`[Incremental Sync] Loading ${daysToLoad} days for site ${siteId} (missing ${syncCheck.missingDays} days)`);
    } else {
      // Полная синхронизация: загружаем за последние 90 дней
      startDate.setDate(startDate.getDate() - maxDays);
      startDate.setHours(0, 0, 0, 0);
      console.log(`[Full Sync] Loading ${maxDays} days for site ${siteId}`);
    }

    // Получаем существующие даты за период, который будем загружать
    const existingDates = await getExistingDatesForSite(siteId, startDate, endDate);
    console.log(`[Sync] Found ${existingDates.size} existing dates in DB for site ${siteId}`);

    // Получаем данные из Google Search Console API
    console.log(`[Sync] Fetching data from Google Search Console API for site ${siteId}...`);
    let aggregatedData;
    try {
      aggregatedData = await searchConsoleService.getAggregatedData(
        site.googleSearchConsoleUrl || foundSiteUrl,
        daysToLoad,
        site.domain
      );
      console.log(`[Sync] Received ${aggregatedData.length} records from Google Search Console API`);
    } catch (error: any) {
      console.error(`[Sync] Error fetching data from Google Search Console API:`, error);
      console.error(`[Sync] Error stack:`, error.stack);
      
      // Более детальная обработка ошибок API
      let errorMessage = error.message || 'Ошибка получения данных из Google Search Console';
      
      if (errorMessage.includes('OAuth') || errorMessage.includes('авторизоваться') || errorMessage.includes('необходимо авторизоваться')) {
        errorMessage = 'Ошибка аутентификации. Убедитесь, что вы авторизованы через Google в разделе Интеграции.';
      } else if (errorMessage.includes('доступ запрещен') || errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
        errorMessage = 'Доступ запрещен. Убедитесь, что ваш Google аккаунт имеет доступ к сайту в Google Search Console.';
      } else if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
        errorMessage = 'Ошибка авторизации. Токены доступа истекли. Пожалуйста, переавторизуйтесь через Google в разделе Интеграции.';
      } else if (errorMessage.includes('API не включен') || errorMessage.includes('has not been used') || errorMessage.includes('is disabled')) {
        errorMessage = 'Google Search Console API не включен. Включите API в Google Cloud Console.';
      }
      
      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
        },
        { status: 500 }
      );
    }

    if (aggregatedData.length === 0) {
      console.log(`[Sync] No data received from Google Search Console API for site ${siteId}`);
      return NextResponse.json({
        success: true,
        message: 'Данные синхронизированы, но новых данных не найдено',
        data: [],
        count: 0,
      });
    }

    // Фильтруем данные: оставляем только те, которых нет в БД (инкрементальное обновление)
    // Или все данные, если это полная синхронизация
    let dataToInsert;
    if (incrementalSync && existingDates.size > 0) {
      // Инкрементальная синхронизация: добавляем только новые данные
      dataToInsert = aggregatedData
        .filter((item) => !existingDates.has(item.date))
        .map((item) => ({
          siteId,
          clicks: item.clicks,
          impressions: item.impressions,
          ctr: item.ctr,
          position: item.position,
          date: item.date,
        }));
      
      console.log(`[Incremental Sync] Filtered ${aggregatedData.length} records to ${dataToInsert.length} new records for site ${siteId}`);
    } else {
      // Полная синхронизация: сохраняем все данные (upsert обновит существующие)
      dataToInsert = aggregatedData.map((item) => ({
        siteId,
        clicks: item.clicks,
        impressions: item.impressions,
        ctr: item.ctr,
        position: item.position,
        date: item.date,
      }));
      
      console.log(`[Full Sync] Saving ${dataToInsert.length} records for site ${siteId}`);
    }

    // Сохраняем данные в БД
    // bulkInsertGoogleSearchConsoleData использует upsert, поэтому существующие данные будут обновлены,
    // а новые - добавлены
    if (dataToInsert.length > 0) {
      console.log(`[Sync] Saving ${dataToInsert.length} records to database for site ${siteId}...`);
      try {
        await bulkInsertGoogleSearchConsoleData(dataToInsert);
        console.log(`[Sync] Successfully saved ${dataToInsert.length} records to database for site ${siteId}`);
      } catch (error: any) {
        console.error(`[Sync] Error saving data to database:`, error);
        console.error(`[Sync] Error stack:`, error.stack);
        return NextResponse.json(
          {
            success: false,
            error: `Ошибка сохранения данных в базу данных: ${error.message || 'Неизвестная ошибка'}`,
          },
          { status: 500 }
        );
      }
    } else {
      console.log(`[Sync] No new data to insert for site ${siteId} (all data already exists)`);
    }

    // Очищаем данные старше 90 дней из БД
    const cleanupDate = new Date();
    cleanupDate.setDate(cleanupDate.getDate() - 90);
    cleanupDate.setHours(0, 0, 0, 0);
    
    try {
      const { deleteOldGoogleSearchConsoleData } = await import('@/lib/db-adapter');
      await deleteOldGoogleSearchConsoleData(siteId, cleanupDate);
      console.log(`[Sync] Cleaned up old data (older than 90 days) for site ${siteId}`);
    } catch (error) {
      console.warn(`[Sync] Failed to cleanup old data for site ${siteId}:`, error);
      // Не прерываем выполнение, если очистка не удалась
    }

    const syncType = incrementalSync ? 'инкрементальная' : 'полная';
    return NextResponse.json({
      success: true,
      message: `Данные Google Search Console синхронизированы (${syncType} синхронизация). ${incrementalSync ? `Добавлено` : `Загружено`} ${dataToInsert.length} записей`,
      data: aggregatedData,
      count: dataToInsert.length,
      incremental: incrementalSync,
    });
  } catch (error: any) {
    console.error('Ошибка синхронизации Google Search Console:', error);
    console.error('Error stack:', error.stack);
    
    // Более детальная обработка ошибок
    let errorMessage = error.message || 'Ошибка синхронизации Google Console';
    
    if (errorMessage.includes('OAuth') || errorMessage.includes('авторизоваться') || errorMessage.includes('необходимо авторизоваться')) {
      errorMessage = 'Ошибка аутентификации. Убедитесь, что вы авторизованы через Google в разделе Интеграции.';
    } else if (errorMessage.includes('доступ запрещен') || errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
      errorMessage = 'Доступ запрещен. Убедитесь, что ваш Google аккаунт имеет доступ к сайту в Google Search Console.';
    } else if (errorMessage.includes('не удалось извлечь URL') || errorMessage.includes('Не удалось автоматически найти сайт')) {
      errorMessage = 'Не удалось автоматически найти сайт в Google Search Console. Укажите URL сайта вручную в настройках сайта.';
    } else if (errorMessage.includes('Не указан URL сайта')) {
      errorMessage = 'Не указан URL сайта и домен для автоматического поиска. Укажите URL сайта в настройках сайта.';
    } else if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
      errorMessage = 'Ошибка авторизации. Токены доступа истекли. Пожалуйста, переавторизуйтесь через Google в разделе Интеграции.';
    } else if (errorMessage.includes('API не включен') || errorMessage.includes('has not been used') || errorMessage.includes('is disabled')) {
      errorMessage = 'Google Search Console API не включен. Включите API в Google Cloud Console.';
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
