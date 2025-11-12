// Универсальный клиент для PostgreSQL
// Использует pg для выполнения произвольных SQL запросов

let pool: any = null;

export async function getPostgresClient() {
  if (pool) {
    return {
      query: async (text: string, params?: any[]) => {
        return pool.query(text, params);
      },
    };
  }

  // Используем pg для выполнения SQL запросов
  const { Pool } = await import('pg');
  const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  
  if (!connectionString) {
    throw new Error('No PostgreSQL connection string found. Please set POSTGRES_URL or DATABASE_URL environment variable.');
  }

  pool = new Pool({
    connectionString,
    ssl: process.env.VERCEL ? { rejectUnauthorized: false } : false,
  });

  return {
    query: async (text: string, params?: any[]) => {
      return pool.query(text, params);
    },
  };
}
