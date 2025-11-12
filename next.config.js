/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
  // Убеждаемся, что все страницы правильно обрабатываются
  experimental: {
    serverComponentsExternalPackages: ['better-sqlite3'],
  },
}

module.exports = nextConfig
