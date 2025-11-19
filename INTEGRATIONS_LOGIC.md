# Логика работы интеграций Google Search Console

## Обзор

Система поддерживает три источника данных для подключенных аккаунтов Google Search Console:

1. **`gsc_integrations`** - основная таблица для хранения OAuth токенов (один аккаунт на пользователя)
2. **`google_gsc_accounts`** - таблица для поддержки множественных аккаунтов Google на одного пользователя
3. **`google_accounts`** - таблица для JWT-аутентифицированных пользователей (legacy)

## Процесс подключения аккаунта (OAuth Callback)

Когда пользователь проходит OAuth авторизацию через Google (`/api/auth/google/callback`):

1. **Получение токенов**: Система получает `access_token` и `refresh_token` от Google
2. **Получение информации о пользователе**: Запрашивает email и user_id из Google UserInfo API
3. **Сохранение в `gsc_integrations`**:
   - Сохраняет токены доступа для работы с Google Search Console API
   - Связывает аккаунт с пользователем через `user_id` (UUID из Supabase Auth)
   - Используется для основного подключения с полным доступом к API

4. **Сохранение в `google_gsc_accounts`**:
   - Сохраняет информацию об аккаунте (email, google_user_id)
   - Позволяет пользователю иметь несколько подключенных Google аккаунтов
   - Используется для отображения списка всех подключенных аккаунтов

5. **Загрузка сайтов из GSC** (опционально):
   - Сразу после подключения система может загрузить список сайтов из Google Search Console
   - Сайты сохраняются в таблицу `gsc_sites` с привязкой к `integration_id`

## Процесс отображения аккаунтов (`/api/gsc-integration`)

API endpoint `/api/gsc-integration` объединяет данные из всех источников:

1. **Получение аккаунтов из `gsc_integrations`**:
   - Получает основной аккаунт пользователя
   - Загружает список сайтов из `gsc_sites` для этого аккаунта
   - Подсчитывает количество сайтов и совпадений с сайтами пользователя

2. **Получение аккаунтов из `google_gsc_accounts`**:
   - Получает все активные аккаунты пользователя
   - Исключает дубликаты (если email уже есть в `gsc_integrations`)
   - Помечает аккаунты, у которых есть связанные сайты

3. **Получение аккаунтов из `google_accounts`** (JWT Auth):
   - Для пользователей, аутентифицированных через JWT/PostgreSQL
   - Fallback механизм для обратной совместимости

4. **Объединение и возврат**:
   - Все аккаунты объединяются в один массив
   - Каждый аккаунт помечается источником (`source`: 'supabase', 'google_gsc_accounts', 'jwt')
   - Возвращается информация о количестве сайтов и совпадениях

## Процесс отключения аккаунта

При отключении аккаунта (`DELETE /api/gsc-integration`):

1. **Определение типа аккаунта**:
   - По параметру `source` определяется, из какой таблицы удалять
   - По `accountId` (числовой) - удаление из `google_accounts` (JWT)
   - По `accountUuid` (UUID) + `source=supabase` - удаление из `gsc_integrations`
   - По `accountUuid` (UUID) + `source=google_gsc_accounts` - деактивация в `google_gsc_accounts`

2. **Удаление/деактивация**:
   - Для `gsc_integrations`: полное удаление записи (каскадное удаление связанных `gsc_sites`)
   - Для `google_gsc_accounts`: мягкое удаление через флаг `is_active = false`
   - Для `google_accounts`: удаление записи из таблицы

## Страница `/integrations`

Объединенная страница отображает:

1. **Все подключенные аккаунты** из всех источников
2. **Информацию о сайтах**:
   - Количество сайтов в базе данных пользователя
   - Количество сайтов в Google Search Console
   - Количество совпадающих сайтов

3. **Фильтрация**:
   - Возможность показать только аккаунты с сайтами
   - Отображение всех аккаунтов по умолчанию

4. **Действия**:
   - Подключение нового аккаунта через OAuth
   - Отключение конкретного аккаунта
   - Отключение всех аккаунтов
   - Очистка всех сайтов

## Структура базы данных

### Таблица `gsc_integrations`
```sql
- id (UUID, PRIMARY KEY)
- user_id (UUID, REFERENCES auth.users)
- google_email (TEXT)
- google_user_id (TEXT)
- access_token (TEXT) - OAuth access token
- refresh_token (TEXT) - OAuth refresh token
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### Таблица `google_gsc_accounts`
```sql
- id (UUID, PRIMARY KEY)
- user_id (UUID, REFERENCES auth.users)
- google_email (TEXT)
- google_user_id (TEXT)
- source (TEXT) - источник подключения
- is_active (BOOLEAN) - флаг активности
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
UNIQUE(user_id, google_user_id)
```

### Таблица `gsc_sites`
```sql
- id (UUID, PRIMARY KEY)
- integration_id (UUID, REFERENCES gsc_integrations)
- site_url (TEXT) - URL сайта из GSC
- permission (TEXT) - уровень доступа
- fetched_at (TIMESTAMP)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
UNIQUE(integration_id, site_url)
```

## Логика сохранения при подключении

```typescript
// 1. Сохранение в gsc_integrations (токены для API)
await upsertGSCIntegration(userId, {
  google_email: googleUserInfo.email,
  google_user_id: googleUserInfo.sub,
  access_token: accessToken,
  refresh_token: refreshToken,
});

// 2. Сохранение в google_gsc_accounts (множественные аккаунты)
await upsertGoogleGSCAccount(userId, {
  google_email: googleUserInfo.email,
  google_user_id: googleUserInfo.sub,
  source: 'gsc',
});

// 3. Загрузка и сохранение сайтов из GSC
const sites = await fetchGSCSites(accessToken);
await upsertGSCSites(integrationId, sites);
```

## Логика получения при отображении

```typescript
// 1. Получить основной аккаунт из gsc_integrations
const integration = await getGSCIntegration(userId);
if (integration) {
  // Получить сайты для этого аккаунта
  const gscSites = await getGSCSites(integration.id);
  // Добавить в список аккаунтов
  accounts.push({
    ...integration,
    source: 'supabase',
    gscSitesCount: gscSites.length,
  });
}

// 2. Получить все аккаунты из google_gsc_accounts
const googleGSCAccounts = await getGoogleGSCAccounts(userId);
for (const account of googleGSCAccounts) {
  // Пропустить дубликаты
  if (!addedEmails.has(account.google_email)) {
    accounts.push({
      ...account,
      source: 'google_gsc_accounts',
    });
  }
}

// 3. Получить аккаунты из google_accounts (JWT)
const jwtAccounts = await getAllGoogleAccounts(userId);
accounts.push(...jwtAccounts.map(acc => ({
  ...acc,
  source: 'jwt',
})));
```

## Преимущества такой архитектуры

1. **Обратная совместимость**: Поддержка старых аккаунтов из `google_accounts`
2. **Множественные аккаунты**: Пользователь может подключить несколько Google аккаунтов
3. **Разделение ответственности**: 
   - `gsc_integrations` хранит токены для API
   - `google_gsc_accounts` хранит список аккаунтов
   - `gsc_sites` хранит сайты из GSC
4. **Гибкость**: Легко добавить новые источники данных или изменить логику
