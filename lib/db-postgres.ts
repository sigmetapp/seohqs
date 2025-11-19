import { getPostgresClient } from './postgres-client';
import type { AffiliateOffer, Site, IntegrationsSettings, Tag, SiteStatus } from './types';

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

// Sites functions
export async function insertSite(site: Omit<Site, 'id' | 'createdAt' | 'updatedAt'>, userId: number): Promise<Site> {
  if (!isPostgresAvailable()) {
    throw new Error('PostgreSQL database not configured. Please set POSTGRES_URL or DATABASE_URL.');
  }

  try {
    const db = await getPostgresClient();
    const result = await db.query(
      `INSERT INTO sites (name, domain, category, google_search_console_url, user_id) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id, name, domain, category, google_search_console_url, user_id, created_at, updated_at`,
      [
        site.name,
        site.domain,
        site.category || null,
        site.googleSearchConsoleUrl || null,
        userId,
      ]
    );

    const row = result.rows[0];
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
  } catch (error: any) {
    if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
      throw new Error('Table sites does not exist. Please run migrations manually. See migrations/002_sites_table.sql');
    }
    throw error;
  }
}

export async function getAllSites(userId: number): Promise<Site[]> {
  if (!isPostgresAvailable()) {
    console.warn('PostgreSQL database not configured, returning empty array');
    return [];
  }

  try {
    const db = await getPostgresClient();
    const result = await db.query('SELECT * FROM sites WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
    return result.rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      domain: row.domain,
      category: row.category,
      googleSearchConsoleUrl: row.google_search_console_url,
      userId: row.user_id,
      statusId: row.status_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } catch (error: any) {
    if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
      console.warn('Table sites does not exist. Please run migrations manually.');
      return [];
    }
    console.error('Error fetching sites:', error);
    return [];
  }
}

export async function getSiteById(id: number, userId: number): Promise<Site | null> {
  if (!isPostgresAvailable()) {
    return null;
  }

  try {
    const db = await getPostgresClient();
    const result = await db.query('SELECT * FROM sites WHERE id = $1 AND user_id = $2', [id, userId]);
    
    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      name: row.name,
      domain: row.domain,
      category: row.category,
      googleSearchConsoleUrl: row.google_search_console_url,
      userId: row.user_id,
      statusId: row.status_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  } catch (error: any) {
    if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
      return null;
    }
    console.error('Error fetching site:', error);
    return null;
  }
}

