import type { AffiliateOffer, Site } from './types';

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
    // На Vercel не используем SQLite
    if (process.env.VERCEL) {
      throw new Error('No database configured on Vercel. Please set up Supabase or PostgreSQL.');
    }
    // Только для локальной разработки
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
    // На Vercel не используем SQLite
    if (process.env.VERCEL) {
      console.warn('No database configured on Vercel. Please set up Supabase or PostgreSQL.');
      return [];
    }
    // Только для локальной разработки
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
    // На Vercel не используем SQLite
    if (process.env.VERCEL) {
      throw new Error('No database configured on Vercel. Please set up Supabase or PostgreSQL.');
    }
    // Только для локальной разработки
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
    // На Vercel не используем SQLite
    if (process.env.VERCEL) {
      return 0;
    }
    // Только для локальной разработки
    const { getOffersCount: countSQLite } = require('./db');
    return countSQLite();
  }
}

// Sites adapter functions
export async function insertSite(site: Omit<Site, 'id' | 'createdAt' | 'updatedAt'>): Promise<Site> {
  if (useSupabase()) {
    const { insertSite: insertSupabase } = await import('./db-supabase');
    return insertSupabase(site);
  } else if (usePostgres()) {
    const { insertSite: insertPostgres } = await import('./db-postgres');
    return insertPostgres(site);
  } else {
    // На Vercel не используем SQLite
    if (process.env.VERCEL) {
      throw new Error('No database configured on Vercel. Please set up Supabase or PostgreSQL.');
    }
    // Только для локальной разработки
    const { insertSite: insertSQLite } = require('./db');
    return insertSQLite(site);
  }
}

export async function getAllSites(): Promise<Site[]> {
  if (useSupabase()) {
    const { getAllSites: getSupabase } = await import('./db-supabase');
    return getSupabase();
  } else if (usePostgres()) {
    const { getAllSites: getPostgres } = await import('./db-postgres');
    return getPostgres();
  } else {
    // На Vercel не используем SQLite
    if (process.env.VERCEL) {
      console.warn('No database configured on Vercel. Please set up Supabase or PostgreSQL.');
      return [];
    }
    // Только для локальной разработки
    const { getAllSites: getSQLite } = require('./db');
    return getSQLite();
  }
}

export async function getSiteById(id: number): Promise<Site | null> {
  if (useSupabase()) {
    const { getSiteById: getSupabase } = await import('./db-supabase');
    return getSupabase(id);
  } else if (usePostgres()) {
    const { getSiteById: getPostgres } = await import('./db-postgres');
    return getPostgres(id);
  } else {
    // На Vercel не используем SQLite
    if (process.env.VERCEL) {
      console.warn('No database configured on Vercel. Please set up Supabase or PostgreSQL.');
      return null;
    }
    // Только для локальной разработки
    const { getSiteById: getSQLite } = require('./db');
    return getSQLite(id);
  }
}

export async function updateSite(id: number, site: Partial<Omit<Site, 'id' | 'createdAt'>>): Promise<Site> {
  if (useSupabase()) {
    const { updateSite: updateSupabase } = await import('./db-supabase');
    return updateSupabase(id, site);
  } else if (usePostgres()) {
    const { updateSite: updatePostgres } = await import('./db-postgres');
    return updatePostgres(id, site);
  } else {
    // На Vercel не используем SQLite
    if (process.env.VERCEL) {
      throw new Error('No database configured on Vercel. Please set up Supabase or PostgreSQL.');
    }
    // Только для локальной разработки
    const { updateSite: updateSQLite } = require('./db');
    return updateSQLite(id, site);
  }
}

// Integrations adapter functions
export async function getIntegrations(): Promise<import('./types').IntegrationsSettings> {
  if (useSupabase()) {
    const { getIntegrations: getSupabase } = await import('./db-supabase');
    return getSupabase();
  } else if (usePostgres()) {
    const { getIntegrations: getPostgres } = await import('./db-postgres');
    return getPostgres();
  } else {
    // На Vercel не используем SQLite
    if (process.env.VERCEL) {
      throw new Error('No database configured on Vercel. Please set up Supabase or PostgreSQL.');
    }
    // Только для локальной разработки
    const { getIntegrations: getSQLite } = require('./db');
    return getSQLite();
  }
}

