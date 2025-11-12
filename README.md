# Google Indexing Service

Сервис для программной отправки URL на индексацию в Google Search Console через Google Indexing API.

## Возможности

- ✅ Отправка одного URL на индексацию
- ✅ Массовая отправка нескольких URL
- ✅ Поддержка операций: URL_UPDATED (обновить/добавить) и URL_DELETED (удалить)
- ✅ Отображение результатов индексации
- ✅ Обработка ошибок

## Технологии

- **Next.js 14** - React фреймворк
- **Google APIs (googleapis)** - Официальная библиотека для работы с Google API
- **TypeScript** - Типизация
- **Tailwind CSS** - Стилизация

## Настройка

### 1. Создание Service Account в Google Cloud

1. Перейдите в [Google Cloud Console](https://console.cloud.google.com/)
2. Создайте новый проект или выберите существующий
3. Включите **Google Indexing API**:
   - Перейдите в "APIs & Services" > "Library"
   - Найдите "Google Indexing API"
   - Нажмите "Enable"

### 2. Создание Service Account

1. Перейдите в "APIs & Services" > "Credentials"
2. Нажмите "Create Credentials" > "Service Account"
3. Заполните данные и создайте аккаунт
4. Перейдите в созданный Service Account
5. На вкладке "Keys" создайте новый ключ (JSON)
6. Скачайте JSON файл с ключами

### 3. Настройка Google Search Console

1. Перейдите в [Google Search Console](https://search.google.com/search-console)
2. Добавьте ваш сайт (если еще не добавлен)
3. Перейдите в "Settings" > "Users and permissions"
4. Добавьте email вашего Service Account (находится в JSON файле, поле `client_email`)
5. Дайте права "Owner" или "Full" для доступа к индексации

### 4. Настройка переменных окружения

Создайте файл `.env.local` в корне проекта:

```env
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project-id.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

**Важно:**
- `GOOGLE_SERVICE_ACCOUNT_EMAIL` - это email из JSON файла (поле `client_email`)
- `GOOGLE_PRIVATE_KEY` - это приватный ключ из JSON файла (поле `private_key`)
- Приватный ключ должен быть в формате с экранированными переносами строк (`\n`)
- Если используете Vercel или другой хостинг, добавьте эти переменные в настройки проекта

### Пример извлечения данных из JSON:

```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "your-service-account@project-id.iam.gserviceaccount.com",
  ...
}
```

## Установка и запуск

```bash
# Установка зависимостей
npm install

# Запуск в режиме разработки
npm run dev

# Сборка для продакшена
npm run build

# Запуск продакшен версии
npm start
```

Приложение будет доступно по адресу: http://localhost:3000

## Использование

### Через веб-интерфейс

1. Откройте приложение в браузере
2. Выберите тип операции (URL_UPDATED или URL_DELETED)
3. Введите один URL или несколько URL (по одному на строку)
4. Нажмите "Отправить"
5. Просмотрите результаты

### Через API

```bash
# Отправка одного URL
curl -X POST http://localhost:3000/api/index \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com/page",
    "type": "URL_UPDATED"
  }'

# Отправка нескольких URL
curl -X POST http://localhost:3000/api/index \
  -H "Content-Type: application/json" \
  -d '{
    "urls": [
      "https://example.com/page1",
      "https://example.com/page2"
    ],
    "type": "URL_UPDATED"
  }'
