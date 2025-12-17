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
  const [tableStyle, setTableStyle] = useState<TableStyle>('classic');
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-extrabold mb-6 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 dark:from-blue-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
            {t('tabsgen.title')}
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            {t('tabsgen.description')}
          </p>
        </div>

        {/* Tabs Navigation */}
        <div className="mb-8 flex justify-center">
          <div className="bg-white dark:bg-gray-800 p-1 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 inline-flex">
            <button
              onClick={() => setActiveTab('payment-methods')}
              className={`
                flex items-center gap-2 px-6 py-3 rounded-lg font-bold text-sm sm:text-base transition-all
                ${activeTab === 'payment-methods' 
                  ? 'bg-blue-600 text-white shadow-lg scale-105' 
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}
              `}
            >
              <span className="text-xl">💳</span>
              Top Payment Methods
            </button>
            <button
              onClick={() => setActiveTab('best-casino')}
              className={`
                flex items-center gap-2 px-6 py-3 rounded-lg font-bold text-sm sm:text-base transition-all
                ${activeTab === 'best-casino' 
                  ? 'bg-blue-600 text-white shadow-lg scale-105' 
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}
              `}
            >
              <span className="text-xl">🏆</span>
              Best Casino
            </button>
            <button
              onClick={() => setActiveTab('recent-winnings')}
              className={`
                flex items-center gap-2 px-6 py-3 rounded-lg font-bold text-sm sm:text-base transition-all
                ${activeTab === 'recent-winnings' 
                  ? 'bg-blue-600 text-white shadow-lg scale-105' 
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}
              `}
            >
              <span className="text-xl">💰</span>
              Recent Winnings
            </button>
          </div>
        </div>

        {/* Preview Section */}
        <div className="mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 font-black text-6xl rotate-12 select-none">
              PREVIEW
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 relative z-10">
              {t('tabsgen.preview')}
            </h2>
            {activeTab === 'payment-methods' && (
              <PaymentMethodsTable country={country} casinos={casinos} countryFlag={selectedCountryFlag} style={tableStyle} />
            )}
            {activeTab === 'best-casino' && (
              <BestCasinoTable country={country} casinos={bestCasinos} countryFlag={selectedCountryFlag} style={tableStyle} />
            )}
            {activeTab === 'recent-winnings' && (
              <RecentWinningsTable country={country} winnings={winnings} countryFlag={selectedCountryFlag} style={tableStyle} />
            )}
          </div>
        </div>

        {/* Configuration Section */}
        <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                {t('tabsgen.settings')}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('tabsgen.selectTableStyle')}
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
                        {t('tabsgen.classic')}
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
                        {t('tabsgen.modern')}
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
                        {t('tabsgen.minimal')}
                      </button>
                  </div>
                  <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
                    {t('tabsgen.selectStyleDescription')}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('tabsgen.selectCountry')}
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
                    {t('tabsgen.countryDescription')}
                  </p>
                </div>

                {/* Tab-specific Settings */}
                {activeTab === 'payment-methods' && (
                  <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                      {t('tabsgen.casinoSettings')}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      {t('tabsgen.casinoSettingsDescription')}
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
                                  placeholder={t('tabsgen.casinoNamePlaceholder').replace('{index}', String(index + 1))}
                                  value={casinos[methodId]?.[index]?.name || ''}
                                  onChange={(e) => updateCasino(methodId, index, 'name', e.target.value)}
                                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                                <input
                                  type="url"
                                  placeholder={t('tabsgen.casinoUrlPlaceholder').replace('{index}', String(index + 1))}
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
                )}

                {activeTab === 'best-casino' && (
                  <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                      Best Casino Settings
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      Configure top 5 best casinos with ratings and bonuses
                    </p>
                    
                    <div className="space-y-4">
                      {bestCasinos.map((casino, index) => (
                        <div key={index} className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
                          <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                            Casino {index + 1}
                          </h4>
                          <div className="grid grid-cols-2 gap-2 mb-2">
                            <input
                              type="text"
                              placeholder="Casino Name"
                              value={casino.name}
                              onChange={(e) => updateBestCasino(index, 'name', e.target.value)}
                              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                            />
                            <input
                              type="url"
                              placeholder="Casino URL"
                              value={casino.url}
                              onChange={(e) => updateBestCasino(index, 'url', e.target.value)}
                              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                            />
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <input
                              type="number"
                              placeholder="Rating (1-5)"
                              min="1"
                              max="5"
                              value={casino.rating}
                              onChange={(e) => updateBestCasino(index, 'rating', parseInt(e.target.value) || 5)}
                              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                            />
                            <input
                              type="text"
                              placeholder="Bonus"
                              value={casino.bonus || ''}
                              onChange={(e) => updateBestCasino(index, 'bonus', e.target.value)}
                              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                            />
                            <input
                              type="text"
                              placeholder="Min Deposit"
                              value={casino.minDeposit || ''}
                              onChange={(e) => updateBestCasino(index, 'minDeposit', e.target.value)}
                              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'recent-winnings' && (
                  <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                      Recent Winnings Settings
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      Configure 30 possible winnings. 5 random ones will be displayed and updated periodically.
                    </p>
                    
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {winnings.slice(0, 10).map((winning, index) => (
                        <div key={index} className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
                          <div className="grid grid-cols-2 gap-2 mb-2">
                            <input
                              type="text"
                              placeholder="Casino Name"
                              value={winning.casino}
                              onChange={(e) => updateWinning(index, 'casino', e.target.value)}
                              className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs"
                            />
                            <input
                              type="url"
                              placeholder="Casino URL"
                              value={winning.url}
                              onChange={(e) => updateWinning(index, 'url', e.target.value)}
                              className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs"
                            />
                          </div>
                          <div className="grid grid-cols-4 gap-2">
                            <input
                              type="text"
                              placeholder="Player"
                              value={winning.player}
                              onChange={(e) => updateWinning(index, 'player', e.target.value)}
                              className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs"
                            />
                            <input
                              type="text"
                              placeholder="Amount"
                              value={winning.amount}
                              onChange={(e) => updateWinning(index, 'amount', e.target.value)}
                              className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs"
                            />
                            <input
                              type="text"
                              placeholder="Game"
                              value={winning.game}
                              onChange={(e) => updateWinning(index, 'game', e.target.value)}
                              className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs"
                            />
                            <input
                              type="text"
                              placeholder="Date"
                              value={winning.date}
                              onChange={(e) => updateWinning(index, 'date', e.target.value)}
                              className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs"
                            />
                          </div>
                        </div>
                      ))}
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        Showing first 10 of {winnings.length} winnings. All {winnings.length} will be used for random selection.
                      </p>
                    </div>
                  </div>
                )}
              </div>

            {/* Embed Code Section */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                {t('tabsgen.embedCode')}
              </h2>
              
              {/* Tab-specific embed codes */}
              <div className="space-y-6">
                {/* Payment Methods Embed Code */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <span>💳</span> Payment Methods Widget
                    </h3>
                    <button
                      onClick={() => handleCopy('payment-methods')}
                      className={`px-4 py-2 rounded-lg font-semibold transition-all text-sm ${
                        copied
                          ? 'bg-green-500 text-white'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      {copied ? t('tabsgen.copied') : t('tabsgen.copy')}
                    </button>
                  </div>
                  <div className="relative">
                    <pre className="bg-gray-900 dark:bg-black rounded-lg p-4 text-sm text-gray-100 whitespace-pre-wrap break-words max-w-full overflow-x-auto">
                      <code className="block whitespace-pre-wrap break-words">{generateEmbedCode('payment-methods')}</code>
                    </pre>
                  </div>
                </div>

                {/* Best Casino Embed Code */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <span>🏆</span> Best Casino Widget
                    </h3>
                    <button
                      onClick={() => handleCopy('best-casino')}
                      className={`px-4 py-2 rounded-lg font-semibold transition-all text-sm ${
                        copied
                          ? 'bg-green-500 text-white'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      {copied ? t('tabsgen.copied') : t('tabsgen.copy')}
                    </button>
                  </div>
                  <div className="relative">
                    <pre className="bg-gray-900 dark:bg-black rounded-lg p-4 text-sm text-gray-100 whitespace-pre-wrap break-words max-w-full overflow-x-auto">
                      <code className="block whitespace-pre-wrap break-words">{generateEmbedCode('best-casino')}</code>
                    </pre>
                  </div>
                </div>

                {/* Recent Winnings Embed Code */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <span>💰</span> Recent Winnings Widget
                    </h3>
                    <button
                      onClick={() => handleCopy('recent-winnings')}
                      className={`px-4 py-2 rounded-lg font-semibold transition-all text-sm ${
                        copied
                          ? 'bg-green-500 text-white'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      {copied ? t('tabsgen.copied') : t('tabsgen.copy')}
                    </button>
                  </div>
                  <div className="relative">
                    <pre className="bg-gray-900 dark:bg-black rounded-lg p-4 text-sm text-gray-100 whitespace-pre-wrap break-words max-w-full overflow-x-auto">
                      <code className="block whitespace-pre-wrap break-words">{generateEmbedCode('recent-winnings')}</code>
                    </pre>
                  </div>
                </div>
              </div>

              <p className="mt-6 text-sm text-gray-600 dark:text-gray-400">
                {t('tabsgen.copyInstructions')}
              </p>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
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
