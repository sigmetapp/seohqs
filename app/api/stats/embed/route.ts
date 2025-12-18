import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Учетные данные для доступа к статистике
const STATS_USERNAME = 'seosasha';
const STATS_PASSWORD = 'Sasha1991!';

/**
 * GET /api/stats/embed
 * Получение статистики вызовов embed скриптов
 * Требует базовую аутентификацию
 */
export async function GET(request: NextRequest) {
  try {
    // Проверка авторизации через Basic Auth
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Basic ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { 
          status: 401,
          headers: {
            'WWW-Authenticate': 'Basic realm="Stats Access"'
          }
        }
      );
    }

    // Декодируем Basic Auth
    const base64Credentials = authHeader.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
    const [username, password] = credentials.split(':');

    // Проверяем учетные данные
    if (username !== STATS_USERNAME || password !== STATS_PASSWORD) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not available' },
        { status: 500 }
      );
    }

    // Получаем параметры периода
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'day'; // day, week, month

    // Вычисляем дату начала периода
    const now = new Date();
    let startDate: Date;
    
    switch (period) {
      case 'day':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    // Получаем статистику по скриптам
    const { data: scriptStats, error: scriptError } = await supabase
      .from('embed_script_logs')
      .select('script_name, referer, created_at')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });

    if (scriptError) {
      console.error('Error fetching script stats:', scriptError);
      return NextResponse.json(
        { error: 'Failed to fetch statistics' },
        { status: 500 }
      );
    }

    // Группируем по скриптам и доменам
    const stats: Record<string, {
      total: number;
      byDomain: Record<string, number>;
    }> = {
      'tabsgen.js': { total: 0, byDomain: {} },
      'slot.js': { total: 0, byDomain: {} },
    };

    scriptStats?.forEach((log) => {
      const scriptName = log.script_name;
      if (stats[scriptName]) {
        stats[scriptName].total++;
        
        // Извлекаем домен из referer
        let domain = 'unknown';
        if (log.referer) {
          try {
            const url = new URL(log.referer);
            domain = url.hostname;
          } catch {
            domain = log.referer.substring(0, 100); // Обрезаем если не валидный URL
          }
        }
        
        stats[scriptName].byDomain[domain] = (stats[scriptName].byDomain[domain] || 0) + 1;
      }
    });

    // Сортируем домены по количеству вызовов
    Object.keys(stats).forEach((scriptName) => {
      const domainEntries = Object.entries(stats[scriptName].byDomain)
        .sort(([, a], [, b]) => b - a);
      stats[scriptName].byDomain = Object.fromEntries(domainEntries);
    });

    return NextResponse.json({
      success: true,
      period,
      startDate: startDate.toISOString(),
      endDate: now.toISOString(),
      stats,
    });
  } catch (error: any) {
    console.error('Error in stats endpoint:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
