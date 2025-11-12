import { supabase, AffiliateOffer } from './supabase';

export async function insertOffers(offers: Omit<AffiliateOffer, 'id' | 'created_at'>[]): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase client not initialized. Check environment variables.');
  }

  if (offers.length === 0) return;

  try {
    const { error } = await supabase
      .from('affiliate_offers')
      .insert(offers.map(offer => ({
        name: offer.name,
        topic: offer.topic,
        country: offer.country,
        model: offer.model,
        cr: offer.cr,
        ecpc: offer.ecpc,
        epc: offer.epc,
        source: offer.source || null,
      })));

    if (error) {
      throw new Error(`Supabase insert error: ${error.message} (code: ${error.code})`);
    }
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
