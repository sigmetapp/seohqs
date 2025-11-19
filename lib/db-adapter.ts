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
export async function insertSite(site: Omit<Site, 'id' | 'createdAt' | 'updatedAt'>, userId: number): Promise<Site> {
  if (useSupabase()) {
    const { insertSite: insertSupabase } = await import('./db-supabase');
    return insertSupabase({ ...site, userId }, userId);
  } else if (usePostgres()) {
    const { insertSite: insertPostgres } = await import('./db-postgres');
    return insertPostgres({ ...site, userId }, userId);
  } else {
    // На Vercel не используем SQLite
    if (process.env.VERCEL) {
      throw new Error('No database configured on Vercel. Please set up Supabase or PostgreSQL.');
    }
    // Только для локальной разработки
    const { insertSite: insertSQLite } = require('./db');
    return insertSQLite({ ...site, userId });
  }
}

export async function getAllSites(userId: number): Promise<Site[]> {
  if (useSupabase()) {
    const { getAllSites: getSupabase } = await import('./db-supabase');
    return getSupabase(userId);
  } else if (usePostgres()) {
    const { getAllSites: getPostgres } = await import('./db-postgres');
    return getPostgres(userId);
  } else {
    // На Vercel не используем SQLite
    if (process.env.VERCEL) {
      console.warn('No database configured on Vercel. Please set up Supabase or PostgreSQL.');
      return [];
    }
    // Только для локальной разработки
    const { getAllSites: getSQLite } = require('./db');
    return getSQLite(userId);
  }
}

export async function getSiteById(id: number, userId: number): Promise<Site | null> {
  if (useSupabase()) {
    const { getSiteById: getSupabase } = await import('./db-supabase');
    return getSupabase(id, userId);
  } else if (usePostgres()) {
    const { getSiteById: getPostgres } = await import('./db-postgres');
    return getPostgres(id, userId);
  } else {
    // На Vercel не используем SQLite
    if (process.env.VERCEL) {
      console.warn('No database configured on Vercel. Please set up Supabase or PostgreSQL.');
      return null;
    }
    // Только для локальной разработки
    const { getSiteById: getSQLite } = require('./db');
    return getSQLite(id, userId);
  }
}

export async function updateSite(id: number, site: Partial<Omit<Site, 'id' | 'createdAt'>>, userId: number): Promise<Site> {
  if (useSupabase()) {
    const { updateSite: updateSupabase } = await import('./db-supabase');
    return updateSupabase(id, site, userId);
  } else if (usePostgres()) {
    const { updateSite: updatePostgres } = await import('./db-postgres');
    return updatePostgres(id, site, userId);
  } else {
    // На Vercel не используем SQLite
    if (process.env.VERCEL) {
      throw new Error('No database configured on Vercel. Please set up Supabase or PostgreSQL.');
    }
    // Только для локальной разработки
    const { updateSite: updateSQLite } = require('./db');
    return updateSQLite(id, site, userId);
  }
}

// Integrations adapter functions
export async function getIntegrations(userId: number): Promise<import('./types').IntegrationsSettings> {
  if (useSupabase()) {
    const { getIntegrations: getSupabase } = await import('./db-supabase');
    return getSupabase(userId);
  } else if (usePostgres()) {
    const { getIntegrations: getPostgres } = await import('./db-postgres');
    return getPostgres(userId);
  } else {
    // На Vercel не используем SQLite
    if (process.env.VERCEL) {
      throw new Error('No database configured on Vercel. Please set up Supabase or PostgreSQL.');
    }
    // Только для локальной разработки
    const { getIntegrations: getSQLite } = require('./db');
    return getSQLite(userId);
  }
}

