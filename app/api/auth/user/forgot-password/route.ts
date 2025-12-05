import { NextResponse } from 'next/server';
import { getUserByEmail } from '@/lib/db-users';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/auth/user/forgot-password
 * Запрос на восстановление пароля
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        {
          success: false,
          error: 'Email обязателен',
        },
        { status: 400 }
      );
    }

    // Проверяем, существует ли пользователь
    const dbUser = await getUserByEmail(email);
    
    // Для безопасности всегда возвращаем успех, даже если пользователь не найден
    // Это предотвращает перебор email адресов
    if (!dbUser || !dbUser.passwordHash) {
      return NextResponse.json({
        success: true,
        message: 'Если пользователь с таким email существует, инструкции по восстановлению пароля отправлены на почту',
      });
    }

    // Генерируем токен восстановления
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date();
    resetTokenExpiry.setHours(resetTokenExpiry.getHours() + 1); // Токен действителен 1 час

    // Сохраняем токен в БД
    await saveResetToken(dbUser.id, resetToken, resetTokenExpiry);

    // Отправляем email с токеном
    let baseUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!baseUrl && process.env.VERCEL_URL) {
      // VERCEL_URL не включает протокол, добавляем https для production
      baseUrl = `https://${process.env.VERCEL_URL}`;
    }
    if (!baseUrl) {
      baseUrl = 'http://localhost:3000';
    }
    const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;
    console.log(`🔗 Сформированный URL для сброса пароля: ${resetUrl}`);
    
    let emailSent = false;
    try {
      await sendPasswordResetEmail(dbUser.email, resetUrl);
      emailSent = true;
      console.log(`✅ Email для сброса пароля успешно отправлен на ${dbUser.email}`);
    } catch (emailError: any) {
      // Детальное логирование ошибки для Vercel
      const errorLog = {
        timestamp: new Date().toISOString(),
        error: {
          message: emailError?.message || 'Unknown error',
          name: emailError?.name || 'Unknown',
          stack: emailError?.stack,
          code: emailError?.code,
          statusCode: emailError?.statusCode,
          command: emailError?.command,
        },
        context: {
          email: dbUser.email,
          userId: dbUser.id,
          resetUrlPrefix: resetUrl.substring(0, 50) + '...',
        },
        environment: {
          NODE_ENV: process.env.NODE_ENV || 'development',
          SUPABASE_SMTP_HOST: process.env.SUPABASE_SMTP_HOST || 'не установлен',
          SUPABASE_SMTP_PORT: process.env.SUPABASE_SMTP_PORT || 'не установлен',
          SUPABASE_SMTP_USER: process.env.SUPABASE_SMTP_USER ? '✅ установлен' : '❌ не установлен',
          SUPABASE_SMTP_PASSWORD: process.env.SUPABASE_SMTP_PASSWORD ? '✅ установлен' : '❌ не установлен',
          SMTP_HOST: process.env.SMTP_HOST || 'не установлен',
          SMTP_PORT: process.env.SMTP_PORT || 'не установлен',
          NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'не установлен',
          VERCEL_URL: process.env.VERCEL_URL || 'не установлен',
        },
      };
      
      console.error('❌ КРИТИЧЕСКАЯ ОШИБКА ОТПРАВКИ EMAIL:');
      console.error(JSON.stringify(errorLog, null, 2));
      
      // В production всегда возвращаем ошибку, если email не был отправлен
      if (process.env.NODE_ENV === 'production') {
        // Логируем в Vercel для мониторинга
        console.error('🔴 PRODUCTION ERROR: Email не был отправлен. Проверьте логи выше для деталей.');
        
        return NextResponse.json(
          {
            success: false,
            error: 'Ошибка отправки email. Пожалуйста, попробуйте позже или свяжитесь с поддержкой.',
            // В production не возвращаем детали ошибки для безопасности
          },
          { status: 500 }
        );
      } else {
        // В режиме разработки выводим предупреждение, но продолжаем
        console.warn('⚠️ Email не отправлен (режим разработки). Проверьте настройки email.');
        console.warn('💡 Для диагностики используйте: GET /api/admin/email-diagnostics');
        console.warn('💡 Для теста отправки используйте: POST /api/admin/email-diagnostics с { "email": "ваш@email.com" }');
        // В development режиме не выбрасываем ошибку, чтобы можно было протестировать UI
      }
    }

    // Возвращаем успех только если email был отправлен или мы в development режиме
    if (!emailSent && process.env.NODE_ENV === 'production') {
      // Это не должно произойти, так как мы уже вернули ошибку выше, но на всякий случай
      console.error('🔴 КРИТИЧЕСКАЯ ОШИБКА: emailSent=false в production режиме');
      return NextResponse.json(
        {
          success: false,
          error: 'Ошибка отправки email. Пожалуйста, попробуйте позже или свяжитесь с поддержкой.',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Если пользователь с таким email существует, инструкции по восстановлению пароля отправлены на почту',
    });
  } catch (error: any) {
    console.error('Ошибка запроса восстановления пароля:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Ошибка запроса восстановления пароля',
      },
      { status: 500 }
    );
  }
}

