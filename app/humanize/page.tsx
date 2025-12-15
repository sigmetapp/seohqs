'use client';

import { useState } from 'react';

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
  const [text, setText] = useState('');
  const [strategy, setStrategy] = useState('mode1');
  const [humanizing, setHumanizing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [showDebug, setShowDebug] = useState(false);

  const handleHumanize = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!text.trim()) {
      setError('Введите текст для обработки');
      return;
    }

    setHumanizing(true);
    setError(null);
    setResult(null);
    setDebugInfo(null);

    const startTime = Date.now();
    const debugData: any = {
      timestamp: new Date().toISOString(),
      input: {
        textLength: text.length,
        textPreview: text.substring(0, 200) + (text.length > 200 ? '...' : ''),
        strategy,
        strategyLabel: HUMANIZE_STRATEGIES.find(s => s.value === strategy)?.label || strategy,
      },
      request: {},
      response: {},
      timing: {},
    };

    try {
      console.log('[HUMANIZE DEBUG] Начало обработки:', {
        strategy,
        textLength: text.length,
        timestamp: debugData.timestamp,
      });

      const requestBody = {
        text,
        strategy,
      };

      debugData.request.body = {
        textLength: text.length,
        strategy,
      };
      debugData.request.headers = {
        'Content-Type': 'application/json',
      };

      const requestStartTime = Date.now();
      const response = await fetch('/api/humanize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const requestTime = Date.now() - requestStartTime;
      debugData.timing.requestTime = `${requestTime}ms`;

      debugData.response.status = response.status;
      debugData.response.statusText = response.statusText;
      debugData.response.headers = Object.fromEntries(response.headers.entries());

      const data = await response.json();
      debugData.response.data = {
        success: data.success,
        resultLength: data.result?.length || 0,
        error: data.error || null,
        debug: data.debug || null,
      };

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Ошибка обработки текста');
      }

      const totalTime = Date.now() - startTime;
      debugData.timing.totalTime = `${totalTime}ms`;
      debugData.output = {
        resultLength: data.result?.length || 0,
        resultPreview: data.result?.substring(0, 200) + (data.result?.length > 200 ? '...' : ''),
      };

      // Добавляем debug информацию из ответа сервера, если есть
      if (data.debug) {
        debugData.serverDebug = data.debug;
      }

      setResult(data.result);
      setDebugInfo(debugData);

      console.log('[HUMANIZE DEBUG] Успешная обработка:', debugData);
    } catch (err: any) {
      const totalTime = Date.now() - startTime;
      debugData.timing.totalTime = `${totalTime}ms`;
      debugData.error = {
        message: err.message,
        stack: err.stack,
      };

      console.error('[HUMANIZE DEBUG] Ошибка:', err);
      console.error('[HUMANIZE DEBUG] Debug данные:', debugData);
      
      setError(err.message || 'Ошибка обработки текста');
      setDebugInfo(debugData);
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
              <div className="flex gap-2">
                <button
                  onClick={() => setShowDebug(!showDebug)}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm font-medium"
                >
                  {showDebug ? 'Скрыть' : 'Показать'} Debug
                </button>
                <button
                  onClick={() => copyToClipboard(result)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
                >
                  Копировать
                </button>
              </div>
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

        {/* Debug информация */}
        {debugInfo && showDebug && (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mt-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              Debug информация
            </h2>
            
            <div className="space-y-4">
              {/* Входные данные */}
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Входные данные</h3>
                <div className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                  <div><strong>Время:</strong> {new Date(debugInfo.timestamp).toLocaleString('ru-RU')}</div>
                  <div><strong>Стратегия:</strong> {debugInfo.input.strategyLabel} ({debugInfo.input.strategy})</div>
                  <div><strong>Длина текста:</strong> {debugInfo.input.textLength} символов</div>
                  <div><strong>Превью текста:</strong> 
                    <div className="mt-1 p-2 bg-white dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-600 text-xs font-mono">
                      {debugInfo.input.textPreview}
                    </div>
                  </div>
                </div>
              </div>

              {/* Запрос */}
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Запрос</h3>
                <div className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                  <div><strong>Метод:</strong> POST</div>
                  <div><strong>Endpoint:</strong> /api/humanize</div>
                  <div><strong>Длина текста в запросе:</strong> {debugInfo.request.body?.textLength || 'N/A'} символов</div>
                  <div><strong>Стратегия в запросе:</strong> {debugInfo.request.body?.strategy || 'N/A'}</div>
                </div>
              </div>

              {/* Ответ */}
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Ответ сервера</h3>
                <div className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                  <div><strong>Статус:</strong> {debugInfo.response.status} {debugInfo.response.statusText}</div>
                  <div><strong>Успех:</strong> {debugInfo.response.data?.success ? '✅ Да' : '❌ Нет'}</div>
                  <div><strong>Длина результата:</strong> {debugInfo.response.data?.resultLength || 0} символов</div>
                  {debugInfo.response.data?.error && (
                    <div className="text-red-600 dark:text-red-400"><strong>Ошибка:</strong> {debugInfo.response.data.error}</div>
                  )}
                </div>
              </div>

              {/* Выходные данные */}
              {debugInfo.output && (
                <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Выходные данные</h3>
                  <div className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                    <div><strong>Длина результата:</strong> {debugInfo.output.resultLength} символов</div>
                    <div><strong>Превью результата:</strong>
                      <div className="mt-1 p-2 bg-white dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-600 text-xs font-mono">
                        {debugInfo.output.resultPreview}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Тайминг */}
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Тайминг</h3>
                <div className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                  <div><strong>Время запроса:</strong> {debugInfo.timing.requestTime || 'N/A'}</div>
                  <div><strong>Общее время:</strong> {debugInfo.timing.totalTime || 'N/A'}</div>
                </div>
              </div>

              {/* Debug с сервера */}
              {debugInfo.serverDebug && (
                <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Debug с сервера</h3>
                  <pre className="text-xs text-gray-700 dark:text-gray-300 overflow-auto p-2 bg-white dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-600">
                    {JSON.stringify(debugInfo.serverDebug, null, 2)}
                  </pre>
                </div>
              )}

              {/* Ошибка */}
              {debugInfo.error && (
                <div className="bg-red-50 dark:bg-red-900 p-4 rounded-lg">
                  <h3 className="font-semibold text-red-900 dark:text-red-200 mb-2">Ошибка</h3>
                  <div className="text-sm text-red-700 dark:text-red-300 space-y-1">
                    <div><strong>Сообщение:</strong> {debugInfo.error.message}</div>
                    {debugInfo.error.stack && (
                      <div className="mt-2">
                        <strong>Stack trace:</strong>
                        <pre className="text-xs mt-1 p-2 bg-white dark:bg-gray-800 rounded border border-red-300 dark:border-red-600 overflow-auto">
                          {debugInfo.error.stack}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Полный JSON */}
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Полный JSON Debug</h3>
                <pre className="text-xs text-gray-700 dark:text-gray-300 overflow-auto p-2 bg-white dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-600 max-h-96">
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
