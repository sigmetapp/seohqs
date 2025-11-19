import { supabase } from './supabase';
import type { AffiliateOffer, Site, IntegrationsSettings, GoogleAccount, Tag, SiteStatus } from './types';

export async function insertOffers(offers: Omit<AffiliateOffer, 'id' | 'created_at'>[]): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase client not initialized. Check environment variables.');
  }

  if (offers.length === 0) return;

  try {
    const dataToInsert = offers.map(offer => ({
      name: offer.name,
      topic: offer.topic,
      country: offer.country,
      model: offer.model,
      cr: offer.cr,
      ecpc: offer.ecpc,
      epc: offer.epc,
      source: offer.source || null,
    }));

    console.log('Inserting offers into Supabase:', dataToInsert.length, 'records');
    
    const { data, error } = await supabase
      .from('affiliate_offers')
      .insert(dataToInsert)
      .select();

    if (error) {
      console.error('Supabase insert error:', error);
      // Проверяем специфичные ошибки RLS
      if (error.code === '42501' || error.message?.includes('permission denied') || error.message?.includes('new row violates row-level security')) {
        throw new Error(`RLS Policy Error: ${error.message}. Проверьте политики Row Level Security в Supabase.`);
      }
      throw new Error(`Supabase insert error: ${error.message} (code: ${error.code}, hint: ${error.hint || 'none'})`);
    }

    console.log('Successfully inserted offers:', data?.length || 0);
  } catch (error: any) {
    if (error?.message?.includes('does not exist') || error?.code === '42P01') {
      throw new Error('Table affiliate_offers does not exist. Please create it in Supabase.');
    }
    throw error;
  }
}

export async function getAllOffers(): Promise<AffiliateOffer[]> {
  if (!supabase) {
    console.warn('Supabase client not initialized, returning empty array');
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('affiliate_offers')
      .select('*')
      .order('name');

    if (error) {
      if (error.code === '42P01' || error.message.includes('does not exist')) {
        console.warn('Table affiliate_offers does not exist');
        return [];
      }
      throw error;
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      topic: row.topic,
      country: row.country,
      model: row.model,
      cr: parseFloat(row.cr) || 0,
      ecpc: parseFloat(row.ecpc) || 0,
      epc: parseFloat(row.epc) || 0,
      source: row.source,
      created_at: row.created_at,
    }));
  } catch (error: any) {
    console.error('Error fetching offers from Supabase:', error);
    return [];
  }
}

export async function clearAllOffers(): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  try {
    // Получаем все ID для удаления
    const { data: allData, error: fetchError } = await supabase
      .from('affiliate_offers')
      .select('id');

    if (fetchError) {
      if (fetchError.code === '42P01' || fetchError.message.includes('does not exist')) {
        return; // Таблица не существует, ничего не делаем
      }
      throw fetchError;
    }

    if (!allData || allData.length === 0) {
      return; // Нет данных для удаления
    }

    // Удаляем все записи по ID
    const ids = allData.map(row => row.id);
    const { error } = await supabase
      .from('affiliate_offers')
      .delete()
      .in('id', ids);

    if (error) {
      throw error;
    }
  } catch (error: any) {
    if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
      return;
    }
    throw error;
  }
}

export async function getOffersCount(): Promise<number> {
  if (!supabase) {
    return 0;
  }

  try {
    const { count, error } = await supabase
      .from('affiliate_offers')
      .select('*', { count: 'exact', head: true });

    if (error) {
      if (error.code === '42P01' || error.message.includes('does not exist')) {
        return 0;
      }
      console.error('Error getting count:', error);
      return 0;
    }

    return count || 0;
  } catch (error: any) {
    console.error('Error getting offers count:', error);
    return 0;
  }
}