// Сохранение токена восстановления в БД
async function saveResetToken(userId: number, token: string, expiry: Date): Promise<void> {
  const useSupabase = !!(process.env.NEXT_PUBLIC_SUPABASE_URL);
  
  if (useSupabase) {
    const { supabase } = await import('@/lib/supabase');
    if (supabase) {
      // Создаем или обновляем запись токена
      await supabase
        .from('password_reset_tokens')
        .upsert({
          user_id: userId,
          token,
          expires_at: expiry.toISOString(),
          created_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id'
        });
    }
  } else if (process.env.POSTGRES_URL || process.env.DATABASE_URL) {
    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
    });
    
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
          token VARCHAR(255) NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      await pool.query(`
        INSERT INTO password_reset_tokens (user_id, token, expires_at)
        VALUES ($1, $2, $3)
        ON CONFLICT (user_id) 
        DO UPDATE SET token = $2, expires_at = $3, created_at = CURRENT_TIMESTAMP
      `, [userId, token, expiry]);
    } finally {
      await pool.end();
    }
  } else {
    // SQLite
    const Database = require('better-sqlite3');
    const { join } = require('path');
    const { existsSync, mkdirSync } = require('fs');
    
    const dbDir = join(process.cwd(), 'data');
    if (!existsSync(dbDir)) {
      mkdirSync(dbDir, { recursive: true });
    }
    
    const dbPath = join(dbDir, 'affiliate.db');
    const db = new Database(dbPath);
    
    db.prepare(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL UNIQUE,
        token TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `).run();
    
    db.prepare(`
      INSERT OR REPLACE INTO password_reset_tokens (user_id, token, expires_at, created_at)
      VALUES (?, ?, ?, datetime('now'))
    `).run(userId, token, expiry.toISOString());
  }
}

// Отправка email с инструкциями по восстановлению пароля
async function sendPasswordResetEmail(email: string, resetUrl: string): Promise<void> {
  console.log(`📧 Попытка отправить email на ${email}`);
  console.log(`🔗 Reset URL: ${resetUrl.substring(0, 80)}...`);
  console.log(`🌍 NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
  
  // Приоритет 1: Supabase SMTP (рекомендуется)
  const supabaseSmtpHost = process.env.SUPABASE_SMTP_HOST;
  const supabaseSmtpPort = process.env.SUPABASE_SMTP_PORT;
  const supabaseSmtpUser = process.env.SUPABASE_SMTP_USER;
  const supabaseSmtpPassword = process.env.SUPABASE_SMTP_PASSWORD;
  
  if (supabaseSmtpHost && supabaseSmtpPort && supabaseSmtpUser && supabaseSmtpPassword) {
    console.log('📤 Используется Supabase SMTP для отправки email');
    console.log(`📨 SMTP Host: ${supabaseSmtpHost}:${supabaseSmtpPort}`);
    try {
      const nodemailer = require('nodemailer');
      
      const transporter = nodemailer.createTransport({
        host: supabaseSmtpHost,
        port: parseInt(supabaseSmtpPort),
        secure: supabaseSmtpPort === '465',
        auth: {
          user: supabaseSmtpUser,
          pass: supabaseSmtpPassword,
        },
      });

      const info = await transporter.sendMail({
        from: process.env.SUPABASE_SMTP_FROM || supabaseSmtpUser,
        to: email,
        subject: 'Восстановление пароля',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Восстановление пароля</h2>
            <p>Вы запросили восстановление пароля для вашего аккаунта.</p>
            <p>Для сброса пароля перейдите по ссылке ниже:</p>
            <p style="margin: 20px 0;">
              <a href="${resetUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Восстановить пароль
              </a>
            </p>
            <p>Или скопируйте эту ссылку в браузер:</p>
            <p style="word-break: break-all; color: #666;">${resetUrl}</p>
            <p style="color: #999; font-size: 12px; margin-top: 30px;">
              Ссылка действительна в течение 1 часа. Если вы не запрашивали восстановление пароля, проигнорируйте это письмо.
            </p>
          </div>
        `,
        text: `
Восстановление пароля

Вы запросили восстановление пароля для вашего аккаунта.

Для сброса пароля перейдите по ссылке:
${resetUrl}

Ссылка действительна в течение 1 часа. Если вы не запрашивали восстановление пароля, проигнорируйте это письмо.
        `,
      });
      
      console.log('✅ Email успешно отправлен через Supabase SMTP:', info.messageId);
      return;
    } catch (error: any) {
      console.error('❌ Ошибка отправки через Supabase SMTP:', error);
      console.error('Детали ошибки SMTP:', {
        message: error?.message,
        code: error?.code,
        command: error?.command,
      });
      // Если Supabase SMTP настроен, но не работает, выбрасываем ошибку
      // В production всегда выбрасываем ошибку
      // В development тоже выбрасываем, чтобы не возвращать успех без отправки email
      const errorMessage = `Не удалось отправить email через Supabase SMTP. Ошибка: ${error?.message || 'Unknown error'}`;
      console.error(`❌ ${errorMessage}`);
      throw new Error(errorMessage);
    }
  }

  // Приоритет 2: Обычный SMTP (для совместимости)
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT;
  const smtpUser = process.env.SMTP_USER;
  const smtpPassword = process.env.SMTP_PASSWORD;
  
  if (smtpHost && smtpPort && smtpUser && smtpPassword) {
    console.log('📤 Используется обычный SMTP для отправки email');
    console.log(`📨 SMTP Host: ${smtpHost}:${smtpPort}`);
    try {
      const nodemailer = require('nodemailer');
      
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(smtpPort),
        secure: smtpPort === '465',
        auth: {
          user: smtpUser,
          pass: smtpPassword,
        },
      });

      const info = await transporter.sendMail({
        from: process.env.SMTP_FROM || smtpUser || 'noreply@seohqs.com',
        to: email,
        subject: 'Восстановление пароля',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Восстановление пароля</h2>
            <p>Вы запросили восстановление пароля для вашего аккаунта.</p>
            <p>Для сброса пароля перейдите по ссылке ниже:</p>
            <p style="margin: 20px 0;">
              <a href="${resetUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Восстановить пароль
              </a>
            </p>
            <p>Или скопируйте эту ссылку в браузер:</p>
            <p style="word-break: break-all; color: #666;">${resetUrl}</p>
            <p style="color: #999; font-size: 12px; margin-top: 30px;">
              Ссылка действительна в течение 1 часа. Если вы не запрашивали восстановление пароля, проигнорируйте это письмо.
            </p>
          </div>
        `,
        text: `
Восстановление пароля

Вы запросили восстановление пароля для вашего аккаунта.

Для сброса пароля перейдите по ссылке:
${resetUrl}

Ссылка действительна в течение 1 часа. Если вы не запрашивали восстановление пароля, проигнорируйте это письмо.
        `,
      });
      
      console.log('✅ Email успешно отправлен через SMTP:', info.messageId);
      return;
    } catch (error: any) {
      console.error('❌ Ошибка отправки через SMTP:', error);
      console.error('Детали ошибки SMTP:', {
        message: error?.message,
        code: error?.code,
        command: error?.command,
      });
      // Если SMTP настроен, но не работает, выбрасываем ошибку
      // В production всегда выбрасываем ошибку
      // В development тоже выбрасываем, чтобы не возвращать успех без отправки email
      const errorMessage = `Не удалось отправить email через SMTP. Ошибка: ${error?.message || 'Unknown error'}`;
      console.error(`❌ ${errorMessage}`);
      throw new Error(errorMessage);
    }
  }

  // Если ничего не настроено, выводим в консоль для разработки
  console.log('=== PASSWORD RESET EMAIL ===');
  console.log(`To: ${email}`);
  console.log(`Subject: Восстановление пароля`);
  console.log(`Reset URL: ${resetUrl}`);
  console.log('===========================');
  console.log('⚠️ Email не отправлен. Настройте один из вариантов:');
  console.log('1. Supabase SMTP: SUPABASE_SMTP_HOST, SUPABASE_SMTP_PORT, SUPABASE_SMTP_USER, SUPABASE_SMTP_PASSWORD');
  console.log('2. Обычный SMTP: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD');
  console.log('===========================');
  console.log('Проверка переменных окружения:');
  console.log(`- SUPABASE_SMTP_HOST: ${process.env.SUPABASE_SMTP_HOST ? '✅ установлен' : '❌ не установлен'}`);
  console.log(`- SUPABASE_SMTP_PORT: ${process.env.SUPABASE_SMTP_PORT ? '✅ установлен' : '❌ не установлен'}`);
  console.log(`- SUPABASE_SMTP_USER: ${process.env.SUPABASE_SMTP_USER ? '✅ установлен' : '❌ не установлен'}`);
  console.log(`- SUPABASE_SMTP_PASSWORD: ${process.env.SUPABASE_SMTP_PASSWORD ? '✅ установлен' : '❌ не установлен'}`);
  console.log(`- SMTP_HOST: ${process.env.SMTP_HOST ? '✅ установлен' : '❌ не установлен'}`);
  console.log('===========================');
  
  if (process.env.NODE_ENV === 'production') {
    const error = new Error('Email не настроен. Настройте Supabase SMTP или обычный SMTP.');
    console.error('❌ КРИТИЧЕСКАЯ ОШИБКА:', error.message);
    throw error;
  }
}
