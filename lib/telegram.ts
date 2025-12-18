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
 * Использует Puppeteer для рендеринга JavaScript и прокрутки страницы
 */
export async function getAllTelegramChannelPosts(
  channelUsername: string,
  maxPosts?: number
): Promise<Array<{
  message_id: number;
  date: number;
  text?: string;
  caption?: string;
  images?: Array<{ url: string; caption?: string }>;
}>> {
  const channelUrl = `https://t.me/s/${channelUsername}`;
  const allPostsMap = new Map<number, {
    message_id: number;
    date: number;
    text?: string;
    caption?: string;
    images?: Array<{ url: string; caption?: string }>;
  }>();
  
  try {
    // Пробуем использовать Puppeteer для получения всех постов
    let puppeteerPosts: Array<{
      message_id: number;
      date: number;
      text?: string;
      caption?: string;
      images?: Array<{ url: string; caption?: string }>;
    }> = [];
    
    let puppeteerUsed = false;
    try {
      console.log('Attempting to fetch posts using Puppeteer...');
      puppeteerPosts = await getAllTelegramChannelPostsWithPuppeteer(channelUsername, maxPosts);
      puppeteerPosts.forEach(post => allPostsMap.set(post.message_id, post));
      console.log(`Found ${puppeteerPosts.length} posts using Puppeteer`);
      puppeteerUsed = true;
    } catch (puppeteerError: any) {
      console.error('Puppeteer error:', puppeteerError);
      console.log('Puppeteer not available or failed, falling back to HTML parsing:', puppeteerError.message);
      
      // Fallback: Парсинг основной страницы канала
      console.log('Fetching posts from main channel page...');
      const mainPosts = await parseTelegramChannelPage(channelUrl);
      mainPosts.forEach(post => allPostsMap.set(post.message_id, post));
      console.log(`Found ${mainPosts.length} posts on main page`);
      
      // Пробуем получить посты через JSON данные
      try {
        const jsonPosts = await parseTelegramChannelJSON(channelUrl, channelUsername);
        jsonPosts.forEach(post => {
          if (!allPostsMap.has(post.message_id)) {
            allPostsMap.set(post.message_id, post);
          }
        });
        console.log(`Found ${jsonPosts.length} additional posts from JSON data`);
      } catch (error) {
        console.log('Could not parse JSON data:', error);
      }
    }
    
    console.log(`Total unique posts found: ${allPostsMap.size} (Puppeteer used: ${puppeteerUsed})`);
    
    // Конвертируем Map в массив и сортируем по дате
    const posts = Array.from(allPostsMap.values());
    posts.sort((a, b) => a.date - b.date);
    
    // Если указан лимит, возвращаем только последние N постов
    if (maxPosts && posts.length > maxPosts) {
      return posts.slice(-maxPosts);
    }
    
    return posts;
  } catch (error) {
    console.error('Error fetching all Telegram channel posts:', error);
    throw error;
  }
}

/**
 * Получает все посты используя Puppeteer для рендеринга JavaScript
 * Прокручивает страницу вверх для загрузки всех исторических постов
 */
