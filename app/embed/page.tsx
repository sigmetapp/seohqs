'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import InteractiveSlot from '../components/InteractiveSlot';

export default function EmbedPage() {
  const [brandName, setBrandName] = useState('Ваш бренд');
  const [copied, setCopied] = useState(false);
  const [customValues1, setCustomValues1] = useState('🎁,💎,⭐,🏆,🎯,💫');
  const [customValues2, setCustomValues2] = useState('Скидка,Бонус,Подарок,Акция,Приз,Выигрыш');
  const [customValues3, setCustomValues3] = useState('10%,20%,30%,50%,100%,200%');

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

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Animated background particles */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        {[...Array(50)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-yellow-300 rounded-full"
            initial={{
              x: Math.random() * 100 + '%',
              y: Math.random() * 100 + '%',
              opacity: 0,
            }}
            animate={{
              y: [null, Math.random() * 100 + '%'],
              opacity: [0, 0.6, 0],
              scale: [0, 1.5, 0],
            }}
            transition={{
              duration: 4 + Math.random() * 3,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      {/* Glowing orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <motion.div
          className="absolute top-20 left-20 w-96 h-96 bg-purple-500 rounded-full blur-3xl opacity-20"
          animate={{
            x: [0, 100, 0],
            y: [0, 50, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.div
          className="absolute bottom-20 right-20 w-96 h-96 bg-pink-500 rounded-full blur-3xl opacity-20"
          animate={{
            x: [0, -100, 0],
            y: [0, -50, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 w-96 h-96 bg-yellow-500 rounded-full blur-3xl opacity-10"
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </div>

      <div className="relative z-10 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <motion.h1
              className="text-5xl md:text-7xl font-black mb-6 bg-gradient-to-r from-yellow-300 via-orange-400 to-pink-500 bg-clip-text text-transparent"
              animate={{
                backgroundPosition: ['0%', '100%', '0%'],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'linear',
              }}
              style={{
                backgroundSize: '200%',
                textShadow: '0 0 30px rgba(255, 215, 0, 0.5)',
                filter: 'drop-shadow(0 0 20px rgba(255, 215, 0, 0.8))',
              }}
            >
              Интерактивный слот для вашего сайта
            </motion.h1>
            <motion.p
              className="text-xl md:text-2xl text-yellow-200 max-w-3xl mx-auto font-semibold"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              Создайте увлекательный интерактивный слот с тремя колесами для сайтов моно-брендов.
              Просто скопируйте код и вставьте на свой сайт!
            </motion.p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
            {/* Preview Section */}
            <motion.div
              className="space-y-6"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              <div className="relative bg-gradient-to-br from-slate-800/90 via-purple-900/90 to-slate-800/90 backdrop-blur-xl rounded-3xl shadow-2xl p-6 border-2 border-yellow-500/30">
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/10 via-transparent to-pink-500/10 rounded-3xl"></div>
                <h2 className="text-3xl font-black text-yellow-300 mb-6 relative z-10" style={{ textShadow: '0 0 10px rgba(255, 215, 0, 0.5)' }}>
                  Предпросмотр
                </h2>
                <div className="relative z-10">
                  <InteractiveSlot
                    brandName={brandName}
                    values1={values1Array.length > 0 ? values1Array : ['🎁', '💎', '⭐']}
                    values2={values2Array.length > 0 ? values2Array : ['Скидка', 'Бонус', 'Подарок']}
                    values3={values3Array.length > 0 ? values3Array : ['10%', '20%', '30%']}
                  />
                </div>
              </div>
            </motion.div>

            {/* Configuration Section */}
            <motion.div
              className="space-y-6"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
            >
              <div className="relative bg-gradient-to-br from-slate-800/90 via-purple-900/90 to-slate-800/90 backdrop-blur-xl rounded-3xl shadow-2xl p-6 border-2 border-yellow-500/30">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-transparent to-pink-500/10 rounded-3xl"></div>
                <h2 className="text-3xl font-black text-yellow-300 mb-6 relative z-10" style={{ textShadow: '0 0 10px rgba(255, 215, 0, 0.5)' }}>
                  Настройки
                </h2>

                <div className="space-y-5 relative z-10">
                  <div>
                    <label className="block text-sm font-bold text-yellow-200 mb-2">
                      Название бренда
                    </label>
                    <motion.input
                      type="text"
                      value={brandName}
                      onChange={(e) => setBrandName(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-yellow-500/30 rounded-xl bg-slate-900/50 text-white placeholder-gray-400 focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all"
                      placeholder="Введите название бренда"
                      whileFocus={{ scale: 1.02 }}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-yellow-200 mb-2">
                      Значения для первого колеса (через запятую)
                    </label>
                    <motion.input
                      type="text"
                      value={customValues1}
                      onChange={(e) => setCustomValues1(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-yellow-500/30 rounded-xl bg-slate-900/50 text-white placeholder-gray-400 focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all"
                      placeholder="🎁,💎,⭐,🏆,🎯,💫"
                      whileFocus={{ scale: 1.02 }}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-yellow-200 mb-2">
                      Значения для второго колеса (через запятую)
                    </label>
                    <motion.input
                      type="text"
                      value={customValues2}
                      onChange={(e) => setCustomValues2(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-yellow-500/30 rounded-xl bg-slate-900/50 text-white placeholder-gray-400 focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all"
                      placeholder="Скидка,Бонус,Подарок,Акция,Приз,Выигрыш"
                      whileFocus={{ scale: 1.02 }}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-yellow-200 mb-2">
                      Значения для третьего колеса (через запятую)
                    </label>
                    <motion.input
                      type="text"
                      value={customValues3}
                      onChange={(e) => setCustomValues3(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-yellow-500/30 rounded-xl bg-slate-900/50 text-white placeholder-gray-400 focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all"
                      placeholder="10%,20%,30%,50%,100%,200%"
                      whileFocus={{ scale: 1.02 }}
                    />
                  </div>
                </div>
              </div>

              {/* Embed Code Section */}
              <div className="relative bg-gradient-to-br from-slate-800/90 via-purple-900/90 to-slate-800/90 backdrop-blur-xl rounded-3xl shadow-2xl p-6 border-2 border-yellow-500/30">
                <div className="absolute inset-0 bg-gradient-to-r from-pink-500/10 via-transparent to-yellow-500/10 rounded-3xl"></div>
                <div className="flex items-center justify-between mb-4 relative z-10">
                  <h2 className="text-3xl font-black text-yellow-300" style={{ textShadow: '0 0 10px rgba(255, 215, 0, 0.5)' }}>
                    Код для встраивания
                  </h2>
                  <motion.button
                    onClick={handleCopy}
                    className={`px-6 py-3 rounded-xl font-bold transition-all relative overflow-hidden ${
                      copied
                        ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white'
                        : 'bg-gradient-to-r from-yellow-500 via-orange-500 to-pink-500 text-white'
                    }`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    animate={copied ? {} : {
                      boxShadow: [
                        '0 0 20px rgba(245, 158, 11, 0.5)',
                        '0 0 30px rgba(245, 158, 11, 0.8)',
                        '0 0 20px rgba(245, 158, 11, 0.5)',
                      ],
                    }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    {copied ? '✓ Скопировано!' : '📋 Копировать'}
                  </motion.button>
                </div>
                <div className="relative z-10">
                  <pre className="bg-slate-950 rounded-xl p-4 overflow-x-auto text-sm text-green-400 border-2 border-green-500/30">
                    <code>{generateEmbedCode()}</code>
                  </pre>
                </div>
                <p className="mt-4 text-sm text-yellow-200 relative z-10">
                  Скопируйте этот код и вставьте его в HTML вашего сайта там, где хотите разместить слот.
                </p>
              </div>
            </motion.div>
          </div>

          {/* Features Section */}
          <motion.div
            className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
          >
            {[
              { icon: '⚡', title: 'Быстрая интеграция', desc: 'Просто скопируйте и вставьте код - слот заработает мгновенно' },
              { icon: '🎨', title: 'Полная кастомизация', desc: 'Настройте все значения под ваш бренд и стиль' },
              { icon: '📱', title: 'Адаптивный дизайн', desc: 'Отлично работает на всех устройствах и экранах' },
            ].map((feature, index) => (
              <motion.div
                key={index}
                className="relative bg-gradient-to-br from-slate-800/90 via-purple-900/90 to-slate-800/90 backdrop-blur-xl rounded-2xl p-6 shadow-xl border-2 border-yellow-500/30 overflow-hidden"
                whileHover={{ scale: 1.05, borderColor: 'rgba(255, 215, 0, 0.6)' }}
                transition={{ duration: 0.3 }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/5 via-transparent to-pink-500/5"></div>
                <div className="text-5xl mb-4 relative z-10">{feature.icon}</div>
                <h3 className="text-xl font-black text-yellow-300 mb-2 relative z-10">
                  {feature.title}
                </h3>
                <p className="text-yellow-200 relative z-10">
                  {feature.desc}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