```

## Ограничения

- **Лимит запросов**: Google Indexing API позволяет отправлять до 200 запросов в день на один URL
- **Владение URL**: URL должны принадлежать сайту, добавленному в Google Search Console
- **Аутентификация**: Требуется правильно настроенный Service Account с доступом к Search Console

## Структура проекта

```
├── app/
│   ├── api/
│   │   └── index/
│   │       └── route.ts          # API endpoint для индексации
│   ├── layout.tsx                 # Главный layout
│   ├── page.tsx                   # Главная страница с UI
│   └── globals.css                # Глобальные стили
├── lib/
│   └── google-indexing.ts         # Логика работы с Google Indexing API
├── package.json
├── next.config.js
└── README.md
```

## Решение проблем

### Ошибка: "GOOGLE_SERVICE_ACCOUNT_EMAIL и GOOGLE_PRIVATE_KEY должны быть установлены"

Убедитесь, что переменные окружения правильно установлены в `.env.local` или в настройках хостинга.

### Ошибка: "Permission denied" или "403 Forbidden"

1. Проверьте, что Service Account добавлен в Google Search Console
2. Убедитесь, что у Service Account есть права Owner или Full
3. Проверьте, что Google Indexing API включен в Google Cloud Console

### Ошибка: "URL is not on property"

URL должен принадлежать сайту, который добавлен в Google Search Console и к которому имеет доступ Service Account.

## Деплой

### Деплой на Vercel (Рекомендуется)

Vercel - это оптимальная платформа для деплоя Next.js приложений.

#### Быстрый деплой через Vercel CLI:

```bash
# Установите Vercel CLI (если еще не установлен)
npm i -g vercel

# Войдите в аккаунт Vercel
vercel login

# Деплой проекта
vercel

# Для продакшен деплоя
vercel --prod
```

#### Деплой через GitHub:

1. Загрузите проект в GitHub репозиторий
2. Перейдите на [vercel.com/new](https://vercel.com/new)
3. Нажмите "Import Git Repository"
4. Выберите репозиторий `sigmetapp/seohqs`
5. Vercel автоматически определит Next.js и настроит сборку
6. **Важно**: Добавьте переменные окружения в настройках проекта:
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `GOOGLE_PRIVATE_KEY`
7. Нажмите "Deploy"

**📖 Подробная инструкция по импорту:** см. `HOW_TO_IMPORT.md`

#### Настройка переменных окружения в Vercel:

1. Перейдите в настройки проекта на Vercel
2. Откройте раздел "Environment Variables"
3. Добавьте:
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL` = ваш email Service Account
   - `GOOGLE_PRIVATE_KEY` = ваш приватный ключ (с экранированными `\n`)
4. Выберите окружения (Production, Preview, Development)
5. Сохраните и передеплойте проект

**Важно для GOOGLE_PRIVATE_KEY в Vercel:**
- Приватный ключ должен быть в одной строке с экранированными переносами `\n`
- Пример: `"-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"`
- Или можно использовать многострочный формат через интерфейс Vercel

### Preview Deploys (Превью деплои)

После импорта проекта в Vercel, **превью деплои создаются автоматически** для:
- ✅ Pull Requests (PR) - каждый PR получает свой уникальный URL
- ✅ Ветки, отличные от production ветки
- ✅ Коммиты в feature ветках

**Как проверить превью:**
1. Создайте Pull Request на GitHub
2. Vercel автоматически создаст превью деплой
3. Ссылка на превью появится в комментариях к PR
4. Или найдите в Vercel Dashboard → Deployments

**Если превью не создаются:**
- Проверьте Settings → Git → "Preview deployments" должно быть включено
- Убедитесь, что GitHub интеграция подключена
- Создайте PR для тестирования

**📖 Подробная инструкция:** см. `HOW_TO_IMPORT.md`

### Деплой на другие платформы

#### Railway

1. Создайте аккаунт на [railway.app](https://railway.app)
2. Создайте новый проект из GitHub репозитория
3. Railway автоматически определит Next.js
4. Добавьте переменные окружения в настройках проекта
5. Деплой произойдет автоматически

#### Render

1. Создайте аккаунт на [render.com](https://render.com)
2. Создайте новый "Web Service"
3. Подключите GitHub репозиторий
4. Настройки:
   - Build Command: `npm run build`
   - Start Command: `npm start`
5. Добавьте переменные окружения
6. Нажмите "Create Web Service"

#### Docker (для любого хостинга)

Создайте `Dockerfile`:

```dockerfile
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app
ENV NODE_ENV production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT 3000
CMD ["node", "server.js"]
```

И обновите `next.config.js`:

```js
const nextConfig = {
  output: 'standalone',
}
```

## Дополнительные ресурсы

- [Google Indexing API Documentation](https://developers.google.com/search/apis/indexing-api/v3/using-api)
- [Google Search Console](https://search.google.com/search-console)
- [Google Cloud Console](https://console.cloud.google.com/)
- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)

## Лицензия

MIT
