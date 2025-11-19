'use client';

import { useState, useEffect } from 'react';
import { GoogleAccount } from '@/lib/types';
import { useI18n } from '@/lib/i18n-context';

interface TaskStats {
  total: number;
  open: number;
  closed: number;
}

interface TeamMember {
  id: number;
  email: string;
  name?: string;
  updatedAt?: string;
}

export default function SummaryPage() {
  const { t, language } = useI18n();
  const [googleAccounts, setGoogleAccounts] = useState<GoogleAccount[]>([]);
  const [taskStats, setTaskStats] = useState<TaskStats>({ total: 0, open: 0, closed: 0 });
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [sitesCount, setSitesCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Загружаем Google аккаунты
      const accountsResponse = await fetch('/api/google-accounts');
      const accountsData = await accountsResponse.json();
      if (accountsData.success) {
        setGoogleAccounts(accountsData.accounts || []);
      }

      // Загружаем статистику задач
      const statsResponse = await fetch('/api/sites/stats');
      const statsData = await statsResponse.json();
      if (statsData.success && statsData.stats) {
        const aggregated = statsData.stats.reduce((acc: TaskStats, stat: any) => {
          acc.total += stat.tasks.total || 0;
          acc.open += stat.tasks.open || 0;
          acc.closed += stat.tasks.closed || 0;
          return acc;
        }, { total: 0, open: 0, closed: 0 });
        setTaskStats(aggregated);
      }

      // Загружаем команду (только участников, добавленных автором через настройки)
      const teamResponse = await fetch('/api/auth/user/team');
      const teamData = await teamResponse.json();
      if (teamData.success) {
        setTeamMembers(teamData.members || []);
      }

      // Загружаем количество сайтов
      const sitesResponse = await fetch('/api/sites');
      const sitesData = await sitesResponse.json();
      if (sitesData.success && sitesData.sites) {
        setSitesCount(sitesData.sites.length || 0);
      }
    } catch (err) {
      console.error('Error loading summary data:', err);
    } finally {
      setLoading(false);
    }
  };

  const isAccountConnected = (account: GoogleAccount): boolean => {
    // Аккаунт считается интегрированным, если есть refresh token
    // (с refresh token можно получить новый access token)
    const refreshToken = account.googleRefreshToken?.trim() || '';
    return !!refreshToken;
  };

  const isUserOnline = (member: TeamMember): boolean => {
    if (!member.updatedAt) return false;
    const lastSeen = new Date(member.updatedAt);
    const now = new Date();
    const diffMinutes = (now.getTime() - lastSeen.getTime()) / (1000 * 60);
    // Считаем онлайн, если был активен в последние 5 минут
    return diffMinutes <= 5;
  };

  const formatLastSeen = (updatedAt?: string): string => {
    if (!updatedAt) return t('common.never');
    const date = new Date(updatedAt);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return t('common.justNow');
    if (diffMinutes < 60) return `${diffMinutes} ${t('common.minutesAgo')}`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} ${t('common.hoursAgo')}`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays} ${t('common.daysAgo')}`;
    return date.toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-white p-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center text-gray-900 dark:text-white">{t('common.loading')}</div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 text-gray-900 dark:text-white">{t('summary.title')}</h1>
          <p className="text-gray-700 dark:text-gray-400">{t('summary.description')}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Google аккаунты */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
              <span>🔐</span>
              <span>{t('summary.googleAccounts')}</span>
            </h2>
            <div className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">
              {googleAccounts.filter(account => isAccountConnected(account)).length}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{t('summary.integratedAccounts')}</p>
            
            {googleAccounts.length > 0 && (
              <div className="space-y-2 mt-4">
                {googleAccounts.map((account) => (
                  <div
                    key={account.id}
                    className="flex items-center justify-between p-2 bg-gray-100 dark:bg-gray-700 rounded text-sm"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className={isAccountConnected(account) ? 'text-green-500' : 'text-yellow-500'}>
                        {isAccountConnected(account) ? '✓' : '⚠'}
                      </span>
                      <span className="truncate text-gray-900 dark:text-white">{account.email}</span>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      isAccountConnected(account)
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                        : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                    }`}>
                      {isAccountConnected(account) ? t('common.connected') : t('common.notConnected')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Задачи */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
              <span>📋</span>
              <span>{t('summary.tasks')}</span>
            </h2>
            <div className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">{taskStats.total}</div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{t('summary.totalTasks')}</p>
            
            <div className="space-y-2 mt-4">
              <div className="flex items-center justify-between p-2 bg-gray-100 dark:bg-gray-700 rounded">
                <span className="text-sm text-gray-800 dark:text-gray-300">{t('summary.open')}</span>
                <span className="text-lg font-bold text-green-600 dark:text-green-500">{taskStats.open}</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-gray-100 dark:bg-gray-700 rounded">
                <span className="text-sm text-gray-800 dark:text-gray-300">{t('summary.closed')}</span>
                <span className="text-lg font-bold text-gray-700 dark:text-gray-400">{taskStats.closed}</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-gray-100 dark:bg-gray-700 rounded">
                <span className="text-sm text-gray-800 dark:text-gray-300">{t('summary.total')}</span>
                <span className="text-lg font-bold text-gray-900 dark:text-white">{taskStats.total}</span>
              </div>
            </div>
          </div>

          {/* Команда */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
              <span>👥</span>
              <span>{t('summary.team')}</span>
            </h2>
            <div className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">{teamMembers.length}</div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{t('summary.peopleInTeam')}</p>
            
            {teamMembers.length > 0 && (
              <div className="space-y-2 mt-4 max-h-64 overflow-y-auto">
                {teamMembers.map((member) => {
                  const online = isUserOnline(member);
                  return (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-2 bg-gray-100 dark:bg-gray-700 rounded text-sm"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          online ? 'bg-green-500' : 'bg-gray-500'
                        }`} />
                        <span className="truncate text-gray-900 dark:text-white">{member.name || member.email}</span>
                      </div>
                      <div className="flex flex-col items-end text-xs">
                        <span className={online ? 'text-green-600 dark:text-green-500' : 'text-gray-700 dark:text-gray-400'}>
                          {online ? t('common.online') : t('common.offline')}
                        </span>
                        <span className="text-gray-700 dark:text-gray-500">
                          {formatLastSeen(member.updatedAt)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Сайты */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
              <span>🌐</span>
              <span>{t('summary.sites')}</span>
            </h2>
            <div className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">{sitesCount}</div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{t('summary.addedSites')}</p>
          </div>
        </div>
      </div>
    </main>
  );
}
