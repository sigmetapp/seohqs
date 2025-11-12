import { supabase } from './supabase';
import type { AffiliateOffer, Site } from './types';

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
