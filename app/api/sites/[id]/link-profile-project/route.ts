import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/middleware-auth';
import { storage } from '@/lib/storage';
import { getSiteById } from '@/lib/db-adapter';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Получить или создать проект для сайта
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    const siteId = parseInt(params.id);
    if (isNaN(siteId)) {
      return NextResponse.json(
        { success: false, error: 'Неверный ID сайта' },
        { status: 400 }
      );
    }

    // Получаем сайт
    const site = await getSiteById(siteId, user.id);
    if (!site) {
      return NextResponse.json(
        { success: false, error: 'Сайт не найден' },
        { status: 404 }
      );
    }

    // Нормализуем домен для поиска
    const normalizeDomain = (domain: string): string => {
      return domain.toLowerCase().trim().replace(/^www\./, '').replace(/^https?:\/\//, '').split('/')[0];
    };

    const normalizedDomain = normalizeDomain(site.domain);

    // Ищем существующий проект по домену
    let project = storage.projects.find((p) => {
      const projectDomain = normalizeDomain(p.domain);
      return projectDomain === normalizedDomain;
    });

    // Если проект не найден, создаем его
    if (!project) {
      project = {
        id: storage.counters.projectId++,
        name: site.name || site.domain,
        domain: site.domain,
        description: `Проект для сайта ${site.domain}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      storage.projects.push(project);
    }

    return NextResponse.json({
      success: true,
      project,
    });
  } catch (error: any) {
    console.error('Error getting/creating project for site:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Ошибка получения/создания проекта',
      },
      { status: 500 }
    );
  }
}