export async function updateIntegrations(settings: Partial<Omit<import('./types').IntegrationsSettings, 'id' | 'updatedAt'>>, userId: number): Promise<import('./types').IntegrationsSettings> {
  if (useSupabase()) {
    const { updateIntegrations: updateSupabase } = await import('./db-supabase');
    return updateSupabase(settings, userId);
  } else if (usePostgres()) {
    const { updateIntegrations: updatePostgres } = await import('./db-postgres');
    return updatePostgres(settings, userId);
  } else {
    // На Vercel не используем SQLite
    if (process.env.VERCEL) {
      throw new Error('No database configured on Vercel. Please set up Supabase or PostgreSQL.');
    }
    // Только для локальной разработки
    const { updateIntegrations: updateSQLite } = require('./db');
    return updateSQLite(settings, userId);
  }
}

// Google Accounts functions
export async function getAllGoogleAccounts(userId: number): Promise<import('./types').GoogleAccount[]> {
  if (useSupabase()) {
    const { getAllGoogleAccounts: getSupabase } = await import('./db-supabase');
    return getSupabase(userId);
  } else if (usePostgres()) {
    const { getAllGoogleAccounts: getPostgres } = await import('./db-postgres-accounts');
    return getPostgres(userId);
  } else {
    if (process.env.VERCEL) {
      throw new Error('No database configured on Vercel. Please set up Supabase or PostgreSQL.');
    }
    const { getAllGoogleAccounts: getSQLite } = require('./db');
    return getSQLite(userId);
  }
}

export async function getGoogleAccountById(id: number, userId: number): Promise<import('./types').GoogleAccount | null> {
  if (useSupabase()) {
    const { getGoogleAccountById: getSupabase } = await import('./db-supabase');
    return getSupabase(id, userId);
  } else if (usePostgres()) {
    const { getGoogleAccountById: getPostgres } = await import('./db-postgres-accounts');
    return getPostgres(id, userId);
  } else {
    if (process.env.VERCEL) {
      throw new Error('No database configured on Vercel. Please set up Supabase or PostgreSQL.');
    }
    const { getGoogleAccountById: getSQLite } = require('./db');
    return getSQLite(id, userId);
  }
}

export async function createGoogleAccount(account: Omit<import('./types').GoogleAccount, 'id' | 'createdAt' | 'updatedAt'>, userId: number): Promise<import('./types').GoogleAccount> {
  if (useSupabase()) {
    const { createGoogleAccount: createSupabase } = await import('./db-supabase');
    return createSupabase({ ...account, userId }, userId);
  } else if (usePostgres()) {
    const { createGoogleAccount: createPostgres } = await import('./db-postgres-accounts');
    return createPostgres({ ...account, userId }, userId);
  } else {
    if (process.env.VERCEL) {
      throw new Error('No database configured on Vercel. Please set up Supabase or PostgreSQL.');
    }
    const { createGoogleAccount: createSQLite } = require('./db');
    return createSQLite({ ...account, userId });
  }
}

export async function updateGoogleAccount(id: number, account: Partial<Omit<import('./types').GoogleAccount, 'id' | 'createdAt' | 'updatedAt'>>, userId: number): Promise<import('./types').GoogleAccount> {
  if (useSupabase()) {
    const { updateGoogleAccount: updateSupabase } = await import('./db-supabase');
    return updateSupabase(id, account, userId);
  } else if (usePostgres()) {
    const { updateGoogleAccount: updatePostgres } = await import('./db-postgres-accounts');
    return updatePostgres(id, account, userId);
  } else {
    if (process.env.VERCEL) {
      throw new Error('No database configured on Vercel. Please set up Supabase or PostgreSQL.');
    }
    const { updateGoogleAccount: updateSQLite } = require('./db');
    return updateSQLite(id, account, userId);
  }
}

