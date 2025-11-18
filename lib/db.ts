import Database from 'better-sqlite3';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import type { Site, IntegrationsSettings, GoogleAccount, Tag } from './types';

export interface AffiliateOffer {
  id?: number;
  name: string;
  topic: string;
  country: string;
  model: string;
  cr: number;
  ecpc: number;
  epc: number;
  source?: string; // Откуда загружен (admitad, cj, etc.)
  createdAt?: string;
}

let db: Database.Database | null = null;

let migrationsRun = false;

export function getDatabase(): Database.Database {
  if (db) {
    return db;
  }

  // Создаем директорию для БД если её нет
  const dbDir = join(process.cwd(), 'data');
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
  }

  const dbPath = join(dbDir, 'affiliate.db');
  db = new Database(dbPath);

  // Миграции теперь выполняются вручную или через API /api/migrate
  // Не запускаем автоматически, чтобы не было ошибок

  return db;
}

export function insertOffers(offers: Omit<AffiliateOffer, 'id' | 'createdAt'>[]): void {
  const database = getDatabase();
  const stmt = database.prepare(`
    INSERT INTO affiliate_offers (name, topic, country, model, cr, ecpc, epc, source)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMany = database.transaction((offers: Omit<AffiliateOffer, 'id' | 'createdAt'>[]) => {
    for (const offer of offers) {
      stmt.run(
        offer.name,
        offer.topic,
        offer.country,
        offer.model,
        offer.cr,
        offer.ecpc,
        offer.epc,
        offer.source || null
      );
    }
  });

  insertMany(offers);
}

export function getAllOffers(): AffiliateOffer[] {
  const database = getDatabase();
  return database.prepare('SELECT * FROM affiliate_offers ORDER BY name').all() as AffiliateOffer[];
}

export function clearAllOffers(): void {
  const database = getDatabase();
  database.prepare('DELETE FROM affiliate_offers').run();
}

export function getOffersCount(): number {
  const database = getDatabase();
  const result = database.prepare('SELECT COUNT(*) as count FROM affiliate_offers').get() as { count: number };
  return result.count;
}

// Sites functions
export function insertSite(site: Omit<Site, 'id' | 'createdAt' | 'updatedAt'>): Site {
  const database = getDatabase();
  const stmt = database.prepare(`
    INSERT INTO sites (name, domain, category, google_search_console_url, user_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `);

  const result = stmt.run(
    site.name,
    site.domain,
    site.category || null,
    site.googleSearchConsoleUrl || null,
    site.userId || null
  );

  return {
    id: Number(result.lastInsertRowid),
    name: site.name,
    domain: site.domain,
    category: site.category,
    googleSearchConsoleUrl: site.googleSearchConsoleUrl,
    userId: site.userId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function getAllSites(userId: number): Site[] {
  const database = getDatabase();
  const rows = database.prepare('SELECT * FROM sites WHERE user_id = ? ORDER BY created_at DESC').all(userId) as any[];
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    domain: row.domain,
    category: row.category,
    googleSearchConsoleUrl: row.google_search_console_url,
    userId: row.user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export function getSiteById(id: number, userId: number): Site | null {
  const database = getDatabase();
  const row = database.prepare('SELECT * FROM sites WHERE id = ? AND user_id = ?').get(id, userId) as any;
  
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    domain: row.domain,
    category: row.category,
    googleSearchConsoleUrl: row.google_search_console_url,
    userId: row.user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function updateSite(id: number, site: Partial<Omit<Site, 'id' | 'createdAt'>>, userId: number): Site {
  const database = getDatabase();
  const updates: string[] = [];
  const values: any[] = [];

  if (site.name !== undefined) {
    updates.push('name = ?');
    values.push(site.name);
  }
  if (site.domain !== undefined) {
    updates.push('domain = ?');
    values.push(site.domain);
  }
  if (site.category !== undefined) {
    updates.push('category = ?');
    values.push(site.category || null);
  }
  if (site.googleSearchConsoleUrl !== undefined) {
    updates.push('google_search_console_url = ?');
    values.push(site.googleSearchConsoleUrl || null);
  }

  updates.push("updated_at = datetime('now')");
  values.push(id, userId);

  const query = `UPDATE sites SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`;
  database.prepare(query).run(...values);

  const updated = getSiteById(id, userId);
  if (!updated) {
    throw new Error('Site not found after update');
  }
  return updated;
}

// Integrations functions
export function getIntegrations(userId: number): IntegrationsSettings {
  const database = getDatabase();
  const row = database.prepare('SELECT * FROM integrations WHERE user_id = ?').get(userId) as any;
  
  if (!row) {
    // Если записи нет, создаем её
    const result = database.prepare(`
      INSERT INTO integrations (user_id, updated_at)
      VALUES (?, datetime('now'))
    `).run(userId);
    
    return {
      id: Number(result.lastInsertRowid),
      userId: userId,
      googleServiceAccountEmail: '',
      googlePrivateKey: '',
      googleSearchConsoleUrl: '',
      googleAccessToken: '',
      googleRefreshToken: '',
      googleTokenExpiry: '',
      updatedAt: new Date().toISOString(),
    };
  }

  return {
    id: row.id,
    userId: row.user_id,
    googleServiceAccountEmail: row.google_service_account_email || '',
    googlePrivateKey: row.google_private_key || '',
    googleSearchConsoleUrl: row.google_search_console_url || '',
    googleAccessToken: row.google_access_token || '',
    googleRefreshToken: row.google_refresh_token || '',
    googleTokenExpiry: row.google_token_expiry || '',
    updatedAt: row.updated_at,
  };
}

export function updateIntegrations(settings: Partial<Omit<IntegrationsSettings, 'id' | 'updatedAt'>>, userId: number): IntegrationsSettings {
  const database = getDatabase();
  const updates: string[] = [];
  const values: any[] = [];

  if (settings.googleServiceAccountEmail !== undefined) {
    updates.push('google_service_account_email = ?');
    values.push(settings.googleServiceAccountEmail || null);
  }
  if (settings.googlePrivateKey !== undefined) {
    updates.push('google_private_key = ?');
    values.push(settings.googlePrivateKey || null);
  }
  if (settings.googleSearchConsoleUrl !== undefined) {
    updates.push('google_search_console_url = ?');
    values.push(settings.googleSearchConsoleUrl || null);
  }
  if (settings.googleAccessToken !== undefined) {
    updates.push('google_access_token = ?');
    values.push(settings.googleAccessToken || null);
  }
  if (settings.googleRefreshToken !== undefined) {
    updates.push('google_refresh_token = ?');
    values.push(settings.googleRefreshToken || null);
  }
  if (settings.googleTokenExpiry !== undefined) {
    updates.push('google_token_expiry = ?');
    values.push(settings.googleTokenExpiry || null);
  }

  updates.push("updated_at = datetime('now')");
  values.push(userId);

  if (updates.length > 1) {
    const query = `UPDATE integrations SET ${updates.join(', ')} WHERE user_id = ?`;
    database.prepare(query).run(...values);
  }

  return getIntegrations(userId);
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

export function insertGoogleSearchConsoleData(
  data: Omit<GoogleSearchConsoleDataRow, 'id' | 'createdAt'>
): GoogleSearchConsoleDataRow {
  const database = getDatabase();
  const stmt = database.prepare(`
    INSERT INTO google_search_console_data (site_id, clicks, impressions, ctr, position, date)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(site_id, date) DO UPDATE SET
      clicks = excluded.clicks,
      impressions = excluded.impressions,
      ctr = excluded.ctr,
      position = excluded.position
  `);

  const result = stmt.run(
    data.siteId,
    data.clicks,
    data.impressions,
    data.ctr,
    data.position,
    data.date
  );

  const row = database
    .prepare('SELECT * FROM google_search_console_data WHERE site_id = ? AND date = ?')
    .get(data.siteId, data.date) as any;

  return {
    id: row.id,
    siteId: row.site_id,
    clicks: row.clicks,
    impressions: row.impressions,
    ctr: row.ctr,
    position: row.position,
    date: row.date,
    createdAt: row.created_at,
  };
}

export function getGoogleSearchConsoleDataBySiteId(
  siteId: number,
  limit: number = 100
): GoogleSearchConsoleDataRow[] {
  const database = getDatabase();
  const rows = database
    .prepare('SELECT * FROM google_search_console_data WHERE site_id = ? ORDER BY date DESC LIMIT ?')
    .all(siteId, limit) as any[];

  return rows.map((row) => ({
    id: row.id,
    siteId: row.site_id,
    clicks: row.clicks,
    impressions: row.impressions,
    ctr: row.ctr,
    position: row.position,
    date: row.date,
    createdAt: row.created_at,
  }));
}

export function bulkInsertGoogleSearchConsoleData(
  data: Omit<GoogleSearchConsoleDataRow, 'id' | 'createdAt'>[]
): void {
  if (data.length === 0) return;

  const database = getDatabase();
  const stmt = database.prepare(`
    INSERT INTO google_search_console_data (site_id, clicks, impressions, ctr, position, date)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(site_id, date) DO UPDATE SET
      clicks = excluded.clicks,
      impressions = excluded.impressions,
      ctr = excluded.ctr,
      position = excluded.position
  `);

  const insertMany = database.transaction((items: Omit<GoogleSearchConsoleDataRow, 'id' | 'createdAt'>[]) => {
    for (const item of items) {
      stmt.run(
        item.siteId,
        item.clicks,
        item.impressions,
        item.ctr,
        item.position,
        item.date
      );
    }
  });

  insertMany(data);
}

// Google Accounts functions
export function getAllGoogleAccounts(userId: number): GoogleAccount[] {
  const database = getDatabase();
  try {
    const rows = database.prepare('SELECT * FROM google_accounts WHERE user_id = ? ORDER BY created_at DESC').all(userId) as any[];
    return rows.map((row: any) => ({
      id: row.id,
      email: row.email,
      userId: row.user_id,
      googleAccessToken: row.google_access_token || '',
      googleRefreshToken: row.google_refresh_token || '',
      googleTokenExpiry: row.google_token_expiry || '',
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } catch (error: any) {
    if (error.message?.includes('no such table')) {
      return [];
    }
    console.error('Error fetching Google accounts:', error);
    return [];
  }
}

export function getGoogleAccountById(id: number, userId: number): GoogleAccount | null {
  const database = getDatabase();
  try {
    const row = database.prepare('SELECT * FROM google_accounts WHERE id = ? AND user_id = ?').get(id, userId) as any;
    if (!row) {
      return null;
    }
    return {
      id: row.id,
      email: row.email,
      userId: row.user_id,
      googleAccessToken: row.google_access_token || '',
      googleRefreshToken: row.google_refresh_token || '',
      googleTokenExpiry: row.google_token_expiry || '',
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  } catch (error: any) {
    console.error('Error fetching Google account:', error);
    return null;
  }
}

export function createGoogleAccount(account: Omit<GoogleAccount, 'id' | 'createdAt' | 'updatedAt'>): GoogleAccount {
  const database = getDatabase();
  const stmt = database.prepare(`
    INSERT INTO google_accounts (email, user_id, google_access_token, google_refresh_token, google_token_expiry, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `);
  
  const result = stmt.run(
    account.email,
    account.userId || null,
    account.googleAccessToken || null,
    account.googleRefreshToken || null,
    account.googleTokenExpiry || null
  );

  const id = Number(result.lastInsertRowid);
  const row = database.prepare('SELECT * FROM google_accounts WHERE id = ?').get(id) as any;
  
  return {
    id: row.id,
    email: row.email,
    userId: row.user_id,
    googleAccessToken: row.google_access_token || '',
    googleRefreshToken: row.google_refresh_token || '',
    googleTokenExpiry: row.google_token_expiry || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function updateGoogleAccount(id: number, account: Partial<Omit<GoogleAccount, 'id' | 'createdAt' | 'updatedAt'>>, userId: number): GoogleAccount {
  const database = getDatabase();
  const updates: string[] = [];
  const values: any[] = [];

  if (account.email !== undefined) {
    updates.push('email = ?');
    values.push(account.email);
  }
  if (account.googleAccessToken !== undefined) {
    updates.push('google_access_token = ?');
    values.push(account.googleAccessToken || null);
  }
  if (account.googleRefreshToken !== undefined) {
    updates.push('google_refresh_token = ?');
    values.push(account.googleRefreshToken || null);
  }
  if (account.googleTokenExpiry !== undefined) {
    updates.push('google_token_expiry = ?');
    values.push(account.googleTokenExpiry || null);
  }
  updates.push("updated_at = datetime('now')");
  values.push(id, userId);

  const query = `UPDATE google_accounts SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`;
  database.prepare(query).run(...values);

  const row = database.prepare('SELECT * FROM google_accounts WHERE id = ? AND user_id = ?').get(id, userId) as any;
  if (!row) {
    throw new Error('Google account not found');
  }

  return {
    id: row.id,
    email: row.email,
    userId: row.user_id,
    googleAccessToken: row.google_access_token || '',
    googleRefreshToken: row.google_refresh_token || '',
    googleTokenExpiry: row.google_token_expiry || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function deleteGoogleAccount(id: number, userId: number): void {
  const database = getDatabase();
  database.prepare('DELETE FROM google_accounts WHERE id = ? AND user_id = ?').run(id, userId);
}

// Tags functions
export function createTag(tag: Omit<Tag, 'id' | 'createdAt' | 'updatedAt'>): Tag {
  const database = getDatabase();
  const stmt = database.prepare(`
    INSERT INTO tags (name, color, user_id, created_at, updated_at)
    VALUES (?, ?, ?, datetime('now'), datetime('now'))
  `);

  const result = stmt.run(
    tag.name,
    tag.color || '#3b82f6',
    tag.userId || null
  );

  return {
    id: Number(result.lastInsertRowid),
    name: tag.name,
    color: tag.color || '#3b82f6',
    userId: tag.userId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function getAllTags(userId: number): Tag[] {
  const database = getDatabase();
  const rows = database.prepare('SELECT * FROM tags WHERE user_id = ? ORDER BY name').all(userId) as any[];
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    color: row.color || '#3b82f6',
    userId: row.user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export function getTagById(id: number, userId: number): Tag | null {
  const database = getDatabase();
  const row = database.prepare('SELECT * FROM tags WHERE id = ? AND user_id = ?').get(id, userId) as any;
  
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    color: row.color || '#3b82f6',
    userId: row.user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function updateTag(id: number, tag: Partial<Omit<Tag, 'id' | 'createdAt'>>, userId: number): Tag {
  const database = getDatabase();
  const updates: string[] = [];
  const values: any[] = [];

  if (tag.name !== undefined) {
    updates.push('name = ?');
    values.push(tag.name);
  }
  if (tag.color !== undefined) {
    updates.push('color = ?');
    values.push(tag.color);
  }

  updates.push("updated_at = datetime('now')");
  values.push(id, userId);

  const query = `UPDATE tags SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`;
  database.prepare(query).run(...values);

  const updated = getTagById(id, userId);
  if (!updated) {
    throw new Error('Tag not found after update');
  }
  return updated;
}

export function deleteTag(id: number, userId: number): void {
  const database = getDatabase();
  database.prepare('DELETE FROM tags WHERE id = ? AND user_id = ?').run(id, userId);
}

// Site tags functions
export function assignTagToSite(siteId: number, tagId: number): void {
  const database = getDatabase();
  try {
    database.prepare(`
      INSERT INTO site_tags (site_id, tag_id, created_at)
      VALUES (?, ?, datetime('now'))
    `).run(siteId, tagId);
  } catch (error: any) {
    // Игнорируем ошибку, если связь уже существует
    if (!error.message?.includes('UNIQUE constraint')) {
      throw error;
    }
  }
}

export function removeTagFromSite(siteId: number, tagId: number): void {
  const database = getDatabase();
  database.prepare('DELETE FROM site_tags WHERE site_id = ? AND tag_id = ?').run(siteId, tagId);
}

export function getSiteTags(siteId: number): Tag[] {
  const database = getDatabase();
  const rows = database.prepare(`
    SELECT t.* FROM tags t
    INNER JOIN site_tags st ON t.id = st.tag_id
    WHERE st.site_id = ?
    ORDER BY t.name
  `).all(siteId) as any[];
  
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    color: row.color || '#3b82f6',
    userId: row.user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export function getSitesByTag(tagId: number, userId: number): number[] {
  const database = getDatabase();
  const rows = database.prepare(`
    SELECT s.id FROM sites s
    INNER JOIN site_tags st ON s.id = st.site_id
    WHERE st.tag_id = ? AND s.user_id = ?
  `).all(tagId, userId) as any[];
  
  return rows.map((row) => row.id);
}

/**
 * Получает теги для нескольких сайтов одним запросом (оптимизация N+1)
 */
export function getAllSitesTags(siteIds: number[]): Record<number, Tag[]> {
  if (siteIds.length === 0) {
    return {};
  }

  const database = getDatabase();
  const placeholders = siteIds.map(() => '?').join(',');
  const rows = database.prepare(`
    SELECT st.site_id, t.id, t.name, t.color, t.user_id, t.created_at, t.updated_at
    FROM site_tags st
    INNER JOIN tags t ON st.tag_id = t.id
    WHERE st.site_id IN (${placeholders})
    ORDER BY st.site_id, t.name
  `).all(...siteIds) as any[];

  const tagsBySite: Record<number, Tag[]> = {};
  
  // Инициализируем пустые массивы для всех сайтов
  siteIds.forEach(siteId => {
    tagsBySite[siteId] = [];
  });

  // Заполняем теги
  rows.forEach((row) => {
    if (!tagsBySite[row.site_id]) {
      tagsBySite[row.site_id] = [];
    }
    tagsBySite[row.site_id].push({
      id: row.id,
      name: row.name,
      color: row.color || '#3b82f6',
      userId: row.user_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  });

  return tagsBySite;
}

