# Настройка Google Service Account

## Где взять учетные данные

### Шаг 1: Создание проекта в Google Cloud Console

1. Откройте [Google Cloud Console](https://console.cloud.google.com/)
2. Войдите в свой аккаунт Google
3. Создайте новый проект или выберите существующий:
   - Нажмите на выпадающий список проектов вверху
   - Нажмите "New Project"
   - Введите название проекта и нажмите "Create"

### Шаг 2: Включение необходимых API

1. Перейдите в **APIs & Services** → **Library**
2. Найдите и включите нужные API (например, Google Sheets API, Google Drive API, Google Indexing API и т.д.)
3. Нажмите "Enable" для каждого API

### Шаг 3: Создание Service Account

1. Перейдите в **APIs & Services** → **Credentials**
2. Нажмите **Create Credentials** → **Service Account**
3. Заполните форму:
   - **Service account name**: введите имя (например, `seohqs-service`)
   - **Service account ID**: будет создан автоматически
   - **Description**: описание (опционально)
4. Нажмите **Create and Continue**
5. На шаге "Grant this service account access to project":
   - Выберите роль (например, `Editor` или более специфичную роль)
   - Нажмите **Continue**
6. На шаге "Grant users access to this service account" можете пропустить и нажать **Done**

### Шаг 4: Создание ключа

1. В списке Service Accounts найдите созданный аккаунт и нажмите на него
2. Перейдите на вкладку **Keys**
3. Нажмите **Add Key** → **Create new key**
4. Выберите формат **JSON**
5. Нажмите **Create**
6. Файл JSON будет автоматически скачан на ваш компьютер

### Шаг 5: Извлечение данных из JSON файла

Откройте скачанный JSON файл. Он будет выглядеть примерно так:

```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "key-id",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "your-service-account@your-project.iam.gserviceaccount.com",
  "client_id": "123456789",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/..."
}
```

Из этого файла вам нужны:
- **`client_email`** → это ваш `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- **`private_key`** → это ваш `GOOGLE_PRIVATE_KEY`

## Куда добавить переменные окружения

### Для локальной разработки

1. Создайте файл `.env.local` в корне проекта (если его еще нет)
2. Добавьте следующие строки:

```env
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

**Важно:**
- `GOOGLE_PRIVATE_KEY` должен быть в кавычках
- Сохраните все символы `\n` в ключе (они нужны для форматирования)
- Не добавляйте файл `.env.local` в git (он уже должен быть в `.gitignore`)

### Для Vercel (Production)

1. Откройте ваш проект в [Vercel Dashboard](https://vercel.com/dashboard)
2. Перейдите в **Settings** → **Environment Variables**
3. Добавьте две переменные:

   **Первая переменная:**
   - **Name**: `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - **Value**: `your-service-account@your-project.iam.gserviceaccount.com`
   - **Environment**: выберите Production, Preview, Development (или нужные вам)

   **Вторая переменная:**
   - **Name**: `GOOGLE_PRIVATE_KEY`
   - **Value**: `-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n`
     - Скопируйте весь ключ из JSON файла, включая `-----BEGIN PRIVATE KEY-----` и `-----END PRIVATE KEY-----`
     - Сохраните все символы `\n` (не заменяйте их на реальные переносы строк)
   - **Environment**: выберите Production, Preview, Development (или нужные вам)

4. Нажмите **Save**
5. **Перезапустите деплой** для применения изменений

### Форматирование GOOGLE_PRIVATE_KEY

При копировании ключа из JSON файла убедитесь, что:
- Ключ находится в одной строке
- Символы `\n` сохранены как есть (не заменены на реальные переносы строк)
- Ключ обернут в кавычки в `.env.local`, но в Vercel кавычки не нужны

**Пример правильного формата:**
```
-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n
```

## Проверка настройки

После добавления переменных окружения:

1. Перезапустите локальный сервер (если работаете локально):
   ```bash
   npm run dev
   ```

2. Проверьте, что переменные доступны в коде:
   ```typescript
   console.log('Email:', process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL);
   console.log('Key exists:', !!process.env.GOOGLE_PRIVATE_KEY);
   ```

3. Для Vercel: после перезапуска деплоя проверьте логи или добавьте отладочный вывод в код

## Безопасность

⚠️ **Важные правила безопасности:**

1. **Никогда не коммитьте** файлы с ключами в git
2. **Не публикуйте** JSON файл с ключами
3. **Не делитесь** ключами публично
4. Используйте `.env.local` для локальной разработки (он должен быть в `.gitignore`)
5. В Vercel используйте Environment Variables (они зашифрованы)
6. Если ключ был скомпрометирован, немедленно удалите его в Google Cloud Console и создайте новый

## Дополнительные настройки

### Предоставление доступа к Google Sheets

Если вы используете Google Sheets API:

1. Откройте нужный Google Sheet
2. Нажмите **Share** (Поделиться)
3. Вставьте email вашего Service Account (из `client_email`)
4. Дайте права **Viewer** или **Editor** (в зависимости от ваших потребностей)
5. Нажмите **Send**

### Предоставление доступа к Google Drive

Если вы используете Google Drive API:

1. Откройте нужную папку/файл в Google Drive
2. Нажмите **Share** (Поделиться)
3. Вставьте email вашего Service Account
4. Дайте необходимые права доступа
5. Нажмите **Send**

## Устранение проблем

### Ошибка: "Invalid credentials"
- Проверьте, что email и ключ скопированы правильно
- Убедитесь, что ключ содержит все символы `\n`
- Проверьте, что ключ не истек (ключи не имеют срока действия, но могут быть удалены)

### Ошибка: "Permission denied"
- Убедитесь, что нужные API включены в Google Cloud Console
- Проверьте, что Service Account имеет необходимые роли
- Для Google Sheets/Drive: убедитесь, что вы предоставили доступ к файлам/папкам

### Ошибка: "Service account not found"
- Проверьте правильность email адреса
- Убедитесь, что Service Account не был удален
