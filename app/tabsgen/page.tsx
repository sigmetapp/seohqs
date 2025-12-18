'use client';

import { useState } from 'react';
import PaymentMethodsTable, { CountryCode, Casino, TableStyle } from '../components/PaymentMethodsTable';
import BestCasinoTable, { BestCasino } from '../components/BestCasinoTable';
import RecentWinningsTable, { CasinoWinning } from '../components/RecentWinningsTable';
import { useI18n } from '@/lib/i18n-context';

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

const DEFAULT_BEST_CASINOS: BestCasino[] = [
  { name: 'Casino A', url: 'https://example.com/casino-a', rating: 5, bonus: '€1000 + 200 FS', minDeposit: '€20', license: 'MGA' },
  { name: 'Casino B', url: 'https://example.com/casino-b', rating: 5, bonus: '€500 + 100 FS', minDeposit: '€10', license: 'UKGC' },
  { name: 'Casino C', url: 'https://example.com/casino-c', rating: 4, bonus: '€300 + 50 FS', minDeposit: '€15', license: 'Curacao' },
  { name: 'Casino D', url: 'https://example.com/casino-d', rating: 4, bonus: '€200 + 30 FS', minDeposit: '€25', license: 'MGA' },
  { name: 'Casino E', url: 'https://example.com/casino-e', rating: 4, bonus: '€150 + 20 FS', minDeposit: '€20', license: 'UKGC' },
];

const DEFAULT_WINNINGS: CasinoWinning[] = Array.from({ length: 30 }, (_, i) => ({
  casino: `Casino ${String.fromCharCode(65 + (i % 5))}`,
  url: `https://example.com/casino-${String.fromCharCode(97 + (i % 5))}`,
  player: `Player${i + 1}`,
  amount: `€${(Math.random() * 50000 + 1000).toFixed(0)}`,
  game: ['Starburst', 'Book of Dead', 'Gonzo\'s Quest', 'Mega Moolah', 'Bonanza'][i % 5],
  date: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB'),
}));

type TabType = 'payment-methods' | 'best-casino' | 'recent-winnings';

