import Database from 'better-sqlite3';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import type { Site, IntegrationsSettings } from './types';

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
    INSERT INTO sites (name, domain, category, google_search_console_url, ahrefs_api_key, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `);

  const result = stmt.run(
    site.name,
    site.domain,
    site.category || null,
    site.googleSearchConsoleUrl || null,
    site.ahrefsApiKey || null
  );

  return {
    id: Number(result.lastInsertRowid),
    name: site.name,
    domain: site.domain,
    category: site.category,
    googleSearchConsoleUrl: site.googleSearchConsoleUrl,
    ahrefsApiKey: site.ahrefsApiKey,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function getAllSites(): Site[] {
  const database = getDatabase();
  const rows = database.prepare('SELECT * FROM sites ORDER BY created_at DESC').all() as any[];
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    domain: row.domain,
    category: row.category,
    googleSearchConsoleUrl: row.google_search_console_url,
    ahrefsApiKey: row.ahrefs_api_key,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export function getSiteById(id: number): Site | null {
  const database = getDatabase();
  const row = database.prepare('SELECT * FROM sites WHERE id = ?').get(id) as any;
  
  if (!row) {
    return null;
  }

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
}

export function updateSite(id: number, site: Partial<Omit<Site, 'id' | 'createdAt'>>): Site {
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
  if (site.ahrefsApiKey !== undefined) {
    updates.push('ahrefs_api_key = ?');
    values.push(site.ahrefsApiKey || null);
  }

  updates.push("updated_at = datetime('now')");
  values.push(id);

  const query = `UPDATE sites SET ${updates.join(', ')} WHERE id = ?`;
  database.prepare(query).run(...values);

  const updated = getSiteById(id);
  if (!updated) {
    throw new Error('Site not found after update');
  }
  return updated;
}

// Integrations functions
export function getIntegrations(): IntegrationsSettings {
  const database = getDatabase();
  const row = database.prepare('SELECT * FROM integrations WHERE id = 1').get() as any;
  
  if (!row) {
    // Если записи нет, создаем её
    database.prepare(`
      INSERT INTO integrations (id, updated_at)
      VALUES (1, datetime('now'))
    `).run();
    
    return {
      id: 1,
      googleServiceAccountEmail: '',
      googlePrivateKey: '',
      ahrefsApiKey: '',
      googleSearchConsoleUrl: '',
      updatedAt: new Date().toISOString(),
    };
  }

  return {
    id: row.id,
    googleServiceAccountEmail: row.google_service_account_email || '',
    googlePrivateKey: row.google_private_key || '',
    ahrefsApiKey: row.ahrefs_api_key || '',
    googleSearchConsoleUrl: row.google_search_console_url || '',
    updatedAt: row.updated_at,
  };
}

export function updateIntegrations(settings: Partial<Omit<IntegrationsSettings, 'id' | 'updatedAt'>>): IntegrationsSettings {
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
  if (settings.ahrefsApiKey !== undefined) {
    updates.push('ahrefs_api_key = ?');
    values.push(settings.ahrefsApiKey || null);
  }
  if (settings.googleSearchConsoleUrl !== undefined) {
    updates.push('google_search_console_url = ?');
    values.push(settings.googleSearchConsoleUrl || null);
  }

  updates.push("updated_at = datetime('now')");

  if (updates.length > 1) {
    const query = `UPDATE integrations SET ${updates.join(', ')} WHERE id = 1`;
    database.prepare(query).run(...values);
  }

  return getIntegrations();
}
