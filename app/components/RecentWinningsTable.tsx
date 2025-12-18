'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CountryCode } from './PaymentMethodsTable';

export interface CasinoWinning {
  casino: string;
  url: string;
  player: string;
  amount: string;
  game: string;
  date: string;
}

export type TableStyle = 'dark' | 'light' | 'casino' | 'classic' | 'modern' | 'minimal';

const TRANSLATIONS: Record<CountryCode, {
  title: string;
  subtitle: string;
  casino: string;
  player: string;
  amount: string;
  game: string;
  date: string;
  playNow: string;
}> = {
  UK: {
    title: 'Recent Casino Winnings',
    subtitle: 'Latest big wins from our top casinos',
    casino: 'Casino',
    player: 'Player',
    amount: 'Amount',
    game: 'Game',
    date: 'Date',
    playNow: 'Play Now',
  },
  DE: {
    title: 'Aktuelle Casino-Gewinne',
    subtitle: 'Neueste große Gewinne aus unseren Top-Casinos',
    casino: 'Casino',
    player: 'Spieler',
    amount: 'Betrag',
    game: 'Spiel',
    date: 'Datum',
    playNow: 'Jetzt Spielen',
  },
  FR: {
    title: 'Gains Récents du Casino',
    subtitle: 'Derniers gros gains de nos meilleurs casinos',
    casino: 'Casino',
    player: 'Joueur',
    amount: 'Montant',
    game: 'Jeu',
    date: 'Date',
    playNow: 'Jouer Maintenant',
  },
  ES: {
    title: 'Ganancias Recientes del Casino',
    subtitle: 'Últimas grandes ganancias de nuestros mejores casinos',
    casino: 'Casino',
    player: 'Jugador',
    amount: 'Cantidad',
    game: 'Juego',
    date: 'Fecha',
    playNow: 'Jugar Ahora',
  },
  IT: {
    title: 'Vincite Recenti del Casinò',
    subtitle: 'Ultime grandi vincite dai nostri migliori casinò',
    casino: 'Casinò',
    player: 'Giocatore',
    amount: 'Importo',
    game: 'Gioco',
    date: 'Data',
    playNow: 'Gioca Ora',
  },
  PT: {
    title: 'Ganhos Recentes do Casino',
    subtitle: 'Últimas grandes vitórias dos nossos melhores casinos',
    casino: 'Casino',
    player: 'Jogador',
    amount: 'Valor',
    game: 'Jogo',
    date: 'Data',
    playNow: 'Jogar Agora',
  },
  BR: {
    title: 'Ganhos Recentes do Cassino',
    subtitle: 'Últimas grandes vitórias dos nossos melhores cassinos',
    casino: 'Cassino',
    player: 'Jogador',
    amount: 'Valor',
    game: 'Jogo',
    date: 'Data',
    playNow: 'Jogar Agora',
  },
  BG: {
    title: 'Скорошни Казино Печалби',
    subtitle: 'Последни големи печалби от нашите топ казина',
    casino: 'Казино',
    player: 'Играч',
    amount: 'Сума',
    game: 'Игра',
    date: 'Дата',
    playNow: 'Играй Сега',
  },
  HU: {
    title: 'Friss Kaszinó Nyeremények',
    subtitle: 'Legújabb nagy nyeremények a legjobb kaszinóinkból',
    casino: 'Kaszinó',
    player: 'Játékos',
    amount: 'Összeg',
    game: 'Játék',
    date: 'Dátum',
    playNow: 'Játék Most',
  },
  FI: {
    title: 'Viimeisimmät Kasinovoitot',
    subtitle: 'Viimeisimmät suuret voitot parhaista kasinoistamme',
    casino: 'Kasino',
    player: 'Pelaaja',
    amount: 'Summa',
    game: 'Peli',
    date: 'Päivämäärä',
    playNow: 'Pelaa Nyt',
  },
  NO: {
    title: 'Nylige Casino Gevinster',
    subtitle: 'Siste store gevinster fra våre beste casinoer',
    casino: 'Casino',
    player: 'Spiller',
    amount: 'Beløp',
    game: 'Spill',
    date: 'Dato',
    playNow: 'Spill Nå',
  },
};

