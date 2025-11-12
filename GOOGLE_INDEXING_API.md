# Google Indexing API - Инструкция по использованию

## Описание

Сервис индексации URL позволяет индексировать **любые ссылки** через Google Indexing API. Это полезно для быстрой индексации новых страниц или обновления уже проиндексированных страниц в Google.

## Возможности

✅ Индексация одного URL  
✅ Индексация нескольких URL одновременно (до 100 за раз)  
✅ Удаление URL из индекса Google  
✅ Поддержка любых URL (не только своего сайта)  

## Требования

1. **Google Service Account** настроен (см. `GOOGLE_SERVICE_ACCOUNT_SETUP.md`)
2. **Google Indexing API** включен в Google Cloud Console
3. **Google Search Console** - сайт добавлен и Service Account является владельцем

## Использование через UI

1. Откройте главную страницу приложения
2. Найдите секцию "Индексация URL в Google"
3. Введите URL в поле для одного URL или несколько URL в текстовое поле (по одному на строку)
4. Нажмите "Индексировать" или "Индексировать все"

## Использование через API

### Индексация одного URL

```bash
POST /api/index
Content-Type: application/json

{
  "url": "https://example.com/page",
  "action": "index"
}
```

### Индексация нескольких URL

```bash
POST /api/index
Content-Type: application/json

{
  "urls": [
    "https://example.com/page1",
    "https://example.com/page2",
    "https://example.com/page3"
  ],
  "action": "index"
}
```

### Удаление URL из индекса

```bash
POST /api/index
Content-Type: application/json

{
  "url": "https://example.com/page",
  "action": "remove"
}
```

### Проверка статуса сервиса

```bash
GET /api/index
```

## Важные замечания

### Ограничения Google Indexing API

1. **Доступ к сайту:** URL должен принадлежать сайту, который добавлен в Google Search Console
2. **Права Service Account:** Service Account должен быть добавлен как **Owner** (владелец) сайта в Search Console
3. **Лимиты:** Google может ограничивать количество запросов на индексацию

### Индексация URL с разных сайтов

Для индексации URL с разных сайтов:

1. Добавьте все нужные сайты в Google Search Console
2. Добавьте ваш Service Account как Owner для каждого сайта
3. Теперь вы можете индексировать URL с любого из этих сайтов

### Типы действий

- `index` (или `URL_UPDATED`) - добавляет или обновляет URL в индексе
- `remove` (или `URL_DELETED`) - удаляет URL из индекса

## Примеры ответов

### Успешная индексация

```json
{
  "success": true,
  "message": "URL успешно отправлен на индексацию: https://example.com/page",
  "data": {
    "urlNotification": {
      "url": "https://example.com/page",
      "type": "URL_UPDATED",
      "notifyTime": "2024-01-15T10:30:00Z"
    }
  }
}
```

### Ошибка доступа

```json
{
  "success": false,
  "message": "Доступ запрещен. Проверьте права Service Account и включен ли Indexing API.",
  "error": "Доступ запрещен. Проверьте права Service Account и включен ли Indexing API."
}
```

### Ошибка валидации URL

```json
{
  "success": false,
  "message": "Некорректный запрос. Убедитесь, что URL валиден и принадлежит сайту, добавленному в Google Search Console."
}
```

## Устранение проблем

### Ошибка 403 Forbidden

**Причина:** Service Account не имеет доступа к сайту в Search Console

**Решение:**
1. Откройте Google Search Console
2. Перейдите в Settings → Users and permissions
3. Добавьте Service Account email как Owner
4. Подождите несколько минут и попробуйте снова

### Ошибка "URL is not on Google"

**Причина:** URL не принадлежит сайту, добавленному в Search Console

**Решение:**
1. Убедитесь, что сайт добавлен в Search Console
2. Проверьте, что домен URL совпадает с доменом в Search Console
3. Убедитесь, что Service Account имеет доступ к этому сайту

### Ошибка "Invalid credentials"

**Причина:** Неправильно настроены переменные окружения

**Решение:**
1. Проверьте `GOOGLE_SERVICE_ACCOUNT_EMAIL` и `GOOGLE_PRIVATE_KEY`
2. Убедитесь, что ключ содержит символы `\n` (не заменены на переносы строк)
3. См. `GOOGLE_SERVICE_ACCOUNT_SETUP.md` для подробных инструкций

## Безопасность

⚠️ **Важно:**
- Никогда не публикуйте Service Account ключи
- Используйте переменные окружения для хранения учетных данных
- Регулярно проверяйте доступы в Google Search Console
- Удаляйте неиспользуемые Service Accounts

## Дополнительные ресурсы

- [Google Indexing API Documentation](https://developers.google.com/search/apis/indexing-api/v3/using-api)
- [Google Search Console](https://search.google.com/search-console)
- [Google Cloud Console](https://console.cloud.google.com/)
