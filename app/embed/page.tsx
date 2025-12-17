'use client';

import { useState, useEffect } from 'react';
import InteractiveSlot from '../components/InteractiveSlot';
import { useI18n } from '@/lib/i18n-context';

type Theme = 'neon' | 'luxury' | 'vibrant';

export default function EmbedPage() {
  const { language: i18nLanguage, t } = useI18n();
  const [brandName, setBrandName] = useState('My Casino');
  const [copied, setCopied] = useState(false);
  const [offerUrl, setOfferUrl] = useState('https://example.com/signup');
  const [language, setLanguage] = useState(i18nLanguage === 'en' ? 'en' : 'ru');
  const [theme, setTheme] = useState<Theme>('neon');
  const [soundEnabled, setSoundEnabled] = useState(false);
  
  // Use symbols/emojis as defaults instead of long text
  const [customValues1, setCustomValues1] = useState('🍒,🍋,🍇,🍉,🔔,💎');
  const [customValues2, setCustomValues2] = useState('7️⃣,🍀,🎲,🎰,🃏,👑');
  const [customValues3, setCustomValues3] = useState('💰,💵,🪙,🧧,🏦,💳');

  // Sync language with i18n language
  useEffect(() => {
    setLanguage(i18nLanguage === 'en' ? 'en' : 'ru');
  }, [i18nLanguage]);

  const generateEmbedCode = () => {
    const values1Array = customValues1.split(',').map(v => v.trim()).filter(Boolean);
    const values2Array = customValues2.split(',').map(v => v.trim()).filter(Boolean);
    const values3Array = customValues3.split(',').map(v => v.trim()).filter(Boolean);

    const embedCode = `<!-- Interactive Slot Widget by SEOHQS -->
<div id="seohqs-slot-widget"></div>
<script>
  (function() {
    var script = document.createElement('script');
    script.src = 'https://www.seohqs.com/embed/slot.js';
    script.setAttribute('data-brand-name', '${brandName}');
    script.setAttribute('data-values1', '${values1Array.join(',')}');
    script.setAttribute('data-values2', '${values2Array.join(',')}');
    script.setAttribute('data-values3', '${values3Array.join(',')}');
    script.setAttribute('data-offer-url', '${offerUrl}');
    script.setAttribute('data-language', '${language}');
    script.setAttribute('data-theme', '${theme}');
    script.setAttribute('data-sound', '${soundEnabled}');
    document.head.appendChild(script);
  })();
</script>
<!-- End SEOHQS Slot Widget -->`;

    return embedCode;
  };

  const handleCopy = () => {
    const code = generateEmbedCode();
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const values1Array = customValues1.split(',').map(v => v.trim()).filter(Boolean);
  const values2Array = customValues2.split(',').map(v => v.trim()).filter(Boolean);
  const values3Array = customValues3.split(',').map(v => v.trim()).filter(Boolean);

  const tabs: { id: Theme; label: string; icon: string }[] = [
    { id: 'neon', label: 'Classic Neon', icon: '🎰' },
    { id: 'luxury', label: 'Royal Luxury', icon: '👑' },
    { id: 'vibrant', label: 'Vibrant Pop', icon: '🍬' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-extrabold mb-6 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 dark:from-blue-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
            {t('embed.title')}
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            {t('embed.description')}
          </p>
        </div>

        {/* Theme Tabs */}
        <div className="flex justify-center mb-10">
          <div className="bg-white dark:bg-gray-800 p-1 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 inline-flex">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setTheme(tab.id)}
                className={`
                  flex items-center gap-2 px-6 py-3 rounded-lg font-bold text-sm sm:text-base transition-all
                  ${theme === tab.id 
                    ? 'bg-blue-600 text-white shadow-lg scale-105' 
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}
                `}
              >
                <span className="text-xl">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Preview Section */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10 font-black text-6xl rotate-12 select-none">
                PREVIEW
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 relative z-10">
                {t('embed.preview')}
              </h2>
              <InteractiveSlot
                brandName={brandName}
                values1={values1Array.length > 0 ? values1Array : ['🍒', '🍋', '🔔']}
                values2={values2Array.length > 0 ? values2Array : ['7️⃣', '🍀', '💎']}
                values3={values3Array.length > 0 ? values3Array : ['💰', '💵', '🪙']}
                offerUrl={offerUrl}
                language={language}
                theme={theme}
                soundEnabled={soundEnabled}
              />
            </div>
          </div>

          {/* Configuration Section */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                {t('embed.settings')}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('embed.brandName')}
                  </label>
                  <input
                    type="text"
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={t('embed.brandNamePlaceholder')}
                  />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t('embed.offerUrl')}
                    </label>
                    <input
                        type="url"
                        value={offerUrl}
                        onChange={(e) => setOfferUrl(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="https://example.com/signup"
                    />
                </div>

                <div className="flex items-center space-x-3 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
                    <input
                        type="checkbox"
                        id="soundEnabled"
                        checked={soundEnabled}
                        onChange={(e) => setSoundEnabled(e.target.checked)}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
                    />
                    <label htmlFor="soundEnabled" className="text-sm font-medium text-gray-900 dark:text-white select-none cursor-pointer">
                        {t('embed.soundEnabled')}
                    </label>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t('embed.language')}
                    </label>
                    <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="ru">Русский</option>
                        <option value="en">English</option>
                        <option value="es">Español</option>
                        <option value="fr">Français</option>
                        <option value="de">Deutsch</option>
                        <option value="bg">Български</option>
                    </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('embed.values1')}
                  </label>
                  <input
                    type="text"
                    value={customValues1}
                    onChange={(e) => setCustomValues1(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="🍒,🍋,🍇,🍉,🔔,💎"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('embed.values2')}
                  </label>
                  <input
                    type="text"
                    value={customValues2}
                    onChange={(e) => setCustomValues2(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="7️⃣,🍀,🎲,🎰,🃏,👑"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('embed.values3')}
                  </label>
                  <input
                    type="text"
                    value={customValues3}
                    onChange={(e) => setCustomValues3(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="💰,💵,🪙,🧧,🏦,💳"
                  />
                </div>
              </div>
            </div>

            {/* Embed Code Section */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {t('embed.embedCode')}
                </h2>
                <button
                  onClick={handleCopy}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                    copied
                      ? 'bg-green-500 text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {copied ? t('embed.copied') : t('embed.copy')}
                </button>
              </div>
              <div className="relative">
                <pre className="bg-gray-900 dark:bg-black rounded-lg p-4 overflow-x-auto text-sm text-gray-100">
                  <code>{generateEmbedCode()}</code>
                </pre>
              </div>
              <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                {t('embed.copyInstructions')}
              </p>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="text-4xl mb-4">⚡</div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              {t('embed.quickIntegration')}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {t('embed.quickIntegrationDesc')}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="text-4xl mb-4">🎨</div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              {t('embed.fullCustomization')}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {t('embed.fullCustomizationDesc')}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="text-4xl mb-4">📱</div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              {t('embed.responsiveDesign')}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {t('embed.responsiveDesignDesc')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
