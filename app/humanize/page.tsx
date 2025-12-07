'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const HUMANIZE_STRATEGIES = [
  {
    value: 'mode1',
    label: 'РЕЖИМ 1: Мягкий перефраз',
    description: 'Сделать текст более человеческим и плавным, не меняя структуру и логику',
  },
  {
    value: 'mode2',
    label: 'РЕЖИМ 2: Чистка штампов',
    description: 'Убрать "запах ИИ" и канцелярит',
  },
  {
    value: 'mode3',
    label: 'РЕЖИМ 3: Конкретизация',
    description: 'Сделать мысли более ясными и конкретными без придуманных фактов',
  },
  {
    value: 'mode4',
    label: 'РЕЖИМ 4: Диалоговый ритм',
    description: 'Сделать текст более живым за счет ритма и легкого диалога',
  },
  {
    value: 'mode5',
    label: 'РЕЖИМ 5: Финальная хуманизация',
    description: 'Финальная вычитка против "роботности"',
  },
];

export default function HumanizePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [text, setText] = useState('');
  const [strategy, setStrategy] = useState('mode1');
  const [humanizing, setHumanizing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/user/me');
      
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      
      const data = await res.json();
      
      if (!data.success || !data.user) {
        router.push('/login');
        return;
      }

      setUser(data.user);
    } catch (error) {
      console.error('Ошибка проверки авторизации:', error);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const handleHumanize = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!text.trim()) {
      setError('Введите текст для обработки');
      return;
    }

    setHumanizing(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/humanize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          strategy,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Ошибка обработки текста');
      }

      setResult(data.result);
    } catch (err: any) {
      console.error('Ошибка humanize:', err);
      setError(err.message || 'Ошибка обработки текста');
    } finally {
      setHumanizing(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('Текст скопирован в буфер обмена');
    } catch (error) {
      console.error('Ошибка копирования:', error);
      alert('Не удалось скопировать текст');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-400">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
          Humanize
        </h1>

        {/* Форма */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-8">
          <form onSubmit={handleHumanize} className="space-y-6">
            {/* Блок для ввода текста */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Текст для обработки *
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                required
                rows={12}
                className="w-full px-4 py-3 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                placeholder="Вставьте текст, который нужно сделать более человеческим..."
              />
            </div>

            {/* Стратегия Humanize */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Стратегия Humanize
              </label>
              <select
                value={strategy}
                onChange={(e) => setStrategy(e.target.value)}
                className="w-full px-4 py-3 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {HUMANIZE_STRATEGIES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                {HUMANIZE_STRATEGIES.find((s) => s.value === strategy)?.description}
              </p>
            </div>

            {error && (
              <div className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={humanizing || !text.trim()}
              className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {humanizing ? 'Обработка...' : 'Humanize'}
            </button>
          </form>
        </div>

        {/* Результат */}
        {result && (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Результат
              </h2>
              <button
                onClick={() => copyToClipboard(result)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
              >
                Копировать
              </button>
            </div>

            <div className="p-6 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="prose prose-lg dark:prose-invert max-w-none
                prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-p:leading-relaxed prose-p:mb-4
                prose-headings:text-gray-900 dark:prose-headings:text-white
                whitespace-pre-wrap text-gray-900 dark:text-white">
                {result}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
