# Инструкция по деплою Google Indexing Service

## Быстрый старт - Vercel

### Вариант 1: Деплой через Vercel CLI

```bash
# 1. Установите Vercel CLI
npm i -g vercel

# 2. Войдите в аккаунт
vercel login

# 3. Деплой (первый раз - интерактивно)
vercel

# 4. Деплой в продакшен
vercel --prod
```

### Вариант 2: Деплой через GitHub + Vercel Dashboard

1. **Загрузите код в GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/yourusername/google-indexing-service.git
   git push -u origin main
   ```

2. **Подключите к Vercel:**
   - Перейдите на [vercel.com](https://vercel.com)
   - Нажмите "Add New Project"
   - Импортируйте ваш GitHub репозиторий
   - Vercel автоматически определит Next.js

3. **Настройте переменные окружения:**
   - В настройках проекта откройте "Environment Variables"
   - Добавьте:
     ```
     GOOGLE_SERVICE_ACCOUNT_EMAIL = your-service-account@project-id.iam.gserviceaccount.com
     GOOGLE_PRIVATE_KEY = "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
     ```
   - Выберите окружения: Production, Preview, Development
   - Сохраните

4. **Деплой:**
   - Нажмите "Deploy"
   - Дождитесь завершения сборки
   - Ваш сервис будет доступен по адресу: `https://your-project.vercel.app`

## Настройка переменных окружения

### Получение данных из Service Account JSON

1. Откройте скачанный JSON файл Service Account
2. Найдите поля:
   - `client_email` → это `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `private_key` → это `GOOGLE_PRIVATE_KEY`

### Формат GOOGLE_PRIVATE_KEY

**Важно:** Приватный ключ должен быть в одной строке с экранированными переносами строк.

**Правильный формат:**
```
-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n
```

**Неправильный формат (многострочный):**
```
-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...
-----END PRIVATE KEY-----
```

### В Vercel Dashboard

При добавлении переменной `GOOGLE_PRIVATE_KEY` в Vercel:
- Можно вставить многострочный ключ - Vercel автоматически обработает его
- Или вставить в одну строку с `\n`

## Проверка деплоя

После деплоя проверьте:

1. **Откройте ваш сайт** (например, `https://your-project.vercel.app`)
2. **Проверьте интерфейс** - должна открыться страница с формой для индексации
3. **Попробуйте отправить тестовый URL** (URL должен принадлежать сайту в Search Console)

## Обновление после изменений

### Через Vercel CLI:
```bash
vercel --prod
```

### Через GitHub:
- Сделайте изменения в коде
- Закоммитьте и запушьте в GitHub
- Vercel автоматически задеплоит новую версию

## Другие платформы

### Railway

1. Создайте аккаунт на [railway.app](https://railway.app)
2. "New Project" → "Deploy from GitHub repo"
3. Выберите репозиторий
4. Railway автоматически определит Next.js
5. Добавьте переменные окружения в "Variables"
6. Деплой произойдет автоматически

### Render

1. Создайте аккаунт на [render.com](https://render.com)
2. "New" → "Web Service"
3. Подключите GitHub репозиторий
4. Настройки:
   - **Name:** google-indexing-service
   - **Environment:** Node
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
5. Добавьте переменные окружения в "Environment"
6. Нажмите "Create Web Service"

### Docker

Если хотите деплоить через Docker:

1. Создайте `Dockerfile` (см. README.md)
2. Соберите образ:
   ```bash
   docker build -t google-indexing-service .
   ```
3. Запустите:
   ```bash
   docker run -p 3000:3000 \
     -e GOOGLE_SERVICE_ACCOUNT_EMAIL=your-email \
     -e GOOGLE_PRIVATE_KEY="your-key" \
     google-indexing-service
   ```

## Troubleshooting

### Ошибка: "Environment variables not found"

- Убедитесь, что переменные добавлены в настройках хостинга
- Проверьте правильность имен переменных (чувствительны к регистру)
- Передеплойте проект после добавления переменных

### Ошибка: "Invalid private key"

- Проверьте формат приватного ключа (должен быть с `\n`)
- Убедитесь, что ключ не обрезан
- Попробуйте скопировать ключ заново из JSON файла

### Ошибка: "Permission denied" при индексации

- Проверьте, что Service Account добавлен в Google Search Console
- Убедитесь, что у Service Account есть права Owner или Full
- Проверьте, что URL принадлежит сайту в Search Console

## Полезные ссылки

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Google Indexing API](https://developers.google.com/search/apis/indexing-api/v3/using-api)
