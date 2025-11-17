import { NextResponse } from 'next/server';
import { assignTagToSite, removeTagFromSite, getSiteTags } from '@/lib/db-adapter';
import { requireAuth } from '@/lib/middleware-auth';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    
    const siteId = parseInt(params.id, 10);
    if (isNaN(siteId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Неверный ID сайта',
        },
        { status: 400 }
      );
    }
    
    const tags = await getSiteTags(siteId);
    
    return NextResponse.json({
      success: true,
      tags,
    });
  } catch (error: any) {
    console.error('Error fetching site tags:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Ошибка получения тегов сайта',
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    
    const siteId = parseInt(params.id, 10);
    if (isNaN(siteId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Неверный ID сайта',
        },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    const { tagId } = body;

    if (!tagId) {
      return NextResponse.json(
        {
          success: false,
          error: 'ID тега обязателен',
        },
        { status: 400 }
      );
    }

    await assignTagToSite(siteId, tagId);

    return NextResponse.json({
      success: true,
    });
  } catch (error: any) {
    console.error('Error assigning tag to site:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Ошибка присвоения тега сайту',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    
    const siteId = parseInt(params.id, 10);
    if (isNaN(siteId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Неверный ID сайта',
        },
        { status: 400 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const tagId = searchParams.get('tagId');

    if (!tagId) {
      return NextResponse.json(
        {
          success: false,
          error: 'ID тега обязателен',
        },
        { status: 400 }
      );
    }

    await removeTagFromSite(siteId, parseInt(tagId, 10));

    return NextResponse.json({
      success: true,
    });
  } catch (error: any) {
    console.error('Error removing tag from site:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Ошибка удаления тега с сайта',
      },
      { status: 500 }
    );
  }
}
