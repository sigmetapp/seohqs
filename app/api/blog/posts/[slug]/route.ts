import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * API endpoint для получения одного поста по slug
 * GET /api/blog/posts/[slug]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;
    
    const { data: post, error } = await supabase
      ?.from('blog_posts')
      .select('*')
      .eq('slug', slug)
      .single() || { data: null, error: null };
    
    if (error || !post) {
      return NextResponse.json(
        { error: 'Пост не найден' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(post);
  } catch (error: any) {
    console.error('Error fetching blog post:', error);
    return NextResponse.json(
      { error: error.message || 'Ошибка при получении поста' },
      { status: 500 }
    );
  }
}