interface RecentWinningsTableProps {
  country: CountryCode;
  winnings: CasinoWinning[];
  countryFlag?: string;
  style?: TableStyle;
  autoUpdate?: boolean;
  updateInterval?: number; // in milliseconds
}

export default function RecentWinningsTable({ 
  country, 
  winnings, 
  countryFlag, 
  style = 'classic',
  autoUpdate = true,
  updateInterval = 30000 // 30 seconds default
}: RecentWinningsTableProps) {
  const [displayedWinnings, setDisplayedWinnings] = useState<CasinoWinning[]>([]);
  const [selectedWinning, setSelectedWinning] = useState<number | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [updateKey, setUpdateKey] = useState(0);
  const t = TRANSLATIONS[country];
  
  const normalizedStyle: 'dark' | 'light' | 'casino' =
    style === 'dark' || style === 'light' || style === 'casino'
      ? style
      : style === 'minimal'
        ? 'casino'
        : style === 'modern'
          ? 'light'
          : 'dark';

  // Shuffle and select 5 random winnings
  const selectRandomWinnings = (allWinnings: CasinoWinning[]) => {
    const shuffled = [...allWinnings].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 5);
  };

  useEffect(() => {
    // Initial selection with animation
    setIsInitializing(true);
    setDisplayedWinnings(selectRandomWinnings(winnings));

    if (autoUpdate && winnings.length > 5) {
      const startTime = Date.now();
      const INITIAL_UPDATE_DURATION = 6000; // 6 seconds
      const FAST_UPDATE_INTERVAL = 1500; // 1.5 seconds for fast updates
      let normalInterval: NodeJS.Timeout | null = null;
      
      // Fast updates in first 5-7 seconds
      const fastInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        
        if (elapsed < INITIAL_UPDATE_DURATION) {
          const newWinnings = selectRandomWinnings(winnings);
          setDisplayedWinnings(newWinnings);
          setSelectedWinning(null);
          setUpdateKey(prev => prev + 1);
          
          // Highlight a random row
          const randomIndex = Math.floor(Math.random() * 5);
          setHighlightedIndex(randomIndex);
          setTimeout(() => setHighlightedIndex(null), 800);
        } else {
          clearInterval(fastInterval);
          setIsInitializing(false);
          
          // Start normal update interval
          normalInterval = setInterval(() => {
            setDisplayedWinnings(selectRandomWinnings(winnings));
            setSelectedWinning(null);
          }, updateInterval);
        }
      }, FAST_UPDATE_INTERVAL);

      return () => {
        clearInterval(fastInterval);
        if (normalInterval) {
          clearInterval(normalInterval);
        }
        setIsInitializing(false);
      };
    } else {
      setIsInitializing(false);
    }
  }, [winnings, autoUpdate, updateInterval]);
  
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
          amount: 'text-emerald-700',
          amountChip: 'bg-emerald-50 border-emerald-200 text-emerald-700',
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
          amount: 'text-emerald-300',
          amountChip: 'bg-emerald-500/10 border-emerald-400/20 text-emerald-200',
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
          amount: 'text-emerald-300',
          amountChip: 'bg-emerald-500/10 border-emerald-400/20 text-emerald-200',
        };
    }
  };
  
  const styleClasses = getStyleClasses();
  const iconSizeClass = normalizedStyle === 'dark' ? 'text-xl' : 'text-2xl';

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
              <th className={`text-center py-4 px-4 font-bold ${styleClasses.textStrong}`}>{t.player}</th>
              <th className={`text-center py-4 px-4 font-bold ${styleClasses.textStrong}`}>{t.amount}</th>
              <th className={`text-center py-4 px-4 font-bold ${styleClasses.textStrong}`}>{t.game}</th>
              <th className={`text-center py-4 px-4 font-bold ${styleClasses.textStrong}`}>{t.date}</th>
            </tr>
          </thead>
          <tbody>
            {displayedWinnings.map((winning, index) => (
              <motion.tr
                key={`${winning.casino}-${winning.player}-${index}-${updateKey}`}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ 
                  opacity: 1, 
                  y: 0, 
                  scale: 1,
                  backgroundColor: highlightedIndex === index 
                    ? (normalizedStyle === 'light' ? 'rgba(59, 130, 246, 0.10)' : normalizedStyle === 'casino' ? 'rgba(236, 72, 153, 0.12)' : 'rgba(59, 130, 246, 0.15)')
                    : 'transparent'
                }}
                transition={{ 
                  delay: isInitializing ? index * 0.15 : 0,
                  duration: 0.4,
                  backgroundColor: { duration: 0.3 }
                }}
                className={`
                  border-b ${styleClasses.border}
                  ${styleClasses.row}
                  transition-all cursor-pointer
                  ${selectedWinning === index ? styleClasses.selectedRow : ''}
                  ${highlightedIndex === index ? (normalizedStyle === 'light' ? 'ring-2 ring-blue-400 shadow-lg' : 'ring-2 ring-fuchsia-400/60 shadow-lg') : ''}
                `}
                onClick={() => setSelectedWinning(selectedWinning === index ? null : index)}
              >
                <td className="py-4 px-4">
                  <div className="flex items-center gap-3">
                    <span className={iconSizeClass}>🎲</span>
                    <span className={`font-semibold ${styleClasses.textStrong}`}>
                      {winning.casino}
                    </span>
                  </div>
                </td>
                <td className={`py-4 px-4 text-center ${styleClasses.text}`}>
                  {winning.player}
                </td>
                <td className="py-4 px-4 text-center">
                  <motion.span 
                    key={`${winning.amount}-${updateKey}`}
                    initial={{ scale: 1.3, opacity: 0 }}
                    animate={{ 
                      scale: highlightedIndex === index ? [1, 1.1, 1] : 1, 
                      opacity: 1 
                    }}
                    transition={{ 
                      duration: 0.4,
                      scale: { 
                        times: [0, 0.5, 1],
                        duration: 0.5,
                        repeat: highlightedIndex === index ? 1 : 0
                      }
                    }}
                    className={`font-bold ${styleClasses.amount} text-lg inline-block`}
                  >
                    {winning.amount}
                  </motion.span>
                </td>
                <td className={`py-4 px-4 text-center ${styleClasses.text}`}>
                  {winning.game}
                </td>
                <td className={`py-4 px-4 text-center ${styleClasses.text}`}>
                  {winning.date}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Selected Winning Details - Desktop */}
      {selectedWinning !== null && displayedWinnings[selectedWinning] && (
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
                {displayedWinnings[selectedWinning].casino}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4">
                <div>
                  <p className={`text-sm ${styleClasses.textMuted} mb-1`}>{t.player}</p>
                  <p className={`text-lg font-semibold ${styleClasses.textStrong}`}>{displayedWinnings[selectedWinning].player}</p>
                </div>
                <div>
                  <p className={`text-sm ${styleClasses.textMuted} mb-1`}>{t.amount}</p>
                  <p className={`text-lg font-semibold ${styleClasses.amount}`}>{displayedWinnings[selectedWinning].amount}</p>
                </div>
                <div>
                  <p className={`text-sm ${styleClasses.textMuted} mb-1`}>{t.game}</p>
                  <p className={`text-lg font-semibold ${styleClasses.textStrong}`}>{displayedWinnings[selectedWinning].game}</p>
                </div>
                <div>
                  <p className={`text-sm ${styleClasses.textMuted} mb-1`}>{t.date}</p>
                  <p className={`text-lg font-semibold ${styleClasses.textStrong}`}>{displayedWinnings[selectedWinning].date}</p>
                </div>
              </div>
              {displayedWinnings[selectedWinning].url && (
                <div className="mt-4">
                  <a
                    href={displayedWinnings[selectedWinning].url}
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
        {displayedWinnings && displayedWinnings.length > 0 ? (
          <>
            {displayedWinnings.map((winning, index) => (
          <div key={`${winning.casino}-${winning.player}-${index}-${updateKey}`} className="w-full">
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ 
                opacity: 1, 
                y: 0, 
                scale: 1,
                backgroundColor: highlightedIndex === index 
                  ? (normalizedStyle === 'light' ? 'rgba(59, 130, 246, 0.10)' : normalizedStyle === 'casino' ? 'rgba(236, 72, 153, 0.12)' : 'rgba(59, 130, 246, 0.15)')
                  : undefined
              }}
              transition={{ 
                delay: isInitializing ? index * 0.15 : 0,
                duration: 0.4,
                backgroundColor: { duration: 0.3 }
              }}
              className={`
                w-full p-4 rounded-xl border-2 transition-all cursor-pointer touch-manipulation
                ${selectedWinning === index 
                  ? normalizedStyle === 'light'
                    ? 'bg-blue-50 border-blue-300 shadow-lg'
                    : normalizedStyle === 'casino'
                    ? 'bg-gradient-to-r from-amber-500/10 via-fuchsia-500/10 to-cyan-400/10 border-amber-400/30 shadow-lg'
                    : 'bg-white/5 border-blue-400/40 shadow-lg'
                  : `${styleClasses.card} active:scale-[0.98] hover:border-white/20`}
                ${highlightedIndex === index ? (normalizedStyle === 'light' ? 'ring-2 ring-blue-400 shadow-lg' : 'ring-2 ring-fuchsia-400/60 shadow-lg') : ''}
              `}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setSelectedWinning(selectedWinning === index ? null : index);
              }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className={`${iconSizeClass} flex-shrink-0`}>🎲</span>
                  <span className={`font-bold ${styleClasses.textStrong} text-base truncate`}>
                    {winning.casino}
                  </span>
                </div>
                <motion.span 
                  key={winning.amount}
                  initial={{ scale: 1.2, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  className={`font-bold ${styleClasses.amount} text-lg inline-block flex-shrink-0`}
                >
                  {winning.amount}
                </motion.span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                <div className="min-w-0">
                  <div className={`mb-1 truncate ${styleClasses.textMuted}`}>{t.player}</div>
                  <div className={`font-semibold ${styleClasses.textStrong} truncate`}>{winning.player}</div>
                </div>
                <div className="min-w-0">
                  <div className={`mb-1 truncate ${styleClasses.textMuted}`}>{t.game}</div>
                  <div className={`font-semibold ${styleClasses.textStrong} truncate`}>{winning.game}</div>
                </div>
              </div>
              <div className={`text-xs ${styleClasses.textMuted}`}>
                {winning.date}
              </div>
              
              {/* Expand indicator */}
              <div className={`mt-3 pt-3 border-t ${normalizedStyle === 'light' ? 'border-slate-200' : 'border-white/10'} flex items-center justify-center`}>
                <span className={`text-xs ${styleClasses.textMuted}`}>
                  {selectedWinning === index ? 'Нажмите, чтобы свернуть' : 'Нажмите для подробностей'}
                </span>
              </div>
            </motion.div>

            {/* Mobile Details */}
            {selectedWinning === index && (
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
                      {winning.casino}
                    </h3>
                    <div className="space-y-2 mb-4">
                      <div className={`flex justify-between items-center p-3 ${styleClasses.detailsCard} rounded-lg ${styleClasses.badgeRing}`}>
                        <span className={`text-xs sm:text-sm ${styleClasses.textMuted}`}>{t.player}</span>
                        <span className={`text-sm sm:text-base font-semibold ${styleClasses.textStrong} ml-2 break-words text-right`}>{winning.player}</span>
                      </div>
                      <div className={`flex justify-between items-center p-3 ${styleClasses.detailsCard} rounded-lg ${styleClasses.badgeRing}`}>
                        <span className={`text-xs sm:text-sm ${styleClasses.textMuted}`}>{t.amount}</span>
                        <span className={`text-sm sm:text-base font-semibold ${styleClasses.amount} ml-2 break-words text-right`}>{winning.amount}</span>
                      </div>
                      <div className={`flex justify-between items-center p-3 ${styleClasses.detailsCard} rounded-lg ${styleClasses.badgeRing}`}>
                        <span className={`text-xs sm:text-sm ${styleClasses.textMuted}`}>{t.game}</span>
                        <span className={`text-sm sm:text-base font-semibold ${styleClasses.textStrong} ml-2 break-words text-right`}>{winning.game}</span>
                      </div>
                      <div className={`flex justify-between items-center p-3 ${styleClasses.detailsCard} rounded-lg ${styleClasses.badgeRing}`}>
                        <span className={`text-xs sm:text-sm ${styleClasses.textMuted}`}>{t.date}</span>
                        <span className={`text-sm sm:text-base font-semibold ${styleClasses.textStrong} ml-2`}>{winning.date}</span>
                      </div>
                    </div>
                    {winning.url && (
                      <a
                        href={winning.url}
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
            <p className="text-lg font-semibold">Нет доступных выигрышей</p>
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
