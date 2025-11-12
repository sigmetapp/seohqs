import { AffiliateOffer } from './db';

// Определяем, какую БД использовать
function usePostgres(): boolean {
  return !!(process.env.POSTGRES_URL || process.env.DATABASE_URL || process.env.VERCEL);
}

export async function insertOffers(offers: Omit<AffiliateOffer, 'id' | 'createdAt'>[]): Promise<void> {
  if (usePostgres()) {
    const { insertOffers: insertPostgres } = await import('./db-postgres');
    return insertPostgres(offers);
  } else {
    const { insertOffers: insertSQLite } = require('./db');
    return insertSQLite(offers);
  }
}

export async function getAllOffers(): Promise<AffiliateOffer[]> {
  if (usePostgres()) {
    const { getAllOffers: getPostgres } = await import('./db-postgres');
    return getPostgres();
  } else {
    const { getAllOffers: getSQLite } = require('./db');
    return getSQLite();
  }
}

export async function clearAllOffers(): Promise<void> {
  if (usePostgres()) {
    const { clearAllOffers: clearPostgres } = await import('./db-postgres');
    return clearPostgres();
  } else {
    const { clearAllOffers: clearSQLite } = require('./db');
    return clearSQLite();
  }
}

export async function getOffersCount(): Promise<number> {
  if (usePostgres()) {
    const { getOffersCount: countPostgres } = await import('./db-postgres');
    return countPostgres();
  } else {
    const { getOffersCount: countSQLite } = require('./db');
    return countSQLite();
  }
}
