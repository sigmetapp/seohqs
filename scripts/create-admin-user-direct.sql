-- Прямой SQL запрос для создания/обновления пользователя admin@buylink.pro
-- 
-- ИНСТРУКЦИЯ:
-- 1. Сначала получите хеш пароля, выполнив: node scripts/get-password-hash.js
-- 2. Замените YOUR_BCRYPT_HASH_HERE на полученный хеш
-- 3. Выполните этот запрос в Supabase SQL Editor

-- Вариант 1: Если пользователь уже существует - обновляем
UPDATE users 
SET 
  name = 'Admin',
  password_hash = 'YOUR_BCRYPT_HASH_HERE',  -- ЗАМЕНИТЕ НА РЕАЛЬНЫЙ ХЕШ!
  updated_at = NOW()
WHERE email = 'admin@buylink.pro';

-- Вариант 2: Если пользователя нет - создаем (INSERT с ON CONFLICT)
INSERT INTO users (email, name, password_hash, created_at, updated_at)
VALUES (
  'admin@buylink.pro',
  'Admin',
  'YOUR_BCRYPT_HASH_HERE',  -- ЗАМЕНИТЕ НА РЕАЛЬНЫЙ ХЕШ!
  NOW(),
  NOW()
)
ON CONFLICT (email) 
DO UPDATE SET
  name = EXCLUDED.name,
  password_hash = EXCLUDED.password_hash,
  updated_at = NOW();

-- Проверка результата
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
