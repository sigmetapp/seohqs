import { NextResponse } from 'next/server';
import { storage } from '@/lib/storage';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = parseInt(params.id);
    const projectLinks = storage.links.filter((l) => l.projectId === projectId);

    if (projectLinks.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Ссылки не найдены',
        },
        { status: 404 }
      );
    }

    let checked = 0;

    // Имитация проверки ссылок
    // В реальности здесь будет:
    // 1. Проверка индексации через Google Search API или другой метод
    // 2. Проверка наличия ссылки на странице через парсинг HTML
    for (const link of projectLinks) {
      try {
        // Имитация проверки
        const isIndexed = Math.random() > 0.3; // 70% вероятность индексации
        const isOnPage = Math.random() > 0.2; // 80% вероятность наличия на странице

        link.status = isIndexed && isOnPage ? 'indexed' : isOnPage ? 'not_found' : 'error';
        link.lastChecked = new Date().toISOString();
        if (isIndexed && isOnPage) {
          link.indexedAt = new Date().toISOString();
        }

        checked++;
      } catch (err) {
        link.status = 'error';
        link.lastChecked = new Date().toISOString();
      }
    }

    return NextResponse.json({
      success: true,
      checked,
      message: `Проверено ${checked} ссылок`,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Ошибка проверки ссылок',
      },
      { status: 500 }
    );
  }
}
