#!/bin/bash
echo "🚀 Деплой Google Indexing Service на Vercel"
echo ""
echo "Проверка Vercel CLI..."
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI не установлен. Устанавливаю..."
    npm install -g vercel
fi

echo "✅ Vercel CLI готов"
echo ""
echo "Проверка авторизации..."
if ! vercel whoami &> /dev/null; then
    echo "⚠️  Требуется авторизация. Запустите: vercel login"
    echo "Затем запустите этот скрипт снова."
    exit 1
fi

echo "✅ Авторизован"
echo ""
echo "📦 Сборка проекта..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Ошибка сборки"
    exit 1
fi

echo "✅ Сборка успешна"
echo ""
echo "🚀 Деплой на Vercel..."
vercel --prod --yes

echo ""
echo "✅ Деплой завершен!"
echo ""
echo "⚠️  Не забудьте добавить переменные окружения в настройках проекта:"
echo "   - GOOGLE_SERVICE_ACCOUNT_EMAIL"
echo "   - GOOGLE_PRIVATE_KEY"
