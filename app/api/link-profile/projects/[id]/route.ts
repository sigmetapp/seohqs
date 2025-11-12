import { NextResponse } from 'next/server';
import { storage } from '@/lib/storage';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const project = storage.projects.find((p) => p.id === parseInt(params.id));
    
    if (!project) {
      return NextResponse.json(
        {
          success: false,
          error: 'Проект не найден',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      project: project,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Ошибка получения проекта',
      },
      { status: 500 }
    );
  }
}
