import { NextResponse } from 'next/server';
import { storage } from '@/lib/storage';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const projectLinks = storage.links.filter((l) => l.projectId === parseInt(params.id));

    return NextResponse.json({
      success: true,
      links: projectLinks,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Ошибка получения ссылок',
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { urls } = body;

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Необходимо указать массив URL',
        },
        { status: 400 }
      );
    }

    const projectId = parseInt(params.id);
    const newLinks = urls.map((url: string) => ({
      id: storage.counters.linkId++,
      projectId,
      url: url.trim(),
      targetUrl: '', // Будет определяться при проверке
      status: 'pending' as const,
      createdAt: new Date().toISOString(),
    }));

    storage.links.push(...newLinks);

    return NextResponse.json({
      success: true,
      links: newLinks,
      message: `Добавлено ${newLinks.length} ссылок`,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Ошибка добавления ссылок',
      },
      { status: 500 }
    );
  }
}