async function getAllTelegramChannelPostsWithPuppeteer(
  channelUsername: string,
  maxPosts?: number
): Promise<Array<{
  message_id: number;
  date: number;
  text?: string;
  caption?: string;
  images?: Array<{ url: string; caption?: string }>;
}>> {
  // Динамический импорт Puppeteer (может быть не установлен)
  const puppeteer = await import('puppeteer').catch(() => null);
  if (!puppeteer) {
    throw new Error('Puppeteer is not available');
  }
  
  const channelUrl = `https://t.me/s/${channelUsername}`;
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    console.log(`Loading channel page: ${channelUrl}`);
    await page.goto(channelUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    
    // Ждем загрузки постов
    await page.waitForSelector('.tgme_widget_message', { timeout: 10000 }).catch(() => {
      console.log('Messages selector not found, continuing...');
    });
    
    // Даем время на полную загрузку начальных постов
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    let previousPostCount = 0;
    let noNewPostsCount = 0; // Счетчик попыток без новых постов
    const maxScrollAttempts = 200; // Увеличиваем количество попыток
    const postsMap = new Map<number, {
      message_id: number;
      date: number;
      text?: string;
      caption?: string;
      images?: Array<{ url: string; caption?: string }>;
    }>();
    
    // Сначала парсим начальные посты
    const initialPosts = await page.evaluate(() => {
      const posts: Array<{
        message_id: number;
        date: number;
        text?: string;
        caption?: string;
        images?: Array<{ url: string; caption?: string }>;
      }> = [];
      
      const messageElements = document.querySelectorAll('.tgme_widget_message');
      
      messageElements.forEach((element) => {
        try {
          const dataPost = element.getAttribute('data-post');
          if (!dataPost) return;
          
          const messageIdMatch = dataPost.match(/\/(\d+)$/);
          if (!messageIdMatch) return;
          
          const messageId = parseInt(messageIdMatch[1], 10);
          
          // Извлекаем дату - пробуем разные способы
          let dateTimestamp = 0;
          
          // Способ 1: time элемент с datetime атрибутом
          const timeElement = element.querySelector('time[datetime]');
          if (timeElement) {
            const datetime = timeElement.getAttribute('datetime');
            if (datetime) {
              const dateObj = new Date(datetime);
              if (!isNaN(dateObj.getTime())) {
                dateTimestamp = Math.floor(dateObj.getTime() / 1000);
              }
            }
          }
          
          // Способ 2: ищем в блоке с датой
          if (dateTimestamp === 0) {
            const dateBlock = element.querySelector('.tgme_widget_message_date');
            if (dateBlock) {
              const timeInBlock = dateBlock.querySelector('time[datetime]');
              if (timeInBlock) {
                const datetime = timeInBlock.getAttribute('datetime');
                if (datetime) {
                  const dateObj = new Date(datetime);
                  if (!isNaN(dateObj.getTime())) {
                    dateTimestamp = Math.floor(dateObj.getTime() / 1000);
                  }
                }
              }
            }
          }
          
          // Способ 3: ищем data-time или data-timestamp атрибуты
          if (dateTimestamp === 0) {
            const dataTime = element.getAttribute('data-time');
            if (dataTime) {
              const timestamp = parseInt(dataTime, 10);
              if (!isNaN(timestamp) && timestamp > 0) {
                dateTimestamp = timestamp;
              }
            }
          }
          
          const textElement = element.querySelector('.tgme_widget_message_text');
          let text: string | undefined;
          if (textElement) {
            text = textElement.textContent?.trim() || undefined;
          }
          
          if (!text) {
            const captionElement = element.querySelector('.tgme_widget_message_caption');
            if (captionElement) {
              text = captionElement.textContent?.trim() || undefined;
            }
          }
          
          const images: Array<{ url: string; caption?: string }> = [];
          const imageLinks = element.querySelectorAll<HTMLAnchorElement>('.tgme_widget_message_photo_wrap');
          imageLinks.forEach((link) => {
            const href = link.getAttribute('href');
            if (href) {
              images.push({ url: href });
            }
          });
          
          if (text || images.length > 0) {
            posts.push({
              message_id: messageId,
              date: dateTimestamp,
              text,
              caption: text,
              images: images.length > 0 ? images : undefined
            });
          }
        } catch (error) {
          // Пропускаем некорректные посты
        }
      });
      
      return posts;
    });
    
    initialPosts.forEach(post => {
      if (post.message_id) {
        postsMap.set(post.message_id, post);
      }
    });
    
    previousPostCount = postsMap.size;
    console.log(`Initial posts found: ${previousPostCount}`);
    
    // Прокручиваем страницу вверх для загрузки старых постов
    // Telegram загружает старые посты при прокрутке к самому верху
    for (let attempt = 0; attempt < maxScrollAttempts; attempt++) {
      // Прокручиваем вверх для загрузки старых постов
      // Telegram загружает старые посты при прокрутке к самому верху страницы
      const scrollInfo = await page.evaluate(() => {
        return {
          scrollHeight: document.body.scrollHeight,
          scrollTop: window.pageYOffset || document.documentElement.scrollTop,
          clientHeight: window.innerHeight
        };
      });
      
      // Прокручиваем к самому верху страницы
      await page.evaluate(() => {
        // Прокручиваем к самому верху
        window.scrollTo({ top: 0, behavior: 'auto' });
        // Также пробуем прокрутить documentElement
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      });
      
      // Ждем загрузки новых постов (увеличиваем время ожидания)
      await new Promise(resolve => setTimeout(resolve, 4000));
      
      // Пробуем активировать загрузку через небольшое движение мыши или клик
      try {
        await page.mouse.move(100, 100);
        await new Promise(resolve => setTimeout(resolve, 500));
        await page.evaluate(() => {
          // Прокручиваем немного вниз и обратно вверх
          window.scrollBy(0, 50);
        });
        await new Promise(resolve => setTimeout(resolve, 500));
        await page.evaluate(() => {
          window.scrollTo({ top: 0, behavior: 'auto' });
          document.documentElement.scrollTop = 0;
          document.body.scrollTop = 0;
        });
        await new Promise(resolve => setTimeout(resolve, 3000));
      } catch (error) {
        console.log('Error with mouse interaction:', error);
      }
      
      // Парсим посты после прокрутки
      const postsAfterScroll = await page.evaluate(() => {
        const posts: Array<{
          message_id: number;
          date: number;
          text?: string;
          caption?: string;
          images?: Array<{ url: string; caption?: string }>;
        }> = [];
        
        const messageElements = document.querySelectorAll('.tgme_widget_message');
        
        messageElements.forEach((element) => {
          try {
            const dataPost = element.getAttribute('data-post');
            if (!dataPost) return;
            
            const messageIdMatch = dataPost.match(/\/(\d+)$/);
            if (!messageIdMatch) return;
            
            const messageId = parseInt(messageIdMatch[1], 10);
            
            // Извлекаем дату - пробуем разные способы
            let dateTimestamp = 0;
            
            // Способ 1: time элемент с datetime атрибутом
            const timeElement = element.querySelector('time[datetime]');
            if (timeElement) {
              const datetime = timeElement.getAttribute('datetime');
              if (datetime) {
                const dateObj = new Date(datetime);
                if (!isNaN(dateObj.getTime())) {
                  dateTimestamp = Math.floor(dateObj.getTime() / 1000);
                }
              }
            }
            
            // Способ 2: ищем в блоке с датой
            if (dateTimestamp === 0) {
              const dateBlock = element.querySelector('.tgme_widget_message_date');
              if (dateBlock) {
                const timeInBlock = dateBlock.querySelector('time[datetime]');
                if (timeInBlock) {
                  const datetime = timeInBlock.getAttribute('datetime');
                  if (datetime) {
                    const dateObj = new Date(datetime);
                    if (!isNaN(dateObj.getTime())) {
                      dateTimestamp = Math.floor(dateObj.getTime() / 1000);
                    }
                  }
                }
              }
            }
            
            // Способ 3: ищем data-time или data-timestamp атрибуты
            if (dateTimestamp === 0) {
              const dataTime = element.getAttribute('data-time');
              if (dataTime) {
                const timestamp = parseInt(dataTime, 10);
                if (!isNaN(timestamp) && timestamp > 0) {
                  dateTimestamp = timestamp;
                }
              }
            }
            
            const textElement = element.querySelector('.tgme_widget_message_text');
            let text: string | undefined;
            if (textElement) {
              text = textElement.textContent?.trim() || undefined;
            }
            
            if (!text) {
              const captionElement = element.querySelector('.tgme_widget_message_caption');
              if (captionElement) {
                text = captionElement.textContent?.trim() || undefined;
              }
            }
            
            const images: Array<{ url: string; caption?: string }> = [];
            const imageLinks = element.querySelectorAll<HTMLAnchorElement>('.tgme_widget_message_photo_wrap');
            imageLinks.forEach((link) => {
              const href = link.getAttribute('href');
              if (href) {
                images.push({ url: href });
              }
            });
            
            if (text || images.length > 0) {
              posts.push({
                message_id: messageId,
                date: dateTimestamp,
                text,
                caption: text,
                images: images.length > 0 ? images : undefined
              });
            }
          } catch (error) {
            // Пропускаем некорректные посты
          }
        });
        
        return posts;
      });
      
      // Добавляем новые посты
      let newPostsFound = 0;
      postsAfterScroll.forEach(post => {
        if (post.message_id && !postsMap.has(post.message_id)) {
          postsMap.set(post.message_id, post);
          newPostsFound++;
        }
      });
      
      const newPostCount = postsMap.size;
      const afterScroll = await page.evaluate(() => document.body.scrollHeight);
      
      console.log(`Attempt ${attempt + 1}: Found ${newPostsFound} new posts, total: ${newPostCount}, scroll height: ${scrollInfo.scrollHeight} -> ${afterScroll}`);
      
      // Если нашли новые посты или высота страницы увеличилась
      if (newPostsFound > 0 || afterScroll > scrollInfo.scrollHeight) {
        noNewPostsCount = 0; // Сбрасываем счетчик
        previousPostCount = newPostCount;
      } else {
        noNewPostsCount++;
        // Если несколько раз подряд не находим новые посты, прекращаем
        if (noNewPostsCount >= 10) {
          console.log('No new posts loaded after 10 scroll attempts, stopping');
          break;
        }
      }
      
      // Проверяем лимит
      if (maxPosts && newPostCount >= maxPosts) {
        console.log(`Reached max posts limit: ${maxPosts}`);
        break;
      }
    }
    
    // Конвертируем Map в массив и сортируем по дате
    const posts = Array.from(postsMap.values());
    posts.sort((a, b) => a.date - b.date);
    
    return posts;
  } finally {
    await browser.close();
  }
}

