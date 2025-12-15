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
  const [position, setPosition] = useState(0);

  useEffect(() => {
    if (spinning) {
      setIsAnimating(true);
      setPosition(0);
      
      const interval = setInterval(() => {
        const randomIndex = Math.floor(Math.random() * values.length);
        setDisplayValue(values[randomIndex]);
        setPosition(prev => prev + 1);
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
    <motion.div
      className="relative w-36 h-48 mx-2 overflow-hidden rounded-2xl"
      initial={false}
      animate={{
        scale: spinning ? [1, 1.05, 1] : 1,
        boxShadow: spinning
          ? '0 0 30px rgba(255, 215, 0, 0.8), 0 0 60px rgba(255, 165, 0, 0.6)'
          : '0 0 20px rgba(255, 215, 0, 0.3)',
      }}
      transition={{ duration: 0.3, repeat: spinning ? Infinity : 0 }}
    >
      {/* Glowing background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 via-orange-500 to-red-600 opacity-90"></div>
      <div className="absolute inset-0 bg-gradient-to-b from-purple-600 via-pink-600 to-red-600 opacity-70"></div>
      
      {/* Metallic border */}
      <div className="absolute inset-0 rounded-2xl border-4 border-yellow-300 shadow-[inset_0_0_20px_rgba(255,215,0,0.5)]"></div>
      
      {/* Content */}
      <div className="relative h-full flex items-center justify-center z-10">
        <motion.div
          className="text-4xl font-black"
          animate={{
            y: spinning ? [0, -20, 0] : 0,
            scale: spinning ? [1, 1.2, 1] : 1,
            rotate: spinning ? [0, 5, -5, 0] : 0,
          }}
          transition={{
            duration: 0.1,
            repeat: spinning ? Infinity : 0,
            ease: 'easeInOut',
          }}
          style={{
            textShadow: '0 0 10px rgba(255, 255, 255, 0.8), 0 0 20px rgba(255, 215, 0, 0.6), 0 0 30px rgba(255, 165, 0, 0.4)',
            filter: 'drop-shadow(0 0 8px rgba(255, 215, 0, 0.8))',
          }}
        >
          {displayValue}
        </motion.div>
      </div>

      {/* Top overlay with shine */}
      <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-white/60 via-white/20 to-transparent pointer-events-none z-20"></div>
      
      {/* Bottom overlay */}
      <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none z-20"></div>
      
      {/* Animated shine effect */}
      {spinning && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent z-30"
          initial={{ x: '-100%' }}
          animate={{ x: '200%' }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}

      {/* Glow particles */}
      {spinning && (
        <div className="absolute inset-0 pointer-events-none z-10">
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-yellow-300 rounded-full"
              initial={{
                x: '50%',
                y: '50%',
                opacity: 0,
              }}
              animate={{
                x: `${Math.random() * 100}%`,
                y: `${Math.random() * 100}%`,
                opacity: [0, 1, 0],
                scale: [0, 1.5, 0],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.2,
              }}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}

interface InteractiveSlotProps {
  brandName?: string;
  values1?: string[];
  values2?: string[];
  values3?: string[];
}

export default function InteractiveSlot({
  brandName = 'Ваш бренд',
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
        }, 2000);
      }, 2000);
    }, 2000);
  };

  const isWin = combination && Object.values(combinations).includes(combination);

  return (
    <div ref={containerRef} className="relative w-full max-w-3xl mx-auto">
      {showConfetti && (
        <Confetti
          width={windowSize.width || window.innerWidth}
          height={windowSize.height || window.innerHeight}
          recycle={false}
          numberOfPieces={500}
          gravity={0.3}
        />
      )}

      <motion.div
        className="relative p-8 rounded-3xl shadow-2xl border-4 overflow-hidden"
        initial={false}
        animate={{
          background: spinning
            ? 'linear-gradient(135deg, #1e1b4b 0%, #312e81 25%, #581c87 50%, #7c2d12 75%, #991b1b 100%)'
            : 'linear-gradient(135deg, #0f172a 0%, #1e293b 25%, #312e81 50%, #581c87 75%, #7c2d12 100%)',
          borderColor: spinning ? 'rgba(255, 215, 0, 0.8)' : 'rgba(255, 215, 0, 0.4)',
          boxShadow: spinning
            ? '0 0 50px rgba(255, 215, 0, 0.6), 0 0 100px rgba(255, 165, 0, 0.4), inset 0 0 50px rgba(255, 215, 0, 0.2)'
            : '0 0 30px rgba(255, 215, 0, 0.3), inset 0 0 30px rgba(255, 215, 0, 0.1)',
        }}
        transition={{ duration: 0.5 }}
      >
        {/* Animated background particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(20)].map((_, i) => (
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
                opacity: [0, 0.8, 0],
                scale: [0, 1, 0],
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
            />
          ))}
        </div>

        {/* Content */}
        <div className="relative z-10">
          <motion.div
            className="text-center mb-8"
            initial={false}
            animate={{
              scale: spinning ? [1, 1.05, 1] : 1,
            }}
            transition={{ duration: 0.3, repeat: spinning ? Infinity : 0 }}
          >
            <motion.h2
              className="text-4xl md:text-5xl font-black mb-3 bg-gradient-to-r from-yellow-300 via-orange-400 to-pink-500 bg-clip-text text-transparent"
              style={{
                textShadow: '0 0 20px rgba(255, 215, 0, 0.5)',
                filter: 'drop-shadow(0 0 10px rgba(255, 215, 0, 0.8))',
              }}
            >
              {brandName}
            </motion.h2>
            <p className="text-xl text-yellow-200 font-semibold">
              Крутите слот и выигрывайте призы!
            </p>
          </motion.div>

          <div className="flex justify-center items-center mb-8">
            <SlotWheel
              values={values1}
              spinning={wheel1Spinning}
              result={results?.[0]}
              onSpinComplete={() => {}}
              index={0}
            />
            <SlotWheel
              values={values2}
              spinning={wheel2Spinning}
              result={results?.[1]}
              onSpinComplete={() => {}}
              index={1}
            />
            <SlotWheel
              values={values3}
              spinning={wheel3Spinning}
              result={results?.[2]}
              onSpinComplete={() => {}}
              index={2}
            />
          </div>

          <div className="text-center mb-6">
            <motion.button
              onClick={handleSpin}
              disabled={spinning}
              className="relative px-12 py-5 rounded-2xl font-black text-xl text-white overflow-hidden"
              whileHover={!spinning ? { scale: 1.05 } : {}}
              whileTap={!spinning ? { scale: 0.95 } : {}}
              animate={{
                background: spinning
                  ? 'linear-gradient(135deg, #6b7280, #9ca3af)'
                  : 'linear-gradient(135deg, #f59e0b, #ef4444, #ec4899, #8b5cf6)',
                boxShadow: spinning
                  ? '0 0 20px rgba(107, 114, 128, 0.5)'
                  : '0 0 30px rgba(245, 158, 11, 0.6), 0 0 60px rgba(239, 68, 68, 0.4)',
              }}
              transition={{ duration: 0.3 }}
            >
              {spinning ? (
                <motion.span
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                >
                  Крутится...
                </motion.span>
              ) : (
                <>
                  <span className="relative z-10">🎰 Крутить!</span>
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                    animate={{
                      x: ['-100%', '200%'],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: 'linear',
                    }}
                  />
                </>
              )}
            </motion.button>
          </div>

          <AnimatePresence>
            {combination && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className={`mt-6 p-6 rounded-2xl border-4 shadow-2xl ${
                  isWin
                    ? 'bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 border-yellow-300'
                    : 'bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 border-pink-400'
                }`}
              >
                <motion.p
                  className="text-center text-xl md:text-2xl font-black text-white"
                  animate={isWin ? {
                    scale: [1, 1.1, 1],
                  } : {}}
                  transition={{
                    duration: 0.5,
                    repeat: isWin ? Infinity : 0,
                  }}
                  style={{
                    textShadow: '0 0 10px rgba(0, 0, 0, 0.8), 0 0 20px rgba(255, 255, 255, 0.5)',
                  }}
                >
                  {combination}
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
