'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface DomainStats {
  [domain: string]: number;
}

interface ScriptStats {
  total: number;
  byDomain: DomainStats;
}

interface StatsData {
  success: boolean;
  period: string;
  startDate: string;
  endDate: string;
  stats: {
    'tabsgen.js': ScriptStats;
    'slot.js': ScriptStats;
  };
}

export default function StatsPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('day');
  const [loadingStats, setLoadingStats] = useState(false);

  // Проверяем, есть ли сохраненная сессия
  useEffect(() => {
    const savedAuth = localStorage.getItem('stats_auth');
    if (savedAuth === 'true') {
      setIsAuthenticated(true);
      fetchStats('day');
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Проверяем учетные данные локально
      if (username === 'seosasha' && password === 'Sasha1991!') {
        setIsAuthenticated(true);
        localStorage.setItem('stats_auth', 'true');
        await fetchStats(period);
      } else {
        setError('Неверный логин или пароль');
      }
    } catch (err) {
      setError('Ошибка входа');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('stats_auth');
    setStats(null);
    setUsername('');
    setPassword('');
  };

  const fetchStats = async (selectedPeriod: 'day' | 'week' | 'month') => {
    setLoadingStats(true);
    try {
      // Создаем Basic Auth заголовок
      const credentials = btoa('seosasha:Sasha1991!');
      
      const response = await fetch(`/api/stats/embed?period=${selectedPeriod}`, {
        headers: {
          'Authorization': `Basic ${credentials}`,
        },
      });

      if (response.status === 401) {
        setIsAuthenticated(false);
        localStorage.removeItem('stats_auth');
        setError('Сессия истекла. Пожалуйста, войдите снова.');
        return;
      }

      if (!response.ok) {
        throw new Error('Ошибка загрузки статистики');
      }

      const data = await response.json();
      setStats(data);
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки статистики');
    } finally {
      setLoadingStats(false);
    }
  };

  const handlePeriodChange = (newPeriod: 'day' | 'week' | 'month') => {
    setPeriod(newPeriod);
    fetchStats(newPeriod);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-700">
          <h1 className="text-3xl font-bold text-center mb-6 text-gray-900 dark:text-white">
            Статистика Embed Скриптов
          </h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Логин
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Пароль
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            {error && (
              <div className="text-red-600 dark:text-red-400 text-sm">{error}</div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Вход...' : 'Войти'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTopDomains = (byDomain: DomainStats, limit: number = 10) => {
    return Object.entries(byDomain)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
            Статистика Embed Скриптов
          </h1>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors"
          >
            Выйти
          </button>
        </div>

        {/* Period Selector */}
        <div className="mb-6 flex gap-2">
          <button
            onClick={() => handlePeriodChange('day')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              period === 'day'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            За сутки
          </button>
          <button
            onClick={() => handlePeriodChange('week')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              period === 'week'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            За 7 дней
          </button>
          <button
            onClick={() => handlePeriodChange('month')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              period === 'month'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            За месяц
          </button>
        </div>

        {loadingStats && (
          <div className="text-center py-8 text-gray-600 dark:text-gray-400">
            Загрузка статистики...
          </div>
        )}

        {stats && !loadingStats && (
          <>
            <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
              Период: {formatDate(stats.startDate)} - {formatDate(stats.endDate)}
            </div>

            {/* Tabsgen.js Stats */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6 border border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                tabsgen.js
              </h2>
              <div className="mb-4">
                <span className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {stats.stats['tabsgen.js'].total}
                </span>
                <span className="text-gray-600 dark:text-gray-400 ml-2">вызовов</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Топ доменов:
              </h3>
              <div className="space-y-2">
                {getTopDomains(stats.stats['tabsgen.js'].byDomain).map(([domain, count], index) => (
                  <div
                    key={domain}
                    className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg"
                  >
                    <span className="text-gray-900 dark:text-white font-medium">
                      {index + 1}. {domain}
                    </span>
                    <span className="text-blue-600 dark:text-blue-400 font-bold">
                      {count}
                    </span>
                  </div>
                ))}
                {Object.keys(stats.stats['tabsgen.js'].byDomain).length === 0 && (
                  <div className="text-gray-500 dark:text-gray-400 text-center py-4">
                    Нет данных за выбранный период
                  </div>
                )}
              </div>
            </div>

            {/* Slot.js Stats */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                slot.js
              </h2>
              <div className="mb-4">
                <span className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                  {stats.stats['slot.js'].total}
                </span>
                <span className="text-gray-600 dark:text-gray-400 ml-2">вызовов</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Топ доменов:
              </h3>
              <div className="space-y-2">
                {getTopDomains(stats.stats['slot.js'].byDomain).map(([domain, count], index) => (
                  <div
                    key={domain}
                    className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg"
                  >
                    <span className="text-gray-900 dark:text-white font-medium">
                      {index + 1}. {domain}
                    </span>
                    <span className="text-purple-600 dark:text-purple-400 font-bold">
                      {count}
                    </span>
                  </div>
                ))}
                {Object.keys(stats.stats['slot.js'].byDomain).length === 0 && (
                  <div className="text-gray-500 dark:text-gray-400 text-center py-4">
                    Нет данных за выбранный период
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {error && stats === null && !loadingStats && (
          <div className="text-center py-8 text-red-600 dark:text-red-400">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
