import { supabase } from './supabase';
import type { AffiliateOffer, Site, IntegrationsSettings } from './types';

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
export async function insertSite(site: Omit<Site, 'id' | 'createdAt' | 'updatedAt'>): Promise<Site> {
  if (!supabase) {
    throw new Error('Supabase client not initialized. Check environment variables.');
  }

  try {
    const dataToInsert = {
      name: site.name,
      domain: site.domain,
      category: site.category || null,
      google_search_console_url: site.googleSearchConsoleUrl || null,
      ahrefs_api_key: site.ahrefsApiKey || null,
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
      ahrefsApiKey: data.ahrefs_api_key,
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

export async function getAllSites(): Promise<Site[]> {
  if (!supabase) {
    console.warn('Supabase client not initialized, returning empty array');
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('sites')
      .select('*')
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
      ahrefsApiKey: row.ahrefs_api_key,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } catch (error: any) {
    console.error('Error fetching sites from Supabase:', error);
    return [];
  }
}

export async function getSiteById(id: number): Promise<Site | null> {
  if (!supabase) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('sites')
      .select('*')
      .eq('id', id)
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
      ahrefsApiKey: data.ahrefs_api_key,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  } catch (error: any) {
    console.error('Error fetching site from Supabase:', error);
    return null;
  }
}

export async function updateSite(id: number, site: Partial<Omit<Site, 'id' | 'createdAt'>>): Promise<Site> {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  try {
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (site.name !== undefined) updateData.name = site.name;
    if (site.domain !== undefined) updateData.domain = site.domain;
    if (site.category !== undefined) updateData.category = site.category || null;
    if (site.googleSearchConsoleUrl !== undefined) updateData.google_search_console_url = site.googleSearchConsoleUrl || null;
    if (site.ahrefsApiKey !== undefined) updateData.ahrefs_api_key = site.ahrefsApiKey || null;

    const { data, error } = await supabase
      .from('sites')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Supabase update error: ${error.message}`);
    }

    return {
      id: data.id,
      name: data.name,
      domain: data.domain,
      category: data.category,
      googleSearchConsoleUrl: data.google_search_console_url,
      ahrefsApiKey: data.ahrefs_api_key,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  } catch (error: any) {
    throw error;
  }
}

// Integrations functions
export async function getIntegrations(): Promise<IntegrationsSettings> {
  if (!supabase) {
    return {
      id: 1,
      googleServiceAccountEmail: '',
      googlePrivateKey: '',
      ahrefsApiKey: '',
      googleSearchConsoleUrl: '',
      updatedAt: new Date().toISOString(),
    };
  }

  try {
    const { data, error } = await supabase
      .from('integrations')
      .select('*')
      .eq('id', 1)
      .single();

    if (error) {
      // Если таблица не существует (42P01 - undefined_table)
      if (error.code === '42P01' || error.message?.includes('does not exist') || error.message?.includes('schema cache')) {
        console.error('Table integrations does not exist. Please run migration: migrations/006_integrations_table_supabase.sql');
        return {
          id: 1,
          googleServiceAccountEmail: '',
          googlePrivateKey: '',
          ahrefsApiKey: '',
          googleSearchConsoleUrl: '',
          updatedAt: new Date().toISOString(),
        };
      }

      if (error.code === 'PGRST116') {
        // Запись не найдена, создаем её
        const { data: newData, error: insertError } = await supabase
          .from('integrations')
          .insert({ id: 1 })
          .select()
          .single();

        if (insertError) {
          console.error('Error creating integrations record:', insertError);
          return {
            id: 1,
            googleServiceAccountEmail: '',
            googlePrivateKey: '',
            ahrefsApiKey: '',
            googleSearchConsoleUrl: '',
            updatedAt: new Date().toISOString(),
          };
        }

        return {
          id: newData.id,
          googleServiceAccountEmail: newData.google_service_account_email || '',
          googlePrivateKey: newData.google_private_key || '',
          ahrefsApiKey: newData.ahrefs_api_key || '',
          googleSearchConsoleUrl: newData.google_search_console_url || '',
          updatedAt: newData.updated_at,
        };
      }

      console.error('Error fetching integrations:', error);
      return {
        id: 1,
        googleServiceAccountEmail: '',
        googlePrivateKey: '',
        ahrefsApiKey: '',
        googleSearchConsoleUrl: '',
        updatedAt: new Date().toISOString(),
      };
    }

    return {
      id: data.id,
      googleServiceAccountEmail: data.google_service_account_email || '',
      googlePrivateKey: data.google_private_key || '',
      ahrefsApiKey: data.ahrefs_api_key || '',
      googleSearchConsoleUrl: data.google_search_console_url || '',
      updatedAt: data.updated_at,
    };
  } catch (error: any) {
    console.error('Error fetching integrations:', error);
    return {
      id: 1,
      googleServiceAccountEmail: '',
      googlePrivateKey: '',
      ahrefsApiKey: '',
      googleSearchConsoleUrl: '',
      updatedAt: new Date().toISOString(),
    };
  }
}

export async function updateIntegrations(settings: Partial<Omit<IntegrationsSettings, 'id' | 'updatedAt'>>): Promise<IntegrationsSettings> {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  try {
    // Сначала убедимся, что запись существует
    const { data: existing } = await supabase
      .from('integrations')
      .select('id')
      .eq('id', 1)
      .single();

    if (!existing) {
      await supabase
        .from('integrations')
        .insert({ id: 1 });
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (settings.googleServiceAccountEmail !== undefined) {
      updateData.google_service_account_email = settings.googleServiceAccountEmail || null;
    }
    if (settings.googlePrivateKey !== undefined) {
      updateData.google_private_key = settings.googlePrivateKey || null;
    }
    if (settings.ahrefsApiKey !== undefined) {
      updateData.ahrefs_api_key = settings.ahrefsApiKey || null;
    }
    if (settings.googleSearchConsoleUrl !== undefined) {
      updateData.google_search_console_url = settings.googleSearchConsoleUrl || null;
    }

    const { data, error } = await supabase
      .from('integrations')
      .update(updateData)
      .eq('id', 1)
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
      throw new Error(`Supabase update error: ${error.message}`);
    }

    return {
      id: data.id,
      googleServiceAccountEmail: data.google_service_account_email || '',
      googlePrivateKey: data.google_private_key || '',
      ahrefsApiKey: data.ahrefs_api_key || '',
      googleSearchConsoleUrl: data.google_search_console_url || '',
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

// Ahrefs Data functions
export interface AhrefsDataRow {
  id: number;
  siteId: number;
  domainRating: number;
  backlinks: number;
  referringDomains: number;
  organicKeywords: number;
  organicTraffic: number;
  date: string;
  createdAt: string;
}

export async function insertAhrefsData(
  data: Omit<AhrefsDataRow, 'id' | 'createdAt'>
): Promise<AhrefsDataRow> {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  try {
    const dataToInsert = {
      site_id: data.siteId,
      domain_rating: data.domainRating,
      backlinks: data.backlinks,
      referring_domains: data.referringDomains,
      organic_keywords: data.organicKeywords,
      organic_traffic: data.organicTraffic,
      date: data.date,
    };

    const { data: inserted, error } = await supabase
      .from('ahrefs_data')
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
      domainRating: inserted.domain_rating,
      backlinks: inserted.backlinks,
      referringDomains: inserted.referring_domains,
      organicKeywords: inserted.organic_keywords,
      organicTraffic: inserted.organic_traffic,
      date: inserted.date,
      createdAt: inserted.created_at,
    };
  } catch (error: any) {
    throw error;
  }
}

export async function getAhrefsDataBySiteId(
  siteId: number
): Promise<AhrefsDataRow | null> {
  if (!supabase) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('ahrefs_data')
      .select('*')
      .eq('site_id', siteId)
      .order('date', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === '42P01' || error.message.includes('does not exist')) {
        return null;
      }
      if (error.code === 'PGRST116') {
        // No rows returned
        return null;
      }
      throw error;
    }

    if (!data) {
      return null;
    }

    return {
      id: data.id,
      siteId: data.site_id,
      domainRating: data.domain_rating,
      backlinks: data.backlinks,
      referringDomains: data.referring_domains,
      organicKeywords: data.organic_keywords,
      organicTraffic: data.organic_traffic,
      date: data.date,
      createdAt: data.created_at,
    };
  } catch (error: any) {
    console.error('Error fetching Ahrefs data:', error);
    return null;
  }
}
