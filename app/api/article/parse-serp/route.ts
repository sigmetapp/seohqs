import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import { getCurrentUser } from '@/lib/auth-utils';
import type { SerpResult } from '@/lib/googleSerp';
import { computeExecutablePath } from '@puppeteer/browsers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface ParseSerpResponse {
  success: boolean;
  results?: SerpResult[];
  captchaHtml?: string;
  error?: string;
}

export async function POST(request: Request) {
  let browser: any = null;
  
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Пользователь не авторизован' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { query, language } = body;

    if (!query) {
      return NextResponse.json(
        { success: false, error: 'Query обязателен' },
        { status: 400 }
      );
    }

    console.log(`[PARSE_SERP] Starting parsing for query: "${query}"`);

    // Запускаем браузер
    // Получаем путь к установленному Chrome из Puppeteer cache
    let executablePath: string | undefined;
    try {
      executablePath = computeExecutablePath({
        browser: 'chrome',
        cacheDir: process.env.PUPPETEER_CACHE_DIR || undefined,
      });
      console.log(`[PARSE_SERP] Using Chrome executable: ${executablePath}`);
    } catch (error) {
      console.warn('[PARSE_SERP] Could not compute executable path, Puppeteer will try to find Chrome automatically:', error);
      // Puppeteer will try to find Chrome automatically if executablePath is undefined
    }

    browser = await puppeteer.launch({
      headless: true,
      ...(executablePath && { executablePath }),
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
      ],
    });

    const page = await browser.newPage();
    
    // Устанавливаем user agent
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // Переходим на страницу content-generator
    const url = 'https://www.seohqs.com/content-generator';
    console.log(`[PARSE_SERP] Navigating to ${url}`);
    
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    // Ждём загрузки страницы
    await page.waitForTimeout(2000);

    // Проверяем наличие CAPTCHA
    const captchaSelectors = [
      'iframe[src*="recaptcha"]',
      'div[class*="captcha"]',
      'div[class*="g-recaptcha"]',
      'div[id*="captcha"]',
      'div[id*="recaptcha"]',
    ];

    let captchaFound = false;
    let captchaHtml = '';

    for (const selector of captchaSelectors) {
      const captchaElement = await page.$(selector);
      if (captchaElement) {
        captchaFound = true;
        console.log(`[PARSE_SERP] CAPTCHA detected with selector: ${selector}`);
        
        // Получаем HTML CAPTCHA элемента и его родителя
        captchaHtml = await page.evaluate((sel) => {
          const element = document.querySelector(sel);
          if (element) {
            // Возвращаем родительский контейнер для лучшего отображения
            const parent = element.closest('div') || element.parentElement;
            return parent ? parent.outerHTML : element.outerHTML;
          }
          return '';
        }, selector);
        
        if (captchaHtml) {
          break;
        }
      }
    }

    // Если найдена CAPTCHA, возвращаем её HTML
    if (captchaFound && captchaHtml) {
      console.log(`[PARSE_SERP] CAPTCHA found, returning CAPTCHA HTML`);
      await browser.close();
      return NextResponse.json({
        success: false,
        captchaHtml,
        error: 'CAPTCHA detected',
      } as ParseSerpResponse);
    }

    // Ищем поле ввода для запроса
    const inputSelectors = [
      'input[type="text"]',
      'input[name*="query"]',
      'input[name*="search"]',
      'input[placeholder*="query"]',
      'input[placeholder*="search"]',
      'textarea',
    ];

    let inputFound = false;
    let inputElement = null;

    for (const selector of inputSelectors) {
      inputElement = await page.$(selector);
      if (inputElement) {
        inputFound = true;
        console.log(`[PARSE_SERP] Found input with selector: ${selector}`);
        break;
      }
    }

    if (!inputFound || !inputElement) {
      // Проверяем ещё раз на CAPTCHA, возможно она появилась после загрузки
      await page.waitForTimeout(2000);
      
      for (const selector of captchaSelectors) {
        const captchaElement = await page.$(selector);
        if (captchaElement) {
          captchaHtml = await page.evaluate((sel) => {
            const element = document.querySelector(sel);
            if (element) {
              const parent = element.closest('div') || element.parentElement;
              return parent ? parent.outerHTML : element.outerHTML;
            }
            return '';
          }, selector);
          
          if (captchaHtml) {
            await browser.close();
            return NextResponse.json({
              success: false,
              captchaHtml,
              error: 'CAPTCHA detected after page load',
            } as ParseSerpResponse);
          }
        }
      }

      await browser.close();
      return NextResponse.json({
        success: false,
        error: 'Не удалось найти поле ввода на странице',
      } as ParseSerpResponse);
    }

    // Вводим запрос
    await inputElement.type(query, { delay: 100 });
    await page.waitForTimeout(500);

    // Ищем кнопку отправки
    const buttonSelectors = [
      'button[type="submit"]',
      'button:contains("Generate")',
      'button:contains("Search")',
      'input[type="submit"]',
      'button',
    ];

    let buttonFound = false;
    let submitButton = null;

    for (const selector of buttonSelectors) {
      try {
        submitButton = await page.$(selector);
        if (submitButton) {
          const buttonText = await page.evaluate((el) => el.textContent, submitButton);
          if (
            buttonText &&
            (buttonText.toLowerCase().includes('generate') ||
              buttonText.toLowerCase().includes('search') ||
              buttonText.toLowerCase().includes('submit'))
          ) {
            buttonFound = true;
            console.log(`[PARSE_SERP] Found submit button with selector: ${selector}`);
            break;
          }
        }
      } catch (e) {
        // Продолжаем поиск
      }
    }

    if (!buttonFound || !submitButton) {
      // Пробуем нажать Enter
      await inputElement.press('Enter');
      await page.waitForTimeout(3000);
    } else {
      await submitButton.click();
      await page.waitForTimeout(3000);
    }

    // Проверяем на CAPTCHA после отправки
    for (const selector of captchaSelectors) {
      const captchaElement = await page.$(selector);
      if (captchaElement) {
        captchaHtml = await page.evaluate((sel) => {
          const element = document.querySelector(sel);
          if (element) {
            const parent = element.closest('div') || element.parentElement;
            return parent ? parent.outerHTML : element.outerHTML;
          }
          return '';
        }, selector);
        
        if (captchaHtml) {
          await browser.close();
          return NextResponse.json({
            success: false,
            captchaHtml,
            error: 'CAPTCHA detected after submission',
          } as ParseSerpResponse);
        }
      }
    }

    // Ждём появления результатов
    await page.waitForTimeout(5000);

    // Парсим результаты
    // Ищем различные селекторы для результатов поиска
    const resultSelectors = [
      'div[class*="result"]',
      'div[class*="serp"]',
      'div[class*="search-result"]',
      'a[href*="http"]',
      'li[class*="result"]',
    ];

    const results: SerpResult[] = [];

    // Пробуем найти результаты через различные селекторы
    for (const selector of resultSelectors) {
      const elements = await page.$$(selector);
      
      for (const element of elements.slice(0, 20)) {
        try {
          const resultData = await page.evaluate((el) => {
            const link = el.querySelector('a[href]') || el;
            const href = link.getAttribute('href') || (link as any).href;
            const title = el.querySelector('h1, h2, h3, .title, [class*="title"]')?.textContent?.trim() ||
                         link.textContent?.trim() ||
                         '';
            const snippet = el.querySelector('p, .snippet, [class*="snippet"], [class*="description"]')?.textContent?.trim() ||
                           el.textContent?.trim() ||
                           '';

            if (href && href.startsWith('http')) {
              return { url: href, title, snippet };
            }
            return null;
          }, element);

          if (resultData && resultData.url && !results.find(r => r.url === resultData.url)) {
            results.push(resultData);
            if (results.length >= 10) break;
          }
        } catch (e) {
          // Продолжаем
        }
      }

      if (results.length >= 10) break;
    }

    // Альтернативный метод: ищем все ссылки на странице
    if (results.length < 10) {
      const links = await page.$$eval('a[href^="http"]', (anchors) => {
        return anchors
          .map((a) => {
            const href = a.getAttribute('href') || '';
            const title = a.textContent?.trim() || '';
            const parent = a.closest('div, li, article');
            const snippet =
              parent?.querySelector('p, .snippet, [class*="description"]')?.textContent?.trim() ||
              parent?.textContent?.trim() ||
              '';

            return { url: href, title, snippet };
          })
          .filter((item) => item.url && item.url.startsWith('http'))
          .slice(0, 20);
      });

      for (const link of links) {
        if (!results.find(r => r.url === link.url)) {
          results.push(link);
          if (results.length >= 10) break;
        }
      }
    }

    await browser.close();

    if (results.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Не удалось найти результаты на странице',
      } as ParseSerpResponse);
    }

    console.log(`[PARSE_SERP] Found ${results.length} results`);

    return NextResponse.json({
      success: true,
      results: results.slice(0, 10),
    } as ParseSerpResponse);
  } catch (error: any) {
    console.error('[PARSE_SERP] Error:', error);
    
    if (browser) {
      try {
        await browser.close();
      } catch (e) {
        // Игнорируем ошибки закрытия браузера
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Ошибка парсинга SERP',
      } as ParseSerpResponse,
      { status: 500 }
    );
  }
}
