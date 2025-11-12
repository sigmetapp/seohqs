import { NextResponse } from 'next/server';
import { getSiteById, getIntegrations, insertAhrefsData } from '@/lib/db-adapter';
import { fetchAhrefsSiteMetrics } from '@/lib/ahrefs';
import type { AhrefsData } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const siteId = parseInt(params.id);
    if (isNaN(siteId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Неверный ID сайта',
        },
        { status: 400 }
      );
    }
    const site = await getSiteById(siteId);

    if (!site) {
      return NextResponse.json(
        {
          success: false,
          error: 'Сайт не найден',
        },
        { status: 404 }
      );
    }

    // Используем ключ сайта или глобальный ключ из настроек интеграций
    const integrations = await getIntegrations();
    const ahrefsApiKey = site.ahrefsApiKey || integrations.ahrefsApiKey;
    
    if (!ahrefsApiKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'Ahrefs API Key не настроен. Настройте его для сайта или в глобальных настройках интеграций.',
        },
        { status: 400 }
      );
    }

    if (!site.domain) {
      return NextResponse.json(
        {
          success: false,
          error: 'Домен сайта не указан',
        },
        { status: 400 }
      );
    }

    // Получаем данные из Ahrefs API
    let metrics;
    try {
      console.log('[Ahrefs Sync] Начало синхронизации:', {
        siteId,
        domain: site.domain,
        hasApiKey: !!ahrefsApiKey,
        apiKeyLength: ahrefsApiKey?.length || 0,
      });
      
      metrics = await fetchAhrefsSiteMetrics(site.domain, ahrefsApiKey);
      
      console.log('[Ahrefs Sync] Данные получены успешно:', {
        domainRating: metrics.domainRating,
        backlinks: metrics.backlinks,
      });
    } catch (apiError: any) {
      // Логируем детали ошибки
      console.error('[Ahrefs Sync] Ошибка API:', {
        message: apiError.message,
        stack: apiError.stack,
        domain: site.domain,
      });
      
      // Если API вернул ошибку, возвращаем понятное сообщение
      const errorMessage = apiError.message || 'Неизвестная ошибка';
      
      // Определяем статус код на основе сообщения об ошибке
      let statusCode = 400;
      if (errorMessage.includes('403 Forbidden')) {
        statusCode = 403;
      } else if (errorMessage.includes('401')) {
        statusCode = 401;
      } else if (errorMessage.includes('404')) {
        statusCode = 404;
      }
      
      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
        },
        { status: statusCode }
      );
    }

    // Сохраняем данные в базу
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const savedData = await insertAhrefsData({
      siteId,
      domainRating: metrics.domainRating,
      backlinks: metrics.backlinks,
      referringDomains: metrics.referringDomains,
      organicKeywords: metrics.organicKeywords,
      organicTraffic: metrics.organicTraffic,
      date: today,
    });

    // Преобразуем в формат AhrefsData для ответа
    const ahrefsData: AhrefsData = {
      siteId: savedData.siteId,
      domainRating: savedData.domainRating,
      backlinks: savedData.backlinks,
      referringDomains: savedData.referringDomains,
      organicKeywords: savedData.organicKeywords,
      organicTraffic: savedData.organicTraffic,
      date: savedData.date,
    };

    return NextResponse.json({
      success: true,
      data: ahrefsData,
      message: 'Данные Ahrefs синхронизированы',
    });
  } catch (error: any) {
    console.error('Error syncing Ahrefs data:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Ошибка синхронизации Ahrefs',
      },
      { status: 500 }
    );
  }
}
