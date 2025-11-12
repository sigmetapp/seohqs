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

  // Создаем таблицу если её нет
  db.exec(`
    CREATE TABLE IF NOT EXISTS affiliate_offers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      topic TEXT NOT NULL,
      country TEXT NOT NULL,
      model TEXT NOT NULL,
      cr REAL DEFAULT 0,
      ecpc REAL DEFAULT 0,
      epc REAL DEFAULT 0,
      source TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_name ON affiliate_offers(name);
    CREATE INDEX IF NOT EXISTS idx_topic ON affiliate_offers(topic);
    CREATE INDEX IF NOT EXISTS idx_country ON affiliate_offers(country);
    CREATE INDEX IF NOT EXISTS idx_model ON affiliate_offers(model);
  `);

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
