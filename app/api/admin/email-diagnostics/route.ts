import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/admin/email-diagnostics
 * Диагностика настроек email для сброса пароля
 */
export async function GET() {
  try {
    const diagnostics = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      appUrl: process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || 'не установлен',
      
      // Проверка Resend API
      resend: {
        enabled: !!process.env.RESEND_API_KEY,
        apiKey: process.env.RESEND_API_KEY ? '✅ установлен' : '❌ не установлен',
        fromEmail: process.env.RESEND_FROM_EMAIL || 'не установлен (будет использован onboarding@resend.dev)',
        status: process.env.RESEND_API_KEY ? 'настроен' : 'не настроен',
        domainNote: process.env.RESEND_FROM_EMAIL && process.env.RESEND_FROM_EMAIL !== 'onboarding@resend.dev' 
          ? '⚠️ Убедитесь, что домен верифицирован в Resend Dashboard' 
          : undefined,
      },
      
      // Проверка Supabase SMTP
      supabaseSmtp: {
        enabled: !!(
          process.env.SUPABASE_SMTP_HOST &&
          process.env.SUPABASE_SMTP_PORT &&
          process.env.SUPABASE_SMTP_USER &&
          process.env.SUPABASE_SMTP_PASSWORD
        ),
        host: process.env.SUPABASE_SMTP_HOST || 'не установлен',
        port: process.env.SUPABASE_SMTP_PORT || 'не установлен',
        user: process.env.SUPABASE_SMTP_USER ? '✅ установлен' : '❌ не установлен',
        password: process.env.SUPABASE_SMTP_PASSWORD ? '✅ установлен' : '❌ не установлен',
        from: process.env.SUPABASE_SMTP_FROM || 'не установлен',
        status: !!(
          process.env.SUPABASE_SMTP_HOST &&
          process.env.SUPABASE_SMTP_PORT &&
          process.env.SUPABASE_SMTP_USER &&
          process.env.SUPABASE_SMTP_PASSWORD
        ) ? 'настроен' : 'не настроен',
      },
      
      // Проверка обычного SMTP
      smtp: {
        enabled: !!(
          process.env.SMTP_HOST &&
          process.env.SMTP_PORT &&
          process.env.SMTP_USER &&
          process.env.SMTP_PASSWORD
        ),
        host: process.env.SMTP_HOST || 'не установлен',
        port: process.env.SMTP_PORT || 'не установлен',
        user: process.env.SMTP_USER ? '✅ установлен' : '❌ не установлен',
        password: process.env.SMTP_PASSWORD ? '✅ установлен' : '❌ не установлен',
        from: process.env.SMTP_FROM || 'не установлен',
        status: !!(
          process.env.SMTP_HOST &&
          process.env.SMTP_PORT &&
          process.env.SMTP_USER &&
          process.env.SMTP_PASSWORD
        ) ? 'настроен' : 'не настроен',
      },
      
      // Определение активного метода
      activeMethod: (() => {
        if (process.env.RESEND_API_KEY) return 'Resend API';
        if (
          process.env.SUPABASE_SMTP_HOST &&
          process.env.SUPABASE_SMTP_PORT &&
          process.env.SUPABASE_SMTP_USER &&
          process.env.SUPABASE_SMTP_PASSWORD
        ) return 'Supabase SMTP';
        if (
          process.env.SMTP_HOST &&
          process.env.SMTP_PORT &&
          process.env.SMTP_USER &&
          process.env.SMTP_PASSWORD
        ) return 'Обычный SMTP';
        return 'не настроен (режим разработки - вывод в консоль)';
      })(),
      
      // Рекомендации
      recommendations: [] as string[],
    };
    
    // Добавляем рекомендации
    if (!diagnostics.resend.enabled && !diagnostics.supabaseSmtp.enabled && !diagnostics.smtp.enabled) {
      diagnostics.recommendations.push(
        '⚠️ Email не настроен! Настройте один из методов отправки:',
        '1. Resend API (рекомендуется): установите RESEND_API_KEY и RESEND_FROM_EMAIL',
        '2. Supabase SMTP: установите SUPABASE_SMTP_HOST, SUPABASE_SMTP_PORT, SUPABASE_SMTP_USER, SUPABASE_SMTP_PASSWORD',
        '3. Обычный SMTP: установите SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD'
      );
    }
    
    if (!process.env.NEXT_PUBLIC_APP_URL && !process.env.VERCEL_URL) {
      diagnostics.recommendations.push(
        '⚠️ NEXT_PUBLIC_APP_URL не установлен! Это может привести к неправильным ссылкам в письмах.'
      );
    }
    
    if (diagnostics.resend.enabled && diagnostics.resend.fromEmail === 'не установлен (будет использован onboarding@resend.dev)') {
      diagnostics.recommendations.push(
        '💡 Рекомендуется установить RESEND_FROM_EMAIL для использования вашего домена'
      );
    }
    
    if (diagnostics.resend.enabled && diagnostics.resend.fromEmail && diagnostics.resend.fromEmail !== 'не установлен (будет использован onboarding@resend.dev)') {
      diagnostics.recommendations.push(
        '⚠️ ВАЖНО: Если письма не приходят, проверьте верификацию домена в Resend Dashboard',
        '   Если домен не верифицирован, временно используйте onboarding@resend.dev'
      );
    }
    
    // Тест отправки (опционально, только если запрошен)
    const testEmail = process.env.TEST_EMAIL;
    if (testEmail) {
      diagnostics.testEmail = testEmail;
      diagnostics.testStatus = 'для теста отправьте POST запрос с { "email": "ваш@email.com" }';
    }
    
    return NextResponse.json({
      success: true,
      diagnostics,
    });
  } catch (error: any) {
    console.error('Ошибка диагностики email:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Ошибка диагностики email',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/email-diagnostics
 * Тестовая отправка email для проверки настроек
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = body;
    
    if (!email) {
      return NextResponse.json(
        {
          success: false,
          error: 'Email обязателен для теста',
        },
        { status: 400 }
      );
    }
    
    // Используем функцию отправки из forgot-password route
    const testUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=test-token-123`;
    
    // Импортируем функцию отправки (скопируем логику)
    const resendApiKey = process.env.RESEND_API_KEY;
    const testResults: any = {
      email,
      testUrl,
      attempts: [] as any[],
    };
    
    // Тест Resend
    if (resendApiKey) {
      try {
        const { Resend } = require('resend');
        const resend = new Resend(resendApiKey);
        const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
        
        const result = await resend.emails.send({
          from: fromEmail,
          to: email,
          subject: 'Тест отправки email - Восстановление пароля',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">Тест отправки email</h2>
              <p>Это тестовое письмо для проверки настроек email.</p>
              <p>Если вы получили это письмо, значит настройки работают корректно.</p>
              <p style="margin: 20px 0;">
                <a href="${testUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  Тестовая ссылка восстановления
                </a>
              </p>
              <p style="color: #999; font-size: 12px; margin-top: 30px;">
                Это тестовое письмо. Ссылка недействительна.
              </p>
            </div>
          `,
        });
        
        testResults.attempts.push({
          method: 'Resend API',
          success: true,
          messageId: result.id || result.data?.id,
          message: 'Email успешно отправлен через Resend',
        });
        
        return NextResponse.json({
          success: true,
          message: 'Тестовый email успешно отправлен через Resend API',
          testResults,
        });
      } catch (error: any) {
        testResults.attempts.push({
          method: 'Resend API',
          success: false,
          error: error.message,
          details: {
            name: error?.name,
            statusCode: error?.statusCode,
          },
        });
      }
    }
    
    // Тест SMTP
    const smtpHost = process.env.SUPABASE_SMTP_HOST || process.env.SMTP_HOST;
    const smtpPort = process.env.SUPABASE_SMTP_PORT || process.env.SMTP_PORT;
    const smtpUser = process.env.SUPABASE_SMTP_USER || process.env.SMTP_USER;
    const smtpPassword = process.env.SUPABASE_SMTP_PASSWORD || process.env.SMTP_PASSWORD;
    
    if (smtpHost && smtpPort && smtpUser && smtpPassword) {
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
          from: process.env.SUPABASE_SMTP_FROM || process.env.SMTP_FROM || smtpUser,
          to: email,
          subject: 'Тест отправки email - Восстановление пароля',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">Тест отправки email</h2>
              <p>Это тестовое письмо для проверки настроек email.</p>
              <p>Если вы получили это письмо, значит настройки работают корректно.</p>
              <p style="margin: 20px 0;">
                <a href="${testUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  Тестовая ссылка восстановления
                </a>
              </p>
              <p style="color: #999; font-size: 12px; margin-top: 30px;">
                Это тестовое письмо. Ссылка недействительна.
              </p>
            </div>
          `,
        });
        
        testResults.attempts.push({
          method: smtpHost === process.env.SUPABASE_SMTP_HOST ? 'Supabase SMTP' : 'Обычный SMTP',
          success: true,
          messageId: info.messageId,
          message: 'Email успешно отправлен через SMTP',
        });
        
        return NextResponse.json({
          success: true,
          message: 'Тестовый email успешно отправлен через SMTP',
          testResults,
        });
      } catch (error: any) {
        testResults.attempts.push({
          method: smtpHost === process.env.SUPABASE_SMTP_HOST ? 'Supabase SMTP' : 'Обычный SMTP',
          success: false,
          error: error.message,
          details: {
            code: error?.code,
            command: error?.command,
          },
        });
      }
    }
    
    // Если ничего не работает
    if (testResults.attempts.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Email не настроен. Настройте один из методов отправки.',
          testResults,
        },
        { status: 400 }
      );
    }
    
    // Если все попытки провалились
    return NextResponse.json(
      {
        success: false,
        error: 'Не удалось отправить тестовый email. Проверьте настройки и логи.',
        testResults,
      },
      { status: 500 }
    );
  } catch (error: any) {
    console.error('Ошибка тестовой отправки email:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Ошибка тестовой отправки email',
      },
      { status: 500 }
    );
  }
}
