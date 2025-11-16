-- Миграция для добавления поля password_hash в таблицу users
-- SQLite версия

-- SQLite не поддерживает IF NOT EXISTS для ALTER TABLE ADD COLUMN
-- Нужно проверять существование колонки перед добавлением
-- В SQLite это делается через проверку схемы таблицы

-- Для SQLite нужно выполнять это вручную или через скрипт миграции
-- ALTER TABLE users ADD COLUMN password_hash TEXT;
