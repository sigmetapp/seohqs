import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * API endpoint для получения списка постов блога
 * GET /api/blog/posts?page=1&limit=10
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const offset = (page - 1) * limit;
    
    const { data: posts, error } = await supabase
      ?.from('blog_posts')
      .select('id, title, content, html_content, images, published_at, slug, created_at')
      .order('published_at', { ascending: false })
      .range(offset, offset + limit - 1) || { data: null, error: null };
    
    if (error) {
      throw error;
    }
    
    // Получаем общее количество постов
    const { count } = await supabase
      ?.from('blog_posts')
      .select('*', { count: 'exact', head: true }) || { count: 0 };
    
    return NextResponse.json({
      posts: posts || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error: any) {
    console.error('Error fetching blog posts:', error);
    return NextResponse.json(
      { error: error.message || 'Ошибка при получении постов' },
      { status: 500 }
    );
  }
}
