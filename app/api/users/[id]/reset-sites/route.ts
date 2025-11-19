import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/middleware-auth';
import { getAllSites, clearGoogleSearchConsoleData } from '@/lib/db-adapter';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/users/[id]/reset-sites
 * Удаляет все сайты указанного пользователя и все связанные данные Google Search Console
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { id } = await params;
    const userId = parseInt(id);
    if (isNaN(userId)) {
      return NextResponse.json(
        { success: false, error: 'Неверный ID пользователя' },
        { status: 400 }
      );
    }

    // Получаем все сайты пользователя
    const sites = await getAllSites(userId);
    
    if (sites.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Нет сайтов для удаления',
        deletedSites: 0,
      });
    }

    // Удаляем данные Google Search Console для каждого сайта
    let deletedDataCount = 0;
    for (const site of sites) {
      try {
        await clearGoogleSearchConsoleData(site.id);
        deletedDataCount++;
      } catch (error: any) {
        console.warn(`Failed to clear GSC data for site ${site.id}:`, error.message);
        // Продолжаем удаление других сайтов даже если один не удался
      }
    }

    // Удаляем все сайты пользователя
    // Используем адаптер для работы с разными БД
    const useSupabase = !!(process.env.NEXT_PUBLIC_SUPABASE_URL);
    const usePostgres = !useSupabase && !!(process.env.POSTGRES_URL || process.env.DATABASE_URL);
    
    if (useSupabase) {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      
      // Удаляем связи site_tags сначала (из-за внешних ключей)
      const siteIds = sites.map(s => s.id);
      if (siteIds.length > 0) {
        await supabase
          .from('site_tags')
          .delete()
          .in('site_id', siteIds);
      }
      
      // Удаляем сайты
      const { error } = await supabase
        .from('sites')
        .delete()
        .eq('user_id', userId);
      
      if (error) {
        throw new Error(`Failed to delete sites: ${error.message}`);
      }
    } else if (usePostgres) {
      // PostgreSQL
      const { getPostgresClient } = await import('@/lib/postgres-client');
      const db = await getPostgresClient();
      
      // Удаляем связи site_tags сначала
      const siteIds = sites.map(s => s.id);
      if (siteIds.length > 0) {
        const placeholders = siteIds.map((_, i) => `$${i + 1}`).join(',');
        await db.query(
          `DELETE FROM site_tags WHERE site_id IN (${placeholders})`,
          siteIds
        );
      }
      
      // Удаляем сайты
      await db.query('DELETE FROM sites WHERE user_id = $1', [userId]);
    } else {
      // SQLite (локальная разработка)
      const Database = require('better-sqlite3');
      const { join } = require('path');
      const { existsSync, mkdirSync } = require('fs');
      
      const dbDir = join(process.cwd(), 'data');
      if (!existsSync(dbDir)) {
        mkdirSync(dbDir, { recursive: true });
      }
      
      const dbPath = join(dbDir, 'affiliate.db');
      const db = new Database(dbPath);
      
      // Удаляем связи site_tags сначала
      const siteIds = sites.map(s => s.id);
      if (siteIds.length > 0) {
        const placeholders = siteIds.map(() => '?').join(',');
        db.prepare(`DELETE FROM site_tags WHERE site_id IN (${placeholders})`).run(...siteIds);
      }
      
      // Удаляем сайты
      db.prepare('DELETE FROM sites WHERE user_id = ?').run(userId);
      
      db.close();
    }

    return NextResponse.json({
      success: true,
      message: `Удалено ${sites.length} сайтов и связанные данные Google Search Console`,
      deletedSites: sites.length,
      deletedGSCData: deletedDataCount,
    });
  } catch (error: any) {
    console.error('Error resetting user sites:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Ошибка удаления сайтов',
      },
      { status: 500 }
    );
  }
}
