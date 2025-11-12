import Database from 'better-sqlite3';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

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

  // Автоматически запускаем миграции при первом подключении
  if (!migrationsRun) {
    try {
      const { runMigrations } = require('./migrations');
      runMigrations();
      migrationsRun = true;
    } catch (error) {
      console.error('Error running migrations:', error);
      // Продолжаем работу даже если миграции не выполнились
    }
  }

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
