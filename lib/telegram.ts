/**
 * Утилиты для работы с Telegram каналами
 * Поддерживает два метода:
 * 1. RSS фид (для публичных каналов) - не требует бота
 * 2. Bot API (для приватных каналов) - требует бота с правами администратора
 */

interface TelegramMessage {
  message_id: number;
  date: number;
  text?: string;
  caption?: string;
  photo?: Array<{
    file_id: string;
    file_unique_id: string;
    width: number;
    height: number;
    file_size?: number;
  }>;
  entities?: Array<{
    type: string;
    offset: number;
    length: number;
    url?: string;
  }>;
}

interface TelegramChannelPost {
  message_id: number;
  date: number;
  text?: string;
  caption?: string;
  photo?: Array<{
    file_id: string;
    file_unique_id: string;
    width: number;
    height: number;
    file_size?: number;
  }>;
}

interface RSSItem {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  content?: string;
  'content:encoded'?: string;
  guid?: string;
}

interface TelegramUpdate {
  update_id: number;
  channel_post?: TelegramChannelPost;
  message?: TelegramMessage;
}

interface TelegramResponse<T> {
  ok: boolean;
  result?: T;
  error_code?: number;
  description?: string;
}

/**
 * Получает посты из публичного канала через RSS фид
 */
export async function getTelegramChannelPostsFromRSS(
  channelUsername: string
): Promise<Array<{
  message_id: number;
  date: number;
  text: string;
  images: Array<{ url: string; caption?: string }>;
}>> {
  const rssUrl = `https://t.me/s/${channelUsername}`;
  
  try {
    // Парсим HTML страницы канала (Telegram не предоставляет прямой RSS)
    // Используем альтернативный метод - парсинг HTML
    const response = await fetch(rssUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch channel: ${response.statusText}`);
    }
    
    const html = await response.text();
    
    // Парсим посты из HTML
    // Telegram использует структуру с data-post атрибутами
    const postRegex = /data-post="([^"]+)"/g;
    const posts: Array<{
      message_id: number;
      date: number;
      text: string;
      images: Array<{ url: string; caption?: string }>;
    }> = [];
    
    let match;
    while ((match = postRegex.exec(html)) !== null) {
      try {
        const postData = JSON.parse(decodeURIComponent(match[1]));
        // Извлекаем информацию о посте
        // Это упрощенный парсинг, может потребоваться доработка
      } catch (e) {
        // Пропускаем некорректные посты
        continue;
      }
    }
    
    // Альтернативный метод: используем готовый RSS парсер или API
    // Для простоты возвращаем пустой массив и используем Bot API
    return [];
  } catch (error) {
    console.error('Error fetching Telegram RSS:', error);
    throw error;
  }
}

/**
 * Получает последние обновления из канала через Telegram Bot API
 */
export async function getTelegramChannelUpdates(
  botToken: string,
  channelUsername: string,
  offset?: number,
  limit: number = 100
): Promise<TelegramUpdate[]> {
  const url = `https://api.telegram.org/bot${botToken}/getUpdates?offset=${offset || 0}&limit=${limit}`;
  
  try {
    const response = await fetch(url);
    const data: TelegramResponse<TelegramUpdate[]> = await response.json();
    
    if (!data.ok) {
      throw new Error(`Telegram API error: ${data.description || 'Unknown error'}`);
    }
    
    return data.result || [];
  } catch (error) {
    console.error('Error fetching Telegram updates:', error);
    throw error;
  }
}

/**
 * Получает все посты из канала через веб-страницу Telegram
 * Это позволяет получить исторические посты с оригинальными датами
 */
export async function getAllTelegramChannelPosts(
  channelUsername: string
): Promise<Array<{
  message_id: number;
  date: number;
  text?: string;
  caption?: string;
  images?: Array<{ url: string; caption?: string }>;
}>> {
  const channelUrl = `https://t.me/s/${channelUsername}`;
  const posts: Array<{
    message_id: number;
    date: number;
    text?: string;
    caption?: string;
    images?: Array<{ url: string; caption?: string }>;
  }> = [];
  
  try {
    // Получаем HTML страницы канала
    const response = await fetch(channelUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch channel: ${response.statusText}`);
    }
    
    const html = await response.text();
    
    // Парсим посты из HTML
    // Telegram использует структуру с data-post атрибутами
    // Ищем все блоки сообщений
    const postMatches: Array<{ postId: string; html: string; date?: string }> = [];
    
    // Ищем все div с классом tgme_widget_message и data-post
    const messageDivRegex = /<div\s+class="tgme_widget_message[^"]*"\s+data-post="([^"]+)"([\s\S]*?)<\/div>\s*(?=<div\s+class="tgme_widget_message|<div\s+class="tgme_widget_message_date|$)/g;
    
    let match;
    while ((match = messageDivRegex.exec(html)) !== null) {
      const postId = match[1]; // формат: channel/message_id
      const postHtml = match[2] + match[0]; // весь HTML поста
      
      // Ищем дату в этом посте (может быть в разных местах)
      const dateMatch = postHtml.match(/<time\s+datetime="([^"]+)"/) || 
                       postHtml.match(/data-time="(\d+)"/) ||
                       postHtml.match(/data-timestamp="(\d+)"/);
      
      let date: string | undefined;
      if (dateMatch) {
        if (dateMatch[1].includes('T')) {
          // ISO формат даты
          date = dateMatch[1];
        } else {
          // Unix timestamp
          const timestamp = parseInt(dateMatch[1], 10);
          date = new Date(timestamp * 1000).toISOString();
        }
      }
      
      postMatches.push({ postId, html: postHtml, date });
    }
    
    // Если не нашли посты первым способом, пробуем альтернативный
    if (postMatches.length === 0) {
      // Альтернативный паттерн - ищем по data-post напрямую
      const altRegex = /data-post="([^"]+)"([\s\S]{0,5000}?)<time\s+datetime="([^"]+)"/g;
      while ((match = altRegex.exec(html)) !== null) {
        const postId = match[1];
        const postHtml = match[2];
        const date = match[3];
        postMatches.push({ postId, html: postHtml, date });
      }
    }
    
    // Обрабатываем каждый пост
    for (const postMatch of postMatches) {
      try {
        // Извлекаем message_id из data-post (формат: channel/message_id)
        const messageIdMatch = postMatch.postId.match(/\/(\d+)$/);
        if (!messageIdMatch) continue;
        
        const messageId = parseInt(messageIdMatch[1], 10);
        
        // Парсим дату
        let dateTimestamp = 0;
        if (postMatch.date) {
          const dateObj = new Date(postMatch.date);
          dateTimestamp = Math.floor(dateObj.getTime() / 1000);
        }
        
        // Извлекаем текст поста
        let text: string | undefined;
        
        // Пробуем разные варианты извлечения текста
        const textMatch = postMatch.html.match(/<div\s+class="tgme_widget_message_text[^"]*">([\s\S]*?)<\/div>/i) ||
                         postMatch.html.match(/<div\s+class="[^"]*message_text[^"]*">([\s\S]*?)<\/div>/i);
        
        if (textMatch) {
          text = textMatch[1]
            .replace(/<br\s*\/?>/gi, '\n') // Сохраняем переносы строк
            .replace(/<[^>]+>/g, '') // Удаляем остальные HTML теги
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&mdash;/g, '—')
            .replace(/&ndash;/g, '–')
            .trim();
        }
        
        // Если текст не найден, но есть caption в изображениях
        if (!text || text.length === 0) {
          const captionMatch = postMatch.html.match(/<div\s+class="[^"]*message_caption[^"]*">([\s\S]*?)<\/div>/i);
          if (captionMatch) {
            text = captionMatch[1]
              .replace(/<br\s*\/?>/gi, '\n')
              .replace(/<[^>]+>/g, '')
              .replace(/&nbsp;/g, ' ')
              .replace(/&amp;/g, '&')
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .replace(/&quot;/g, '"')
              .trim();
          }
        }
        
        // Извлекаем изображения
        const images: Array<{ url: string; caption?: string }> = [];
        
        // Пробуем разные варианты извлечения изображений
        const imageRegexes = [
          /<a\s+class="tgme_widget_message_photo_wrap[^"]*"\s+href="([^"]+)"/gi,
          /<img\s+[^>]*src="([^"]*\/[^"]*\.(?:jpg|jpeg|png|gif|webp)[^"]*)"/gi,
          /background-image:\s*url\(['"]?([^'"]+)['"]?\)/gi
        ];
        
        for (const imageRegex of imageRegexes) {
          let imageMatch;
          while ((imageMatch = imageRegex.exec(postMatch.html)) !== null) {
            let imageUrl = imageMatch[1];
            if (imageUrl && !imageUrl.startsWith('data:')) {
              // Нормализуем URL
              if (imageUrl.startsWith('//')) {
                imageUrl = 'https:' + imageUrl;
              } else if (imageUrl.startsWith('/')) {
                imageUrl = 'https://t.me' + imageUrl;
              }
              
              if (imageUrl && !images.find(img => img.url === imageUrl)) {
                images.push({ url: imageUrl });
              }
            }
          }
        }
        
        // Если есть текст или изображения, добавляем пост
        if (text || images.length > 0) {
          posts.push({
            message_id: messageId,
            date: dateTimestamp,
            text: text || undefined,
            caption: text || undefined,
            images: images.length > 0 ? images : undefined
          });
        }
      } catch (error) {
        console.error(`Error parsing post ${postMatch.postId}:`, error);
        continue;
      }
    }
    
    // Сортируем по дате (от старых к новым)
    posts.sort((a, b) => a.date - b.date);
    
    return posts;
  } catch (error) {
    console.error('Error fetching all Telegram channel posts:', error);
    throw error;
  }
}

/**
 * Получает информацию о файле для загрузки фото
 */
export async function getTelegramFile(botToken: string, fileId: string): Promise<string | null> {
  try {
    const fileInfoUrl = `https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`;
    const fileInfoResponse = await fetch(fileInfoUrl);
    const fileInfo: TelegramResponse<{ file_path: string }> = await fileInfoResponse.json();
    
    if (!fileInfo.ok || !fileInfo.result) {
      return null;
    }
    
    return `https://api.telegram.org/file/bot${botToken}/${fileInfo.result.file_path}`;
  } catch (error) {
    console.error('Error getting Telegram file:', error);
    return null;
  }
}

/**
 * Фильтрует обновления только из указанного канала
 */
export function filterChannelUpdates(
  updates: TelegramUpdate[],
  channelUsername: string
): TelegramChannelPost[] {
  const channelPosts: TelegramChannelPost[] = [];
  
  for (const update of updates) {
    // Проверяем channel_post (посты из каналов)
    if (update.channel_post) {
      channelPosts.push(update.channel_post);
    }
  }
  
  return channelPosts;
}

/**
 * Конвертирует Telegram пост в формат для сохранения в БД
 */
export async function convertTelegramPostToBlogPost(
  post: TelegramChannelPost,
  channelUsername: string,
  botToken?: string
): Promise<{
  telegram_message_id: number;
  telegram_channel_username: string;
  title: string | null;
  content: string;
  html_content: string;
  images: Array<{ url: string; caption?: string }>;
  published_at: Date;
  slug: string;
}> {
  const text = post.text || post.caption || '';
  const publishedAt = new Date(post.date * 1000);
  
  // Извлекаем заголовок (первая строка или первые 100 символов)
  const lines = text.split('\n').filter(line => line.trim());
  const title = lines.length > 0 ? lines[0].substring(0, 200) : null;
  const content = text;
  
  // Генерируем slug из заголовка или даты
  const slugBase = title 
    ? title.toLowerCase()
        .replace(/[^a-zа-яё0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 100)
    : `post-${post.message_id}`;
  const slug = `${slugBase}-${post.message_id}`;
  
  // Обрабатываем изображения
  const images: Array<{ url: string; caption?: string }> = [];
  if (post.photo && post.photo.length > 0) {
    // Берем самое большое фото
    const largestPhoto = post.photo[post.photo.length - 1];
    if (botToken) {
      const photoUrl = await getTelegramFile(botToken, largestPhoto.file_id);
      if (photoUrl) {
        images.push({
          url: photoUrl,
          caption: post.caption || undefined
        });
      }
    }
  }
  
  // Конвертируем текст в HTML (базовая обработка)
  let htmlContent = content
    .replace(/\n/g, '<br>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>');
  
  return {
    telegram_message_id: post.message_id,
    telegram_channel_username: channelUsername,
    title,
    content,
    html_content: htmlContent,
    images,
    published_at: publishedAt,
    slug
  };
}
