import { getPostgresClient } from './postgres-client';

export interface AffiliateOffer {
  id?: number;
  name: string;
  topic: string;
  country: string;
  model: string;
  cr: number;
  ecpc: number;
  epc: number;
  source?: string;
  createdAt?: string;
}

// Проверяем, доступна ли PostgreSQL БД
function isPostgresAvailable(): boolean {
  return !!process.env.POSTGRES_URL || !!process.env.DATABASE_URL;
}

export async function insertOffers(offers: Omit<AffiliateOffer, 'id' | 'createdAt'>[]): Promise<void> {
  if (!isPostgresAvailable()) {
    throw new Error('PostgreSQL database not configured');
  }

  if (offers.length === 0) return;

  const db = await getPostgresClient();
  
  // Вставляем по одному для надежности (можно оптимизировать позже)
  for (const offer of offers) {
    await db.query(
      'INSERT INTO affiliate_offers (name, topic, country, model, cr, ecpc, epc, source) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [offer.name, offer.topic, offer.country, offer.model, offer.cr, offer.ecpc, offer.epc, offer.source || null]
    );
  }
}

export async function getAllOffers(): Promise<AffiliateOffer[]> {
  if (!isPostgresAvailable()) {
    throw new Error('PostgreSQL database not configured');
  }

  const db = await getPostgresClient();
  const result = await db.query('SELECT * FROM affiliate_offers ORDER BY name');
  
  return result.rows as AffiliateOffer[];
}

export async function clearAllOffers(): Promise<void> {
  if (!isPostgresAvailable()) {
    throw new Error('PostgreSQL database not configured');
  }

  const db = await getPostgresClient();
  await db.query('DELETE FROM affiliate_offers');
}

export async function getOffersCount(): Promise<number> {
  if (!isPostgresAvailable()) {
    throw new Error('PostgreSQL database not configured');
  }

  const db = await getPostgresClient();
  const result = await db.query('SELECT COUNT(*) as count FROM affiliate_offers');
  return parseInt(result.rows[0].count as string, 10);
}