// Sites functions
export async function insertSite(site: Omit<Site, 'id' | 'createdAt' | 'updatedAt'>, userId: number): Promise<Site> {
  if (!supabase) {
    throw new Error('Supabase client not initialized. Check environment variables.');
  }

  try {
    const dataToInsert = {
      name: site.name,
      domain: site.domain,
      category: site.category || null,
      google_search_console_url: site.googleSearchConsoleUrl || null,
      user_id: userId,
    };

    const { data, error } = await supabase
      .from('sites')
      .insert(dataToInsert)
      .select()
      .single();

    if (error) {
      if (error.code === '42501' || error.message?.includes('permission denied') || error.message?.includes('new row violates row-level security')) {
        throw new Error(`RLS Policy Error: ${error.message}. Проверьте политики Row Level Security в Supabase.`);
      }
      throw new Error(`Supabase insert error: ${error.message} (code: ${error.code})`);
    }

    return {
      id: data.id,
      name: data.name,
      domain: data.domain,
      category: data.category,
      googleSearchConsoleUrl: data.google_search_console_url,
      userId: data.user_id,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  } catch (error: any) {
    if (error?.message?.includes('does not exist') || error?.code === '42P01') {
      throw new Error('Table sites does not exist. Please create it in Supabase.');
    }
    throw error;
  }
}

export async function getAllSites(userId: number): Promise<Site[]> {
  if (!supabase) {
    console.warn('Supabase client not initialized, returning empty array');
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('sites')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      if (error.code === '42P01' || error.message.includes('does not exist')) {
        console.warn('Table sites does not exist');
        return [];
      }
      throw error;
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      domain: row.domain,
      category: row.category,
      googleSearchConsoleUrl: row.google_search_console_url,
      userId: row.user_id,
      statusId: row.status_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } catch (error: any) {
    console.error('Error fetching sites from Supabase:', error);
    return [];
  }
}

export async function getSiteById(id: number, userId: number): Promise<Site | null> {
  if (!supabase) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('sites')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === '42P01' || error.message.includes('does not exist')) {
        return null;
      }
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw error;
    }

    if (!data) return null;

    return {
      id: data.id,
      name: data.name,
      domain: data.domain,
      category: data.category,
      googleSearchConsoleUrl: data.google_search_console_url,
      userId: data.user_id,
      statusId: data.status_id,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  } catch (error: any) {
    console.error('Error fetching site from Supabase:', error);
    return null;
  }
}