export async function updateSite(id: number, site: Partial<Omit<Site, 'id' | 'createdAt'>>, userId: number): Promise<Site> {
  if (!isPostgresAvailable()) {
    throw new Error('PostgreSQL database not configured');
  }

  try {
    const db = await getPostgresClient();
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (site.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(site.name);
    }
    if (site.domain !== undefined) {
      updates.push(`domain = $${paramIndex++}`);
      values.push(site.domain);
    }
    if (site.category !== undefined) {
      updates.push(`category = $${paramIndex++}`);
      values.push(site.category || null);
    }
    if (site.googleSearchConsoleUrl !== undefined) {
      updates.push(`google_search_console_url = $${paramIndex++}`);
      values.push(site.googleSearchConsoleUrl || null);
    }
    if (site.statusId !== undefined) {
      updates.push(`status_id = $${paramIndex++}`);
      values.push(site.statusId || null);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id, userId);

    const query = `UPDATE sites SET ${updates.join(', ')} WHERE id = $${paramIndex++} AND user_id = $${paramIndex} RETURNING *`;
    const result = await db.query(query, values);

    const row = result.rows[0];
    return {
      id: row.id,
      name: row.name,
      domain: row.domain,
      category: row.category,
      googleSearchConsoleUrl: row.google_search_console_url,
      userId: row.user_id,
      statusId: row.status_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  } catch (error: any) {
    throw error;
  }
}

// Integrations functions
export async function getIntegrations(userId: number): Promise<IntegrationsSettings> {
  if (!isPostgresAvailable()) {
    return {
      id: 1,
      userId: userId,
      googleServiceAccountEmail: '',
      googlePrivateKey: '',
      googleSearchConsoleUrl: '',
      updatedAt: new Date().toISOString(),
    };
  }

  try {
    const db = await getPostgresClient();
    const result = await db.query('SELECT * FROM integrations WHERE user_id = $1', [userId]);
    
    if (result.rows.length === 0) {
      // Если записи нет, создаем её
      const insertResult = await db.query(
        `INSERT INTO integrations (user_id, updated_at) VALUES ($1, CURRENT_TIMESTAMP) 
         RETURNING *`,
        [userId]
      );
      
      const row = insertResult.rows[0];
      return {
        id: row.id,
        userId: row.user_id,
        googleServiceAccountEmail: '',
        googlePrivateKey: '',
        googleSearchConsoleUrl: '',
        googleAccessToken: '',
        googleRefreshToken: '',
        googleTokenExpiry: '',
        updatedAt: row.updated_at,
      };
    }

    const row = result.rows[0];
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
  } catch (error: any) {
    if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
      // Таблица не существует, возвращаем пустые настройки
      return {
        id: 1,
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
    console.error('Error fetching integrations:', error);
    return {
      id: 1,
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
}

export async function updateIntegrations(settings: Partial<Omit<IntegrationsSettings, 'id' | 'updatedAt'>>, userId: number): Promise<IntegrationsSettings> {
  if (!isPostgresAvailable()) {
    throw new Error('PostgreSQL database not configured');
  }

  try {
    const db = await getPostgresClient();
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (settings.googleServiceAccountEmail !== undefined) {
      updates.push(`google_service_account_email = $${paramIndex++}`);
      values.push(settings.googleServiceAccountEmail || null);
    }
    if (settings.googlePrivateKey !== undefined) {
      updates.push(`google_private_key = $${paramIndex++}`);
      values.push(settings.googlePrivateKey || null);
    }
    if (settings.googleSearchConsoleUrl !== undefined) {
      updates.push(`google_search_console_url = $${paramIndex++}`);
      values.push(settings.googleSearchConsoleUrl || null);
    }
    if (settings.googleAccessToken !== undefined) {
      updates.push(`google_access_token = $${paramIndex++}`);
      values.push(settings.googleAccessToken || null);
    }
    if (settings.googleRefreshToken !== undefined) {
      updates.push(`google_refresh_token = $${paramIndex++}`);
      values.push(settings.googleRefreshToken || null);
    }
    if (settings.googleTokenExpiry !== undefined) {
      updates.push(`google_token_expiry = $${paramIndex++}`);
      values.push(settings.googleTokenExpiry || null);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(userId);

    if (updates.length > 1) {
      // Сначала убедимся, что запись существует
      await db.query(
        `INSERT INTO integrations (user_id, updated_at) VALUES ($1, CURRENT_TIMESTAMP) 
         ON CONFLICT (user_id) DO NOTHING`,
        [userId]
      );

      const query = `UPDATE integrations SET ${updates.join(', ')} WHERE user_id = $${paramIndex}`;
      await db.query(query, values);
    }

    return getIntegrations(userId);
  } catch (error: any) {
    throw error;
  }
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

export async function insertGoogleSearchConsoleData(
  data: Omit<GoogleSearchConsoleDataRow, 'id' | 'createdAt'>
): Promise<GoogleSearchConsoleDataRow> {
  if (!isPostgresAvailable()) {
    throw new Error('PostgreSQL database not configured');
  }

  try {
    const db = await getPostgresClient();
    const result = await db.query(
      `INSERT INTO google_search_console_data (site_id, clicks, impressions, ctr, position, date)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (site_id, date) 
       DO UPDATE SET clicks = EXCLUDED.clicks, impressions = EXCLUDED.impressions, 
                     ctr = EXCLUDED.ctr, position = EXCLUDED.position
       RETURNING id, site_id, clicks, impressions, ctr, position, date, created_at`,
      [data.siteId, data.clicks, data.impressions, data.ctr, data.position, data.date]
    );

    const row = result.rows[0];
    return {
      id: row.id,
      siteId: row.site_id,
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: parseFloat(row.ctr),
      position: parseFloat(row.position),
      date: row.date,
      createdAt: row.created_at,
    };
  } catch (error: any) {
    if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
      throw new Error('Table google_search_console_data does not exist. Please run migrations.');
    }
    throw error;
  }
}

export async function getGoogleSearchConsoleDataBySiteId(
  siteId: number,
  limit: number = 100
): Promise<GoogleSearchConsoleDataRow[]> {
  if (!isPostgresAvailable()) {
    return [];
  }

  try {
    const db = await getPostgresClient();
    const result = await db.query(
      `SELECT * FROM google_search_console_data 
       WHERE site_id = $1 
       ORDER BY date DESC 
       LIMIT $2`,
      [siteId, limit]
    );

    return result.rows.map((row: any) => ({
      id: row.id,
      siteId: row.site_id,
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: parseFloat(row.ctr),
      position: parseFloat(row.position),
      date: row.date,
      createdAt: row.created_at,
    }));
  } catch (error: any) {
    if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
      return [];
    }
    console.error('Error fetching Google Search Console data:', error);
    return [];
  }
}

export async function bulkInsertGoogleSearchConsoleData(
  data: Omit<GoogleSearchConsoleDataRow, 'id' | 'createdAt'>[]
): Promise<void> {
  if (!isPostgresAvailable()) {
    throw new Error('PostgreSQL database not configured');
  }

  if (data.length === 0) return;

  try {
    const db = await getPostgresClient();
    
    // Используем транзакцию для массовой вставки
    await db.query('BEGIN');
    
    try {
      for (const item of data) {
        await db.query(
          `INSERT INTO google_search_console_data (site_id, clicks, impressions, ctr, position, date)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (site_id, date) 
           DO UPDATE SET clicks = EXCLUDED.clicks, impressions = EXCLUDED.impressions, 
                         ctr = EXCLUDED.ctr, position = EXCLUDED.position`,
          [item.siteId, item.clicks, item.impressions, item.ctr, item.position, item.date]
        );
      }
      await db.query('COMMIT');
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  } catch (error: any) {
    if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
      throw new Error('Table google_search_console_data does not exist. Please run migrations.');
    }
    throw error;
  }
}

/**
 * Получает множество дат, которые уже есть в БД для указанного сайта за период
 */
export async function getExistingDatesForSite(
  siteId: number,
  startDate: Date,
  endDate: Date
): Promise<Set<string>> {
  if (!isPostgresAvailable()) {
    return new Set();
  }

  try {
    const db = await getPostgresClient();
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    const result = await db.query(
      `SELECT DISTINCT date FROM google_search_console_data 
       WHERE site_id = $1 
       AND date >= $2 
       AND date <= $3`,
      [siteId, startDateStr, endDateStr]
    );

    const datesSet = new Set<string>();
    result.rows.forEach((row: any) => {
      if (row.date) {
        datesSet.add(row.date);
      }
    });

    return datesSet;
  } catch (error: any) {
    if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
      return new Set();
    }
    console.error('Error fetching existing dates:', error);
    return new Set();
  }
}

export async function clearGoogleSearchConsoleData(siteId?: number): Promise<void> {
  if (!isPostgresAvailable()) {
    throw new Error('PostgreSQL database not configured');
  }

  try {
    const db = await getPostgresClient();
    
    if (siteId) {
      // Очищаем данные для конкретного сайта
      await db.query('DELETE FROM google_search_console_data WHERE site_id = $1', [siteId]);
      console.log(`Cleared Google Search Console data for site ${siteId}`);
    } else {
      // Очищаем все данные
      await db.query('DELETE FROM google_search_console_data');
      console.log('Cleared all Google Search Console data');
    }
  } catch (error: any) {
    if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
      throw new Error('Table google_search_console_data does not exist. Please run migrations.');
    }
    throw error;
  }
}

// Tags functions
export async function createTag(tag: Omit<Tag, 'id' | 'createdAt' | 'updatedAt'>, userId: number): Promise<Tag> {
  if (!isPostgresAvailable()) {
    throw new Error('PostgreSQL database not configured. Please set POSTGRES_URL or DATABASE_URL.');
  }

  try {
    const db = await getPostgresClient();
    const result = await db.query(
      `INSERT INTO tags (name, color, user_id, created_at, updated_at) 
       VALUES ($1, $2, $3, NOW(), NOW())
       RETURNING id, name, color, user_id, created_at, updated_at`,
      [tag.name, tag.color || '#3b82f6', userId]
    );

    const row = result.rows[0];
    return {
      id: row.id,
      name: row.name,
      color: row.color || '#3b82f6',
      userId: row.user_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  } catch (error: any) {
    if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
      throw new Error('Table tags does not exist. Please run migrations.');
    }
    if (error?.code === '23505') {
      throw new Error('Tag with this name already exists');
    }
    throw error;
  }
}

export async function getAllTags(userId: number): Promise<Tag[]> {
  if (!isPostgresAvailable()) {
    return [];
  }

  try {
    const db = await getPostgresClient();
    const result = await db.query(
      'SELECT * FROM tags WHERE user_id = $1 ORDER BY name',
      [userId]
    );

    return result.rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      color: row.color || '#3b82f6',
      userId: row.user_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } catch (error: any) {
    if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
      return [];
    }
    console.error('Error fetching tags:', error);
    return [];
  }
}

export async function getTagById(id: number, userId: number): Promise<Tag | null> {
  if (!isPostgresAvailable()) {
    return null;
  }

  try {
    const db = await getPostgresClient();
    const result = await db.query(
      'SELECT * FROM tags WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      name: row.name,
      color: row.color || '#3b82f6',
      userId: row.user_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  } catch (error: any) {
    if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
      return null;
    }
    console.error('Error fetching tag:', error);
    return null;
  }
}

export async function updateTag(id: number, tag: Partial<Omit<Tag, 'id' | 'createdAt'>>, userId: number): Promise<Tag> {
  if (!isPostgresAvailable()) {
    throw new Error('PostgreSQL database not configured');
  }

  try {
    const db = await getPostgresClient();
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (tag.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(tag.name);
    }
    if (tag.color !== undefined) {
      updates.push(`color = $${paramIndex++}`);
      values.push(tag.color);
    }

    updates.push(`updated_at = NOW()`);
    values.push(id, userId);

    const query = `UPDATE tags SET ${updates.join(', ')} WHERE id = $${paramIndex++} AND user_id = $${paramIndex++}`;
    await db.query(query, values);

    const updated = await getTagById(id, userId);
    if (!updated) {
      throw new Error('Tag not found after update');
    }
    return updated;
  } catch (error: any) {
    if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
      throw new Error('Table tags does not exist. Please run migrations.');
    }
    throw error;
  }
}

