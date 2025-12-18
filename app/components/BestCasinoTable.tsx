'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { CountryCode } from './PaymentMethodsTable';

export interface BestCasino {
  name: string;
  url: string;
  rating: number; // 1-5
  bonus?: string;
  minDeposit?: string;
  license?: string;
}

export type TableStyle = 'classic' | 'modern' | 'minimal';

const TRANSLATIONS: Record<CountryCode, {
  title: string;
  subtitle: string;
  casino: string;
  rating: string;
  bonus: string;
  minDeposit: string;
  license: string;
  playNow: string;
}> = {
  UK: {
    title: 'Best Casino',
    subtitle: 'Top 5 best casinos with best ratings and bonuses',
    casino: 'Casino',
    rating: 'Rating',
    bonus: 'Bonus',
    minDeposit: 'Min Deposit',
    license: 'License',
    playNow: 'Play Now',
  },
  DE: {
    title: 'Bestes Casino',
    subtitle: 'Top 5 beste Casinos mit besten Bewertungen und Boni',
    casino: 'Casino',
    rating: 'Bewertung',
    bonus: 'Bonus',
    minDeposit: 'Mindestbetrag',
    license: 'Lizenz',
    playNow: 'Jetzt Spielen',
  },
  FR: {
    title: 'Meilleur Casino',
    subtitle: 'Top 5 meilleurs casinos avec les meilleures notes et bonus',
    casino: 'Casino',
    rating: 'Note',
    bonus: 'Bonus',
    minDeposit: 'Dépôt Min',
    license: 'Licence',
    playNow: 'Jouer Maintenant',
  },
  ES: {
    title: 'Mejor Casino',
    subtitle: 'Top 5 mejores casinos con mejores calificaciones y bonos',
    casino: 'Casino',
    rating: 'Calificación',
    bonus: 'Bono',
    minDeposit: 'Depósito Mín',
    license: 'Licencia',
    playNow: 'Jugar Ahora',
  },
  IT: {
    title: 'Miglior Casinò',
    subtitle: 'Top 5 migliori casinò con migliori valutazioni e bonus',
    casino: 'Casinò',
    rating: 'Valutazione',
    bonus: 'Bonus',
    minDeposit: 'Deposito Min',
    license: 'Licenza',
    playNow: 'Gioca Ora',
  },
  PT: {
    title: 'Melhor Casino',
    subtitle: 'Top 5 melhores casinos com melhores avaliações e bônus',
    casino: 'Casino',
    rating: 'Avaliação',
    bonus: 'Bônus',
    minDeposit: 'Depósito Mín',
    license: 'Licença',
    playNow: 'Jogar Agora',
  },
  BR: {
    title: 'Melhor Cassino',
    subtitle: 'Top 5 melhores cassinos com melhores avaliações e bônus',
    casino: 'Cassino',
    rating: 'Avaliação',
    bonus: 'Bônus',
    minDeposit: 'Depósito Mín',
    license: 'Licença',
    playNow: 'Jogar Agora',
  },
  BG: {
    title: 'Най-доброто Казино',
    subtitle: 'Топ 5 най-добри казина с най-добри оценки и бонуси',
    casino: 'Казино',
    rating: 'Оценка',
    bonus: 'Бонус',
    minDeposit: 'Мин. Депозит',
    license: 'Лиценз',
    playNow: 'Играй Сега',
  },
  HU: {
    title: 'Legjobb Kaszinó',
    subtitle: 'Top 5 legjobb kaszinó a legjobb értékelésekkel és bónuszokkal',
    casino: 'Kaszinó',
    rating: 'Értékelés',
    bonus: 'Bónusz',
    minDeposit: 'Min. Befizetés',
    license: 'Licenc',
    playNow: 'Játék Most',
  },
  FI: {
    title: 'Paras Kasino',
    subtitle: 'Top 5 parasta kasinoa parhaisilla arvioilla ja bonuksilla',
    casino: 'Kasino',
    rating: 'Arvio',
    bonus: 'Bonus',
    minDeposit: 'Min. Talletus',
    license: 'Lisenssi',
    playNow: 'Pelaa Nyt',
  },
  NO: {
    title: 'Beste Casino',
    subtitle: 'Top 5 beste casinoer med beste vurderinger og bonuser',
    casino: 'Casino',
    rating: 'Vurdering',
    bonus: 'Bonus',
    minDeposit: 'Min. Innskudd',
    license: 'Lisens',
    playNow: 'Spill Nå',
  },
};

interface BestCasinoTableProps {
  country: CountryCode;
  casinos: BestCasino[];
  countryFlag?: string;
  style?: TableStyle;
}

