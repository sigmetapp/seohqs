import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { 
  getTelegramChannelUpdates, 
  filterChannelUpdates, 
  convertTelegramPostToBlogPost,
  getAllTelegramChannelPosts
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
 * GET /api/blog/sync - получение статуса синхронизации или полная синхронизация
 * Query параметры:
 * - full=true - выполнить полную синхронизацию всех постов из канала
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const fullSync = searchParams.get('full') === 'true';
    const channelUsername = process.env.TELEGRAM_CHANNEL_USERNAME || 'seohqs';
    
    // Если запрошена полная синхронизация
    if (fullSync) {
      console.log('Starting full sync for channel:', channelUsername);
      console.log('Attempting to fetch all posts with Puppeteer...');
      
      // Получаем все посты из канала через веб-страницу
      // Не ограничиваем количество постов
      const allPosts = await getAllTelegramChannelPosts(channelUsername);
      
      console.log(`Found ${allPosts.length} posts in channel`);
      if (allPosts.length > 0) {
        // Проверяем даты постов
        const postsWithDates = allPosts.filter(p => p.date > 0);
        const postsWithoutDates = allPosts.filter(p => p.date === 0);
        console.log(`Posts with dates: ${postsWithDates.length}, without dates: ${postsWithoutDates.length}`);
        
        if (postsWithDates.length > 0) {
          const sortedByDate = [...postsWithDates].sort((a, b) => a.date - b.date);
          console.log(`Date range: ${new Date(sortedByDate[0].date * 1000).toISOString()} to ${new Date(sortedByDate[sortedByDate.length - 1].date * 1000).toISOString()}`);
        }
        
        // Логируем примеры постов для отладки
        if (allPosts.length > 0) {
          console.log('Sample posts:', allPosts.slice(0, 3).map(p => ({
            message_id: p.message_id,
            date: p.date,
            dateISO: p.date > 0 ? new Date(p.date * 1000).toISOString() : 'NO DATE',
            hasText: !!(p.text || p.caption),
            imagesCount: p.images?.length || 0
          })));
        }
      }
      
      // Получаем существующие посты из БД
      const { data: existingPosts } = await supabase
        ?.from('blog_posts')
        .select('telegram_message_id')
        .eq('telegram_channel_username', channelUsername) || { data: [] };
      
      const existingMessageIds = new Set(
        (existingPosts || []).map(p => p.telegram_message_id)
      );
      
      // Конвертируем и сохраняем посты
      const syncedPosts = [];
      const updatedPosts = [];
      const skippedPosts = [];
      
      for (const post of allPosts) {
        try {
          // Конвертируем пост в формат для БД
          // Используем упрощенную конвертацию, так как у нас уже есть данные
          const text = post.text || post.caption || '';
          
          // Обрабатываем дату публикации
          let publishedAt: Date;
          if (post.date && post.date > 0) {
            // Дата в формате Unix timestamp (секунды)
            publishedAt = new Date(post.date * 1000);
          } else {
            // Если дата не найдена, пытаемся извлечь из message_id (примерная дата)
            // Telegram message_id обычно содержит временную информацию
            // Но лучше использовать текущую дату как fallback
            console.warn(`Post ${post.message_id} has no date, using current date`);
            publishedAt = new Date();
          }
          
          // Проверяем, что дата валидна
          if (isNaN(publishedAt.getTime())) {
            console.warn(`Invalid date for post ${post.message_id}, using current date`);
            publishedAt = new Date();
          }
          
          // Извлекаем заголовок
          const lines = text.split('\n').filter(line => line.trim());
          const title = lines.length > 0 ? lines[0].substring(0, 200) : null;
          
          // Генерируем slug
          const slugBase = title 
            ? title.toLowerCase()
                .replace(/[^a-zа-яё0-9]+/g, '-')
                .replace(/^-+|-+$/g, '')
                .substring(0, 100)
            : `post-${post.message_id}`;
          const slug = `${slugBase}-${post.message_id}`;
          
          // Конвертируем текст в HTML
          let htmlContent = text
            .replace(/\n/g, '<br>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>');
          
          const blogPost = {
            telegram_message_id: post.message_id,
            telegram_channel_username: channelUsername,
            title,
            content: text,
            html_content: htmlContent,
            images: post.images || [],
            published_at: publishedAt.toISOString(),
            slug
          };
          
          // Проверяем, существует ли уже пост
          if (existingMessageIds.has(post.message_id)) {
            // Обновляем существующий пост (особенно дату публикации)
            const { error } = await supabase
              ?.from('blog_posts')
              .update({
                ...blogPost,
                updated_at: new Date().toISOString()
              })
              .eq('telegram_message_id', post.message_id) || { error: null };
            
            if (error) {
              console.error(`Error updating post ${post.message_id}:`, error);
              skippedPosts.push(post.message_id);
            } else {
              updatedPosts.push(blogPost.slug);
            }
          } else {
            // Создаем новый пост
            const { error } = await supabase
              ?.from('blog_posts')
              .insert(blogPost) || { error: null };
            
            if (error) {
              console.error(`Error inserting post ${post.message_id}:`, error);
              skippedPosts.push(post.message_id);
            } else {
              syncedPosts.push(blogPost.slug);
            }
          }
        } catch (error) {
          console.error(`Error processing post ${post.message_id}:`, error);
          skippedPosts.push(post.message_id);
          continue;
        }
      }
      
      return NextResponse.json({
        message: `Полная синхронизация завершена`,
        channel: channelUsername,
        total_found: allPosts.length,
        synced: syncedPosts.length,
        updated: updatedPosts.length,
        skipped: skippedPosts.length,
        synced_posts: syncedPosts,
        updated_posts: updatedPosts
      });
    }
    
    // Обычный статус синхронизации
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
    console.error('Error in GET /api/blog/sync:', error);
    return NextResponse.json(
      { error: error.message || 'Ошибка при получении статуса' },
      { status: 500 }
    );
  }
}
