'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Confetti from 'react-confetti';

interface SlotWheelProps {
  values: string[];
  spinning: boolean;
  result?: string;
  onSpinComplete?: () => void;
  index: number;
}

function SlotWheel({ values, spinning, result, onSpinComplete, index }: SlotWheelProps) {
  const [displayValue, setDisplayValue] = useState(values[0]);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (spinning) {
      setIsAnimating(true);
      
      const interval = setInterval(() => {
        const randomIndex = Math.floor(Math.random() * values.length);
        setDisplayValue(values[randomIndex]);
      }, 50);

      const timeout = setTimeout(() => {
        clearInterval(interval);
        if (result) {
          setDisplayValue(result);
        }
        setIsAnimating(false);
        if (onSpinComplete) {
          setTimeout(onSpinComplete, 300);
        }
      }, 2000 + index * 200);

      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
  }, [spinning, result, values, onSpinComplete, index]);

  return (
    <div className="relative w-24 h-32 sm:w-32 sm:h-40 mx-1 sm:mx-2 overflow-hidden bg-gradient-to-b from-gray-100 to-gray-200 border-x-2 border-gray-400 shadow-[inset_0_0_10px_rgba(0,0,0,0.2)] rounded-lg">
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        animate={{
          y: spinning ? [0, -10, 0] : 0,
          filter: spinning ? "blur(1px)" : "none"
        }}
        transition={{ duration: 0.1, repeat: spinning ? Infinity : 0 }}
      >
        <span className="text-3xl sm:text-4xl font-bold text-gray-800">{displayValue}</span>
      </motion.div>
      
      {/* Shadows for cylinder effect */}
      <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-black/30 to-transparent pointer-events-none z-10"></div>
      <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-black/30 to-transparent pointer-events-none z-10"></div>
      
      {/* Shine/Reflection */}
      <div className="absolute top-1/2 left-0 right-0 h-10 -translate-y-1/2 bg-gradient-to-b from-white/0 via-white/50 to-white/0 pointer-events-none z-10"></div>
    </div>
  );
}

interface InteractiveSlotProps {
  brandName?: string;
  values1?: string[];
  values2?: string[];
  values3?: string[];
  offerUrl?: string;
  language?: string;
  theme?: 'neon' | 'luxury' | 'vibrant';
}

const TRANSLATIONS = {
    ru: {
        spin: 'Крутить',
        spinning: 'Крутится...',
        win: 'Победа!',
        playReal: 'Играть на деньги',
        congrats: 'Поздравляем! Вы выиграли!'
    },
    en: {
        spin: 'SPIN',
        spinning: 'SPINNING...',
        win: 'WIN!',
        playReal: 'PLAY FOR REAL MONEY',
        congrats: 'Congratulations! You won!'
    },
    es: {
        spin: 'GIRAR',
        spinning: 'GIRANDO...',
        win: '¡GANASTE!',
        playReal: 'JUGAR CON DINERO REAL',
        congrats: '¡Felicidades! ¡Ganaste!'
    },
    fr: {
        spin: 'TOURNER',
        spinning: 'TOURNE...',
        win: 'GAGNÉ !',
        playReal: "JOUER POUR DE L'ARGENT",
        congrats: 'Félicitations ! Vous avez gagné !'
    },
    de: {
        spin: 'DREHEN',
        spinning: 'DREHT SICH...',
        win: 'GEWONNEN!',
        playReal: 'UM ECHTES GELD SPIELEN',
        congrats: 'Herzlichen Glückwunsch! Sie haben gewonnen!'
    }
} as const;

