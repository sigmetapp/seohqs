'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n-context';

export default function Home() {
  const router = useRouter();
  const { t } = useI18n();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Проверяем, авторизован ли пользователь
    fetch('/api/auth/user/me')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.user) {
          setUser(data.user);
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  const handleGetStarted = () => {
    if (user) {
      router.push('/summary');
    } else {
      router.push('/login');
    }
  };

  // Демо данные для презентации
  const demoStats = {
    sites: 12,
    indexedLinks: 1247,
    totalClicks: 45892,
    totalImpressions: 1245830,
    tasksCompleted: 89,
    teamMembers: 5,
  };

  const demoFeatures = [
    {
      icon: '🌐',
      title: 'Управление сайтами',
      description: 'Централизованное управление всеми вашими сайтами. Отслеживайте статистику, задачи и производительность в одном месте.',
      stats: `${demoStats.sites} сайтов`,
      color: 'blue',
    },
    {
      icon: '🔗',
      title: 'Индексация ссылок',
      description: 'Быстрая индексация ссылок через Google Indexing API. Массовая обработка и автоматическое отслеживание статуса.',
      stats: `${demoStats.indexedLinks.toLocaleString()} ссылок`,
      color: 'green',
    },
    {
      icon: '📊',
      title: 'Google Search Console',
      description: 'Интеграция с Google Search Console для получения данных о кликах, показах и позициях в поиске.',
      stats: `${demoStats.totalClicks.toLocaleString()} кликов`,
      color: 'purple',
    },
    {
      icon: '📈',
      title: 'Аналитика и отчеты',
      description: 'Детальная аналитика по всем вашим сайтам. Отслеживайте тренды, производительность и рост.',
      stats: `${demoStats.totalImpressions.toLocaleString()} показов`,
      color: 'orange',
    },
    {
      icon: '✅',
      title: 'Управление задачами',
      description: 'Система управления задачами для каждого сайта. Отслеживайте прогресс и координируйте работу команды.',
      stats: `${demoStats.tasksCompleted} выполнено`,
      color: 'indigo',
    },
    {
      icon: '👥',
      title: 'Командная работа',
      description: 'Работайте вместе с командой. Управляйте доступом, назначайте задачи и отслеживайте активность.',
      stats: `${demoStats.teamMembers} участников`,
      color: 'pink',
    },
  ];

  const demoTableData = [
    { domain: 'example.com', clicks: 12450, impressions: 245830, ctr: 5.1, position: 3.2 },
    { domain: 'mysite.ru', clicks: 8920, impressions: 189450, ctr: 4.7, position: 4.1 },
    { domain: 'webapp.io', clicks: 15630, impressions: 312560, ctr: 5.0, position: 2.8 },
    { domain: 'blog.site', clicks: 5430, impressions: 124580, ctr: 4.4, position: 5.3 },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-32 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-pink-600/10 dark:from-blue-500/5 dark:via-purple-500/5 dark:to-pink-500/5"></div>
        <div className="relative max-w-7xl mx-auto">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold mb-6 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 dark:from-blue-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
              SEO Tools Platform
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
              Комплексное решение для управления SEO, индексации ссылок и аналитики ваших сайтов
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button
                onClick={handleGetStarted}
                className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-lg shadow-lg transform transition-all hover:scale-105 hover:shadow-xl"
              >
                {user ? 'Перейти в панель' : 'Начать работу'}
              </button>
              <Link
                href="#features"
                className="px-8 py-4 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-semibold rounded-lg shadow-md border border-gray-200 dark:border-gray-700 hover:shadow-lg transform transition-all hover:scale-105"
              >
                Узнать больше
              </Link>
            </div>
          </div>

          {/* Demo Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16 max-w-5xl mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 transform hover:scale-105 transition-all">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{demoStats.sites}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Сайтов</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 transform hover:scale-105 transition-all">
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">{demoStats.indexedLinks.toLocaleString()}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Индексировано</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 transform hover:scale-105 transition-all">
              <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">{demoStats.totalClicks.toLocaleString()}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Кликов</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 transform hover:scale-105 transition-all">
              <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">{demoStats.totalImpressions.toLocaleString()}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Показов</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Возможности платформы
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Все инструменты для эффективного управления SEO в одном месте
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {demoFeatures.map((feature, index) => (
              <div
                key={index}
                className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transform transition-all hover:-translate-y-2"
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {feature.description}
                </p>
                <div className={`inline-block px-3 py-1 rounded-full text-sm font-semibold bg-${feature.color}-100 dark:bg-${feature.color}-900/30 text-${feature.color}-700 dark:text-${feature.color}-300`}>
                  {feature.stats}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo Data Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Примеры данных
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Посмотрите, как выглядят данные в реальной работе
            </p>
          </div>

          {/* Demo Table */}
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-blue-600 to-purple-600">
                  <tr>
                    <th className="px-6 py-4 text-left text-white font-semibold">Домен</th>
                    <th className="px-6 py-4 text-right text-white font-semibold">Клики</th>
                    <th className="px-6 py-4 text-right text-white font-semibold">Показы</th>
                    <th className="px-6 py-4 text-right text-white font-semibold">CTR</th>
                    <th className="px-6 py-4 text-right text-white font-semibold">Позиция</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {demoTableData.map((row, index) => (
                    <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                        {row.domain}
                      </td>
                      <td className="px-6 py-4 text-right text-gray-900 dark:text-white">
                        {row.clicks.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right text-gray-900 dark:text-white">
                        {row.impressions.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right text-green-600 dark:text-green-400 font-semibold">
                        {row.ctr}%
                      </td>
                      <td className="px-6 py-4 text-right text-gray-900 dark:text-white">
                        {row.position}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Demo Charts/Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Индексация</h3>
                <span className="text-2xl">🔗</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Индексировано</span>
                  <span className="font-semibold text-gray-900 dark:text-white">1,247</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: '87%' }}></div>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">В обработке</span>
                  <span className="font-semibold text-gray-900 dark:text-white">156</span>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Задачи</h3>
                <span className="text-2xl">✅</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Выполнено</span>
                  <span className="font-semibold text-green-600 dark:text-green-400">89</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: '74%' }}></div>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">В работе</span>
                  <span className="font-semibold text-orange-600 dark:text-orange-400">23</span>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Команда</h3>
                <span className="text-2xl">👥</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Активных</span>
                  <span className="font-semibold text-green-600 dark:text-green-400">5</span>
                </div>
                <div className="flex gap-2 mt-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-semibold"
                    >
                      {i}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Готовы начать?
          </h2>
          <p className="text-xl text-white/90 mb-8">
            Присоединяйтесь к платформе и начните эффективно управлять SEO уже сегодня
          </p>
          <button
            onClick={handleGetStarted}
            className="px-8 py-4 bg-white text-blue-600 font-semibold rounded-lg shadow-lg transform transition-all hover:scale-105 hover:shadow-xl"
          >
            {user ? 'Перейти в панель' : 'Начать бесплатно'}
          </button>
        </div>
      </section>
    </div>
  );
}
