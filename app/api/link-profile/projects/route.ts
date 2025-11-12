import { NextResponse } from 'next/server';
import { storage } from '@/lib/storage';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      projects: storage.projects,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Ошибка получения проектов',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, domain, description } = body;

    if (!name || !domain) {
      return NextResponse.json(
        {
          success: false,
          error: 'Название и домен обязательны',
        },
        { status: 400 }
      );
    }

    const newProject = {
      id: storage.counters.projectId++,
      name,
      domain,
      description: description || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    storage.projects.push(newProject);

    return NextResponse.json({
      success: true,
      project: newProject,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Ошибка создания проекта',
      },
      { status: 500 }
    );
  }
}
