import { getPostgresClient } from './postgres-client';
import type { AffiliateOffer, Site, IntegrationsSettings } from './types';

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
export async function insertSite(site: Omit<Site, 'id' | 'createdAt' | 'updatedAt'>): Promise<Site> {
  if (!isPostgresAvailable()) {
    throw new Error('PostgreSQL database not configured. Please set POSTGRES_URL or DATABASE_URL.');
  }

  try {
    const db = await getPostgresClient();
    const result = await db.query(
      `INSERT INTO sites (name, domain, category, google_search_console_url, ahrefs_api_key) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id, name, domain, category, google_search_console_url, ahrefs_api_key, created_at, updated_at`,
      [
        site.name,
        site.domain,
        site.category || null,
        site.googleSearchConsoleUrl || null,
        site.ahrefsApiKey || null,
      ]
    );

    const row = result.rows[0];
    return {
      id: row.id,
      name: row.name,
      domain: row.domain,
      category: row.category,
      googleSearchConsoleUrl: row.google_search_console_url,
      ahrefsApiKey: row.ahrefs_api_key,
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

export async function getAllSites(): Promise<Site[]> {
  if (!isPostgresAvailable()) {
    console.warn('PostgreSQL database not configured, returning empty array');
    return [];
  }

  try {
    const db = await getPostgresClient();
    const result = await db.query('SELECT * FROM sites ORDER BY created_at DESC');
    return result.rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      domain: row.domain,
      category: row.category,
      googleSearchConsoleUrl: row.google_search_console_url,
      ahrefsApiKey: row.ahrefs_api_key,
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

export async function getSiteById(id: number): Promise<Site | null> {
  if (!isPostgresAvailable()) {
    return null;
  }

  try {
    const db = await getPostgresClient();
    const result = await db.query('SELECT * FROM sites WHERE id = $1', [id]);
    
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
      ahrefsApiKey: row.ahrefs_api_key,
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

export async function updateSite(id: number, site: Partial<Omit<Site, 'id' | 'createdAt'>>): Promise<Site> {
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
    if (site.ahrefsApiKey !== undefined) {
      updates.push(`ahrefs_api_key = $${paramIndex++}`);
      values.push(site.ahrefsApiKey || null);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `UPDATE sites SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await db.query(query, values);

    const row = result.rows[0];
    return {
      id: row.id,
      name: row.name,
      domain: row.domain,
      category: row.category,
      googleSearchConsoleUrl: row.google_search_console_url,
      ahrefsApiKey: row.ahrefs_api_key,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  } catch (error: any) {
    throw error;
  }
}

// Integrations functions
export async function getIntegrations(): Promise<IntegrationsSettings> {
  if (!isPostgresAvailable()) {
    return {
      id: 1,
      googleServiceAccountEmail: '',
      googlePrivateKey: '',
      ahrefsApiKey: '',
      googleSearchConsoleUrl: '',
      updatedAt: new Date().toISOString(),
    };
  }

  try {
    const db = await getPostgresClient();
    const result = await db.query('SELECT * FROM integrations WHERE id = 1');
    
    if (result.rows.length === 0) {
      // Если записи нет, создаем её
      await db.query(
        `INSERT INTO integrations (id, updated_at) VALUES (1, CURRENT_TIMESTAMP) 
         ON CONFLICT (id) DO NOTHING`
      );
      
      return {
        id: 1,
        googleServiceAccountEmail: '',
        googlePrivateKey: '',
        ahrefsApiKey: '',
        googleSearchConsoleUrl: '',
        updatedAt: new Date().toISOString(),
      };
    }

    const row = result.rows[0];
    return {
      id: row.id,
      googleServiceAccountEmail: row.google_service_account_email || '',
      googlePrivateKey: row.google_private_key || '',
      ahrefsApiKey: row.ahrefs_api_key || '',
      googleSearchConsoleUrl: row.google_search_console_url || '',
      updatedAt: row.updated_at,
    };
  } catch (error: any) {
    if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
      // Таблица не существует, возвращаем пустые настройки
      return {
        id: 1,
        googleServiceAccountEmail: '',
        googlePrivateKey: '',
        ahrefsApiKey: '',
        googleSearchConsoleUrl: '',
        updatedAt: new Date().toISOString(),
      };
    }
    console.error('Error fetching integrations:', error);
    return {
      id: 1,
      googleServiceAccountEmail: '',
      googlePrivateKey: '',
      ahrefsApiKey: '',
      googleSearchConsoleUrl: '',
      updatedAt: new Date().toISOString(),
    };
  }
}

export async function updateIntegrations(settings: Partial<Omit<IntegrationsSettings, 'id' | 'updatedAt'>>): Promise<IntegrationsSettings> {
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
    if (settings.ahrefsApiKey !== undefined) {
      updates.push(`ahrefs_api_key = $${paramIndex++}`);
      values.push(settings.ahrefsApiKey || null);
    }
    if (settings.googleSearchConsoleUrl !== undefined) {
      updates.push(`google_search_console_url = $${paramIndex++}`);
      values.push(settings.googleSearchConsoleUrl || null);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    if (updates.length > 1) {
      // Сначала убедимся, что запись существует
      await db.query(
        `INSERT INTO integrations (id, updated_at) VALUES (1, CURRENT_TIMESTAMP) 
         ON CONFLICT (id) DO NOTHING`
      );

      values.push(1);
      const query = `UPDATE integrations SET ${updates.join(', ')} WHERE id = $${paramIndex}`;
      await db.query(query, values);
    }

    return getIntegrations();
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

// Ahrefs Data functions
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
  if (!isPostgresAvailable()) {
    throw new Error('PostgreSQL database not configured');
  }

  try {
    const db = await getPostgresClient();
    const result = await db.query(
      `INSERT INTO ahrefs_data (site_id, domain_rating, backlinks, referring_domains, organic_keywords, organic_traffic, date)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (site_id, date) 
       DO UPDATE SET domain_rating = EXCLUDED.domain_rating, backlinks = EXCLUDED.backlinks, 
                     referring_domains = EXCLUDED.referring_domains, organic_keywords = EXCLUDED.organic_keywords,
                     organic_traffic = EXCLUDED.organic_traffic
       RETURNING id, site_id, domain_rating, backlinks, referring_domains, organic_keywords, organic_traffic, date, created_at`,
      [data.siteId, data.domainRating, data.backlinks, data.referringDomains, data.organicKeywords, data.organicTraffic, data.date]
    );

    const row = result.rows[0];
    return {
      id: row.id,
      siteId: row.site_id,
      domainRating: row.domain_rating,
      backlinks: row.backlinks,
      referringDomains: row.referring_domains,
      organicKeywords: row.organic_keywords,
      organicTraffic: row.organic_traffic,
      date: row.date,
      createdAt: row.created_at,
    };
  } catch (error: any) {
    if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
      throw new Error('Table ahrefs_data does not exist. Please run migrations.');
    }
    throw error;
  }
}

export async function getAhrefsDataBySiteId(
  siteId: number
): Promise<AhrefsDataRow | null> {
  if (!isPostgresAvailable()) {
    return null;
  }

  try {
    const db = await getPostgresClient();
    const result = await db.query(
      `SELECT * FROM ahrefs_data 
       WHERE site_id = $1 
       ORDER BY date DESC 
       LIMIT 1`,
      [siteId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      siteId: row.site_id,
      domainRating: row.domain_rating,
      backlinks: row.backlinks,
      referringDomains: row.referring_domains,
      organicKeywords: row.organic_keywords,
      organicTraffic: row.organic_traffic,
      date: row.date,
      createdAt: row.created_at,
    };
  } catch (error: any) {
    if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
      return null;
    }
    console.error('Error fetching Ahrefs data:', error);
    return null;
  }
}
