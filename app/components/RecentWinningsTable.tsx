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

export type TableStyle = 'classic' | 'modern' | 'minimal';

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
      <div className="desktop-table-view hidden md:block overflow-x-auto w-full">
        <table className="w-full">
          <thead>
            <tr className={`${styleClasses.tableHeader} border-b-2 ${styleClasses.border}`}>
              <th className={`text-left py-4 px-4 font-bold ${style === 'modern' ? 'text-purple-900 dark:text-purple-100' : 'text-gray-900 dark:text-white'}`}>{t.casino}</th>
              <th className={`text-center py-4 px-4 font-bold ${style === 'modern' ? 'text-purple-900 dark:text-purple-100' : 'text-gray-900 dark:text-white'}`}>{t.player}</th>
              <th className={`text-center py-4 px-4 font-bold ${style === 'modern' ? 'text-purple-900 dark:text-purple-100' : 'text-gray-900 dark:text-white'}`}>{t.amount}</th>
              <th className={`text-center py-4 px-4 font-bold ${style === 'modern' ? 'text-purple-900 dark:text-purple-100' : 'text-gray-900 dark:text-white'}`}>{t.game}</th>
              <th className={`text-center py-4 px-4 font-bold ${style === 'modern' ? 'text-purple-900 dark:text-purple-100' : 'text-gray-900 dark:text-white'}`}>{t.date}</th>
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
                    ? (style === 'modern' ? 'rgba(147, 51, 234, 0.2)' : style === 'minimal' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.15)')
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
                  ${highlightedIndex === index ? 'ring-2 ring-blue-400 dark:ring-blue-500 shadow-lg' : ''}
                `}
                onClick={() => setSelectedWinning(selectedWinning === index ? null : index)}
              >
                <td className="py-4 px-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🎲</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {winning.casino}
                    </span>
                  </div>
                </td>
                <td className="py-4 px-4 text-center text-gray-700 dark:text-gray-300">
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
                    className="font-bold text-green-600 dark:text-green-400 text-lg inline-block"
                  >
                    {winning.amount}
                  </motion.span>
                </td>
                <td className="py-4 px-4 text-center text-gray-700 dark:text-gray-300">
                  {winning.game}
                </td>
                <td className="py-4 px-4 text-center text-gray-700 dark:text-gray-300">
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
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">
                {displayedWinnings[selectedWinning].casino}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t.player}</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">{displayedWinnings[selectedWinning].player}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t.amount}</p>
                  <p className="text-lg font-semibold text-green-600 dark:text-green-400">{displayedWinnings[selectedWinning].amount}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t.game}</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">{displayedWinnings[selectedWinning].game}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t.date}</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">{displayedWinnings[selectedWinning].date}</p>
                </div>
              </div>
              {displayedWinnings[selectedWinning].url && (
                <div className="mt-4">
                  <a
                    href={displayedWinnings[selectedWinning].url}
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
                  ? (style === 'modern' ? 'rgba(147, 51, 234, 0.2)' : style === 'minimal' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.15)')
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
                  ? style === 'modern'
                    ? 'bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-800/40 dark:to-blue-800/40 border-purple-500 dark:border-purple-400 shadow-lg'
                    : style === 'minimal'
                    ? 'bg-gray-100 dark:bg-gray-800 border-gray-400 dark:border-gray-500 shadow-lg'
                    : 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 dark:border-blue-400 shadow-lg'
                  : `${styleClasses.card} active:scale-[0.98] hover:border-gray-300 dark:hover:border-gray-600`}
                ${highlightedIndex === index ? 'ring-2 ring-blue-400 dark:ring-blue-500 shadow-lg' : ''}
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
                  <span className="text-2xl flex-shrink-0">🎲</span>
                  <span className="font-bold text-gray-900 dark:text-white text-base truncate">
                    {winning.casino}
                  </span>
                </div>
                <motion.span 
                  key={winning.amount}
                  initial={{ scale: 1.2, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  className="font-bold text-green-600 dark:text-green-400 text-lg inline-block flex-shrink-0"
                >
                  {winning.amount}
                </motion.span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                <div className="min-w-0">
                  <div className="text-gray-600 dark:text-gray-400 mb-1 truncate">{t.player}</div>
                  <div className="font-semibold text-gray-900 dark:text-white truncate">{winning.player}</div>
                </div>
                <div className="min-w-0">
                  <div className="text-gray-600 dark:text-gray-400 mb-1 truncate">{t.game}</div>
                  <div className="font-semibold text-gray-900 dark:text-white truncate">{winning.game}</div>
                </div>
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                {winning.date}
              </div>
              
              {/* Expand indicator */}
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-center">
                <span className="text-xs text-gray-500 dark:text-gray-400">
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
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3 break-words">
                      {winning.casino}
                    </h3>
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between items-center p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                        <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">{t.player}</span>
                        <span className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white ml-2 break-words text-right">{winning.player}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                        <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">{t.amount}</span>
                        <span className="text-sm sm:text-base font-semibold text-green-600 dark:text-green-400 ml-2 break-words text-right">{winning.amount}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                        <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">{t.game}</span>
                        <span className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white ml-2 break-words text-right">{winning.game}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                        <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">{t.date}</span>
                        <span className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white ml-2">{winning.date}</span>
                      </div>
                    </div>
                    {winning.url && (
                      <a
                        href={winning.url}
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
