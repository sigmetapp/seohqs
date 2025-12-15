'use client';

import { useState } from 'react';
import PaymentMethodsTable, { CountryCode, Casino, TableStyle } from '../components/PaymentMethodsTable';

const DEFAULT_CASINOS: Record<string, Casino[]> = {
  visa: [
    { name: 'Casino A', url: 'https://example.com/casino-a' },
    { name: 'Casino B', url: 'https://example.com/casino-b' },
    { name: 'Casino C', url: 'https://example.com/casino-c' },
  ],
  mastercard: [
    { name: 'Casino A', url: 'https://example.com/casino-a' },
    { name: 'Casino B', url: 'https://example.com/casino-b' },
    { name: 'Casino C', url: 'https://example.com/casino-c' },
  ],
  skrill: [
    { name: 'Casino X', url: 'https://example.com/casino-x' },
    { name: 'Casino Y', url: 'https://example.com/casino-y' },
    { name: 'Casino Z', url: 'https://example.com/casino-z' },
  ],
  neteller: [
    { name: 'Casino X', url: 'https://example.com/casino-x' },
    { name: 'Casino Y', url: 'https://example.com/casino-y' },
    { name: 'Casino Z', url: 'https://example.com/casino-z' },
  ],
  paysafecard: [
    { name: 'Casino 1', url: 'https://example.com/casino-1' },
    { name: 'Casino 2', url: 'https://example.com/casino-2' },
    { name: 'Casino 3', url: 'https://example.com/casino-3' },
  ],
};

const PAYMENT_METHOD_NAMES: Record<string, string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  skrill: 'Skrill',
  neteller: 'Neteller',
  paysafecard: 'Paysafecard',
};

export default function TabsGenPage() {
  const [country, setCountry] = useState<CountryCode>('UK');
  const [tableStyle, setTableStyle] = useState<TableStyle>('classic');
  const [copied, setCopied] = useState(false);
  const [casinos, setCasinos] = useState<Record<string, Casino[]>>(DEFAULT_CASINOS);

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

  const selectedCountryFlag = countries.find(c => c.code === country)?.flag || '';

  const generateEmbedCode = () => {
    // Serialize casinos data
    const casinosData = JSON.stringify(casinos).replace(/"/g, '&quot;');
    
    const embedCode = `<!-- Payment Methods Table Widget by SEOHQS -->
<div id="seohqs-payment-methods-widget"></div>
<script>
  (function() {
    var script = document.createElement('script');
    script.src = 'https://www.seohqs.com/embed/tabsgen.js';
    script.setAttribute('data-country', '${country}');
    script.setAttribute('data-style', '${tableStyle}');
    script.setAttribute('data-casinos', '${casinosData}');
    document.head.appendChild(script);
  })();
</script>
<!-- End SEOHQS Payment Methods Widget -->`;

    return embedCode;
  };

  const updateCasino = (methodId: string, index: number, field: 'name' | 'url', value: string) => {
    setCasinos(prev => {
      const methodCasinos = [...(prev[methodId] || [])];
      if (!methodCasinos[index]) {
        methodCasinos[index] = { name: '', url: '' };
      }
      methodCasinos[index] = { ...methodCasinos[index], [field]: value };
      return { ...prev, [methodId]: methodCasinos };
    });
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

        {/* Preview Section */}
        <div className="mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 font-black text-6xl rotate-12 select-none">
              PREVIEW
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 relative z-10">
              Предпросмотр
            </h2>
            <PaymentMethodsTable country={country} casinos={casinos} countryFlag={selectedCountryFlag} style={tableStyle} />
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
                    Выберите стиль таблицы
                  </label>
                  <div className="flex flex-wrap gap-3 mb-6">
                    <button
                      onClick={() => setTableStyle('classic')}
                      className={`
                        px-4 py-2 rounded-lg font-medium transition-all border-2
                        ${tableStyle === 'classic'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                          : 'text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'}
                      `}
                    >
                      🎨 Классический
                    </button>
                    <button
                      onClick={() => setTableStyle('modern')}
                      className={`
                        px-4 py-2 rounded-lg font-medium transition-all border-2
                        ${tableStyle === 'modern'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                          : 'text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'}
                      `}
                    >
                      ✨ Современный
                    </button>
                    <button
                      onClick={() => setTableStyle('minimal')}
                      className={`
                        px-4 py-2 rounded-lg font-medium transition-all border-2
                        ${tableStyle === 'minimal'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                          : 'text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'}
                      `}
                    >
                      🎯 Минималистичный
                    </button>
                  </div>
                  <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
                    Выберите стиль оформления таблицы. Код для встраивания будет автоматически обновлен.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Выберите страну
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {countries.map((c) => (
                      <button
                        key={c.code}
                        onClick={() => setCountry(c.code)}
                        className={`
                          flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all
                          border
                          ${country === c.code
                            ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                            : 'text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'}
                        `}
                      >
                        <span className="text-sm">{c.flag}</span>
                        <span>{c.name}</span>
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    Таблица автоматически адаптируется под выбранный язык страны
                  </p>
                </div>

                {/* Casinos Settings */}
                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                    Настройка казино для каждого метода
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Укажите топ-3 казино для каждого платежного метода. Они будут отображаться при клике на метод.
                  </p>
                  
                  <div className="space-y-6">
                    {Object.keys(PAYMENT_METHOD_NAMES).map((methodId) => (
                      <div key={methodId} className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                          {PAYMENT_METHOD_NAMES[methodId]}
                        </h4>
                        <div className="space-y-3">
                          {[0, 1, 2].map((index) => (
                            <div key={index} className="grid grid-cols-2 gap-2">
                              <input
                                type="text"
                                placeholder={`Название казино ${index + 1}`}
                                value={casinos[methodId]?.[index]?.name || ''}
                                onChange={(e) => updateCasino(methodId, index, 'name', e.target.value)}
                                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                              <input
                                type="url"
                                placeholder={`URL казино ${index + 1}`}
                                value={casinos[methodId]?.[index]?.url || ''}
                                onChange={(e) => updateCasino(methodId, index, 'url', e.target.value)}
                                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
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
                <pre className="bg-gray-900 dark:bg-black rounded-lg p-4 text-sm text-gray-100 whitespace-pre-wrap break-words max-w-full">
                  <code className="block whitespace-pre-wrap break-words">{generateEmbedCode()}</code>
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
