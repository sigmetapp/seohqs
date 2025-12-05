/**
 * Скрипт для получения bcrypt хеша пароля
 * Использование: node scripts/get-password-hash.js
 */

const bcrypt = require('bcryptjs');

const password = 'Sasha1991!';

console.log('Генерация хеша для пароля:', password);
console.log('');

bcrypt.hash(password, 10)
  .then(hash => {
    console.log('✅ Хеш пароля (bcrypt, rounds=10):');
    console.log('');
    console.log(hash);
    console.log('');
    console.log('📋 Используйте этот хеш в SQL запросе:');
    console.log('');
    console.log(`UPDATE users SET password_hash = '${hash}' WHERE email = 'admin@buylink.pro';`);
    console.log('');
    console.log('Или вставьте в файл scripts/create-admin-user.sql');
  })
  .catch(error => {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  });
