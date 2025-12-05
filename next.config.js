/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  swcMinify: true,
  poweredByHeader: false,
  compress: true,
  
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
    optimizePackageImports: ['@supabase/supabase-js'],
  },
  
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig
