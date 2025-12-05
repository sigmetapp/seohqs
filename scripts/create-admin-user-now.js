/**
 * Скрипт для создания пользователя admin@buylink.pro через API endpoint
 * Запустите сервер: npm run dev
 * Затем выполните: node scripts/create-admin-user-now.js
 */

const http = require('http');

const data = JSON.stringify({
  email: 'admin@buylink.pro',
  password: 'Sasha1991!',
  name: 'Admin'
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/admin/create-user',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

console.log('📤 Создание пользователя admin@buylink.pro...');
console.log(`   Email: admin@buylink.pro`);
console.log(`   Пароль: Sasha1991!`);

const req = http.request(options, (res) => {
  let responseData = '';

  res.on('data', (chunk) => {
    responseData += chunk;
  });

  res.on('end', () => {
    try {
      const result = JSON.parse(responseData);
      
      if (result.success) {
        console.log('✅ Пользователь успешно создан/обновлен:');
        console.log(`   Email: ${result.user.email}`);
        console.log(`   ID: ${result.user.id}`);
        console.log(`   Имя: ${result.user.name || 'не указано'}`);
        console.log(`   Пароль: Sasha1991!`);
        console.log('');
        console.log('Теперь вы можете войти с этими учетными данными.');
      } else {
        console.error('❌ Ошибка:', result.error);
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Ошибка парсинга ответа:', error);
      console.error('Ответ сервера:', responseData);
      process.exit(1);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Ошибка подключения к серверу:', error.message);
  console.error('');
  console.error('💡 Убедитесь, что сервер запущен:');
  console.error('   npm run dev');
  console.error('');
  console.error('Или используйте curl:');
  console.error(`   curl -X POST http://localhost:3000/api/admin/create-user \\`);
  console.error(`     -H "Content-Type: application/json" \\`);
  console.error(`     -d '{"email":"admin@buylink.pro","password":"Sasha1991!","name":"Admin"}'`);
  process.exit(1);
});

req.write(data);
req.end();