export async function updateSite(id: number, site: Partial<Omit<Site, 'id' | 'createdAt'>>, userId: number): Promise<Site> {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  try {
    // Сначала проверяем, что сайт существует и принадлежит пользователю
    const { data: existingSite, error: checkError } = await supabase
      .from('sites')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle();

    if (checkError) {
      throw new Error(`Supabase check error: ${checkError.message}`);
    }

    if (!existingSite) {
      throw new Error('Site not found or access denied');
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (site.name !== undefined) updateData.name = site.name;
    if (site.domain !== undefined) updateData.domain = site.domain;
    if (site.category !== undefined) updateData.category = site.category || null;
    if (site.googleSearchConsoleUrl !== undefined) updateData.google_search_console_url = site.googleSearchConsoleUrl || null;
    if (site.statusId !== undefined) updateData.status_id = site.statusId || null;

    const { data, error } = await supabase
      .from('sites')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .maybeSingle();

    if (error) {
      // Проверяем специфичные ошибки Supabase
      if (error.message?.includes('Cannot coerce') || error.message?.includes('multiple rows')) {
        // Если запрос вернул несколько строк, получаем первую
        const { data: multipleData, error: multipleError } = await supabase
          .from('sites')
          .select('*')
          .eq('id', id)
          .eq('user_id', userId)
          .limit(1);

        if (multipleError || !multipleData || multipleData.length === 0) {
          throw new Error('Site not found or access denied');
        }

        const siteData = multipleData[0];
        return {
          id: siteData.id,
          name: siteData.name,
          domain: siteData.domain,
          category: siteData.category,
          googleSearchConsoleUrl: siteData.google_search_console_url,
          userId: siteData.user_id,
          statusId: siteData.status_id,
          createdAt: siteData.created_at,
          updatedAt: siteData.updated_at,
        };
      }
      throw new Error(`Supabase update error: ${error.message}`);
    }

    if (!data) {
      throw new Error('Failed to update site: no data returned');
    }

    return {
      id: data.id,
      name: data.name,
      domain: data.domain,
      category: data.category,
      googleSearchConsoleUrl: data.google_search_console_url,
      userId: data.user_id,
      statusId: data.status_id,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  } catch (error: any) {
    throw error;
  }
}

// Integrations functions
export async function getIntegrations(userId: number): Promise<IntegrationsSettings> {
  if (!supabase) {
      return {
        id: 1,
        userId: userId,
        googleServiceAccountEmail: '',
        googlePrivateKey: '',
        googleSearchConsoleUrl: '',
        updatedAt: new Date().toISOString(),
      };
  }

  try {
    const { data, error } = await supabase
      .from('integrations')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      // Если таблица не существует (42P01 - undefined_table)
      if (error.code === '42P01' || error.message?.includes('does not exist') || error.message?.includes('schema cache')) {
        console.error('Table integrations does not exist. Please run migration: migrations/006_integrations_table_supabase.sql');
        return {
          id: 1,
          googleServiceAccountEmail: '',
          googlePrivateKey: '',
          googleSearchConsoleUrl: '',
          googleAccessToken: '',
          googleRefreshToken: '',
          googleTokenExpiry: '',
          updatedAt: new Date().toISOString(),
        };
      }

      if (error.code === 'PGRST116') {
        // Запись не найдена, создаем её используя upsert для предотвращения ошибки duplicate key
        const { data: newData, error: upsertError } = await supabase
          .from('integrations')
          .upsert({ user_id: userId }, {
            onConflict: 'user_id',
            ignoreDuplicates: false
          })
          .select()
          .single();

        if (upsertError) {
          console.error('Error creating integrations record:', upsertError);
          // Если ошибка duplicate key, пытаемся получить существующую запись
          if (upsertError.message?.includes('duplicate key') || upsertError.code === '23505') {
            const { data: existingData, error: fetchError } = await supabase
              .from('integrations')
              .select('*')
              .eq('user_id', userId)
              .single();
            
            if (!fetchError && existingData) {
              return {
                id: existingData.id,
                userId: existingData.user_id,
                googleServiceAccountEmail: existingData.google_service_account_email || '',
                googlePrivateKey: existingData.google_private_key || '',
                googleSearchConsoleUrl: existingData.google_search_console_url || '',
                googleAccessToken: existingData.google_access_token || '',
                googleRefreshToken: existingData.google_refresh_token || '',
                googleTokenExpiry: existingData.google_token_expiry || '',
                updatedAt: existingData.updated_at,
              };
            }
          }
          
          return {
            id: 1,
            userId: userId,
            googleServiceAccountEmail: '',
            googlePrivateKey: '',
            googleSearchConsoleUrl: '',
            googleAccessToken: '',
            googleRefreshToken: '',
            googleTokenExpiry: '',
            updatedAt: new Date().toISOString(),
          };
        }

        return {
          id: newData.id,
          userId: newData.user_id,
          googleServiceAccountEmail: newData.google_service_account_email || '',
          googlePrivateKey: newData.google_private_key || '',
          googleSearchConsoleUrl: newData.google_search_console_url || '',
          googleAccessToken: newData.google_access_token || '',
          googleRefreshToken: newData.google_refresh_token || '',
          googleTokenExpiry: newData.google_token_expiry || '',
          updatedAt: newData.updated_at,
        };
      }

      console.error('Error fetching integrations:', error);
      return {
        id: 1,
        userId: userId,
        googleServiceAccountEmail: '',
        googlePrivateKey: '',
        googleSearchConsoleUrl: '',
        googleAccessToken: '',
        googleRefreshToken: '',
        googleTokenExpiry: '',
        updatedAt: new Date().toISOString(),
      };
    }

    return {
      id: data.id,
      userId: data.user_id,
      googleServiceAccountEmail: data.google_service_account_email || '',
      googlePrivateKey: data.google_private_key || '',
      googleSearchConsoleUrl: data.google_search_console_url || '',
      googleAccessToken: data.google_access_token || '',
      googleRefreshToken: data.google_refresh_token || '',
      googleTokenExpiry: data.google_token_expiry || '',
      updatedAt: data.updated_at,
    };
  } catch (error: any) {
    console.error('Error fetching integrations:', error);
    return {
      id: 1,
      userId: userId,
      googleServiceAccountEmail: '',
      googlePrivateKey: '',
      googleSearchConsoleUrl: '',
      googleAccessToken: '',
      googleRefreshToken: '',
      googleTokenExpiry: '',
      updatedAt: new Date().toISOString(),
    };
  }
}

export async function updateIntegrations(settings: Partial<Omit<IntegrationsSettings, 'id' | 'updatedAt'>>, userId: number): Promise<IntegrationsSettings> {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  try {
    // Используем upsert для создания или обновления записи
    // Это предотвращает ошибку duplicate key, если запись уже существует
    const upsertData: any = {
      user_id: userId,
      updated_at: new Date().toISOString(),
    };

    // Добавляем только те поля, которые были переданы для обновления
    if (settings.googleServiceAccountEmail !== undefined) {
      upsertData.google_service_account_email = settings.googleServiceAccountEmail || null;
    }
    if (settings.googlePrivateKey !== undefined) {
      upsertData.google_private_key = settings.googlePrivateKey || null;
    }
    if (settings.googleSearchConsoleUrl !== undefined) {
      upsertData.google_search_console_url = settings.googleSearchConsoleUrl || null;
    }
    if (settings.googleAccessToken !== undefined) {
      upsertData.google_access_token = settings.googleAccessToken || null;
    }
    if (settings.googleRefreshToken !== undefined) {
      upsertData.google_refresh_token = settings.googleRefreshToken || null;
    }
    if (settings.googleTokenExpiry !== undefined) {
      upsertData.google_token_expiry = settings.googleTokenExpiry || null;
    }

    // Используем upsert с конфликтом по user_id (уникальный индекс)
    const { data, error } = await supabase
      .from('integrations')
      .upsert(upsertData, {
        onConflict: 'user_id',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (error) {
      // Если таблица не существует
      if (error.code === '42P01' || error.message?.includes('does not exist') || error.message?.includes('schema cache')) {
        throw new Error(
          `Таблица integrations не существует в Supabase. Пожалуйста, выполните миграцию:\n` +
          `1. Откройте Supabase Dashboard\n` +
          `2. Перейдите в SQL Editor\n` +
          `3. Выполните SQL из файла: migrations/006_integrations_table_supabase.sql`
        );
      }
      
      // Если ошибка duplicate key (может произойти если миграция еще не выполнена)
      if (error.message?.includes('duplicate key') || error.code === '23505' || error.message?.includes('unique constraint')) {
        // Пытаемся обновить существующую запись
        const { data: existingData, error: updateError } = await supabase
          .from('integrations')
          .update(upsertData)
          .eq('user_id', userId)
          .select()
          .single();
        
        if (!updateError && existingData) {
          return {
            id: existingData.id,
            userId: existingData.user_id,
            googleServiceAccountEmail: existingData.google_service_account_email || '',
            googlePrivateKey: existingData.google_private_key || '',
            googleSearchConsoleUrl: existingData.google_search_console_url || '',
            googleAccessToken: existingData.google_access_token || '',
            googleRefreshToken: existingData.google_refresh_token || '',
            googleTokenExpiry: existingData.google_token_expiry || '',
            updatedAt: existingData.updated_at,
          };
        }
        
        // Если обновление не удалось, выбрасываем оригинальную ошибку
        throw new Error(`Supabase upsert error: ${error.message}. Возможно, требуется выполнить миграцию migrations/017_fix_integrations_primary_key_supabase.sql`);
      }
      
      // Проверяем специфичные ошибки Supabase
      if (error.message?.includes('Cannot coerce') || error.message?.includes('multiple rows')) {
        // Если запрос вернул несколько строк, получаем первую
        const { data: multipleData, error: multipleError } = await supabase
          .from('integrations')
          .select('*')
          .eq('user_id', userId)
          .limit(1);

        if (multipleError || !multipleData || multipleData.length === 0) {
          throw new Error('Failed to update integrations: no data found');
        }

        const integrationData = multipleData[0];
        return {
          id: integrationData.id,
          userId: integrationData.user_id,
          googleServiceAccountEmail: integrationData.google_service_account_email || '',
          googlePrivateKey: integrationData.google_private_key || '',
          googleSearchConsoleUrl: integrationData.google_search_console_url || '',
          googleAccessToken: integrationData.google_access_token || '',
          googleRefreshToken: integrationData.google_refresh_token || '',
          googleTokenExpiry: integrationData.google_token_expiry || '',
          updatedAt: integrationData.updated_at,
        };
      }
      
      throw new Error(`Supabase update error: ${error.message}`);
    }

    if (!data) {
      throw new Error('Failed to update integrations: no data returned');
    }

    return {
      id: data.id,
      userId: data.user_id,
      googleServiceAccountEmail: data.google_service_account_email || '',
      googlePrivateKey: data.google_private_key || '',
      googleSearchConsoleUrl: data.google_search_console_url || '',
      googleAccessToken: data.google_access_token || '',
      googleRefreshToken: data.google_refresh_token || '',
      googleTokenExpiry: data.google_token_expiry || '',
      updatedAt: data.updated_at,
    };
  } catch (error: any) {
    throw error;
  }
}

// Google Search Console Data functions
export interface GoogleSearchConsoleDataRow {
  id: number;
  siteId: number;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  date: string;
  createdAt: string;
}

export async function insertGoogleSearchConsoleData(
  data: Omit<GoogleSearchConsoleDataRow, 'id' | 'createdAt'>
): Promise<GoogleSearchConsoleDataRow> {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  try {
    const dataToInsert = {
      site_id: data.siteId,
      clicks: data.clicks,
      impressions: data.impressions,
      ctr: data.ctr,
      position: data.position,
      date: data.date,
    };

    const { data: inserted, error } = await supabase
      .from('google_search_console_data')
      .upsert(dataToInsert, {
        onConflict: 'site_id,date',
        ignoreDuplicates: false,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '42501' || error.message?.includes('permission denied')) {
        throw new Error(`RLS Policy Error: ${error.message}. Проверьте политики Row Level Security.`);
      }
      throw new Error(`Supabase insert error: ${error.message}`);
    }

    return {
      id: inserted.id,
      siteId: inserted.site_id,
      clicks: inserted.clicks,
      impressions: inserted.impressions,
      ctr: parseFloat(inserted.ctr),
      position: parseFloat(inserted.position),
      date: inserted.date,
      createdAt: inserted.created_at,
    };
  } catch (error: any) {
    throw error;
  }
}

export async function getGoogleSearchConsoleDataBySiteId(
  siteId: number,
  limit: number = 100
): Promise<GoogleSearchConsoleDataRow[]> {
  if (!supabase) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('google_search_console_data')
      .select('*')
      .eq('site_id', siteId)
      .order('date', { ascending: false })
      .limit(limit);

    if (error) {
      if (error.code === '42P01' || error.message.includes('does not exist')) {
        return [];
      }
      throw error;
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      siteId: row.site_id,
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: parseFloat(row.ctr),
      position: parseFloat(row.position),
      date: row.date,
      createdAt: row.created_at,
    }));
  } catch (error: any) {
    console.error('Error fetching Google Search Console data:', error);
    return [];
  }
}

