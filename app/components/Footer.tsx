'use client';

import { useI18n } from '@/lib/i18n-context';
import Link from 'next/link';

export default function Footer() {
  const { t } = useI18n();

  return (
    <footer className="bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-4">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('footer.rights')}
          </p>
          <Link
            href="/admin/users"
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors font-medium"
          >
            Управление пользователями
          </Link>
        </div>
      </div>
    </footer>
  );
}
