'use client';

import { useI18n } from '@/lib/i18n-context';

export default function Footer() {
  const { t } = useI18n();
  
  return (
    <footer className="bg-gray-800 dark:bg-gray-800 bg-gray-100 border-t border-gray-700 dark:border-gray-700 border-gray-200 py-4">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-center text-sm text-gray-400 dark:text-gray-400 text-gray-600">
          {t('footer.rights')}
        </p>
      </div>
    </footer>
  );
}