export async function bulkInsertGoogleSearchConsoleData(
  data: Omit<GoogleSearchConsoleDataRow, 'id' | 'createdAt'>[]
): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  if (data.length === 0) return;

  try {
    const dataToInsert = data.map(item => ({
      site_id: item.siteId,
      clicks: item.clicks,
      impressions: item.impressions,
      ctr: item.ctr,
      position: item.position,
      date: item.date,
    }));

    const { error } = await supabase
      .from('google_search_console_data')
      .upsert(dataToInsert, {
        onConflict: 'site_id,date',
        ignoreDuplicates: false,
      });

    if (error) {
      if (error.code === '42501' || error.message?.includes('permission denied')) {
        throw new Error(`RLS Policy Error: ${error.message}. Проверьте политики Row Level Security.`);
      }
      throw new Error(`Supabase bulk insert error: ${error.message}`);
    }
  } catch (error: any) {
    throw error;
  }
}

/**
 * Получает множество дат, которые уже есть в БД для указанного сайта за период
 */
export async function getExistingDatesForSite(
  siteId: number,
  startDate: Date,
  endDate: Date
): Promise<Set<string>> {
  if (!supabase) {
    return new Set();
  }

  try {
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('google_search_console_data')
      .select('date')
      .eq('site_id', siteId)
      .gte('date', startDateStr)
      .lte('date', endDateStr);

    if (error) {
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return new Set();
      }
      console.error('Error fetching existing dates:', error);
      return new Set();
    }

    const datesSet = new Set<string>();
    (data || []).forEach((row: any) => {
      if (row.date) {
        datesSet.add(row.date);
      }
    });

    return datesSet;
  } catch (error: any) {
    console.error('Error fetching existing dates:', error);
    return new Set();
  }
}

