import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/middleware-auth';
import { getAllSites, clearGoogleSearchConsoleData, getAllGoogleAccounts, deleteGoogleAccount } from '@/lib/db-adapter';
import { deleteGSCIntegration } from '@/lib/gsc-integrations';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/users/[id]/reset-sites
 * Удаляет все данные пользователя: сайты, задачи, теги, интеграции, Google аккаунты и т.д.
 * Пользователь сможет заново добавить все данные
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

    const useSupabase = !!(process.env.NEXT_PUBLIC_SUPABASE_URL);
    const usePostgres = !useSupabase && !!(process.env.POSTGRES_URL || process.env.DATABASE_URL);
    
    const stats = {
      deletedSites: 0,
      deletedTasks: 0,
      deletedTaskMessages: 0,
      deletedTaskActivities: 0,
      deletedTags: 0,
      deletedGoogleAccounts: 0,
      deletedIntegrations: 0,
      deletedGSCIntegrations: 0,
      deletedLinkProjects: 0,
      deletedGSCData: 0,
    };

    // Получаем все сайты пользователя
    const sites = await getAllSites(userId);
    const siteIds = sites.map(s => s.id);
    stats.deletedSites = sites.length;

    if (useSupabase) {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      // 1. Удаляем данные Google Search Console для каждого сайта
      for (const site of sites) {
        try {
          await clearGoogleSearchConsoleData(site.id);
          stats.deletedGSCData++;
        } catch (error: any) {
          console.warn(`Failed to clear GSC data for site ${site.id}:`, error.message);
        }
      }

      // 2. Удаляем задачи сайтов и связанные данные
      if (siteIds.length > 0) {
        // Получаем ID всех задач
        const { data: tasks } = await supabase
          .from('site_tasks')
          .select('id')
          .in('site_id', siteIds);
        
        const taskIds = tasks?.map(t => t.id) || [];
        stats.deletedTasks = taskIds.length;

        if (taskIds.length > 0) {
          // Удаляем сообщения задач
          const { count: messagesCount } = await supabase
            .from('task_messages')
            .delete()
            .in('task_id', taskIds)
            .select('id', { count: 'exact', head: true });
          stats.deletedTaskMessages = messagesCount || 0;

          // Удаляем активность задач
          const { count: activitiesCount } = await supabase
            .from('task_activities')
            .delete()
            .in('task_id', taskIds)
            .select('id', { count: 'exact', head: true });
          stats.deletedTaskActivities = activitiesCount || 0;

          // Удаляем задачи
          await supabase
            .from('site_tasks')
            .delete()
            .in('site_id', siteIds);
        }
      }

      // 3. Удаляем связи сайтов с тегами
      if (siteIds.length > 0) {
        await supabase
          .from('site_tags')
          .delete()
          .in('site_id', siteIds);
      }

      // 4. Удаляем теги пользователя
      const { count: tagsCount } = await supabase
        .from('tags')
        .delete()
        .eq('user_id', userId)
        .select('id', { count: 'exact', head: true });
      stats.deletedTags = tagsCount || 0;

      // 5. Удаляем сайты
      await supabase
        .from('sites')
        .delete()
        .eq('user_id', userId);

      // 6. Удаляем Google аккаунты
      const googleAccounts = await getAllGoogleAccounts(userId);
      for (const account of googleAccounts) {
        try {
          await deleteGoogleAccount(account.id, userId);
          stats.deletedGoogleAccounts++;
        } catch (error: any) {
          console.warn(`Failed to delete Google account ${account.id}:`, error.message);
        }
      }

      // 7. Удаляем интеграции
      const { count: integrationsCount } = await supabase
        .from('integrations')
        .delete()
        .eq('user_id', userId)
        .select('id', { count: 'exact', head: true });
      stats.deletedIntegrations = integrationsCount || 0;

      // 8. Удаляем GSC интеграции (Supabase Auth)
      try {
        // Получаем email пользователя
        const { data: userData } = await supabase
          .from('users')
          .select('email')
          .eq('id', userId)
          .single();
        
        if (userData?.email) {
          // Пробуем найти пользователя в auth.users по email
          const { data: authUsers } = await supabase.auth.admin.listUsers();
          const authUser = authUsers?.users?.find(u => u.email === userData.email);
          
          if (authUser?.id) {
            // Удаляем GSC интеграции через функцию
            try {
              const deleted = await deleteGSCIntegration(authUser.id);
              if (deleted) stats.deletedGSCIntegrations++;
            } catch (err: any) {
              console.warn('Failed to delete GSC integration via function:', err.message);
            }
            
            // Также удаляем напрямую через Supabase на случай, если функция не сработала
            const { data: gscIntegrations } = await supabase
              .from('gsc_integrations')
              .select('id')
              .eq('user_id', authUser.id);
            
            if (gscIntegrations && gscIntegrations.length > 0) {
              const integrationIds = gscIntegrations.map(i => i.id);
              
              // Удаляем связанные сайты
              await supabase
                .from('gsc_sites')
                .delete()
                .in('integration_id', integrationIds);
              
              // Удаляем интеграции
              await supabase
                .from('gsc_integrations')
                .delete()
                .eq('user_id', authUser.id);
              
              stats.deletedGSCIntegrations = gscIntegrations.length;
            }
          } else {
            // Если пользователь не найден в auth.users, пробуем найти GSC интеграции напрямую
            // (на случай, если user_id в gsc_integrations - это числовой ID)
            const { data: gscIntegrations } = await supabase
              .from('gsc_integrations')
              .select('id, user_id');
            
            // Фильтруем интеграции, которые могут принадлежать этому пользователю
            // (это не идеально, но лучше чем ничего)
            if (gscIntegrations && gscIntegrations.length > 0) {
              // Удаляем все найденные интеграции (осторожно!)
              // В реальности лучше иметь связь через email или другой идентификатор
              console.warn('Could not find auth user for GSC integration cleanup');
            }
          }
        }
      } catch (error: any) {
        console.warn('Failed to delete GSC integrations:', error.message);
      }

      // 9. Удаляем ссылочные проекты и ссылки
      const { data: linkProjects } = await supabase
        .from('link_projects')
        .select('id')
        .eq('user_id', userId);
      
      const linkProjectIds = linkProjects?.map(p => p.id) || [];
      stats.deletedLinkProjects = linkProjectIds.length;

      if (linkProjectIds.length > 0) {
        // Удаляем ссылки проектов
        await supabase
          .from('project_links')
          .delete()
          .in('project_id', linkProjectIds);
        
        // Удаляем проекты
        await supabase
          .from('link_projects')
          .delete()
          .eq('user_id', userId);
      }

    } else if (usePostgres) {
      const { getPostgresClient } = await import('@/lib/postgres-client');
      const db = await getPostgresClient();

      // 1. Удаляем данные Google Search Console
      for (const site of sites) {
        try {
          await clearGoogleSearchConsoleData(site.id);
          stats.deletedGSCData++;
        } catch (error: any) {
          console.warn(`Failed to clear GSC data for site ${site.id}:`, error.message);
        }
      }

      // 2. Удаляем задачи и связанные данные
      if (siteIds.length > 0) {
        const placeholders = siteIds.map((_, i) => `$${i + 1}`).join(',');
        
        // Получаем ID задач
        const tasksResult = await db.query(
          `SELECT id FROM site_tasks WHERE site_id IN (${placeholders})`,
          siteIds
        );
        const taskIds = tasksResult.rows.map(r => r.id);
        stats.deletedTasks = taskIds.length;

        if (taskIds.length > 0) {
          const taskPlaceholders = taskIds.map((_, i) => `$${i + 1}`).join(',');
          
          // Удаляем сообщения задач
          const messagesResult = await db.query(
            `DELETE FROM task_messages WHERE task_id IN (${taskPlaceholders}) RETURNING id`,
            taskIds
          );
          stats.deletedTaskMessages = messagesResult.rowCount || 0;

          // Удаляем активность задач
          const activitiesResult = await db.query(
            `DELETE FROM task_activities WHERE task_id IN (${taskPlaceholders}) RETURNING id`,
            taskIds
          );
          stats.deletedTaskActivities = activitiesResult.rowCount || 0;

          // Удаляем задачи
          await db.query(
            `DELETE FROM site_tasks WHERE site_id IN (${placeholders})`,
            siteIds
          );
        }
      }

      // 3. Удаляем связи сайтов с тегами
      if (siteIds.length > 0) {
        const placeholders = siteIds.map((_, i) => `$${i + 1}`).join(',');
        await db.query(
          `DELETE FROM site_tags WHERE site_id IN (${placeholders})`,
          siteIds
        );
      }

      // 4. Удаляем теги пользователя
      const tagsResult = await db.query(
        'DELETE FROM tags WHERE user_id = $1 RETURNING id',
        [userId]
      );
      stats.deletedTags = tagsResult.rowCount || 0;

      // 5. Удаляем сайты
      await db.query('DELETE FROM sites WHERE user_id = $1', [userId]);

      // 6. Удаляем Google аккаунты
      const googleAccounts = await getAllGoogleAccounts(userId);
      for (const account of googleAccounts) {
        try {
          await deleteGoogleAccount(account.id, userId);
          stats.deletedGoogleAccounts++;
        } catch (error: any) {
          console.warn(`Failed to delete Google account ${account.id}:`, error.message);
        }
      }

      // 7. Удаляем интеграции
      const integrationsResult = await db.query(
        'DELETE FROM integrations WHERE user_id = $1 RETURNING id',
        [userId]
      );
      stats.deletedIntegrations = integrationsResult.rowCount || 0;

      // 8. Удаляем ссылочные проекты
      const linkProjectsResult = await db.query(
        'SELECT id FROM link_projects WHERE user_id = $1',
        [userId]
      );
      const linkProjectIds = linkProjectsResult.rows.map(r => r.id);
      stats.deletedLinkProjects = linkProjectIds.length;

      if (linkProjectIds.length > 0) {
        const projectPlaceholders = linkProjectIds.map((_, i) => `$${i + 1}`).join(',');
        await db.query(
          `DELETE FROM project_links WHERE project_id IN (${projectPlaceholders})`,
          linkProjectIds
        );
        await db.query('DELETE FROM link_projects WHERE user_id = $1', [userId]);
      }

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

      // 1. Удаляем данные Google Search Console
      for (const site of sites) {
        try {
          await clearGoogleSearchConsoleData(site.id);
          stats.deletedGSCData++;
        } catch (error: any) {
          console.warn(`Failed to clear GSC data for site ${site.id}:`, error.message);
        }
      }

      // 2. Удаляем задачи и связанные данные
      if (siteIds.length > 0) {
        const placeholders = siteIds.map(() => '?').join(',');
        
        // Получаем ID задач
        const tasks = db.prepare(`SELECT id FROM site_tasks WHERE site_id IN (${placeholders})`).all(...siteIds);
        const taskIds = tasks.map((t: any) => t.id);
        stats.deletedTasks = taskIds.length;

        if (taskIds.length > 0) {
          const taskPlaceholders = taskIds.map(() => '?').join(',');
          
          // Удаляем сообщения задач
          const messagesResult = db.prepare(`DELETE FROM task_messages WHERE task_id IN (${taskPlaceholders})`).run(...taskIds);
          stats.deletedTaskMessages = messagesResult.changes || 0;

          // Удаляем активность задач
          const activitiesResult = db.prepare(`DELETE FROM task_activities WHERE task_id IN (${taskPlaceholders})`).run(...taskIds);
          stats.deletedTaskActivities = activitiesResult.changes || 0;

          // Удаляем задачи
          db.prepare(`DELETE FROM site_tasks WHERE site_id IN (${placeholders})`).run(...siteIds);
        }
      }

      // 3. Удаляем связи сайтов с тегами
      if (siteIds.length > 0) {
        const placeholders = siteIds.map(() => '?').join(',');
        db.prepare(`DELETE FROM site_tags WHERE site_id IN (${placeholders})`).run(...siteIds);
      }

      // 4. Удаляем теги пользователя
      const tagsResult = db.prepare('DELETE FROM tags WHERE user_id = ?').run(userId);
      stats.deletedTags = tagsResult.changes || 0;

      // 5. Удаляем сайты
      db.prepare('DELETE FROM sites WHERE user_id = ?').run(userId);

      // 6. Удаляем Google аккаунты
      const googleAccounts = await getAllGoogleAccounts(userId);
      for (const account of googleAccounts) {
        try {
          await deleteGoogleAccount(account.id, userId);
          stats.deletedGoogleAccounts++;
        } catch (error: any) {
          console.warn(`Failed to delete Google account ${account.id}:`, error.message);
        }
      }

      // 7. Удаляем интеграции
      const integrationsResult = db.prepare('DELETE FROM integrations WHERE user_id = ?').run(userId);
      stats.deletedIntegrations = integrationsResult.changes || 0;

      // 8. Удаляем ссылочные проекты
      const linkProjects = db.prepare('SELECT id FROM link_projects WHERE user_id = ?').all(userId);
      const linkProjectIds = linkProjects.map((p: any) => p.id);
      stats.deletedLinkProjects = linkProjectIds.length;

      if (linkProjectIds.length > 0) {
        const projectPlaceholders = linkProjectIds.map(() => '?').join(',');
        db.prepare(`DELETE FROM project_links WHERE project_id IN (${projectPlaceholders})`).run(...linkProjectIds);
        db.prepare('DELETE FROM link_projects WHERE user_id = ?').run(userId);
      }

      db.close();
    }

    const totalDeleted = Object.values(stats).reduce((sum, val) => sum + val, 0);

    if (totalDeleted === 0) {
      return NextResponse.json({
        success: true,
        message: 'У пользователя нет данных для удаления',
        stats,
        totalDeleted: 0,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Все данные пользователя успешно сброшены. Пользователь может заново добавить все данные.`,
      stats,
      totalDeleted,
    });
  } catch (error: any) {
    console.error('Error resetting user data:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Ошибка сброса данных пользователя',
      },
      { status: 500 }
    );
  }
}
