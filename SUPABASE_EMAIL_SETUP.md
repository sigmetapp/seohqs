# Настройка отправки Email для Supabase

Для работы восстановления пароля через email в проекте на Supabase есть несколько вариантов настройки.

## Вариант 1: Resend API (Рекомендуется) ⭐

Resend - это современный сервис для отправки email, который отлично работает с Supabase и Next.js.

### Шаги настройки:

1. **Зарегистрируйтесь на Resend**
   - Перейдите на https://resend.com
   - Создайте аккаунт (есть бесплатный план)

2. **Создайте API ключ**
   - В Dashboard Resend перейдите в "API Keys"
   - Создайте новый ключ
   - Скопируйте ключ

3. **Добавьте домен (опционально, но рекомендуется)**
   - В Dashboard перейдите в "Domains"
   - Добавьте ваш домен (например, seohqs.com)
   - Настройте DNS записи согласно инструкциям Resend
   - Подождите верификации домена

4. **Настройте переменные окружения**

   В Vercel или вашем хостинге добавьте:
   ```env
   RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxx
   RESEND_FROM_EMAIL=noreply@seohqs.com
   NEXT_PUBLIC_APP_URL=https://www.seohqs.com
   ```

   Или если используете домен Resend:
   ```env
   RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxx
   RESEND_FROM_EMAIL=onboarding@resend.dev
   NEXT_PUBLIC_APP_URL=https://www.seohqs.com
   ```

   **Важно:** `NEXT_PUBLIC_APP_URL` используется для формирования ссылки восстановления пароля. Укажите ваш домен.

5. **Готово!** Email будет отправляться через Resend.

---

## Вариант 2: Supabase SMTP

Supabase позволяет настроить SMTP в настройках проекта.

### Шаги настройки:

1. **Откройте Supabase Dashboard**
   - Перейдите на https://supabase.com/dashboard
   - Выберите ваш проект

2. **Настройте SMTP**
   - Перейдите в Settings → Auth → SMTP Settings
   - Включите "Enable Custom SMTP"
   - Заполните данные вашего SMTP сервера:
     - **SMTP Host**: например, `smtp.gmail.com` или ваш SMTP сервер
     - **SMTP Port**: обычно `587` (TLS) или `465` (SSL)
     - **SMTP User**: ваш email адрес
     - **SMTP Password**: пароль приложения или SMTP пароль
     - **Sender Email**: email отправителя
     - **Sender Name**: имя отправителя

3. **Настройте переменные окружения**

   В Vercel или вашем хостинге добавьте:
   ```env
   SUPABASE_SMTP_HOST=smtp.gmail.com
   SUPABASE_SMTP_PORT=587
   SUPABASE_SMTP_USER=your-email@gmail.com
   SUPABASE_SMTP_PASSWORD=your-app-password
   SUPABASE_SMTP_FROM=noreply@seohqs.com
   NEXT_PUBLIC_APP_URL=https://www.seohqs.com
   ```

### Примеры SMTP провайдеров:

**Gmail:**
```env
SUPABASE_SMTP_HOST=smtp.gmail.com
SUPABASE_SMTP_PORT=587
SUPABASE_SMTP_USER=your-email@gmail.com
SUPABASE_SMTP_PASSWORD=your-app-password  # Пароль приложения, не обычный пароль
```

**SendGrid:**
```env
SUPABASE_SMTP_HOST=smtp.sendgrid.net
SUPABASE_SMTP_PORT=587
SUPABASE_SMTP_USER=apikey
SUPABASE_SMTP_PASSWORD=your-sendgrid-api-key
```

**Mailgun:**
```env
SUPABASE_SMTP_HOST=smtp.mailgun.org
SUPABASE_SMTP_PORT=587
SUPABASE_SMTP_USER=postmaster@your-domain.mailgun.org
SUPABASE_SMTP_PASSWORD=your-mailgun-password
```

---

## Вариант 3: Обычный SMTP

Если у вас есть свой SMTP сервер, вы можете использовать его напрямую.

### Настройка переменных окружения:

```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASSWORD=your-password
SMTP_FROM=noreply@seohqs.com
NEXT_PUBLIC_APP_URL=https://www.seohqs.com
```

---

## Приоритет использования

Система будет использовать методы в следующем порядке:

1. **Resend API** (если установлен `RESEND_API_KEY`)
2. **Supabase SMTP** (если установлены `SUPABASE_SMTP_*`)
3. **Обычный SMTP** (если установлены `SMTP_*`)
4. **Режим разработки** (вывод в консоль, если ничего не настроено)

---

## Проверка работы

После настройки:

1. Перейдите на страницу логина: `/login`
2. Нажмите "Забыли пароль?"
3. Введите email
4. Проверьте почту (или консоль в режиме разработки)

---

## Рекомендации

- **Для продакшена**: Используйте Resend API или Supabase SMTP
- **Для разработки**: Можно оставить без настройки - ссылка будет выводиться в консоль
- **Безопасность**: Никогда не коммитьте API ключи в git. Используйте переменные окружения.

---

## Troubleshooting

### Email не отправляется

1. Проверьте переменные окружения в Vercel/хостинге
2. Проверьте логи в консоли (там будет информация об ошибках)
3. Убедитесь, что домен верифицирован (для Resend)
4. Проверьте лимиты отправки (бесплатные планы имеют ограничения)

### Gmail не работает

- Используйте "Пароль приложения", а не обычный пароль Gmail
- Включите двухфакторную аутентификацию в Google аккаунте
- Создайте пароль приложения: https://myaccount.google.com/apppasswords

---

## Дополнительные настройки

### Настройка домена в Resend

1. Добавьте домен в Resend Dashboard
2. Добавьте DNS записи:
   - SPF: `v=spf1 include:resend.com ~all`
   - DKIM: (будет предоставлен Resend)
   - DMARC: `v=DMARC1; p=none;`
3. Дождитесь верификации (обычно несколько минут)

После верификации вы сможете отправлять email с вашего домена!
