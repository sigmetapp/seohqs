/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Убеждаемся, что статические файлы правильно обслуживаются
  async headers() {
    return [
      {
        source: '/data/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, must-revalidate',
          },
        ],
      },
    ];
  },
}

module.exports = nextConfig
