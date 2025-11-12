import { getPostgresClient } from './postgres-client';
import type { AffiliateOffer } from './types';

// Проверяем, доступна ли PostgreSQL БД
function isPostgresAvailable(): boolean {
  return !!process.env.POSTGRES_URL || !!process.env.DATABASE_URL;
}

export async function insertOffers(offers: Omit<AffiliateOffer, 'id' | 'createdAt'>[]): Promise<void> {
  if (!isPostgresAvailable()) {
    throw new Error('PostgreSQL database not configured. Please set POSTGRES_URL or DATABASE_URL.');
  }

  if (offers.length === 0) return;

  try {
    const db = await getPostgresClient();
    
    // Вставляем по одному для надежности (можно оптимизировать позже)
    for (const offer of offers) {
      await db.query(
        'INSERT INTO affiliate_offers (name, topic, country, model, cr, ecpc, epc, source) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [offer.name, offer.topic, offer.country, offer.model, offer.cr, offer.ecpc, offer.epc, offer.source || null]
      );
    }
  } catch (error: any) {
    if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
      throw new Error('Table affiliate_offers does not exist. Please run migrations manually. See migrations/manual_migration.sql');
    }
    throw error;
  }
}

export async function getAllOffers(): Promise<AffiliateOffer[]> {
  if (!isPostgresAvailable()) {
    // Возвращаем пустой массив вместо ошибки, чтобы сайт работал
    console.warn('PostgreSQL database not configured, returning empty array');
    return [];
  }

  try {
    const db = await getPostgresClient();
    const result = await db.query('SELECT * FROM affiliate_offers ORDER BY name');
    return result.rows as AffiliateOffer[];
  } catch (error: any) {
    // Если таблица не существует, возвращаем пустой массив
    if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
      console.warn('Table affiliate_offers does not exist. Please run migrations manually.');
      return [];
    }
    console.error('Error fetching offers:', error);
    return [];
  }
}

export async function clearAllOffers(): Promise<void> {
  if (!isPostgresAvailable()) {
    throw new Error('PostgreSQL database not configured');
  }

  try {
    const db = await getPostgresClient();
    await db.query('DELETE FROM affiliate_offers');
  } catch (error: any) {
    if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
      // Таблица не существует, ничего не делаем
      return;
    }
    throw error;
  }
}

export async function getOffersCount(): Promise<number> {
  if (!isPostgresAvailable()) {
    return 0;
  }

  try {
    const db = await getPostgresClient();
    const result = await db.query('SELECT COUNT(*) as count FROM affiliate_offers');
    return parseInt(result.rows[0].count as string, 10);
  } catch (error: any) {
    if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
      return 0;
    }
    console.error('Error getting offers count:', error);
    return 0;
  }
}