export async function clearGoogleSearchConsoleData(siteId?: number): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  try {
    if (siteId) {
      // Очищаем данные для конкретного сайта
      const { error } = await supabase
        .from('google_search_console_data')
        .delete()
        .eq('site_id', siteId);
      
      if (error) {
        throw new Error(`Supabase delete error: ${error.message}`);
      }
      console.log(`Cleared Google Search Console data for site ${siteId}`);
    } else {
      // Очищаем все данные
      const { error } = await supabase
        .from('google_search_console_data')
        .delete()
        .neq('id', 0); // Удаляем все записи
      
      if (error) {
        throw new Error(`Supabase delete error: ${error.message}`);
      }
      console.log('Cleared all Google Search Console data');
    }
  } catch (error: any) {
    throw error;
  }
}

/**
 * Удаляет данные Google Search Console старше указанной даты для указанного сайта
 */
export async function deleteOldGoogleSearchConsoleData(
  siteId: number,
  beforeDate: Date
): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  try {
    const beforeDateStr = beforeDate.toISOString().split('T')[0];
    
    const { error } = await supabase
      .from('google_search_console_data')
      .delete()
      .eq('site_id', siteId)
      .lt('date', beforeDateStr);
    
    if (error) {
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        // Таблица не существует, ничего не делаем
        return;
      }
      throw new Error(`Supabase delete old data error: ${error.message}`);
    }
    
    console.log(`Deleted Google Search Console data older than ${beforeDateStr} for site ${siteId}`);
  } catch (error: any) {
    throw error;
  }
}