export async function updateIntegrations(settings: Partial<Omit<import('./types').IntegrationsSettings, 'id' | 'updatedAt'>>): Promise<import('./types').IntegrationsSettings> {
  if (useSupabase()) {
    const { updateIntegrations: updateSupabase } = await import('./db-supabase');
    return updateSupabase(settings);
  } else if (usePostgres()) {
    const { updateIntegrations: updatePostgres } = await import('./db-postgres');
    return updatePostgres(settings);
  } else {
    // На Vercel не используем SQLite
    if (process.env.VERCEL) {
      throw new Error('No database configured on Vercel. Please set up Supabase or PostgreSQL.');
    }
    // Только для локальной разработки
    const { updateIntegrations: updateSQLite } = require('./db');
    return updateSQLite(settings);
  }
}

// Google Search Console Data adapter functions
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
  if (useSupabase()) {
    const { insertGoogleSearchConsoleData: insertSupabase } = await import('./db-supabase');
    return insertSupabase(data);
  } else if (usePostgres()) {
    const { insertGoogleSearchConsoleData: insertPostgres } = await import('./db-postgres');
    return insertPostgres(data);
  } else {
    if (process.env.VERCEL) {
      throw new Error('No database configured on Vercel. Please set up Supabase or PostgreSQL.');
    }
    const { insertGoogleSearchConsoleData: insertSQLite } = require('./db');
    return insertSQLite(data);
  }
}

export async function getGoogleSearchConsoleDataBySiteId(
  siteId: number,
  limit: number = 100
): Promise<GoogleSearchConsoleDataRow[]> {
  if (useSupabase()) {
    const { getGoogleSearchConsoleDataBySiteId: getSupabase } = await import('./db-supabase');
    return getSupabase(siteId, limit);
  } else if (usePostgres()) {
    const { getGoogleSearchConsoleDataBySiteId: getPostgres } = await import('./db-postgres');
    return getPostgres(siteId, limit);
  } else {
    if (process.env.VERCEL) {
      return [];
    }
    const { getGoogleSearchConsoleDataBySiteId: getSQLite } = require('./db');
    return getSQLite(siteId, limit);
  }
}

export async function bulkInsertGoogleSearchConsoleData(
  data: Omit<GoogleSearchConsoleDataRow, 'id' | 'createdAt'>[]
): Promise<void> {
  if (useSupabase()) {
    const { bulkInsertGoogleSearchConsoleData: bulkInsertSupabase } = await import('./db-supabase');
    return bulkInsertSupabase(data);
  } else if (usePostgres()) {
    const { bulkInsertGoogleSearchConsoleData: bulkInsertPostgres } = await import('./db-postgres');
    return bulkInsertPostgres(data);
  } else {
    if (process.env.VERCEL) {
      throw new Error('No database configured on Vercel. Please set up Supabase or PostgreSQL.');
    }
    const { bulkInsertGoogleSearchConsoleData: bulkInsertSQLite } = require('./db');
    return bulkInsertSQLite(data);
  }
}

// Ahrefs Data adapter functions
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
  if (useSupabase()) {
    const { insertAhrefsData: insertSupabase } = await import('./db-supabase');
    return insertSupabase(data);
  } else if (usePostgres()) {
    const { insertAhrefsData: insertPostgres } = await import('./db-postgres');
    return insertPostgres(data);
  } else {
    if (process.env.VERCEL) {
      throw new Error('No database configured on Vercel. Please set up Supabase or PostgreSQL.');
    }
    const { insertAhrefsData: insertSQLite } = require('./db');
    return insertSQLite(data);
  }
}

export async function getAhrefsDataBySiteId(
  siteId: number
): Promise<AhrefsDataRow | null> {
  if (useSupabase()) {
    const { getAhrefsDataBySiteId: getSupabase } = await import('./db-supabase');
    return getSupabase(siteId);
  } else if (usePostgres()) {
    const { getAhrefsDataBySiteId: getPostgres } = await import('./db-postgres');
    return getPostgres(siteId);
  } else {
    if (process.env.VERCEL) {
      return null;
    }
    const { getAhrefsDataBySiteId: getSQLite } = require('./db');
    return getSQLite(siteId);
  }
}
