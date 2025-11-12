import { AffiliateOffer } from './db';

// Определяем, какую БД использовать
function useSupabase(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && 
           (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY));
}

function usePostgres(): boolean {
  // Если есть Supabase, используем его
  if (useSupabase()) return false;
  
  // Иначе проверяем обычный PostgreSQL
  if (process.env.VERCEL) {
    return !!(process.env.POSTGRES_URL || process.env.DATABASE_URL);
  }
  return !!(process.env.POSTGRES_URL || process.env.DATABASE_URL);
}

export async function insertOffers(offers: Omit<AffiliateOffer, 'id' | 'createdAt'>[]): Promise<void> {
  if (useSupabase()) {
    const { insertOffers: insertSupabase } = await import('./db-supabase');
    return insertSupabase(offers);
  } else if (usePostgres()) {
    const { insertOffers: insertPostgres } = await import('./db-postgres');
    return insertPostgres(offers);
  } else {
    const { insertOffers: insertSQLite } = require('./db');
    return insertSQLite(offers);
  }
}

export async function getAllOffers(): Promise<AffiliateOffer[]> {
  if (useSupabase()) {
    const { getAllOffers: getSupabase } = await import('./db-supabase');
    return getSupabase();
  } else if (usePostgres()) {
    const { getAllOffers: getPostgres } = await import('./db-postgres');
    return getPostgres();
  } else {
    const { getAllOffers: getSQLite } = require('./db');
    return getSQLite();
  }
}

export async function clearAllOffers(): Promise<void> {
  if (useSupabase()) {
    const { clearAllOffers: clearSupabase } = await import('./db-supabase');
    return clearSupabase();
  } else if (usePostgres()) {
    const { clearAllOffers: clearPostgres } = await import('./db-postgres');
    return clearPostgres();
  } else {
    const { clearAllOffers: clearSQLite } = require('./db');
    return clearSQLite();
  }
}

export async function getOffersCount(): Promise<number> {
  if (useSupabase()) {
    const { getOffersCount: countSupabase } = await import('./db-supabase');
    return countSupabase();
  } else if (usePostgres()) {
    const { getOffersCount: countPostgres } = await import('./db-postgres');
    return countPostgres();
  } else {
    const { getOffersCount: countSQLite } = require('./db');
    return countSQLite();
  }
}
