import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/middleware-auth';
import { getAllSites } from '@/lib/db-adapter';
import { storage } from '@/lib/storage';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Получить статистику задач и ссылок для всех сайтов пользователя
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    const sites = await getAllSites(user.id);

    // Функция для нормализации домена
    const normalizeDomain = (domain: string): string => {
      return domain.toLowerCase().trim().replace(/^www\./, '').replace(/^https?:\/\//, '').split('/')[0];
    };

    // Получаем статистику задач для каждого сайта
    const useSupabase = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && 
      (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY));
    const usePostgres = !useSupabase && !!(process.env.POSTGRES_URL || process.env.DATABASE_URL);

    const statsPromises = sites.map(async (site) => {
      // Статистика задач
      let taskStats = {
        total: 0,
        open: 0,
        closed: 0,
      };

      try {
        if (useSupabase) {
          const { createClient } = await import('@supabase/supabase-js');
          const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
          );
          const { data, error } = await supabase
            .from('site_tasks')
            .select('status')
            .eq('site_id', site.id);
          if (!error && data) {
            taskStats.total = data.length;
            taskStats.open = data.filter((t: any) => t.status !== 'completed').length;
            taskStats.closed = data.filter((t: any) => t.status === 'completed').length;
          }
        } else if (usePostgres) {
          const { Pool } = await import('pg');
          const pool = new Pool({
            connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
          });
          const result = await pool.query(
            'SELECT status FROM site_tasks WHERE site_id = $1',
            [site.id]
          );
          await pool.end();
          taskStats.total = result.rows.length;
          taskStats.open = result.rows.filter((t: any) => t.status !== 'completed').length;
          taskStats.closed = result.rows.filter((t: any) => t.status === 'completed').length;
        } else {
          // SQLite
          const Database = require('better-sqlite3');
          const { join } = require('path');
          const dbPath = join(process.cwd(), 'data', 'affiliate.db');
          const db = new Database(dbPath);
          const tasks = db.prepare('SELECT status FROM site_tasks WHERE site_id = ?').all(site.id);
          db.close();
          taskStats.total = tasks.length;
          taskStats.open = tasks.filter((t: any) => t.status !== 'completed').length;
          taskStats.closed = tasks.filter((t: any) => t.status === 'completed').length;
        }
      } catch (err) {
        console.error(`Error getting task stats for site ${site.id}:`, err);
      }

      // Статистика ссылок Link Profile
      let linkCount = 0;
      try {
        const normalizedDomain = normalizeDomain(site.domain);
        const project = storage.projects.find((p) => {
          const projectDomain = normalizeDomain(p.domain);
          return projectDomain === normalizedDomain;
        });
        if (project) {
          linkCount = storage.links.filter((l) => l.projectId === project.id).length;
        }
      } catch (err) {
        console.error(`Error getting link count for site ${site.id}:`, err);
      }

      return {
        siteId: site.id,
        tasks: taskStats,
        links: linkCount,
      };
    });

    const stats = await Promise.all(statsPromises);

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error: any) {
    console.error('Error fetching sites stats:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Ошибка получения статистики',
      },
      { status: 500 }
    );
  }
}
