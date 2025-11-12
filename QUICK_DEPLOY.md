# 🚀 Быстрый деплой

## Vercel (Рекомендуется - 2 минуты)

### Через CLI:

```bash
# 1. Установите Vercel CLI
npm i -g vercel

# 2. Войдите
vercel login

# 3. Деплой
vercel --prod
```

### Через GitHub:

1. Загрузите код в GitHub
2. Перейдите на [vercel.com/new](https://vercel.com/new)
3. Импортируйте репозиторий
4. **Добавьте переменные окружения:**
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `GOOGLE_PRIVATE_KEY`
5. Нажмите "Deploy"

## ⚙️ Настройка переменных окружения

Из вашего Service Account JSON файла возьмите:

- `client_email` → `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `private_key` → `GOOGLE_PRIVATE_KEY` (в одну строку с `\n`)

**Пример:**
```
GOOGLE_SERVICE_ACCOUNT_EMAIL=service@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"
```

## ✅ Проверка

После деплоя откройте ваш сайт и попробуйте отправить тестовый URL.

Подробные инструкции: см. `DEPLOY.md` или `README.md`
