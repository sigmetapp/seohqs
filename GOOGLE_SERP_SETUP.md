# Настройка Google SERP API для генерации статей

## Описание

Для работы генератора статей необходимо настроить API для получения результатов поиска Google (SERP - Search Engine Results Page). Есть несколько вариантов:

1. **Google Custom Search API** (бесплатно до 100 запросов/день)
2. **SerpAPI** (платно, но проще в использовании)
3. **Zenserp** (платно, хорошая альтернатива)

## Вариант 1: Google Custom Search API (Рекомендуется для начала)

### Шаг 1: Создание Google Cloud Project

1. Откройте [Google Cloud Console](https://console.cloud.google.com/)
2. Создайте новый проект или выберите существующий
3. Запомните **Project ID**

### Шаг 2: Включение Custom Search API

1. В Google Cloud Console перейдите в **APIs & Services** → **Library**
2. Найдите **Custom Search API**
3. Нажмите **Enable**

### Шаг 3: Создание API ключа

1. Перейдите в **APIs & Services** → **Credentials**
2. Нажмите **Create Credentials** → **API Key**
3. Скопируйте созданный **API Key**
4. (Опционально) Ограничьте использование ключа:
   - Нажмите на созданный ключ для редактирования
   - В разделе **API restrictions** выберите **Restrict key**
   - Выберите **Custom Search API**
   - Сохраните

### Шаг 4: Создание Search Engine (CX)

1. Откройте [Google Programmable Search Engine](https://programmablesearchengine.google.com/)
2. Нажмите **Add** для создания нового поискового движка
3. Заполните форму:
   - **Sites to search**: `*` (звездочка означает поиск по всему интернету)
   - **Name**: например, "SEO HQ Article Generator"
   - **Language**: выберите нужный язык
4. Нажмите **Create**
5. Перейдите в **Setup** → **Basics**
6. Скопируйте **Search engine ID** (CX) - это строка вида `017576662512468239146:omuauf_lfve`

### Шаг 5: Настройка переменных окружения

#### Для локальной разработки

Создайте или обновите файл `.env.local` в корне проекта:

```env
GOOGLE_SEARCH_API_KEY=your-api-key-here
GOOGLE_SEARCH_ENGINE_ID=your-search-engine-id-here
```

#### Для Vercel (Production)

1. Откройте ваш проект в [Vercel Dashboard](https://vercel.com/dashboard)
2. Перейдите в **Settings** → **Environment Variables**
3. Добавьте переменные:

   **GOOGLE_SEARCH_API_KEY:**
   - **Name**: `GOOGLE_SEARCH_API_KEY`
   - **Value**: ваш API ключ из шага 3
   - **Environment**: Production, Preview, Development

   **GOOGLE_SEARCH_ENGINE_ID:**
   - **Name**: `GOOGLE_SEARCH_ENGINE_ID`
   - **Value**: ваш Search Engine ID из шага 4
   - **Environment**: Production, Preview, Development

4. Нажмите **Save**
5. **Перезапустите деплой** для применения изменений

### Шаг 6: Обновление кода

Откройте файл `lib/googleSerp.ts` и раскомментируйте реализацию для Google Custom Search API:

```typescript
export async function fetchGoogleSerpTop10(params: SerpParams): Promise<SerpResult[]> {
  const { query, language, country } = params;
  
  const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
  const engineId = process.env.GOOGLE_SEARCH_ENGINE_ID;
  
  if (!apiKey || !engineId) {
    throw new Error('GOOGLE_SEARCH_API_KEY and GOOGLE_SEARCH_ENGINE_ID environment variables must be set');
  }
  
  const response = await fetch(
    `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${engineId}&q=${encodeURIComponent(query)}&hl=${language || 'en'}&gl=${country || 'us'}&num=10`
  );
  
  if (!response.ok) {
    throw new Error(`Google Custom Search API error: ${response.statusText}`);
  }
  
  const data = await response.json();
  
  return (data.items || []).slice(0, 10).map((item: any) => ({
    url: item.link,
    title: item.title || '',
    snippet: item.snippet || '',
  }));
}
```

### Лимиты Google Custom Search API

- **Бесплатный лимит**: 100 запросов в день
- **Платный тариф**: $5 за 1000 запросов (первые 100 бесплатно)

## Вариант 2: SerpAPI (Альтернатива)

### Преимущества SerpAPI

- ✅ Проще в использовании
- ✅ Больше результатов на запрос
- ✅ Поддержка разных локаций и языков
- ✅ Более стабильная работа

### Настройка SerpAPI

1. Зарегистрируйтесь на [SerpAPI](https://serpapi.com/)
2. Получите API ключ в разделе [Dashboard](https://serpapi.com/dashboard)
3. Добавьте переменную окружения:

```env
SERP_API_KEY=your-serpapi-key-here
```

4. Обновите `lib/googleSerp.ts`:

```typescript
export async function fetchGoogleSerpTop10(params: SerpParams): Promise<SerpResult[]> {
  const { query, language, country } = params;
  
  const apiKey = process.env.SERP_API_KEY;
  if (!apiKey) {
    throw new Error('SERP_API_KEY environment variable is not set');
  }
  
  const response = await fetch(
    `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&api_key=${apiKey}&hl=${language || 'en'}&gl=${country || 'us'}&num=10`
  );
  
  if (!response.ok) {
    throw new Error(`SerpAPI error: ${response.statusText}`);
  }
  
  const data = await response.json();
  
  return (data.organic_results || []).slice(0, 10).map((result: any) => ({
    url: result.link,
    title: result.title || '',
    snippet: result.snippet || '',
  }));
}
```

### Лимиты SerpAPI

- **Бесплатный план**: 100 запросов в месяц
- **Платные планы**: от $50/месяц за 5000 запросов

## Вариант 3: Zenserp (Альтернатива)

### Настройка Zenserp

1. Зарегистрируйтесь на [Zenserp](https://zenserp.com/)
2. Получите API ключ в разделе Dashboard
3. Добавьте переменную окружения:

```env
ZENSERP_API_KEY=your-zenserp-key-here
```

4. Обновите `lib/googleSerp.ts`:

```typescript
export async function fetchGoogleSerpTop10(params: SerpParams): Promise<SerpResult[]> {
  const { query, language, country } = params;
  
  const apiKey = process.env.ZENSERP_API_KEY;
  if (!apiKey) {
    throw new Error('ZENSERP_API_KEY environment variable is not set');
  }
  
  const response = await fetch(
    `https://app.zenserp.com/api/v2/search?q=${encodeURIComponent(query)}&apikey=${apiKey}&hl=${language || 'en'}&gl=${country || 'us'}&num=10`
  );
  
  if (!response.ok) {
    throw new Error(`Zenserp error: ${response.statusText}`);
  }
  
  const data = await response.json();
  
  return (data.organic || []).slice(0, 10).map((result: any) => ({
    url: result.url,
    title: result.title || '',
    snippet: result.description || '',
  }));
}
```

### Лимиты Zenserp

- **Бесплатный план**: 50 запросов в месяц
- **Платные планы**: от $29/месяц за 1000 запросов

## Рекомендации

1. **Для начала**: Используйте Google Custom Search API (бесплатно 100 запросов/день)
2. **Для продакшена**: Рассмотрите SerpAPI или Zenserp для большей стабильности
3. **Для тестирования**: Можно использовать любой из вариантов

## Проверка работы

После настройки API:

1. Убедитесь, что переменные окружения установлены
2. Попробуйте создать статью через интерфейс
3. Проверьте логи в Vercel (если есть ошибки SERP)

## Устранение проблем

### Ошибка: "SERP_API_KEY environment variable is not set"

**Причина:** Переменная окружения не установлена  
**Решение:** Убедитесь, что переменная добавлена в `.env.local` (локально) или в Vercel Environment Variables (продакшен)

### Ошибка: "Not enough Google SERP results"

**Причина:** API вернул меньше 2 результатов  
**Решение:** 
- Проверьте, что API ключ действителен
- Убедитесь, что лимиты не исчерпаны
- Попробуйте другой поисковый запрос

### Ошибка: "SERP request failed"

**Причина:** Ошибка при запросе к API  
**Решение:**
- Проверьте логи в консоли для деталей
- Убедитесь, что API ключ правильный
- Проверьте лимиты API (возможно, исчерпан дневной/месячный лимит)

## Дополнительная информация

- [Google Custom Search API Documentation](https://developers.google.com/custom-search/v1/overview)
- [SerpAPI Documentation](https://serpapi.com/search-api)
- [Zenserp Documentation](https://zenserp.com/docs)