export async function deleteGoogleAccount(id: number, userId: number): Promise<void> {
  if (useSupabase()) {
    const { deleteGoogleAccount: deleteSupabase } = await import('./db-supabase');
    return deleteSupabase(id, userId);
  } else if (usePostgres()) {
    const { deleteGoogleAccount: deletePostgres } = await import('./db-postgres-accounts');
    return deletePostgres(id, userId);
  } else {
    if (process.env.VERCEL) {
      throw new Error('No database configured on Vercel. Please set up Supabase or PostgreSQL.');
    }
    const { deleteGoogleAccount: deleteSQLite } = require('./db');
    return deleteSQLite(id, userId);
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

export async function clearGoogleSearchConsoleData(siteId?: number): Promise<void> {
  if (useSupabase()) {
    const { clearGoogleSearchConsoleData: clearSupabase } = await import('./db-supabase');
    return clearSupabase(siteId);
  } else if (usePostgres()) {
    const { clearGoogleSearchConsoleData: clearPostgres } = await import('./db-postgres');
    return clearPostgres(siteId);
  } else {
    if (process.env.VERCEL) {
      throw new Error('No database configured on Vercel. Please set up Supabase or PostgreSQL.');
    }
    const { clearGoogleSearchConsoleData: clearSQLite } = require('./db');
    return clearSQLite(siteId);
  }
}

// Tags adapter functions
export async function createTag(tag: Omit<import('./types').Tag, 'id' | 'createdAt' | 'updatedAt'>, userId: number): Promise<import('./types').Tag> {
  if (useSupabase()) {
    const { createTag: createSupabase } = await import('./db-supabase');
    return createSupabase(tag, userId);
  } else if (usePostgres()) {
    const { createTag: createPostgres } = await import('./db-postgres');
    return createPostgres(tag, userId);
  } else {
    if (process.env.VERCEL) {
      throw new Error('No database configured on Vercel. Please set up Supabase or PostgreSQL.');
    }
    const { createTag: createSQLite } = require('./db');
    return createSQLite({ ...tag, userId });
  }
}

export async function getAllTags(userId: number): Promise<import('./types').Tag[]> {
  if (useSupabase()) {
    const { getAllTags: getSupabase } = await import('./db-supabase');
    return getSupabase(userId);
  } else if (usePostgres()) {
    const { getAllTags: getPostgres } = await import('./db-postgres');
    return getPostgres(userId);
  } else {
    if (process.env.VERCEL) {
      return [];
    }
    const { getAllTags: getSQLite } = require('./db');
    return getSQLite(userId);
  }
}

export async function getTagById(id: number, userId: number): Promise<import('./types').Tag | null> {
  if (useSupabase()) {
    const { getTagById: getSupabase } = await import('./db-supabase');
    return getSupabase(id, userId);
  } else if (usePostgres()) {
    const { getTagById: getPostgres } = await import('./db-postgres');
    return getPostgres(id, userId);
  } else {
    if (process.env.VERCEL) {
      return null;
    }
    const { getTagById: getSQLite } = require('./db');
    return getSQLite(id, userId);
  }
}

export async function updateTag(id: number, tag: Partial<Omit<import('./types').Tag, 'id' | 'createdAt'>>, userId: number): Promise<import('./types').Tag> {
  if (useSupabase()) {
    const { updateTag: updateSupabase } = await import('./db-supabase');
    return updateSupabase(id, tag, userId);
  } else if (usePostgres()) {
    const { updateTag: updatePostgres } = await import('./db-postgres');
    return updatePostgres(id, tag, userId);
  } else {
    if (process.env.VERCEL) {
      throw new Error('No database configured on Vercel. Please set up Supabase or PostgreSQL.');
    }
    const { updateTag: updateSQLite } = require('./db');
    return updateSQLite(id, tag, userId);
  }
}

export async function deleteTag(id: number, userId: number): Promise<void> {
  if (useSupabase()) {
    const { deleteTag: deleteSupabase } = await import('./db-supabase');
    return deleteSupabase(id, userId);
  } else if (usePostgres()) {
    const { deleteTag: deletePostgres } = await import('./db-postgres');
    return deletePostgres(id, userId);
  } else {
    if (process.env.VERCEL) {
      throw new Error('No database configured on Vercel. Please set up Supabase or PostgreSQL.');
    }
    const { deleteTag: deleteSQLite } = require('./db');
    return deleteSQLite(id, userId);
  }
}

// Site tags adapter functions
export async function assignTagToSite(siteId: number, tagId: number): Promise<void> {
  if (useSupabase()) {
    const { assignTagToSite: assignSupabase } = await import('./db-supabase');
    return assignSupabase(siteId, tagId);
  } else if (usePostgres()) {
    const { assignTagToSite: assignPostgres } = await import('./db-postgres');
    return assignPostgres(siteId, tagId);
  } else {
    if (process.env.VERCEL) {
      throw new Error('No database configured on Vercel. Please set up Supabase or PostgreSQL.');
    }
    const { assignTagToSite: assignSQLite } = require('./db');
    return assignSQLite(siteId, tagId);
  }
}

export async function removeTagFromSite(siteId: number, tagId: number): Promise<void> {
  if (useSupabase()) {
    const { removeTagFromSite: removeSupabase } = await import('./db-supabase');
    return removeSupabase(siteId, tagId);
  } else if (usePostgres()) {
    const { removeTagFromSite: removePostgres } = await import('./db-postgres');
    return removePostgres(siteId, tagId);
  } else {
    if (process.env.VERCEL) {
      throw new Error('No database configured on Vercel. Please set up Supabase or PostgreSQL.');
    }
    const { removeTagFromSite: removeSQLite } = require('./db');
    return removeSQLite(siteId, tagId);
  }
}

export async function getSiteTags(siteId: number): Promise<import('./types').Tag[]> {
  if (useSupabase()) {
    const { getSiteTags: getSupabase } = await import('./db-supabase');
    return getSupabase(siteId);
  } else if (usePostgres()) {
    const { getSiteTags: getPostgres } = await import('./db-postgres');
    return getPostgres(siteId);
  } else {
    if (process.env.VERCEL) {
      return [];
    }
    const { getSiteTags: getSQLite } = require('./db');
    return getSQLite(siteId);
  }
}

export async function getSitesByTag(tagId: number, userId: number): Promise<number[]> {
  if (useSupabase()) {
    const { getSitesByTag: getSupabase } = await import('./db-supabase');
    return getSupabase(tagId, userId);
  } else if (usePostgres()) {
    const { getSitesByTag: getPostgres } = await import('./db-postgres');
    return getPostgres(tagId, userId);
  } else {
    if (process.env.VERCEL) {
      return [];
    }
    const { getSitesByTag: getSQLite } = require('./db');
    return getSQLite(tagId, userId);
  }
}

/**
 * Получает теги для нескольких сайтов одним запросом (оптимизация N+1)
 */
export async function getAllSitesTags(siteIds: number[]): Promise<Record<number, import('./types').Tag[]>> {
  if (useSupabase()) {
    const { getAllSitesTags: getSupabase } = await import('./db-supabase');
    return getSupabase(siteIds);
  } else if (usePostgres()) {
    const { getAllSitesTags: getPostgres } = await import('./db-postgres');
    return getPostgres(siteIds);
  } else {
    if (process.env.VERCEL) {
      return {};
    }
    const { getAllSitesTags: getSQLite } = require('./db');
    return getSQLite(siteIds);
  }
}

/**
 * Получает все статусы сайтов (глобальные, не привязаны к пользователю)
 */
export async function getAllStatuses(): Promise<import('./types').SiteStatus[]> {
  if (useSupabase()) {
    const { getAllStatuses: getSupabase } = await import('./db-supabase');
    return getSupabase();
  } else if (usePostgres()) {
    const { getAllStatuses: getPostgres } = await import('./db-postgres');
    return getPostgres();
  } else {
    if (process.env.VERCEL) {
      return [];
    }
    const { getAllStatuses: getSQLite } = require('./db');
    return getSQLite();
  }
}