// Google Accounts functions
export async function getAllGoogleAccounts(userId: number): Promise<GoogleAccount[]> {
  if (!supabase) {
    console.warn('Supabase client not initialized, returning empty array');
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('google_accounts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        // Таблица не существует, возвращаем пустой массив
        return [];
      }
      console.error('Error fetching Google accounts:', error);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      email: row.email,
      userId: row.user_id,
      googleAccessToken: row.google_access_token || '',
      googleRefreshToken: row.google_refresh_token || '',
      googleTokenExpiry: row.google_token_expiry || '',
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } catch (error: any) {
    console.error('Error fetching Google accounts:', error);
    return [];
  }
}

export async function getGoogleAccountById(id: number, userId: number): Promise<GoogleAccount | null> {
  if (!supabase) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('google_accounts')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Запись не найдена
        return null;
      }
      console.error('Error fetching Google account:', error);
      return null;
    }

    if (!data) {
      return null;
    }

    return {
      id: data.id,
      email: data.email,
      userId: data.user_id,
      googleAccessToken: data.google_access_token || '',
      googleRefreshToken: data.google_refresh_token || '',
      googleTokenExpiry: data.google_token_expiry || '',
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  } catch (error: any) {
    console.error('Error fetching Google account:', error);
    return null;
  }
}

