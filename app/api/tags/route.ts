import { NextResponse } from 'next/server';
import { getAllTags, createTag, updateTag, deleteTag } from '@/lib/db-adapter';
import { requireAuth } from '@/lib/middleware-auth';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;
    
    const tags = await getAllTags(user.id);
    
    return NextResponse.json({
      success: true,
      tags,
    });
  } catch (error: any) {
    console.error('Error fetching tags:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Ошибка получения тегов',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;
    
    const body = await request.json();
    const { name, color } = body;

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          error: 'Название тега обязательно',
        },
        { status: 400 }
      );
    }

    const newTag = await createTag({
      name,
      color: color || '#3b82f6',
    }, user.id);

    return NextResponse.json({
      success: true,
      tag: newTag,
    });
  } catch (error: any) {
    console.error('Error creating tag:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Ошибка создания тега',
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;
    
    const body = await request.json();
    const { id, name, color } = body;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: 'ID тега обязателен',
        },
        { status: 400 }
      );
    }

    const updatedTag = await updateTag(id, {
      name,
      color,
    }, user.id);

    return NextResponse.json({
      success: true,
      tag: updatedTag,
    });
  } catch (error: any) {
    console.error('Error updating tag:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Ошибка обновления тега',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: 'ID тега обязателен',
        },
        { status: 400 }
      );
    }

    await deleteTag(parseInt(id, 10), user.id);

    return NextResponse.json({
      success: true,
    });
  } catch (error: any) {
    console.error('Error deleting tag:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Ошибка удаления тега',
      },
      { status: 500 }
    );
  }
}
