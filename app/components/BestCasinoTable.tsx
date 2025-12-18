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

export type TableStyle = 'dark' | 'light' | 'casino' | 'classic' | 'modern' | 'minimal';

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
  
  const normalizedStyle: 'dark' | 'light' | 'casino' =
    style === 'dark' || style === 'light' || style === 'casino'
      ? style
      : style === 'minimal'
        ? 'casino'
        : style === 'modern'
          ? 'light'
          : 'dark';

  const getStyleClasses = () => {
    switch (normalizedStyle) {
      // 2) Light style (for white websites)
      case 'light':
        return {
          container: 'bg-white',
          header: 'bg-transparent',
          headerText: 'text-slate-950',
          tableHeader: 'bg-slate-50',
          row: 'hover:bg-slate-50',
          selectedRow: 'bg-blue-50',
          border: 'border-slate-200',
          card: 'bg-white border-slate-200',
          details: 'bg-slate-50 border-slate-200',
          textStrong: 'text-slate-950',
          text: 'text-slate-700',
          textMuted: 'text-slate-500',
          badgeRing: 'ring-1 ring-black/5',
          detailsCard: 'bg-white/70',
          primaryBtn: 'bg-blue-600 hover:bg-blue-700 text-white',
        };
      // 3) Casino / landing style (colorful)
      case 'casino':
        return {
          container: 'bg-gradient-to-br from-[#070A16] via-[#1A0636] to-[#062A4B]',
          header: 'bg-transparent',
          headerText: 'text-white',
          tableHeader: 'bg-gradient-to-r from-amber-500/15 via-fuchsia-500/15 to-cyan-400/15',
          row: 'hover:bg-white/5',
          selectedRow: 'bg-gradient-to-r from-amber-500/10 via-fuchsia-500/10 to-cyan-400/10',
          border: 'border-white/10',
          card: 'bg-black/25 border-white/10',
          details: 'bg-gradient-to-r from-black/40 via-fuchsia-950/25 to-black/40 border-amber-400/20',
          textStrong: 'text-white',
          text: 'text-white/85',
          textMuted: 'text-white/60',
          badgeRing: 'ring-1 ring-white/10',
          detailsCard: 'bg-black/20',
          primaryBtn: 'bg-gradient-to-r from-amber-500 via-fuchsia-500 to-cyan-400 text-slate-950 hover:brightness-110',
        };
      // 1) Dark style (keep dark, improve proportions a bit)
      default:
        return {
          container: 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950',
          header: 'bg-transparent',
          headerText: 'text-white',
          tableHeader: 'bg-slate-900/70',
          row: 'hover:bg-white/5',
          selectedRow: 'bg-blue-500/10',
          border: 'border-slate-700/50',
          card: 'bg-slate-900/40 border-slate-700/50',
          details: 'bg-gradient-to-r from-slate-900/70 to-slate-950/70 border-slate-700/50',
          textStrong: 'text-white',
          text: 'text-slate-200',
          textMuted: 'text-slate-400',
          badgeRing: 'ring-1 ring-white/10',
          detailsCard: 'bg-white/5',
          primaryBtn: 'bg-blue-600 hover:bg-blue-700 text-white',
        };
    }
  };
  
  const styleClasses = getStyleClasses();
  const iconSizeClass = normalizedStyle === 'dark' ? 'text-xl' : 'text-2xl';
  
  const getRatingStars = (rating: number) => {
    return '⭐'.repeat(rating) + '☆'.repeat(5 - rating);
  };

  return (
    <div className={`w-full max-w-6xl mx-auto p-2 sm:p-4 md:p-6 ${styleClasses.container} rounded-xl sm:rounded-2xl shadow-xl border ${styleClasses.border} min-w-0`}>
      {/* Header */}
      <div className={`text-center mb-4 sm:mb-6 md:mb-8 p-2 sm:p-4 rounded-xl`}>
        <h2 className={`text-xl sm:text-2xl md:text-3xl lg:text-4xl font-extrabold mb-1 sm:mb-2 md:mb-3 ${styleClasses.headerText}`}>
          {t.title}
        </h2>
        <p className={`text-xs sm:text-sm md:text-base lg:text-lg px-1 sm:px-2 ${styleClasses.textMuted}`}>
          {t.subtitle}
        </p>
      </div>

      {/* Desktop Table View */}
      <div className="desktop-table-view hidden md:block overflow-x-auto w-full">
        <table className="w-full">
          <thead>
            <tr className={`${styleClasses.tableHeader} border-b-2 ${styleClasses.border}`}>
              <th className={`text-left py-4 px-4 font-bold ${styleClasses.textStrong}`}>{t.casino}</th>
              <th className={`text-center py-4 px-4 font-bold ${styleClasses.textStrong}`}>{t.rating}</th>
              <th className={`text-center py-4 px-4 font-bold ${styleClasses.textStrong}`}>{t.bonus}</th>
              <th className={`text-center py-4 px-4 font-bold ${styleClasses.textStrong}`}>{t.minDeposit}</th>
              <th className={`text-center py-4 px-4 font-bold ${styleClasses.textStrong}`}>{t.license}</th>
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
                    <span className={iconSizeClass}>🎲</span>
                    <span className={`font-semibold ${styleClasses.textStrong}`}>
                      {casino.name}
                    </span>
                  </div>
                </td>
                <td className="py-4 px-4 text-center">
                  <span className="text-lg" title={`${casino.rating}/5`}>
                    {getRatingStars(casino.rating)}
                  </span>
                </td>
                <td className={`py-4 px-4 text-center ${styleClasses.text}`}>
                  {casino.bonus || '-'}
                </td>
                <td className={`py-4 px-4 text-center ${styleClasses.text}`}>
                  {casino.minDeposit || '-'}
                </td>
                <td className={`py-4 px-4 text-center ${styleClasses.text}`}>
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
              <h3 className={`text-xl sm:text-2xl font-bold ${styleClasses.textStrong} mb-4`}>
                {casinos[selectedCasino].name}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div>
                  <p className={`text-sm ${styleClasses.textMuted} mb-1`}>{t.rating}</p>
                  <p className={`text-lg font-semibold ${styleClasses.textStrong}`}>
                    {getRatingStars(casinos[selectedCasino].rating)}
                  </p>
                </div>
                <div>
                  <p className={`text-sm ${styleClasses.textMuted} mb-1`}>{t.bonus}</p>
                  <p className={`text-lg font-semibold ${styleClasses.textStrong}`}>{casinos[selectedCasino].bonus || '-'}</p>
                </div>
                <div>
                  <p className={`text-sm ${styleClasses.textMuted} mb-1`}>{t.minDeposit}</p>
                  <p className={`text-lg font-semibold ${styleClasses.textStrong}`}>{casinos[selectedCasino].minDeposit || '-'}</p>
                </div>
              </div>
              {casinos[selectedCasino].url && (
                <div className="mt-4">
                  <a
                    href={casinos[selectedCasino].url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-block px-6 py-3 font-semibold rounded-lg transition-colors ${styleClasses.primaryBtn}`}
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
      <div className="mobile-table-view block md:hidden space-y-3 sm:space-y-4 w-full min-h-[200px]">
        {casinos && casinos.length > 0 ? (
          <>
            {casinos.slice(0, 5).map((casino, index) => (
          <div key={index} className="w-full">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`
                w-full p-4 rounded-xl border-2 transition-all cursor-pointer touch-manipulation
                ${selectedCasino === index 
                  ? normalizedStyle === 'light'
                    ? 'bg-blue-50 border-blue-300 shadow-lg'
                    : normalizedStyle === 'casino'
                    ? 'bg-gradient-to-r from-amber-500/10 via-fuchsia-500/10 to-cyan-400/10 border-amber-400/30 shadow-lg'
                    : 'bg-white/5 border-blue-400/40 shadow-lg'
                  : `${styleClasses.card} active:scale-[0.98] hover:border-white/20`}
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
                  <span className={`${iconSizeClass} flex-shrink-0`}>🎲</span>
                  <span className={`font-bold ${styleClasses.textStrong} text-base truncate`}>
                    {casino.name}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="min-w-0">
                  <div className={`mb-1 truncate ${styleClasses.textMuted}`}>{t.rating}</div>
                  <div className={`font-semibold ${styleClasses.textStrong} break-words text-[10px] sm:text-xs`}>{getRatingStars(casino.rating)}</div>
                </div>
                <div className="min-w-0">
                  <div className={`mb-1 truncate ${styleClasses.textMuted}`}>{t.bonus}</div>
                  <div className={`font-semibold ${styleClasses.textStrong} truncate`}>{casino.bonus || '-'}</div>
                </div>
                <div className="min-w-0">
                  <div className={`mb-1 truncate ${styleClasses.textMuted}`}>{t.minDeposit}</div>
                  <div className={`font-semibold ${styleClasses.textStrong} truncate`}>{casino.minDeposit || '-'}</div>
                </div>
              </div>
              
              {/* Expand indicator */}
              <div className={`mt-3 pt-3 border-t ${normalizedStyle === 'light' ? 'border-slate-200' : 'border-white/10'} flex items-center justify-center`}>
                <span className={`text-xs ${styleClasses.textMuted}`}>
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
                    <h3 className={`text-lg font-bold ${styleClasses.textStrong} mb-3 break-words`}>
                      {casino.name}
                    </h3>
                    <div className="space-y-2 mb-4">
                      <div className={`flex justify-between items-center p-3 ${styleClasses.detailsCard} rounded-lg ${styleClasses.badgeRing}`}>
                        <span className={`text-xs sm:text-sm ${styleClasses.textMuted}`}>{t.rating}</span>
                        <span className={`text-sm sm:text-base font-semibold ${styleClasses.textStrong} ml-2 break-words text-right`}>{getRatingStars(casino.rating)}</span>
                      </div>
                      <div className={`flex justify-between items-center p-3 ${styleClasses.detailsCard} rounded-lg ${styleClasses.badgeRing}`}>
                        <span className={`text-xs sm:text-sm ${styleClasses.textMuted}`}>{t.bonus}</span>
                        <span className={`text-sm sm:text-base font-semibold ${styleClasses.textStrong} ml-2 break-words text-right`}>{casino.bonus || '-'}</span>
                      </div>
                      <div className={`flex justify-between items-center p-3 ${styleClasses.detailsCard} rounded-lg ${styleClasses.badgeRing}`}>
                        <span className={`text-xs sm:text-sm ${styleClasses.textMuted}`}>{t.minDeposit}</span>
                        <span className={`text-sm sm:text-base font-semibold ${styleClasses.textStrong} ml-2`}>{casino.minDeposit || '-'}</span>
                      </div>
                      {casino.license && (
                        <div className={`flex justify-between items-center p-3 ${styleClasses.detailsCard} rounded-lg ${styleClasses.badgeRing}`}>
                          <span className={`text-xs sm:text-sm ${styleClasses.textMuted}`}>{t.license}</span>
                          <span className={`text-sm sm:text-base font-semibold ${styleClasses.textStrong} ml-2`}>{casino.license}</span>
                        </div>
                      )}
                    </div>
                    {casino.url && (
                      <a
                        href={casino.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`block w-full text-center px-4 py-2 font-semibold rounded-lg transition-colors touch-manipulation ${styleClasses.primaryBtn}`}
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
          </>
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <p className="text-lg font-semibold">Нет доступных казино</p>
            <p className="text-sm mt-2">Попробуйте обновить страницу</p>
          </div>
        )}
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