export default function TabsGenPage() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<TabType>('payment-methods');
  const [country, setCountry] = useState<CountryCode>('UK');
  const [tableStyle, setTableStyle] = useState<TableStyle>('light');
  const [copied, setCopied] = useState(false);
  const [casinos, setCasinos] = useState<Record<string, Casino[]>>(DEFAULT_CASINOS);
  const [bestCasinos, setBestCasinos] = useState<BestCasino[]>(DEFAULT_BEST_CASINOS);
  const [winnings, setWinnings] = useState<CasinoWinning[]>(DEFAULT_WINNINGS);

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

  const generateEmbedCode = (tabType: TabType = activeTab) => {
    // Serialize data and properly escape for HTML attributes
    const escapeHtmlAttribute = (str: string) => {
      return str
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    };
    
    const casinosData = escapeHtmlAttribute(JSON.stringify(casinos));
    const bestCasinosData = escapeHtmlAttribute(JSON.stringify(bestCasinos));
    const winningsData = escapeHtmlAttribute(JSON.stringify(winnings));
    
    const embedCode = `<!-- ${tabType === 'payment-methods' ? 'Payment Methods' : tabType === 'best-casino' ? 'Best Casino' : 'Recent Winnings'} Widget by SEOHQS -->
<div id="seohqs-payment-methods-widget"></div>
<script>
  (function() {
    var script = document.createElement('script');
    script.src = 'https://www.seohqs.com/embed/tabsgen.js';
    script.setAttribute('data-country', '${country}');
    script.setAttribute('data-style', '${tableStyle}');
    script.setAttribute('data-tab', '${tabType}');
    script.setAttribute('data-casinos', '${casinosData}');
    script.setAttribute('data-best-casinos', '${bestCasinosData}');
    script.setAttribute('data-winnings', '${winningsData}');
    document.head.appendChild(script);
  })();
</script>
<!-- End SEOHQS Widget -->`;

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

  const updateBestCasino = (index: number, field: keyof BestCasino, value: string | number) => {
    setBestCasinos(prev => {
      const updated = [...prev];
      if (!updated[index]) {
        updated[index] = { name: '', url: '', rating: 5 };
      }
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const updateWinning = (index: number, field: keyof CasinoWinning, value: string) => {
    setWinnings(prev => {
      const updated = [...prev];
      if (!updated[index]) {
        updated[index] = { casino: '', url: '', player: '', amount: '', game: '', date: '' };
      }
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleCopy = (tabType?: TabType) => {
    const code = generateEmbedCode(tabType || activeTab);
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-6 sm:py-8 md:py-12 px-3 sm:px-4 md:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-10 md:mb-12">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold mb-4 sm:mb-6 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 dark:from-blue-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
            {t('tabsgen.title')}
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto px-2">
            {t('tabsgen.description')}
          </p>
        </div>

        {/* Tabs Navigation */}
        <div className="mb-8 flex justify-center px-2">
          <div className="bg-white dark:bg-gray-800 p-1 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 inline-flex flex-wrap justify-center gap-1 w-full max-w-2xl">
            <button
              onClick={() => setActiveTab('payment-methods')}
              className={`
                flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 rounded-lg font-bold text-xs sm:text-sm md:text-base transition-all flex-1 sm:flex-none min-w-0
                ${activeTab === 'payment-methods' 
                  ? 'bg-blue-600 text-white shadow-lg scale-105' 
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}
              `}
            >
              <span className="text-base sm:text-lg md:text-xl flex-shrink-0">💳</span>
              <span className="truncate">Top Payment Methods</span>
            </button>
            <button
              onClick={() => setActiveTab('best-casino')}
              className={`
                flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 rounded-lg font-bold text-xs sm:text-sm md:text-base transition-all flex-1 sm:flex-none min-w-0
                ${activeTab === 'best-casino' 
                  ? 'bg-blue-600 text-white shadow-lg scale-105' 
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}
              `}
            >
              <span className="text-base sm:text-lg md:text-xl flex-shrink-0">🏆</span>
              <span className="truncate">Best Casino</span>
            </button>
            <button
              onClick={() => setActiveTab('recent-winnings')}
              className={`
                flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 rounded-lg font-bold text-xs sm:text-sm md:text-base transition-all flex-1 sm:flex-none min-w-0
                ${activeTab === 'recent-winnings' 
                  ? 'bg-blue-600 text-white shadow-lg scale-105' 
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}
              `}
            >
              <span className="text-base sm:text-lg md:text-xl flex-shrink-0">💰</span>
              <span className="truncate">Recent Winnings</span>
            </button>
          </div>
        </div>

        {/* Preview Section */}
        <div className="mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-2 sm:p-4 md:p-6 border border-gray-200 dark:border-gray-700 relative overflow-x-hidden overflow-y-visible">
            <div className="absolute top-0 right-0 p-2 sm:p-4 opacity-10 font-black text-3xl sm:text-4xl md:text-6xl rotate-12 select-none pointer-events-none">
              PREVIEW
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4 md:mb-6 relative z-10 px-2 sm:px-1">
              {t('tabsgen.preview')}
            </h2>
            <div className="relative z-10 w-full overflow-x-auto overflow-y-visible min-h-[300px]">
              <div className="min-w-0 w-full">
                {activeTab === 'payment-methods' && (
                  <div className="w-full">
                    <PaymentMethodsTable country={country} casinos={casinos} countryFlag={selectedCountryFlag} style={tableStyle} />
                  </div>
                )}
                {activeTab === 'best-casino' && (
                  <div className="w-full">
                    <BestCasinoTable country={country} casinos={bestCasinos} countryFlag={selectedCountryFlag} style={tableStyle} />
                  </div>
                )}
                {activeTab === 'recent-winnings' && (
                  <div className="w-full">
                    <RecentWinningsTable country={country} winnings={winnings} countryFlag={selectedCountryFlag} style={tableStyle} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Configuration Section */}
        <div className="space-y-4 sm:space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6">
                {t('tabsgen.settings')}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('tabsgen.selectTableStyle')}
                  </label>
                  <div className="flex flex-wrap gap-2 sm:gap-3 mb-4 sm:mb-6">
                    <button
                      onClick={() => setTableStyle('dark')}
                      className={`
                        flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg font-medium transition-all border-2 text-xs sm:text-sm
                        ${tableStyle === 'dark'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                          : 'text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'}
                      `}
                      >
                        {t('tabsgen.dark')}
                      </button>
                      <button
                        onClick={() => setTableStyle('light')}
                        className={`
                        flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg font-medium transition-all border-2 text-xs sm:text-sm
                        ${tableStyle === 'light'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                          : 'text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'}
                      `}
                      >
                        {t('tabsgen.light')}
                      </button>
                      <button
                        onClick={() => setTableStyle('casino')}
                        className={`
                        flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg font-medium transition-all border-2 text-xs sm:text-sm
                        ${tableStyle === 'casino'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                          : 'text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'}
                      `}
                      >
                        {t('tabsgen.casino')}
                      </button>
                  </div>
                  <p className="mb-4 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                    {t('tabsgen.selectStyleDescription')}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('tabsgen.selectCountry')}
                  </label>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {countries.map((c) => (
                      <button
                        key={c.code}
                        onClick={() => setCountry(c.code)}
                        className={`
                          flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded text-xs font-medium transition-all
                          border whitespace-nowrap
                          ${country === c.code
                            ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                            : 'text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'}
                        `}
                      >
                        <span className="text-xs sm:text-sm">{c.flag}</span>
                        <span className="hidden sm:inline">{c.name}</span>
                        <span className="sm:hidden">{c.code}</span>
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                    {t('tabsgen.countryDescription')}
                  </p>
                </div>

                {/* Tab-specific Settings */}
                {activeTab === 'payment-methods' && (
                  <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-200 dark:border-gray-700">
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-3 sm:mb-4">
                      {t('tabsgen.casinoSettings')}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-3 sm:mb-4">
                      {t('tabsgen.casinoSettingsDescription')}
                    </p>
                    
                    <div className="space-y-4 sm:space-y-6 w-full overflow-x-visible">
                      {Object.keys(PAYMENT_METHOD_NAMES).map((methodId) => (
                        <div key={methodId} className="p-3 sm:p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700 w-full min-w-0">
                          <h4 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white mb-2 sm:mb-3">
                            {PAYMENT_METHOD_NAMES[methodId]}
                          </h4>
                          <div className="space-y-2 sm:space-y-3">
                            {[0, 1, 2].map((index) => (
                              <div key={index} className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 w-full">
                                <input
                                  type="text"
                                  placeholder={t('tabsgen.casinoNamePlaceholder').replace('{index}', String(index + 1))}
                                  value={casinos[methodId]?.[index]?.name || ''}
                                  onChange={(e) => updateCasino(methodId, index, 'name', e.target.value)}
                                  className="w-full min-w-0 px-3 py-2 sm:py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm sm:text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                                <input
                                  type="url"
                                  placeholder={t('tabsgen.casinoUrlPlaceholder').replace('{index}', String(index + 1))}
                                  value={casinos[methodId]?.[index]?.url || ''}
                                  onChange={(e) => updateCasino(methodId, index, 'url', e.target.value)}
                                  className="w-full min-w-0 px-3 py-2 sm:py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm sm:text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'best-casino' && (
                  <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-200 dark:border-gray-700">
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-3 sm:mb-4">
                      Best Casino Settings
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-3 sm:mb-4">
                      Configure top 5 best casinos with ratings and bonuses
                    </p>
                    
                    <div className="space-y-3 sm:space-y-4 w-full overflow-x-visible">
                      {bestCasinos.map((casino, index) => (
                        <div key={index} className="p-3 sm:p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700 w-full min-w-0">
                          <h4 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white mb-2 sm:mb-3">
                            Casino {index + 1}
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 mb-2 sm:mb-3">
                            <input
                              type="text"
                              placeholder="Casino Name"
                              value={casino.name}
                              onChange={(e) => updateBestCasino(index, 'name', e.target.value)}
                              className="w-full min-w-0 px-3 py-2 sm:py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm sm:text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <input
                              type="url"
                              placeholder="Casino URL"
                              value={casino.url}
                              onChange={(e) => updateBestCasino(index, 'url', e.target.value)}
                              className="w-full min-w-0 px-3 py-2 sm:py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm sm:text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                            <input
                              type="number"
                              placeholder="Rating (1-5)"
                              min="1"
                              max="5"
                              value={casino.rating}
                              onChange={(e) => updateBestCasino(index, 'rating', parseInt(e.target.value) || 5)}
                              className="w-full min-w-0 px-3 py-2 sm:py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm sm:text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <input
                              type="text"
                              placeholder="Bonus"
                              value={casino.bonus || ''}
                              onChange={(e) => updateBestCasino(index, 'bonus', e.target.value)}
                              className="w-full min-w-0 px-3 py-2 sm:py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm sm:text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <input
                              type="text"
                              placeholder="Min Deposit"
                              value={casino.minDeposit || ''}
                              onChange={(e) => updateBestCasino(index, 'minDeposit', e.target.value)}
                              className="w-full min-w-0 px-3 py-2 sm:py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm sm:text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'recent-winnings' && (
                  <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-200 dark:border-gray-700">
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-3 sm:mb-4">
                      Recent Winnings Settings
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-3 sm:mb-4">
                      Configure 30 possible winnings. 5 random ones will be displayed and updated periodically.
                    </p>
                    
                    <div className="space-y-2 max-h-96 overflow-y-auto overflow-x-visible pr-2">
                      {winnings.slice(0, 10).map((winning, index) => (
                        <div key={index} className="p-2 sm:p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700 w-full min-w-0">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 mb-2 sm:mb-3">
                            <input
                              type="text"
                              placeholder="Casino Name"
                              value={winning.casino}
                              onChange={(e) => updateWinning(index, 'casino', e.target.value)}
                              className="w-full min-w-0 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm sm:text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <input
                              type="url"
                              placeholder="Casino URL"
                              value={winning.url}
                              onChange={(e) => updateWinning(index, 'url', e.target.value)}
                              className="w-full min-w-0 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm sm:text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                            <input
                              type="text"
                              placeholder="Player"
                              value={winning.player}
                              onChange={(e) => updateWinning(index, 'player', e.target.value)}
                              className="w-full min-w-0 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm sm:text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <input
                              type="text"
                              placeholder="Amount"
                              value={winning.amount}
                              onChange={(e) => updateWinning(index, 'amount', e.target.value)}
                              className="w-full min-w-0 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm sm:text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <input
                              type="text"
                              placeholder="Game"
                              value={winning.game}
                              onChange={(e) => updateWinning(index, 'game', e.target.value)}
                              className="w-full min-w-0 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm sm:text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <input
                              type="text"
                              placeholder="Date"
                              value={winning.date}
                              onChange={(e) => updateWinning(index, 'date', e.target.value)}
                              className="w-full min-w-0 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm sm:text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                        </div>
                      ))}
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 px-1">
                        Showing first 10 of {winnings.length} winnings. All {winnings.length} will be used for random selection.
                      </p>
                    </div>
                  </div>
                )}
              </div>

            {/* Embed Code Section */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6">
                {t('tabsgen.embedCode')}
              </h2>
              
              {/* Tab-specific embed code - only show active tab */}
              {activeTab === 'payment-methods' && (
                <div>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <span>💳</span> <span className="whitespace-nowrap">Payment Methods Widget</span>
                    </h3>
                    <button
                      onClick={() => handleCopy('payment-methods')}
                      className={`px-3 sm:px-4 py-2 rounded-lg font-semibold transition-all text-xs sm:text-sm whitespace-nowrap ${
                        copied
                          ? 'bg-green-500 text-white'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      {copied ? t('tabsgen.copied') : t('tabsgen.copy')}
                    </button>
                  </div>
                  <div className="relative">
                    <pre className="bg-gray-900 dark:bg-black rounded-lg p-3 sm:p-4 text-xs sm:text-sm text-gray-100 whitespace-pre-wrap break-words max-w-full overflow-x-auto overflow-y-auto max-h-96">
                      <code className="block whitespace-pre-wrap break-words font-mono">{generateEmbedCode('payment-methods')}</code>
                    </pre>
                  </div>
                </div>
              )}

              {activeTab === 'best-casino' && (
                <div>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <span>🏆</span> <span className="whitespace-nowrap">Best Casino Widget</span>
                    </h3>
                    <button
                      onClick={() => handleCopy('best-casino')}
                      className={`px-3 sm:px-4 py-2 rounded-lg font-semibold transition-all text-xs sm:text-sm whitespace-nowrap ${
                        copied
                          ? 'bg-green-500 text-white'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      {copied ? t('tabsgen.copied') : t('tabsgen.copy')}
                    </button>
                  </div>
                  <div className="relative">
                    <pre className="bg-gray-900 dark:bg-black rounded-lg p-3 sm:p-4 text-xs sm:text-sm text-gray-100 whitespace-pre-wrap break-words max-w-full overflow-x-auto overflow-y-auto max-h-96">
                      <code className="block whitespace-pre-wrap break-words font-mono">{generateEmbedCode('best-casino')}</code>
                    </pre>
                  </div>
                </div>
              )}

              {activeTab === 'recent-winnings' && (
                <div>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <span>💰</span> <span className="whitespace-nowrap">Recent Winnings Widget</span>
                    </h3>
                    <button
                      onClick={() => handleCopy('recent-winnings')}
                      className={`px-3 sm:px-4 py-2 rounded-lg font-semibold transition-all text-xs sm:text-sm whitespace-nowrap ${
                        copied
                          ? 'bg-green-500 text-white'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      {copied ? t('tabsgen.copied') : t('tabsgen.copy')}
                    </button>
                  </div>
                  <div className="relative">
                    <pre className="bg-gray-900 dark:bg-black rounded-lg p-3 sm:p-4 text-xs sm:text-sm text-gray-100 whitespace-pre-wrap break-words max-w-full overflow-x-auto overflow-y-auto max-h-96">
                      <code className="block whitespace-pre-wrap break-words font-mono">{generateEmbedCode('recent-winnings')}</code>
                    </pre>
                  </div>
                </div>
              )}

              <p className="mt-6 text-sm text-gray-600 dark:text-gray-400">
                {t('tabsgen.copyInstructions')}
              </p>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="mt-8 sm:mt-10 md:mt-12 grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="text-4xl mb-4">🌍</div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              {t('tabsgen.featureMultilingual')}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {t('tabsgen.featureMultilingualDesc')}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              {t('tabsgen.featureInteractive')}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {t('tabsgen.featureInteractiveDesc')}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="text-4xl mb-4">⚡</div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              {t('tabsgen.featureQuickIntegration')}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {t('tabsgen.featureQuickIntegrationDesc')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
