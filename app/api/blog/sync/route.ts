import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { 
  getTelegramChannelUpdates, 
  filterChannelUpdates, 
  convertTelegramPostToBlogPost 
} from '@/lib/telegram';

/**
 * API endpoint для синхронизации постов из Telegram канала
 * POST /api/blog/sync
 * 
 * Требует переменные окружения:
 * - TELEGRAM_BOT_TOKEN - токен бота с доступом к каналу
 * - TELEGRAM_CHANNEL_USERNAME - username канала (например, 'seohqs')
 */
export async function POST(request: NextRequest) {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const channelUsername = process.env.TELEGRAM_CHANNEL_USERNAME || 'seohqs';
    
    if (!botToken) {
      return NextResponse.json(
        { error: 'TELEGRAM_BOT_TOKEN не настроен в переменных окружения' },
        { status: 500 }
      );
    }
    
    // Получаем последний синхронизированный message_id из БД
    const { data: lastPost } = await supabase
      ?.from('blog_posts')
      .select('telegram_message_id')
      .eq('telegram_channel_username', channelUsername)
      .order('telegram_message_id', { ascending: false })
      .limit(1)
      .single() || { data: null };
    
    const lastMessageId = lastPost?.telegram_message_id || 0;
    
    // Получаем обновления из Telegram
    const updates = await getTelegramChannelUpdates(botToken, channelUsername);
    const channelPosts = filterChannelUpdates(updates, channelUsername);
    
    // Фильтруем только новые посты
    const newPosts = channelPosts.filter(post => post.message_id > lastMessageId);
    
    if (newPosts.length === 0) {
      return NextResponse.json({
        message: 'Новых постов не найдено',
        synced: 0
      });
    }
    
    // Конвертируем и сохраняем посты
    const syncedPosts = [];
    for (const post of newPosts) {
      try {
        const blogPost = await convertTelegramPostToBlogPost(
          post,
          channelUsername,
          botToken
        );
        
        // Проверяем, не существует ли уже пост с таким slug
        const { data: existing } = await supabase
          ?.from('blog_posts')
          .select('id')
          .eq('slug', blogPost.slug)
          .single() || { data: null };
        
        if (existing) {
          // Обновляем существующий пост
          const { error } = await supabase
            ?.from('blog_posts')
            .update({
              ...blogPost,
              updated_at: new Date().toISOString()
            })
            .eq('slug', blogPost.slug) || { error: null };
          
          if (error) {
            console.error('Error updating post:', error);
            continue;
          }
        } else {
          // Создаем новый пост
          const { error } = await supabase
            ?.from('blog_posts')
            .insert(blogPost) || { error: null };
          
          if (error) {
            console.error('Error inserting post:', error);
            continue;
          }
        }
        
        syncedPosts.push(blogPost.slug);
      } catch (error) {
        console.error(`Error processing post ${post.message_id}:`, error);
        continue;
      }
    }
    
    return NextResponse.json({
      message: `Синхронизировано ${syncedPosts.length} постов`,
      synced: syncedPosts.length,
      posts: syncedPosts
    });
    
  } catch (error: any) {
    console.error('Error syncing Telegram posts:', error);
    return NextResponse.json(
      { error: error.message || 'Ошибка при синхронизации постов' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/blog/sync - получение статуса синхронизации
 */
export async function GET() {
  try {
    const channelUsername = process.env.TELEGRAM_CHANNEL_USERNAME || 'seohqs';
    
    const { data: posts, error } = await supabase
      ?.from('blog_posts')
      .select('id, telegram_message_id, title, published_at, created_at')
      .eq('telegram_channel_username', channelUsername)
      .order('published_at', { ascending: false })
      .limit(10) || { data: null, error: null };
    
    if (error) {
      throw error;
    }
    
    return NextResponse.json({
      channel: channelUsername,
      total_posts: posts?.length || 0,
      latest_posts: posts || []
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Ошибка при получении статуса' },
      { status: 500 }
    );
  }
}
