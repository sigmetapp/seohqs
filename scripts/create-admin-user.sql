-- SQL запрос для создания пользователя admin@buylink.pro в Supabase
-- 
-- ВАЖНО: Перед выполнением этого запроса нужно получить хеш пароля Sasha1991!
-- 
-- Вариант 1: Используйте Node.js для получения хеша:
--   node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('Sasha1991!', 10).then(h => console.log(h));"
--
-- Вариант 2: Используйте онлайн генератор bcrypt: https://bcrypt-generator.com/
--   Пароль: Sasha1991!
--   Rounds: 10
--
-- Вариант 3: Используйте API endpoint (рекомендуется):
--   curl -X POST http://localhost:3000/api/admin/create-user \
--     -H "Content-Type: application/json" \
--     -d '{"email":"admin@buylink.pro","password":"Sasha1991!","name":"Admin"}'

-- Проверяем, существует ли пользователь
DO $$
DECLARE
  user_exists BOOLEAN;
  password_hash TEXT;
BEGIN
  -- Проверяем существование пользователя
  SELECT EXISTS(SELECT 1 FROM users WHERE email = 'admin@buylink.pro') INTO user_exists;
  
  -- Хеш пароля Sasha1991! (получен через bcrypt.hash с rounds=10)
  -- ВАЖНО: Замените этот хеш на актуальный, полученный через Node.js или онлайн генератор
  -- Пример хеша (замените на реальный):
  password_hash := '$2a$10$YOUR_BCRYPT_HASH_HERE';
  
  IF user_exists THEN
    -- Обновляем существующего пользователя
    UPDATE users 
    SET 
      email = 'admin@buylink.pro',
      name = 'Admin',
      password_hash = password_hash,
      updated_at = NOW()
    WHERE email = 'admin@buylink.pro';
    
    RAISE NOTICE 'Пользователь admin@buylink.pro обновлен';
  ELSE
    -- Создаем нового пользователя
    INSERT INTO users (email, name, password_hash, created_at, updated_at)
    VALUES (
      'admin@buylink.pro',
      'Admin',
      password_hash,
      NOW(),
      NOW()
    );
    
    RAISE NOTICE 'Пользователь admin@buylink.pro создан';
  END IF;
END $$;

-- Проверяем результат
SELECT id, email, name, 
       CASE 
         WHEN password_hash IS NOT NULL THEN 'Пароль установлен'
         ELSE 'Пароль не установлен'
       END as password_status,
       created_at, updated_at
FROM users 
WHERE email = 'admin@buylink.pro';