const THEME_STYLES = {
  neon: {
    container: 'bg-gray-900 border-gray-800',
    background: 'bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-purple-900 via-gray-900 to-black',
    lights: 'border-yellow-500/50',
    headerBox: 'bg-black/60 border-yellow-500/30 shadow-[0_0_15px_rgba(234,179,8,0.3)]',
    headerText: 'from-yellow-200 via-yellow-400 to-yellow-600',
    screen: 'from-gray-800 to-black border-yellow-600/60',
    payline: 'bg-red-500/50',
    arrow: 'border-l-red-500',
    button: 'from-red-500 to-red-700 border-red-400 shadow-[0_6px_0_rgb(180,0,0),0_10px_20px_rgba(0,0,0,0.4)]',
    buttonCta: 'from-green-500 to-green-700 border-green-400 shadow-[0_0_20px_rgba(34,197,94,0.6)]',
    resultBox: 'bg-black/80 border-yellow-500/40 shadow-[0_0_20px_rgba(234,179,8,0.2)]',
    resultText: 'text-yellow-400 drop-shadow-[0_0_5px_rgba(250,204,21,0.8)]'
  },
  luxury: {
    container: 'bg-black border-yellow-900',
    background: 'bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-yellow-900/40 via-black to-black',
    lights: 'border-yellow-400/60',
    headerBox: 'bg-black/80 border-yellow-600 shadow-[0_0_20px_rgba(250,204,21,0.4)]',
    headerText: 'from-yellow-100 via-yellow-300 to-yellow-500',
    screen: 'from-gray-900 to-black border-yellow-500',
    payline: 'bg-yellow-500/50',
    arrow: 'border-l-yellow-500',
    button: 'from-yellow-600 to-yellow-800 border-yellow-400 shadow-[0_6px_0_rgb(161,98,7),0_10px_20px_rgba(0,0,0,0.4)]',
    buttonCta: 'from-yellow-500 to-yellow-700 border-yellow-300 shadow-[0_0_25px_rgba(234,179,8,0.6)]',
    resultBox: 'bg-black/90 border-yellow-500 shadow-[0_0_30px_rgba(234,179,8,0.3)]',
    resultText: 'text-yellow-200 drop-shadow-[0_0_10px_rgba(250,204,21,1)]'
  },
  vibrant: {
    container: 'bg-indigo-900 border-indigo-800',
    background: 'bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-pink-500 via-purple-900 to-indigo-900',
    lights: 'border-white/40',
    headerBox: 'bg-white/10 border-white/30 backdrop-blur-md shadow-[0_0_20px_rgba(255,255,255,0.2)]',
    headerText: 'from-pink-300 via-purple-300 to-indigo-300',
    screen: 'from-indigo-900 to-purple-900 border-pink-500/60',
    payline: 'bg-pink-500/50',
    arrow: 'border-l-pink-500',
    button: 'from-pink-500 to-purple-600 border-pink-400 shadow-[0_6px_0_rgb(192,38,211),0_10px_20px_rgba(0,0,0,0.4)]',
    buttonCta: 'from-cyan-500 to-blue-600 border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.6)]',
    resultBox: 'bg-indigo-900/90 border-pink-500/50 shadow-[0_0_20px_rgba(236,72,153,0.4)]',
    resultText: 'text-pink-300 drop-shadow-[0_0_5px_rgba(244,114,182,0.8)]'
  }
};

