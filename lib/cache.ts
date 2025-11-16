/**
 * Простая система кеширования в памяти с TTL (Time To Live)
 * Используется для кеширования данных Google Search Console
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // в миллисекундах
}

class SimpleCache {
  private cache: Map<string, CacheEntry<any>> = new Map();

  /**
   * Получить данные из кеша
   * @param key Ключ кеша
   * @returns Данные или null, если кеш истек или отсутствует
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      // Кеш истек, удаляем его
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Сохранить данные в кеш
   * @param key Ключ кеша
   * @param data Данные для кеширования
   * @param ttl Время жизни кеша в миллисекундах (по умолчанию 12 часов)
   */
  set<T>(key: string, data: T, ttl: number = 12 * 60 * 60 * 1000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * Удалить данные из кеша
   * @param key Ключ кеша
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Очистить весь кеш
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Проверить, существует ли валидный кеш
   * @param key Ключ кеша
   * @returns true, если кеш существует и не истек
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Очистить истекшие записи из кеша
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

// Экспортируем singleton экземпляр
export const cache = new SimpleCache();

// Периодически очищаем истекшие записи (каждые 30 минут)
// Только в браузерной среде или Node.js с поддержкой setInterval
if (typeof setInterval !== 'undefined' && typeof window === 'undefined') {
  // В серверной среде Next.js setInterval может работать, но лучше очищать при каждом запросе
  // Очистка происходит автоматически при проверке кеша через get() или has()
}