export async function createGoogleAccount(account: Omit<GoogleAccount, 'id' | 'createdAt' | 'updatedAt'>, userId: number): Promise<GoogleAccount> {
  if (!supabase) {
    throw new Error('Supabase client not initialized. Check environment variables.');
  }

  try {
    const { data, error } = await supabase
      .from('google_accounts')
      .insert({
        email: account.email,
        user_id: userId,
        google_access_token: account.googleAccessToken || null,
        google_refresh_token: account.googleRefreshToken || null,
        google_token_expiry: account.googleTokenExpiry || null,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new Error('Аккаунт с таким email уже существует');
      }
      throw new Error(`Supabase insert error: ${error.message}`);
    }

    if (!data) {
      throw new Error('Failed to create Google account');
    }

    return {
      id: data.id,
      email: data.email,
      userId: data.user_id,
      googleAccessToken: data.google_access_token || '',
      googleRefreshToken: data.google_refresh_token || '',
      googleTokenExpiry: data.google_token_expiry || '',
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  } catch (error: any) {
    throw error;
  }
}

export async function updateGoogleAccount(id: number, account: Partial<Omit<GoogleAccount, 'id' | 'createdAt' | 'updatedAt'>>, userId: number): Promise<GoogleAccount> {
  if (!supabase) {
    throw new Error('Supabase client not initialized. Check environment variables.');
  }

  try {
    // Сначала проверяем, что аккаунт существует и принадлежит пользователю
    const { data: existingAccount, error: checkError } = await supabase
      .from('google_accounts')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle();

    if (checkError) {
      throw new Error(`Supabase check error: ${checkError.message}`);
    }

    if (!existingAccount) {
      throw new Error('Google account not found or access denied');
    }

    const updates: any = {};
    if (account.email !== undefined) {
      updates.email = account.email;
    }
    if (account.googleAccessToken !== undefined) {
      updates.google_access_token = account.googleAccessToken || null;
    }
    if (account.googleRefreshToken !== undefined) {
      updates.google_refresh_token = account.googleRefreshToken || null;
    }
    if (account.googleTokenExpiry !== undefined) {
      updates.google_token_expiry = account.googleTokenExpiry || null;
    }
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('google_accounts')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .maybeSingle();

    if (error) {
      // Проверяем специфичные ошибки Supabase
      if (error.message?.includes('Cannot coerce') || error.message?.includes('multiple rows')) {
        // Если запрос вернул несколько строк, получаем первую
        const { data: multipleData, error: multipleError } = await supabase
          .from('google_accounts')
          .select('*')
          .eq('id', id)
          .eq('user_id', userId)
          .limit(1);

        if (multipleError || !multipleData || multipleData.length === 0) {
          throw new Error('Google account not found or access denied');
        }

        const accountData = multipleData[0];
        return {
          id: accountData.id,
          email: accountData.email,
          userId: accountData.user_id,
          googleAccessToken: accountData.google_access_token || '',
          googleRefreshToken: accountData.google_refresh_token || '',
          googleTokenExpiry: accountData.google_token_expiry || '',
          createdAt: accountData.created_at,
          updatedAt: accountData.updated_at,
        };
      }
      throw new Error(`Supabase update error: ${error.message}`);
    }

    if (!data) {
      throw new Error('Failed to update Google account: no data returned');
    }

    return {
      id: data.id,
      email: data.email,
      userId: data.user_id,
      googleAccessToken: data.google_access_token || '',
      googleRefreshToken: data.google_refresh_token || '',
      googleTokenExpiry: data.google_token_expiry || '',
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  } catch (error: any) {
    throw error;
  }
}

export async function deleteGoogleAccount(id: number, userId: number): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase client not initialized. Check environment variables.');
  }

  try {
    const { error } = await supabase
      .from('google_accounts')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Supabase delete error: ${error.message}`);
    }
  } catch (error: any) {
    throw error;
  }
}

// Tags functions
export async function createTag(tag: Omit<Tag, 'id' | 'createdAt' | 'updatedAt'>, userId: number): Promise<Tag> {
  if (!supabase) {
    throw new Error('Supabase client not initialized. Check environment variables.');
  }

  try {
    const { data, error } = await supabase
      .from('tags')
      .insert({
        name: tag.name,
        color: tag.color || '#3b82f6',
        user_id: userId,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new Error('Tag with this name already exists');
      }
      if (error.code === '42501' || error.message?.includes('permission denied')) {
        throw new Error(`RLS Policy Error: ${error.message}. Проверьте политики Row Level Security.`);
      }
      throw new Error(`Supabase insert error: ${error.message}`);
    }

    if (!data) {
      throw new Error('Failed to create tag');
    }

    return {
      id: data.id,
      name: data.name,
      color: data.color || '#3b82f6',
      userId: data.user_id,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  } catch (error: any) {
    throw error;
  }
}

export async function getAllTags(userId: number): Promise<Tag[]> {
  if (!supabase) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .eq('user_id', userId)
      .order('name', { ascending: true });

    if (error) {
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return [];
      }
      console.error('Error fetching tags:', error);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      color: row.color || '#3b82f6',
      userId: row.user_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } catch (error: any) {
    console.error('Error fetching tags:', error);
    return [];
  }
}

export async function getTagById(id: number, userId: number): Promise<Tag | null> {
  if (!supabase) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Error fetching tag:', error);
      return null;
    }

    if (!data) {
      return null;
    }

    return {
      id: data.id,
      name: data.name,
      color: data.color || '#3b82f6',
      userId: data.user_id,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  } catch (error: any) {
    console.error('Error fetching tag:', error);
    return null;
  }
}

export async function updateTag(id: number, tag: Partial<Omit<Tag, 'id' | 'createdAt'>>, userId: number): Promise<Tag> {
  if (!supabase) {
    throw new Error('Supabase client not initialized. Check environment variables.');
  }

  try {
    const updates: any = {};
    if (tag.name !== undefined) {
      updates.name = tag.name;
    }
    if (tag.color !== undefined) {
      updates.color = tag.color;
    }
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('tags')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error('Tag not found');
      }
      throw new Error(`Supabase update error: ${error.message}`);
    }

    if (!data) {
      throw new Error('Failed to update tag');
    }

    return {
      id: data.id,
      name: data.name,
      color: data.color || '#3b82f6',
      userId: data.user_id,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  } catch (error: any) {
    throw error;
  }
}

export async function deleteTag(id: number, userId: number): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase client not initialized. Check environment variables.');
  }

  try {
    const { error } = await supabase
      .from('tags')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Supabase delete error: ${error.message}`);
    }
  } catch (error: any) {
    throw error;
  }
}

