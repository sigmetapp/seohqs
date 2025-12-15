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
}

export default function InteractiveSlot({
  brandName = 'CASINO',
  values1 = ['🎁', '💎', '⭐', '🏆', '🎯', '💫'],
  values2 = ['Скидка', 'Бонус', 'Подарок', 'Акция', 'Приз', 'Выигрыш'],
  values3 = ['10%', '20%', '30%', '50%', '100%', '200%'],
}: InteractiveSlotProps) {
  const [spinning, setSpinning] = useState(false);
  const [results, setResults] = useState<[string, string, string] | null>(null);
  const [combination, setCombination] = useState<string>('');
  const [showConfetti, setShowConfetti] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

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

  const combinations: Record<string, string> = {
    '🎁-Скидка-10%': '🎉 Поздравляем! Вы получили подарок со скидкой 10%!',
    '💎-Бонус-20%': '✨ Отлично! Драгоценный бонус 20% ваш!',
    '⭐-Подарок-30%': '🌟 Удивительно! Звездный подарок 30%!',
    '🏆-Акция-50%': '🏅 Потрясающе! Трофейная акция 50%!',
    '🎯-Приз-100%': '🎊 Невероятно! Точно в цель - приз 100%!',
    '💫-Выигрыш-200%': '🚀 Фантастика! Максимальный выигрыш 200%!',
  };

  const [wheel1Spinning, setWheel1Spinning] = useState(false);
  const [wheel2Spinning, setWheel2Spinning] = useState(false);
  const [wheel3Spinning, setWheel3Spinning] = useState(false);

  const handleSpin = () => {
    if (spinning) return;

    setSpinning(true);
    setResults(null);
    setCombination('');
    setShowConfetti(false);

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

          // Проверяем комбинацию
          const combo = `${result1}-${result2}-${result3}`;
          if (combinations[combo]) {
            setCombination(combinations[combo]);
            setShowConfetti(true);
            setTimeout(() => setShowConfetti(false), 5000);
          } else {
            setCombination(`🎲 Выпало: ${result1} ${result2} ${result3}`);
          }
        }, 1500);
      }, 1500);
    }, 1500);
  };

  const isWin = combination && Object.values(combinations).includes(combination);

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
      <div className="relative p-6 sm:p-10 rounded-[30px] bg-gray-900 shadow-2xl overflow-hidden border-4 border-gray-800">
        
        {/* Background Texture */}
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-purple-900 via-gray-900 to-black"></div>
        
        {/* Lights Border */}
        <div className="absolute inset-2 border-2 border-dashed border-yellow-500/50 rounded-[20px] pointer-events-none animate-pulse"></div>

        {/* Top Header */}
        <div className="relative z-10 text-center mb-6">
          <div className="inline-block px-8 py-2 bg-black/60 rounded-full border border-yellow-500/30 backdrop-blur-sm shadow-[0_0_15px_rgba(234,179,8,0.3)]">
            <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-yellow-400 to-yellow-600">
              {brandName}
            </h2>
          </div>
        </div>

        {/* Slot Screen Area */}
        <div className="relative bg-gradient-to-b from-gray-800 to-black p-4 rounded-xl border-4 border-yellow-600/60 shadow-inner mb-8">
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
             <div className="absolute top-1/2 left-0 w-full h-0.5 bg-red-500/50 z-20 shadow-[0_0_5px_rgba(239,68,68,0.8)] pointer-events-none"></div>
             <div className="absolute top-1/2 left-0 -translate-y-1/2 -left-1 w-0 h-0 border-l-[8px] border-l-red-500 border-y-[6px] border-y-transparent z-20"></div>
             <div className="absolute top-1/2 right-0 -translate-y-1/2 -right-1 w-0 h-0 border-r-[8px] border-r-red-500 border-y-[6px] border-y-transparent z-20"></div>
        </div>

        {/* Controls Area */}
        <div className="flex flex-col items-center justify-center relative z-10">
          <motion.button
            onClick={handleSpin}
            disabled={spinning}
            className={`
              relative group px-12 py-4 rounded-full font-black text-xl uppercase tracking-widest
              text-white shadow-[0_6px_0_rgb(180,0,0),0_10px_20px_rgba(0,0,0,0.4)]
              bg-gradient-to-b from-red-500 to-red-700
              border-2 border-red-400
              transition-all duration-100
              ${spinning ? 'opacity-80 cursor-not-allowed filter grayscale-[0.5]' : 'hover:-translate-y-1 hover:shadow-[0_8px_0_rgb(180,0,0),0_15px_25px_rgba(0,0,0,0.5)] active:translate-y-1 active:shadow-[0_2px_0_rgb(180,0,0),0_5px_10px_rgba(0,0,0,0.4)]'}
            `}
          >
            <span className="drop-shadow-md flex items-center gap-2">
                {spinning ? 'SPINNING...' : 'SPIN'}
            </span>
             {/* Shine effect on button */}
             <div className="absolute inset-0 rounded-full overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-[50%] bg-gradient-to-b from-white/20 to-transparent"></div>
             </div>
          </motion.button>
        </div>

        {/* Result Message */}
        <AnimatePresence>
          {combination && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="mt-6 mx-auto bg-black/80 border border-yellow-500/40 rounded-lg p-4 text-center backdrop-blur-md shadow-[0_0_20px_rgba(234,179,8,0.2)]"
            >
              <motion.p 
                className={`text-lg sm:text-xl font-bold ${isWin ? 'text-yellow-400 drop-shadow-[0_0_5px_rgba(250,204,21,0.8)]' : 'text-gray-200'}`}
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
