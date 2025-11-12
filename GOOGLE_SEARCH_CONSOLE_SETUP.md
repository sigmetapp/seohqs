# Настройка Google Search Console API

## Описание

Интеграция с Google Search Console API позволяет автоматически получать данные о производительности сайтов в поиске Google:
- Клики
- Показы
- CTR (Click-Through Rate)
- Средняя позиция в поиске

## Требования

1. **Google Service Account** - уже настроен для Google Indexing API
2. **Доступ к сайту в Google Search Console** - Service Account должен иметь доступ к сайту

## Настройка

### 1. Настройка Service Account

Service Account уже настроен для Google Indexing API. Убедитесь, что:
- Service Account имеет email: `service-account@project-id.iam.gserviceaccount.com`
- Приватный ключ сохранен в настройках интеграций

### 2. Предоставление доступа в Google Search Console

1. Откройте [Google Search Console](https://search.google.com/search-console)
2. Выберите ваш сайт
3. Перейдите в **Настройки** → **Владельцы и пользователи**
4. Нажмите **Добавить пользователя**
5. Введите email вашего Service Account
6. Выберите уровень доступа: **Полный** или **Ограниченный** (достаточно для чтения данных)

**Важно:** Для доменов Google Workspace может потребоваться настройка делегирования домена. В этом случае:
1. Перейдите в Google Admin Console
2. Настройте делегирование домена для Service Account

### 3. Настройка URL сайта

В настройках сайта укажите URL из Google Search Console. Поддерживаются следующие форматы:
- `sc-domain:example.com` (для доменов)
- `https://example.com` (для префиксов URL)
- `https://search.google.com/search-console/...?resource_id=sc-domain%3Aexample.com` (полный URL из интерфейса)

## Использование

### Синхронизация данных

1. Откройте страницу сайта
2. Перейдите на вкладку **Google Console**
3. Нажмите кнопку **Синхронизировать**
4. Данные за последние 30 дней будут загружены и сохранены в базу данных

### Просмотр данных

Данные отображаются в таблице на вкладке **Google Console**:
- Дата
- Клики
- Показы
- CTR (%)
- Средняя позиция

## API Endpoints

### GET `/api/sites/[id]/google-console`
Получает сохраненные данные Google Search Console для сайта.

**Ответ:**
```json
{
  "success": true,
  "data": [
    {
      "siteId": 1,
      "clicks": 150,
      "impressions": 5000,
      "ctr": 0.03,
      "position": 12.5,
      "date": "2024-01-15"
    }
  ],
  "count": 30
}
```

### POST `/api/sites/[id]/google-console/sync`
Синхронизирует данные из Google Search Console API.

**Ответ:**
```json
{
  "success": true,
  "message": "Данные Google Search Console синхронизированы. Загружено 30 записей",
  "data": [...],
  "count": 30
}
```

## Ошибки

### Ошибка аутентификации
**Причина:** Неверные учетные данные Service Account
**Решение:** Проверьте настройки Google Service Account в разделе Интеграции

### Доступ запрещен (403)
**Причина:** Service Account не имеет доступа к сайту в Search Console
**Решение:** 
1. Добавьте Service Account как пользователя в Google Search Console
2. Для доменов Google Workspace настройте делегирование домена

### Неверный формат URL
**Причина:** URL сайта в настройках имеет неверный формат
**Решение:** Убедитесь, что URL корректный. Используйте формат `sc-domain:example.com` или `https://example.com`

## Дополнительные возможности

Библиотека `google-search-console.ts` предоставляет дополнительные методы:

- `getQueryData()` - получение данных по запросам (топ запросов)
- `getPageData()` - получение данных по страницам (топ страниц)
- `getCountryData()` - получение данных по странам
- `getDeviceData()` - получение данных по устройствам

Эти методы можно использовать для расширения функциональности в будущем.
