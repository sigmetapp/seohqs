'use client';

import { useState } from 'react';
import PaymentMethodsTable, { CountryCode } from '../components/PaymentMethodsTable';

export default function TabsGenPage() {
  const [country, setCountry] = useState<CountryCode>('UK');
  const [copied, setCopied] = useState(false);

  const countries: { code: CountryCode; name: string; flag: string }[] = [
    { code: 'UK', name: 'United Kingdom', flag: '🇬🇧' },
    { code: 'DE', name: 'Germany', flag: '🇩🇪' },
    { code: 'FR', name: 'France', flag: '🇫🇷' },
    { code: 'ES', name: 'Spain', flag: '🇪🇸' },
    { code: 'IT', name: 'Italy', flag: '🇮🇹' },
    { code: 'PT', name: 'Portugal', flag: '🇵🇹' },
    { code: 'BR', name: 'Brazil', flag: '🇧🇷' },
    { code: 'BG', name: 'Bulgaria', flag: '🇧🇬' },
    { code: 'HU', name: 'Hungary', flag: '🇭🇺' },
    { code: 'FI', name: 'Finland', flag: '🇫🇮' },
    { code: 'NO', name: 'Norway', flag: '🇳🇴' },
  ];

  const generateEmbedCode = () => {
    const embedCode = `<!-- Payment Methods Table Widget by SEOHQS -->
<div id="seohqs-payment-methods-widget"></div>
<script>
  (function() {
    var script = document.createElement('script');
    script.src = 'https://www.seohqs.com/embed/tabsgen.js';
    script.setAttribute('data-country', '${country}');
    document.head.appendChild(script);
  })();
</script>
<!-- End SEOHQS Payment Methods Widget -->`;

    return embedCode;
  };

  const handleCopy = () => {
    const code = generateEmbedCode();
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-extrabold mb-6 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 dark:from-blue-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
            TabsGen - Таблица платежных методов
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Создайте красивую интерактивную таблицу со статусами топ-5 самых популярных платежных методов для казино и слотов.
            Просто выберите страну и скопируйте код для встраивания!
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Preview Section */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10 font-black text-6xl rotate-12 select-none">
                PREVIEW
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 relative z-10">
                Предпросмотр
              </h2>
              <PaymentMethodsTable country={country} />
            </div>
          </div>

          {/* Configuration Section */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                Настройки
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Выберите страну
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {countries.map((c) => (
                      <button
                        key={c.code}
                        onClick={() => setCountry(c.code)}
                        className={`
                          flex items-center gap-2 px-4 py-3 rounded-lg font-medium text-sm transition-all
                          border-2
                          ${country === c.code
                            ? 'bg-blue-600 text-white border-blue-600 shadow-lg scale-105'
                            : 'text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'}
                        `}
                      >
                        <span className="text-xl">{c.flag}</span>
                        <span>{c.name}</span>
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    Таблица автоматически адаптируется под выбранный язык страны
                  </p>
                </div>
              </div>
            </div>

            {/* Embed Code Section */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Код для встраивания
                </h2>
                <button
                  onClick={handleCopy}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                    copied
                      ? 'bg-green-500 text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {copied ? '✓ Скопировано!' : '📋 Копировать'}
                </button>
              </div>
              <div className="relative">
                <pre className="bg-gray-900 dark:bg-black rounded-lg p-4 overflow-x-auto text-sm text-gray-100">
                  <code>{generateEmbedCode()}</code>
                </pre>
              </div>
              <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                Скопируйте этот код и вставьте его в HTML вашего сайта там, где хотите разместить таблицу.
              </p>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="text-4xl mb-4">🌍</div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Мультиязычность
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Поддержка 11 стран с автоматической адаптацией текста под язык
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Интерактивность
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Кликните на метод платежа для просмотра детальной информации
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="text-4xl mb-4">⚡</div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Быстрая интеграция
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Просто скопируйте и вставьте код - таблица заработает мгновенно
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
