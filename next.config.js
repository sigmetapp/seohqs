/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Отключаем для ускорения сборки
  swcMinify: true, // Используем SWC минификацию (быстрее)
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production', // Убираем console.log в продакшене
  },
  // Оптимизация для быстрого деплоя
  poweredByHeader: false, // Убираем заголовок X-Powered-By
  generateEtags: false, // Отключаем ETags для ускорения
  compress: true, // Включаем сжатие
  
  webpack: (config, { isServer }) => {
    // Исключаем better-sqlite3 из серверного бандла
    if (isServer) {
      config.externals = config.externals || [];
      if (Array.isArray(config.externals)) {
        config.externals.push('better-sqlite3');
      } else {
        config.externals = [config.externals, 'better-sqlite3'];
      }
    }
    return config;
  },
  
  experimental: {
    serverComponentsExternalPackages: ['better-sqlite3'],
    optimizePackageImports: ['@supabase/supabase-js', 'googleapis'], // Оптимизация импортов
  },
  
  // Отключаем проверки при сборке для ускорения деплоя
  typescript: {
    ignoreBuildErrors: true, // Отключаем проверку типов для скорости деплоя
  },
  eslint: {
    ignoreDuringBuilds: true, // Отключаем ESLint при сборке для ускорения
  },
}

module.exports = nextConfig
