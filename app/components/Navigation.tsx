'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/lib/theme-context';
import { useI18n } from '@/lib/i18n-context';

export default function Navigation() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useI18n();

  const navItems: Array<{ href: string; labelKey: string }> = [
    { href: '/blog', labelKey: 'Blog' },
    { href: '/embed', labelKey: 'Slotget' },
    { href: '/tabsgen', labelKey: 'TabsGen' },
    { href: '/logchecker', labelKey: 'Logchecker' },
  ];

  return (
    <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="flex items-center">
                <h1 className="text-2xl font-extrabold bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 dark:from-blue-400 dark:via-blue-300 dark:to-indigo-400 bg-clip-text text-transparent tracking-tight">
                  seohqs
                </h1>
              </Link>
            </div>
            <div className="hidden md:ml-[50px] md:flex md:space-x-4 lg:space-x-6 md:items-center">
              {navItems.map((item) => {
                const isActive = pathname === item.href || 
                  (item.href !== '/' && pathname?.startsWith(item.href));
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`inline-flex items-center px-2 pt-1 border-b-2 text-sm font-medium transition-colors whitespace-nowrap ${
                      isActive
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-300'
                    }`}
                  >
                    {item.labelKey === 'Blog' ? 'Blog' : item.labelKey === 'Slotget' ? 'Slotget' : item.labelKey === 'TabsGen' ? 'TabsGen' : item.labelKey === 'Logchecker' ? 'Logchecker' : t(item.labelKey)}
                  </Link>
                );
              })}
              
            </div>
          </div>
          <div className="flex items-center space-x-2 md:space-x-3">
            {/* Language switcher */}
            <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded overflow-hidden">
              <button
                onClick={() => setLanguage('ru')}
                className={`px-2 py-1 text-xs font-medium transition-colors ${
                  language === 'ru'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                RU
              </button>
              <button
                onClick={() => setLanguage('en')}
                className={`px-2 py-1 text-xs font-medium transition-colors ${
                  language === 'en'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                Eng
              </button>
            </div>

            {/* Theme switcher */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            >
              {theme === 'dark' ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className="md:hidden">
        <div className="pt-2 pb-3 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== '/' && pathname?.startsWith(item.href));
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium transition-colors ${
                  isActive
                    ? 'bg-gray-100 dark:bg-gray-900 border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                {item.labelKey === 'Blog' ? 'Blog' : item.labelKey === 'Content Generator' ? 'Content Generator' : item.labelKey === 'Humanize' ? 'Humanize' : item.labelKey === 'TabsGen' ? 'TabsGen' : item.labelKey === 'Logchecker' ? 'Logchecker' : t(item.labelKey)}
              </Link>
            );
          })}
          
        </div>
      </div>
    </nav>
  );
}
