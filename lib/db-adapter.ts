import { AffiliateOffer } from './db';

// Определяем, какую БД использовать
function usePostgres(): boolean {
  // На Vercel всегда используем PostgreSQL если есть переменные окружения
  if (process.env.VERCEL) {
    return !!(process.env.POSTGRES_URL || process.env.DATABASE_URL);
  }
  // Локально проверяем переменные окружения
  return !!(process.env.POSTGRES_URL || process.env.DATABASE_URL);
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
