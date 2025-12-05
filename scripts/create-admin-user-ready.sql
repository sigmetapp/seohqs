-- Готовый SQL запрос для создания/обновления пользователя admin@buylink.pro в Supabase
-- Пароль: Sasha1991!
-- 
-- Выполните этот запрос в Supabase SQL Editor:
-- 1. Откройте Supabase Dashboard
-- 2. Перейдите в SQL Editor
-- 3. Вставьте этот запрос и выполните

-- Создаем или обновляем пользователя
INSERT INTO users (email, name, password_hash, created_at, updated_at)
VALUES (
  'admin@buylink.pro',
  'Admin',
  '$2b$10$1l3RM3BsGmKiJePozSKGve76avnXY0l/lgyMpdE8OVk4XLdhovql6',  -- Хеш пароля Sasha1991!
  NOW(),
  NOW()
)
ON CONFLICT (email) 
DO UPDATE SET
  name = EXCLUDED.name,
  password_hash = EXCLUDED.password_hash,
  updated_at = NOW();

-- Проверяем результат
SELECT 
  id,
  email,
  name,
  CASE 
    WHEN password_hash IS NOT NULL THEN '✅ Пароль установлен'
    ELSE '❌ Пароль не установлен'
  END as password_status,
  created_at,
  updated_at
FROM users 
WHERE email = 'admin@buylink.pro';
