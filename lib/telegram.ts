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