// Site tags functions
export async function assignTagToSite(siteId: number, tagId: number): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase client not initialized. Check environment variables.');
  }

  try {
    const { error } = await supabase
      .from('site_tags')
      .insert({
        site_id: siteId,
        tag_id: tagId,
      });

    if (error) {
      if (error.code === '23505') {
        // Tag already assigned, ignore
        return;
      }
      if (error.code === '42501' || error.message?.includes('permission denied')) {
        throw new Error(`RLS Policy Error: ${error.message}. Проверьте политики Row Level Security.`);
      }
      throw new Error(`Supabase insert error: ${error.message}`);
    }
  } catch (error: any) {
    throw error;
  }
}

export async function removeTagFromSite(siteId: number, tagId: number): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase client not initialized. Check environment variables.');
  }

  try {
    const { error } = await supabase
      .from('site_tags')
      .delete()
      .eq('site_id', siteId)
      .eq('tag_id', tagId);

    if (error) {
      throw new Error(`Supabase delete error: ${error.message}`);
    }
  } catch (error: any) {
    throw error;
  }
}

export async function getSiteTags(siteId: number): Promise<Tag[]> {
  if (!supabase) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('site_tags')
      .select(`
        tag_id,
        tags (
          id,
          name,
          color,
          user_id,
          created_at,
          updated_at
        )
      `)
      .eq('site_id', siteId);

    if (error) {
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return [];
      }
      console.error('Error fetching site tags:', error);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: row.tags.id,
      name: row.tags.name,
      color: row.tags.color || '#3b82f6',
      userId: row.tags.user_id,
      createdAt: row.tags.created_at,
      updatedAt: row.tags.updated_at,
    }));
  } catch (error: any) {
    console.error('Error fetching site tags:', error);
    return [];
  }
}

export async function getSitesByTag(tagId: number, userId: number): Promise<number[]> {
  if (!supabase) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('site_tags')
      .select(`
        site_id,
        sites!inner (
          id,
          user_id
        )
      `)
      .eq('tag_id', tagId)
      .eq('sites.user_id', userId);

    if (error) {
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return [];
      }
      console.error('Error fetching sites by tag:', error);
      return [];
    }

    return (data || []).map((row: any) => row.site_id);
  } catch (error: any) {
    console.error('Error fetching sites by tag:', error);
    return [];
  }
}

/**
 * Получает теги для нескольких сайтов одним запросом (оптимизация N+1)
 */
export async function getAllSitesTags(siteIds: number[]): Promise<Record<number, import('./types').Tag[]>> {
  if (!supabase || siteIds.length === 0) {
    return {};
  }

  try {
    const { data, error } = await supabase
      .from('site_tags')
      .select(`
        site_id,
        tags (
          id,
          name,
          color,
          user_id,
          created_at,
          updated_at
        )
      `)
      .in('site_id', siteIds);

    if (error) {
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return {};
      }
      console.error('Error fetching all sites tags:', error);
      return {};
    }

    const tagsBySite: Record<number, import('./types').Tag[]> = {};
    
    // Инициализируем пустые массивы для всех сайтов
    siteIds.forEach(siteId => {
      tagsBySite[siteId] = [];
    });

    // Заполняем теги
    (data || []).forEach((row: any) => {
      if (row.tags && !tagsBySite[row.site_id]) {
        tagsBySite[row.site_id] = [];
      }
      if (row.tags) {
        tagsBySite[row.site_id].push({
          id: row.tags.id,
          name: row.tags.name,
          color: row.tags.color || '#3b82f6',
          userId: row.tags.user_id,
          createdAt: row.tags.created_at,
          updatedAt: row.tags.updated_at,
        });
      }
    });

    return tagsBySite;
  } catch (error: any) {
    console.error('Error fetching all sites tags:', error);
    return {};
  }
}

export async function getAllStatuses(): Promise<SiteStatus[]> {
  if (!supabase) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('site_statuses')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) {
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return [];
      }
      console.error('Error fetching statuses:', error);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      color: row.color || '#6b7280',
      sortOrder: row.sort_order,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } catch (error: any) {
    console.error('Error fetching statuses:', error);
    return [];
  }
}

