/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    // Исключаем better-sqlite3 из серверного бандла на Vercel
    if (isServer && process.env.VERCEL) {
      config.externals = config.externals || [];
      config.externals.push('better-sqlite3');
    }
    return config;
  },
}

module.exports = nextConfig