export default function InteractiveSlot({
  brandName = 'CASINO',
  values1 = ['🍒', '🍋', '🍇', '🍉', '🔔', '💎'],
  values2 = ['7️⃣', '🍀', '🎲', '🎰', '🃏', '👑'],
  values3 = ['💰', '💵', '🪙', '🧧', '🏦', '💳'],
  offerUrl = '#',
  language = 'ru',
  theme = 'neon'
}: InteractiveSlotProps) {
  const [spinning, setSpinning] = useState(false);
  const [results, setResults] = useState<[string, string, string] | null>(null);
  const [combination, setCombination] = useState<string>('');
  const [showConfetti, setShowConfetti] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  const [spinFinished, setSpinFinished] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const texts = TRANSLATIONS[language as keyof typeof TRANSLATIONS] || TRANSLATIONS.en;
  const styles = THEME_STYLES[theme];

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setWindowSize({ width: rect.width, height: window.innerHeight });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const [wheel1Spinning, setWheel1Spinning] = useState(false);
  const [wheel2Spinning, setWheel2Spinning] = useState(false);
  const [wheel3Spinning, setWheel3Spinning] = useState(false);

  const handleSpin = () => {
    if (spinning) return;

    setSpinning(true);
    setResults(null);
    setCombination('');
    setShowConfetti(false);
    setSpinFinished(false);

    // Генерируем случайные результаты
    const result1 = values1[Math.floor(Math.random() * values1.length)];
    const result2 = values2[Math.floor(Math.random() * values2.length)];
    const result3 = values3[Math.floor(Math.random() * values3.length)];

    // Запускаем первое колесо
    setWheel1Spinning(true);
    setTimeout(() => {
      setWheel1Spinning(false);
      setResults(prev => prev ? [result1, prev[1], prev[2]] : [result1, '', '']);
      
      // Запускаем второе колесо
      setWheel2Spinning(true);
      setTimeout(() => {
        setWheel2Spinning(false);
        setResults(prev => prev ? [prev[0], result2, prev[2]] : [result1, result2, '']);
        
        // Запускаем третье колесо
        setWheel3Spinning(true);
        setTimeout(() => {
          setWheel3Spinning(false);
          setResults([result1, result2, result3]);
          setSpinning(false);

          // Always show win for engagement in this demo
          setCombination(`${texts.congrats} ${result1} ${result2} ${result3}`);
          setShowConfetti(true);
          setSpinFinished(true); // Show CTA button
          
          setTimeout(() => setShowConfetti(false), 5000);
        }, 1500);
      }, 1500);
    }, 1500);
  };

  const isWin = !!combination;

  return (
    <div ref={containerRef} className="relative w-full max-w-4xl mx-auto font-sans">
      {showConfetti && (
        <Confetti
          width={windowSize.width || window.innerWidth}
          height={windowSize.height || window.innerHeight}
          recycle={false}
          numberOfPieces={500}
        />
      )}

      {/* Casino Machine Cabinet */}
      <div className={`relative p-6 sm:p-10 rounded-[30px] shadow-2xl overflow-hidden border-4 ${styles.container}`}>
        
        {/* Background Texture */}
        <div className={`absolute inset-0 opacity-40 ${styles.background}`}></div>
        
        {/* Lights Border */}
        <div className={`absolute inset-2 border-2 border-dashed rounded-[20px] pointer-events-none animate-pulse ${styles.lights}`}></div>

        {/* Top Header */}
        <div className="relative z-10 text-center mb-6">
          <div className={`inline-block px-8 py-2 rounded-full border backdrop-blur-sm ${styles.headerBox}`}>
            <h2 className={`text-3xl sm:text-4xl font-black uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r ${styles.headerText}`}>
              {brandName}
            </h2>
          </div>
        </div>

        {/* Slot Screen Area */}
        <div className={`relative bg-gradient-to-b rounded-xl border-4 shadow-inner mb-8 ${styles.screen}`}>
            {/* Screen Glare */}
            <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-white/5 to-transparent pointer-events-none rounded-lg z-20"></div>

            <div className="flex justify-center items-center gap-2 sm:gap-4 py-4 px-2 bg-black/40 rounded-lg shadow-inner">
                <SlotWheel
                    values={values1}
                    spinning={wheel1Spinning}
                    result={results?.[0]}
                    index={0}
                />
                <SlotWheel
                    values={values2}
                    spinning={wheel2Spinning}
                    result={results?.[1]}
                    index={1}
                />
                <SlotWheel
                    values={values3}
                    spinning={wheel3Spinning}
                    result={results?.[2]}
                    index={2}
                />
            </div>
            
             {/* Payline */}
             <div className={`absolute top-1/2 left-0 w-full h-0.5 z-20 shadow-[0_0_5px_rgba(255,255,255,0.4)] pointer-events-none ${styles.payline}`}></div>
             <div className={`absolute top-1/2 left-0 -translate-y-1/2 -left-1 w-0 h-0 border-l-[8px] border-y-[6px] border-y-transparent z-20 ${styles.arrow}`}></div>
             <div className={`absolute top-1/2 right-0 -translate-y-1/2 -right-1 w-0 h-0 border-r-[8px] border-l-transparent border-y-[6px] border-y-transparent z-20 border-r-current ${styles.arrow.replace('border-l-', 'text-')}`}></div>
        </div>

        {/* Controls Area */}
        <div className="flex flex-col items-center justify-center relative z-10 space-y-4">
          {!spinFinished ? (
            <motion.button
              onClick={handleSpin}
              disabled={spinning}
              className={`
                relative group px-12 py-4 rounded-full font-black text-xl uppercase tracking-widest
                text-white bg-gradient-to-b border-2
                transition-all duration-100
                ${styles.button}
                ${spinning ? 'opacity-80 cursor-not-allowed filter grayscale-[0.5]' : 'hover:-translate-y-1 active:translate-y-1'}
              `}
            >
              <span className="drop-shadow-md flex items-center gap-2">
                  {spinning ? texts.spinning : texts.spin}
              </span>
               {/* Shine effect on button */}
               <div className="absolute inset-0 rounded-full overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-[50%] bg-gradient-to-b from-white/20 to-transparent"></div>
               </div>
            </motion.button>
          ) : (
            <motion.a
                href={offerUrl}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`
                    relative group px-10 py-5 rounded-full font-black text-xl uppercase tracking-widest
                    text-white bg-gradient-to-b border-2
                    cursor-pointer inline-block
                    animate-pulse text-center
                    ${styles.buttonCta}
                `}
            >
                 <span className="drop-shadow-md">{texts.playReal}</span>
                  {/* Shine effect on button */}
               <div className="absolute inset-0 rounded-full overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-[50%] bg-gradient-to-b from-white/20 to-transparent"></div>
               </div>
            </motion.a>
          )}
        </div>

        {/* Result Message */}
        <AnimatePresence>
          {combination && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className={`mt-6 mx-auto rounded-lg p-4 text-center backdrop-blur-md border ${styles.resultBox}`}
            >
              <motion.p 
                className={`text-lg sm:text-xl font-bold ${styles.resultText}`}
                animate={isWin ? { scale: [1, 1.02, 1] } : {}}
                transition={{ duration: 1, repeat: isWin ? Infinity : 0 }}
              >
                {combination}
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="text-center mt-3">
        <span className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">Verified by SEOHQS</span>
      </div>
    </div>
  );
}
