'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n-context';

export default function Home() {
  const router = useRouter();
  const { t } = useI18n();

  const handleGetStarted = () => {
    router.push('/embed');
  };

  const tools = [
    {
      icon: '🎰',
      titleKey: 'home.toolEmbedTitle',
      descriptionKey: 'home.toolEmbedDesc',
      featuresKey: 'home.toolEmbedFeatures',
      link: '/embed',
      color: 'blue',
      gradient: 'from-blue-500 to-purple-600',
    },
    {
      icon: '💳',
      titleKey: 'home.toolTabsgenTitle',
      descriptionKey: 'home.toolTabsgenDesc',
      featuresKey: 'home.toolTabsgenFeatures',
      link: '/tabsgen',
      color: 'green',
      gradient: 'from-green-500 to-teal-600',
    },
    {
      icon: '📊',
      titleKey: 'home.toolLogcheckerTitle',
      descriptionKey: 'home.toolLogcheckerDesc',
      featuresKey: 'home.toolLogcheckerFeatures',
      link: '/logchecker',
      color: 'purple',
      gradient: 'from-purple-500 to-pink-600',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-32 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-pink-600/10 dark:from-blue-500/5 dark:via-purple-500/5 dark:to-pink-500/5"></div>
        <div className="relative max-w-7xl mx-auto">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold mb-6 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 dark:from-blue-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
              {t('home.heroTitle')}
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
              {t('home.heroDescription')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button
                onClick={handleGetStarted}
                className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-lg shadow-lg transform transition-all hover:scale-105 hover:shadow-xl"
              >
                {t('home.getStarted')}
              </button>
              <Link
                href="#features"
                className="px-8 py-4 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-semibold rounded-lg shadow-md border border-gray-200 dark:border-gray-700 hover:shadow-lg transform transition-all hover:scale-105"
              >
                {t('home.learnMore')}
              </Link>
            </div>
          </div>

        </div>
      </section>

      {/* Tools Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              {t('home.toolsTitle')}
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              {t('home.toolsSubtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {tools.map((tool, index) => (
              <Link
                key={index}
                href={tool.link}
                className="group bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 rounded-2xl p-8 shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-2xl transform transition-all hover:-translate-y-2 hover:scale-105"
              >
                <div className={`text-6xl mb-6 transform group-hover:scale-110 transition-transform`}>
                  {tool.icon}
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                  {t(tool.titleKey)}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4 text-lg">
                  {t(tool.descriptionKey)}
                </p>
                <div className={`inline-block px-4 py-2 rounded-lg text-sm font-semibold bg-gradient-to-r ${tool.gradient} text-white mb-4`}>
                  {t(tool.featuresKey)}
                </div>
                <div className="mt-6 flex items-center text-blue-600 dark:text-blue-400 font-semibold group-hover:translate-x-2 transition-transform">
                  {t('home.tryTool')} →
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>


      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            {t('home.ctaTitle')}
          </h2>
          <p className="text-xl text-white/90 mb-8">
            {t('home.ctaDescription')}
          </p>
          <button
            onClick={handleGetStarted}
            className="px-8 py-4 bg-white text-blue-600 font-semibold rounded-lg shadow-lg transform transition-all hover:scale-105 hover:shadow-xl"
          >
            {t('home.ctaButton')}
          </button>
        </div>
      </section>
    </div>
  );
}
