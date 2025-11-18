'use client';

import { useState, useEffect } from 'react';
import { GoogleAccount } from '@/lib/types';

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
  const [googleAccounts, setGoogleAccounts] = useState<GoogleAccount[]>([]);
  const [taskStats, setTaskStats] = useState<TaskStats>({ total: 0, open: 0, closed: 0 });
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
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

      // Загружаем команду
      const usersResponse = await fetch('/api/users');
      const usersData = await usersResponse.json();
      if (usersData.success) {
        setTeamMembers(usersData.users || []);
      }
    } catch (err) {
      console.error('Error loading summary data:', err);
    } finally {
      setLoading(false);
    }
  };

  const isAccountConnected = (account: GoogleAccount): boolean => {
    return !!(account.googleAccessToken?.trim() && account.googleRefreshToken?.trim());
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
    if (!updatedAt) return 'Никогда';
    const date = new Date(updatedAt);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return 'Только что';
    if (diffMinutes < 60) return `${diffMinutes} мин. назад`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} ч. назад`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays} дн. назад`;
    return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center">Загрузка...</div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Сводка</h1>
          <p className="text-gray-400">Общая информация о системе</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Google аккаунты */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span>🔐</span>
              <span>Google аккаунты</span>
            </h2>
            <div className="text-3xl font-bold mb-2">{googleAccounts.length}</div>
            <p className="text-sm text-gray-400 mb-4">Интегрированных аккаунтов</p>
            
            {googleAccounts.length > 0 && (
              <div className="space-y-2 mt-4">
                {googleAccounts.map((account) => (
                  <div
                    key={account.id}
                    className="flex items-center justify-between p-2 bg-gray-700 rounded text-sm"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className={isAccountConnected(account) ? 'text-green-400' : 'text-yellow-400'}>
                        {isAccountConnected(account) ? '✓' : '⚠'}
                      </span>
                      <span className="truncate">{account.email}</span>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      isAccountConnected(account)
                        ? 'bg-green-900/30 text-green-300'
                        : 'bg-yellow-900/30 text-yellow-300'
                    }`}>
                      {isAccountConnected(account) ? 'Связан' : 'Не связан'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Задачи */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span>📋</span>
              <span>Задачи</span>
            </h2>
            <div className="text-3xl font-bold mb-2">{taskStats.total}</div>
            <p className="text-sm text-gray-400 mb-4">Всего задач по всем сайтам</p>
            
            <div className="space-y-2 mt-4">
              <div className="flex items-center justify-between p-2 bg-gray-700 rounded">
                <span className="text-sm text-gray-300">Открыто</span>
                <span className="text-lg font-bold text-green-400">{taskStats.open}</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-gray-700 rounded">
                <span className="text-sm text-gray-300">Закрыто</span>
                <span className="text-lg font-bold text-gray-400">{taskStats.closed}</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-gray-700 rounded">
                <span className="text-sm text-gray-300">Всего</span>
                <span className="text-lg font-bold text-white">{taskStats.total}</span>
              </div>
            </div>
          </div>

          {/* Команда */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span>👥</span>
              <span>Команда</span>
            </h2>
            <div className="text-3xl font-bold mb-2">{teamMembers.length}</div>
            <p className="text-sm text-gray-400 mb-4">Людей в команде</p>
            
            {teamMembers.length > 0 && (
              <div className="space-y-2 mt-4 max-h-64 overflow-y-auto">
                {teamMembers.map((member) => {
                  const online = isUserOnline(member);
                  return (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-2 bg-gray-700 rounded text-sm"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          online ? 'bg-green-400' : 'bg-gray-500'
                        }`} />
                        <span className="truncate">{member.name || member.email}</span>
                      </div>
                      <div className="flex flex-col items-end text-xs">
                        <span className={online ? 'text-green-400' : 'text-gray-400'}>
                          {online ? 'Онлайн' : 'Офлайн'}
                        </span>
                        <span className="text-gray-500">
                          {formatLastSeen(member.updatedAt)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
