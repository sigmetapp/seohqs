-- Исправление структуры таблицы integrations для поддержки множественных пользователей
-- Проблема: id имеет DEFAULT 1, что вызывает ошибку duplicate key при создании записей для разных пользователей
-- Решение: изменить id на BIGSERIAL (автоинкремент) и добавить уникальный индекс на user_id

-- Удаляем старую запись с id=1 без user_id, если она существует
DELETE FROM integrations WHERE id = 1 AND user_id IS NULL;

-- Создаем последовательность для id, если её нет
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'integrations_id_seq') THEN
    CREATE SEQUENCE integrations_id_seq;
  END IF;
END $$;

-- Изменяем колонку id на BIGSERIAL
-- Сначала удаляем DEFAULT
ALTER TABLE integrations ALTER COLUMN id DROP DEFAULT;

-- Устанавливаем последовательность как значение по умолчанию
ALTER TABLE integrations ALTER COLUMN id SET DEFAULT nextval('integrations_id_seq');

-- Устанавливаем текущее значение последовательности на максимальный существующий id
DO $$ 
DECLARE
  max_id BIGINT;
BEGIN
  SELECT COALESCE(MAX(id), 0) INTO max_id FROM integrations;
  IF max_id > 0 THEN
    PERFORM setval('integrations_id_seq', max_id);
  END IF;
END $$;

-- Добавляем уникальный индекс на user_id, чтобы каждый пользователь мог иметь только одну запись интеграций
CREATE UNIQUE INDEX IF NOT EXISTS idx_integrations_user_id_unique ON integrations(user_id);

-- Удаляем старый индекс, если он существует (он будет заменен уникальным)
DROP INDEX IF EXISTS idx_integrations_user_id;