export async function deleteTag(id: number, userId: number): Promise<void> {
  if (!isPostgresAvailable()) {
    throw new Error('PostgreSQL database not configured');
  }

  try {
    const db = await getPostgresClient();
    await db.query('DELETE FROM tags WHERE id = $1 AND user_id = $2', [id, userId]);
  } catch (error: any) {
    if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
      return;
    }
    throw error;
  }
}

// Site tags functions
export async function assignTagToSite(siteId: number, tagId: number): Promise<void> {
  if (!isPostgresAvailable()) {
    throw new Error('PostgreSQL database not configured');
  }

  try {
    const db = await getPostgresClient();
    await db.query(
      `INSERT INTO site_tags (site_id, tag_id, created_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (site_id, tag_id) DO NOTHING`,
      [siteId, tagId]
    );
  } catch (error: any) {
    if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
      throw new Error('Table site_tags does not exist. Please run migrations.');
    }
    throw error;
  }
}

export async function removeTagFromSite(siteId: number, tagId: number): Promise<void> {
  if (!isPostgresAvailable()) {
    throw new Error('PostgreSQL database not configured');
  }

  try {
    const db = await getPostgresClient();
    await db.query('DELETE FROM site_tags WHERE site_id = $1 AND tag_id = $2', [siteId, tagId]);
  } catch (error: any) {
    if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
      return;
    }
    throw error;
  }
}