export default function BestCasinoTable({ country, casinos, countryFlag, style = 'classic' }: BestCasinoTableProps) {
  const [selectedCasino, setSelectedCasino] = useState<number | null>(null);
  const t = TRANSLATIONS[country];
  
  const getStyleClasses = () => {
    switch (style) {
      case 'modern':
        return {
          container: 'bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-purple-900/30 dark:via-blue-900/30 dark:to-pink-900/30',
          header: 'bg-gradient-to-r from-purple-600 via-blue-600 to-pink-600 dark:from-purple-500 dark:via-blue-500 dark:to-pink-500',
          headerText: 'text-white',
          tableHeader: 'bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-800/50 dark:to-blue-800/50',
          row: 'hover:bg-gradient-to-r hover:from-purple-50 hover:to-blue-50 dark:hover:from-purple-800/30 dark:hover:to-blue-800/30',
          selectedRow: 'bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-800/40 dark:to-purple-800/40',
          border: 'border-purple-200 dark:border-purple-700',
          card: 'bg-gradient-to-br from-white to-purple-50 dark:from-gray-800 dark:to-purple-900/30 border-purple-300 dark:border-purple-700',
          details: 'bg-gradient-to-r from-purple-100 via-blue-100 to-pink-100 dark:from-purple-900/40 dark:via-blue-900/40 dark:to-pink-900/40 border-purple-300 dark:border-purple-700',
        };
      case 'minimal':
        return {
          container: 'bg-white dark:bg-gray-900',
          header: 'bg-transparent',
          headerText: 'text-gray-900 dark:text-white',
          tableHeader: 'bg-gray-50 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600',
          row: 'hover:bg-gray-50 dark:hover:bg-gray-800/50',
          selectedRow: 'bg-gray-100 dark:bg-gray-800',
          border: 'border-gray-200 dark:border-gray-700',
          card: 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700',
          details: 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700',
        };
      default: // classic
        return {
          container: 'bg-white dark:bg-gray-800',
          header: 'bg-transparent',
          headerText: 'text-gray-900 dark:text-white',
          tableHeader: 'bg-gray-100 dark:bg-gray-700 border-b-2 border-gray-300 dark:border-gray-600',
          row: 'hover:bg-gray-50 dark:hover:bg-gray-700/50',
          selectedRow: 'bg-blue-50 dark:bg-blue-900/20',
          border: 'border-gray-200 dark:border-gray-700',
          card: 'bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700',
          details: 'bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-blue-200 dark:border-blue-800',
        };
    }
  };
  
  const styleClasses = getStyleClasses();
  
  const getRatingStars = (rating: number) => {
    return '⭐'.repeat(rating) + '☆'.repeat(5 - rating);
  };

  return (
    <div className={`w-full max-w-6xl mx-auto p-2 sm:p-4 md:p-6 ${styleClasses.container} rounded-xl sm:rounded-2xl shadow-xl border ${styleClasses.border} min-w-0`}>
      {/* Header */}
      <div className={`text-center mb-4 sm:mb-6 md:mb-8 p-2 sm:p-4 rounded-xl ${style === 'modern' ? styleClasses.header : ''}`}>
        <h2 className={`text-xl sm:text-2xl md:text-3xl lg:text-4xl font-extrabold mb-1 sm:mb-2 md:mb-3 ${
          style === 'modern' 
            ? styleClasses.headerText 
            : 'bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 dark:from-blue-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent'
        }`}>
          {t.title}
        </h2>
        <p className={`text-xs sm:text-sm md:text-base lg:text-lg px-1 sm:px-2 ${
          style === 'modern' 
            ? styleClasses.headerText + ' opacity-90' 
            : 'text-gray-600 dark:text-gray-300'
        }`}>
          {t.subtitle}
        </p>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className={`${styleClasses.tableHeader} border-b-2 ${styleClasses.border}`}>
              <th className={`text-left py-4 px-4 font-bold ${style === 'modern' ? 'text-purple-900 dark:text-purple-100' : 'text-gray-900 dark:text-white'}`}>{t.casino}</th>
              <th className={`text-center py-4 px-4 font-bold ${style === 'modern' ? 'text-purple-900 dark:text-purple-100' : 'text-gray-900 dark:text-white'}`}>{t.rating}</th>
              <th className={`text-center py-4 px-4 font-bold ${style === 'modern' ? 'text-purple-900 dark:text-purple-100' : 'text-gray-900 dark:text-white'}`}>{t.bonus}</th>
              <th className={`text-center py-4 px-4 font-bold ${style === 'modern' ? 'text-purple-900 dark:text-purple-100' : 'text-gray-900 dark:text-white'}`}>{t.minDeposit}</th>
              <th className={`text-center py-4 px-4 font-bold ${style === 'modern' ? 'text-purple-900 dark:text-purple-100' : 'text-gray-900 dark:text-white'}`}>{t.license}</th>
            </tr>
          </thead>
          <tbody>
            {casinos.slice(0, 5).map((casino, index) => (
              <motion.tr
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`
                  border-b ${styleClasses.border}
                  ${styleClasses.row}
                  transition-colors cursor-pointer
                  ${selectedCasino === index ? styleClasses.selectedRow : ''}
                `}
                onClick={() => setSelectedCasino(selectedCasino === index ? null : index)}
              >
                <td className="py-4 px-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🎲</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {casino.name}
                    </span>
                  </div>
                </td>
                <td className="py-4 px-4 text-center">
                  <span className="text-lg" title={`${casino.rating}/5`}>
                    {getRatingStars(casino.rating)}
                  </span>
                </td>
                <td className="py-4 px-4 text-center text-gray-700 dark:text-gray-300">
                  {casino.bonus || '-'}
                </td>
                <td className="py-4 px-4 text-center text-gray-700 dark:text-gray-300">
                  {casino.minDeposit || '-'}
                </td>
                <td className="py-4 px-4 text-center text-gray-700 dark:text-gray-300">
                  {casino.license || '-'}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Selected Casino Details - Desktop */}
      {selectedCasino !== null && casinos[selectedCasino] && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className={`hidden md:block mt-4 sm:mt-6 p-4 sm:p-6 ${styleClasses.details} rounded-xl border ${styleClasses.border}`}
        >
          <div className="flex items-start gap-4">
            <span className="text-4xl">🎲</span>
            <div className="flex-1">
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">
                {casinos[selectedCasino].name}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t.rating}</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {getRatingStars(casinos[selectedCasino].rating)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t.bonus}</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">{casinos[selectedCasino].bonus || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t.minDeposit}</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">{casinos[selectedCasino].minDeposit || '-'}</p>
                </div>
              </div>
              {casinos[selectedCasino].url && (
                <div className="mt-4">
                  <a
                    href={casinos[selectedCasino].url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                  >
                    {t.playNow} →
                  </a>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Mobile Card View - Always visible on mobile */}
      <div className="md:hidden space-y-3 sm:space-y-4 w-full">
        {casinos.length > 0 && casinos.slice(0, 5).map((casino, index) => (
          <div key={index} className="w-full">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`
                w-full p-4 rounded-xl border-2 transition-all cursor-pointer touch-manipulation
                ${selectedCasino === index 
                  ? style === 'modern'
                    ? 'bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-800/40 dark:to-blue-800/40 border-purple-500 dark:border-purple-400 shadow-lg'
                    : style === 'minimal'
                    ? 'bg-gray-100 dark:bg-gray-800 border-gray-400 dark:border-gray-500 shadow-lg'
                    : 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 dark:border-blue-400 shadow-lg'
                  : `${styleClasses.card} active:scale-[0.98] hover:border-gray-300 dark:hover:border-gray-600`}
              `}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setSelectedCasino(selectedCasino === index ? null : index);
              }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-2xl flex-shrink-0">🎲</span>
                  <span className="font-bold text-gray-900 dark:text-white text-base truncate">
                    {casino.name}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="min-w-0">
                  <div className="text-gray-600 dark:text-gray-400 mb-1 truncate">{t.rating}</div>
                  <div className="font-semibold text-gray-900 dark:text-white break-words text-[10px] sm:text-xs">{getRatingStars(casino.rating)}</div>
                </div>
                <div className="min-w-0">
                  <div className="text-gray-600 dark:text-gray-400 mb-1 truncate">{t.bonus}</div>
                  <div className="font-semibold text-gray-900 dark:text-white truncate">{casino.bonus || '-'}</div>
                </div>
                <div className="min-w-0">
                  <div className="text-gray-600 dark:text-gray-400 mb-1 truncate">{t.minDeposit}</div>
                  <div className="font-semibold text-gray-900 dark:text-white truncate">{casino.minDeposit || '-'}</div>
                </div>
              </div>
              
              {/* Expand indicator */}
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-center">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {selectedCasino === index ? 'Нажмите, чтобы свернуть' : 'Нажмите для подробностей'}
                </span>
              </div>
            </motion.div>

            {/* Mobile Details */}
            {selectedCasino === index && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className={`w-full p-4 ${styleClasses.details} rounded-xl border ${styleClasses.border} overflow-visible`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-3xl flex-shrink-0">🎲</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3 break-words">
                      {casino.name}
                    </h3>
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between items-center p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                        <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">{t.rating}</span>
                        <span className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white ml-2 break-words text-right">{getRatingStars(casino.rating)}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                        <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">{t.bonus}</span>
                        <span className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white ml-2 break-words text-right">{casino.bonus || '-'}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                        <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">{t.minDeposit}</span>
                        <span className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white ml-2">{casino.minDeposit || '-'}</span>
                      </div>
                      {casino.license && (
                        <div className="flex justify-between items-center p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                          <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">{t.license}</span>
                          <span className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white ml-2">{casino.license}</span>
                        </div>
                      )}
                    </div>
                    {casino.url && (
                      <a
                        href={casino.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full text-center px-4 py-2 bg-blue-600 active:bg-blue-700 text-white font-semibold rounded-lg transition-colors touch-manipulation"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {t.playNow} →
                      </a>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-6 text-center">
        <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-widest font-semibold">
          Verified by SEOHQS
        </span>
      </div>
    </div>
  );
}
