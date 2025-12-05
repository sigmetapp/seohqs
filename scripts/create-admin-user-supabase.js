const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');

async function createAdminUser() {
  try {
    // Проверяем переменные окружения Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Ошибка: Переменные окружения Supabase не найдены!');
      console.error('Необходимо установить:');
      console.error('  - NEXT_PUBLIC_SUPABASE_URL');
      console.error('  - SUPABASE_SERVICE_ROLE_KEY (рекомендуется) или NEXT_PUBLIC_SUPABASE_ANON_KEY');
      process.exit(1);
    }
    
    console.log('✅ Найдены переменные окружения Supabase');
    console.log(`   URL: ${supabaseUrl}`);
    console.log(`   Key: ${supabaseKey.substring(0, 20)}...`);
    
    // Создаем клиент Supabase
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const email = 'admin@buylink.pro';
    const password = 'Sasha1991';
    
    // Хешируем пароль
    const passwordHash = await bcrypt.hash(password, 10);
    console.log('✅ Пароль захеширован');
    
    // Проверяем, существует ли пользователь
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();
    
    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }
    
    if (existingUser) {
      // Обновляем существующего пользователя
      console.log('📝 Пользователь уже существует, обновляем...');
      const { data, error } = await supabase
        .from('users')
        .update({
          email,
          name: 'Admin',
          password_hash: passwordHash,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingUser.id)
        .select()
        .single();
      
      if (error) throw error;
      
      console.log('✅ Пользователь успешно обновлен:');
      console.log(`   Email: ${data.email}`);
      console.log(`   ID: ${data.id}`);
      console.log(`   Имя: ${data.name || 'не указано'}`);
      console.log(`   Пароль: ${password}`);
    } else {
      // Создаем нового пользователя
      console.log('➕ Создаем нового пользователя...');
      const { data, error } = await supabase
        .from('users')
        .insert({
          email,
          name: 'Admin',
          password_hash: passwordHash,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      console.log('✅ Пользователь успешно создан:');
      console.log(`   Email: ${data.email}`);
      console.log(`   ID: ${data.id}`);
      console.log(`   Имя: ${data.name || 'не указано'}`);
      console.log(`   Пароль: ${password}`);
    }
  } catch (error) {
    console.error('❌ Ошибка создания пользователя:', error);
    if (error.message) {
      console.error('   Сообщение:', error.message);
    }
    if (error.details) {
      console.error('   Детали:', error.details);
    }
    if (error.hint) {
      console.error('   Подсказка:', error.hint);
    }
    process.exit(1);
  }
}

createAdminUser();