export async function getSiteTags(siteId: number): Promise<Tag[]> {
  if (!isPostgresAvailable()) {
    return [];
  }

  try {
    const db = await getPostgresClient();
    const result = await db.query(
      `SELECT t.* FROM tags t
       INNER JOIN site_tags st ON t.id = st.tag_id
       WHERE st.site_id = $1
       ORDER BY t.name`,
      [siteId]
    );

    return result.rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      color: row.color || '#3b82f6',
      userId: row.user_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } catch (error: any) {
    if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
      return [];
    }
    console.error('Error fetching site tags:', error);
    return [];
  }
}

export async function getSitesByTag(tagId: number, userId: number): Promise<number[]> {
  if (!isPostgresAvailable()) {
    return [];
  }

  try {
    const db = await getPostgresClient();
    const result = await db.query(
      `SELECT s.id FROM sites s
       INNER JOIN site_tags st ON s.id = st.site_id
       WHERE st.tag_id = $1 AND s.user_id = $2`,
      [tagId, userId]
    );

    return result.rows.map((row: any) => row.id);
  } catch (error: any) {
    if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
      return [];
    }
    console.error('Error fetching sites by tag:', error);
    return [];
  }
}

/**
 * Получает теги для нескольких сайтов одним запросом (оптимизация N+1)
 */
export async function getAllSitesTags(siteIds: number[]): Promise<Record<number, import('./types').Tag[]>> {
  if (!isPostgresAvailable() || siteIds.length === 0) {
    return {};
  }

  try {
    const db = await getPostgresClient();
    const result = await db.query(
      `SELECT st.site_id, t.id, t.name, t.color, t.user_id, t.created_at, t.updated_at
       FROM site_tags st
       INNER JOIN tags t ON st.tag_id = t.id
       WHERE st.site_id = ANY($1::int[])
       ORDER BY st.site_id, t.name`,
      [siteIds]
    );

    const tagsBySite: Record<number, import('./types').Tag[]> = {};
    
    // Инициализируем пустые массивы для всех сайтов
    siteIds.forEach(siteId => {
      tagsBySite[siteId] = [];
    });

    // Заполняем теги
    result.rows.forEach((row: any) => {
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
  } catch (error: any) {
    if (error?.code === '42P01' || error.message?.includes('does not exist')) {
      return {};
    }
    console.error('Error fetching all sites tags:', error);
    return {};
  }
}

export async function getAllStatuses(): Promise<SiteStatus[]> {
  if (!isPostgresAvailable()) {
    return [];
  }

  try {
    const db = await getPostgresClient();
    const result = await db.query(
      'SELECT * FROM site_statuses ORDER BY sort_order ASC'
    );

    return result.rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      color: row.color || '#6b7280',
      sortOrder: row.sort_order,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } catch (error: any) {
    if (error?.code === '42P01' || error.message?.includes('does not exist')) {
      return [];
    }
    console.error('Error fetching statuses:', error);
    return [];
  }
}