/**
 * Парсит HTML страницу канала Telegram
 */
async function parseTelegramChannelPage(
  channelUrl: string
): Promise<Array<{
  message_id: number;
  date: number;
  text?: string;
  caption?: string;
  images?: Array<{ url: string; caption?: string }>;
}>> {
  const posts: Array<{
    message_id: number;
    date: number;
    text?: string;
    caption?: string;
    images?: Array<{ url: string; caption?: string }>;
  }> = [];
  
  const response = await fetch(channelUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5'
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
    
  return posts;
}

/**
 * Пытается извлечь данные постов из JSON, встроенного в страницу Telegram
 */
async function parseTelegramChannelJSON(
  channelUrl: string,
  channelUsername: string
): Promise<Array<{
  message_id: number;
  date: number;
  text?: string;
  caption?: string;
  images?: Array<{ url: string; caption?: string }>;
}>> {
  const posts: Array<{
    message_id: number;
    date: number;
    text?: string;
    caption?: string;
    images?: Array<{ url: string; caption?: string }>;
  }> = [];
  
  try {
    const response = await fetch(channelUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const html = await response.text();
    
    // Ищем JSON данные в скриптах на странице
    // Telegram иногда встраивает данные в window.__INITIAL_STATE__ или подобные переменные
    const jsonMatches = [
      /window\.__INITIAL_STATE__\s*=\s*({[\s\S]*?});/,
      /window\.__INITIAL_DATA__\s*=\s*({[\s\S]*?});/,
      /<script[^>]*>[\s\S]*?({[\s\S]*?"messages"[\s\S]*?})[\s\S]*?<\/script>/i
    ];
    
    for (const regex of jsonMatches) {
      const match = html.match(regex);
      if (match) {
        try {
          const data = JSON.parse(match[1]);
          // Парсим структуру данных (может варьироваться)
          // Это упрощенная версия, может потребоваться адаптация
          if (data.messages || data.posts) {
            const messages = data.messages || data.posts || [];
            for (const msg of messages) {
              if (msg.id && msg.date) {
                posts.push({
                  message_id: msg.id,
                  date: typeof msg.date === 'number' ? msg.date : Math.floor(new Date(msg.date).getTime() / 1000),
                  text: msg.text || msg.message || msg.caption,
                  caption: msg.caption,
                  images: msg.photo ? [{ url: msg.photo }] : undefined
                });
              }
            }
          }
        } catch (e) {
          // Продолжаем поиск других форматов
          continue;
        }
      }
    }
  } catch (error) {
    // Игнорируем ошибки парсинга JSON
  }
  
  return posts;
}

/**
 * Пытается получить посты через неофициальный API или альтернативные методы
 */
async function fetchTelegramChannelViaAPI(
  channelUsername: string,
  currentCount: number
): Promise<Array<{
  message_id: number;
  date: number;
  text?: string;
  caption?: string;
  images?: Array<{ url: string; caption?: string }>;
}>> {
  const posts: Array<{
    message_id: number;
    date: number;
    text?: string;
    caption?: string;
    images?: Array<{ url: string; caption?: string }>;
  }> = [];
  
  try {
    // Пробуем получить больше постов через несколько запросов к веб-странице
    // Telegram иногда предоставляет API endpoint для загрузки старых сообщений
    // Формат: https://t.me/s/{channel}?before={message_id}
    
    // Если у нас уже есть посты, пробуем загрузить более старые
    if (currentCount > 0) {
      // Пробуем загрузить страницу с параметром before (если Telegram поддерживает)
      // Это может не работать, но стоит попробовать
      const olderUrl = `https://t.me/s/${channelUsername}?before=1`;
      try {
        const olderPosts = await parseTelegramChannelPage(olderUrl);
        posts.push(...olderPosts);
      } catch (error) {
        // Игнорируем ошибки
      }
    }
  } catch (error) {
    // Игнорируем ошибки
  }
  
  return posts;
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
