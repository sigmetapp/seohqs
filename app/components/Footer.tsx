'use client';

import { useI18n } from '@/lib/i18n-context';
import Link from 'next/link';
import { useState, useEffect } from 'react';

const ADMIN_EMAIL = 'admin@buylink.pro';

export default function Footer() {
  const { t } = useI18n();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    try {
      const response = await fetch('/api/auth/user/me');
      const data = await response.json();
      
      if (data.success && data.user) {
        const userEmail = (data.user.email || '').trim().toLowerCase();
        const adminEmail = ADMIN_EMAIL.trim().toLowerCase();
        setIsAdmin(userEmail === adminEmail);
      }
    } catch (error) {
      console.error('Ошибка проверки статуса администратора:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <footer className="bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-4">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-center items-center space-x-4">
          {!loading && (
            <Link
              href={isAdmin ? "/admin/users" : "/profile"}
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
            >
              User
            </Link>
          )}
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('footer.rights')}
          </p>
        </div>
      </div>
    </footer>
  );
}
