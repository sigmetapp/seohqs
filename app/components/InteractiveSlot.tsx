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
      className="relative w-40 h-52 mx-2 overflow-hidden rounded-3xl"
      initial={false}
      animate={{
        scale: spinning ? [1, 1.1, 1] : 1,
        rotate: spinning ? [0, 2, -2, 0] : 0,
        boxShadow: spinning
          ? '0 0 40px rgba(255, 215, 0, 1), 0 0 80px rgba(255, 165, 0, 0.8), 0 0 120px rgba(255, 140, 0, 0.6)'
          : '0 0 25px rgba(255, 215, 0, 0.5), 0 0 50px rgba(255, 165, 0, 0.3)',
      }}
      transition={{ duration: 0.2, repeat: spinning ? Infinity : 0 }}
    >
      {/* Animated rainbow background */}
      <motion.div
        className="absolute inset-0"
        animate={spinning ? {
          background: [
            'linear-gradient(135deg, #fbbf24, #f97316, #dc2626)',
            'linear-gradient(135deg, #ec4899, #8b5cf6, #3b82f6)',
            'linear-gradient(135deg, #10b981, #f59e0b, #ef4444)',
            'linear-gradient(135deg, #fbbf24, #f97316, #dc2626)',
          ],
        } : {
          background: 'linear-gradient(135deg, #fbbf24, #f97316, #dc2626)',
        }}
        transition={{ duration: 0.5, repeat: spinning ? Infinity : 0 }}
      />
      <motion.div
        className="absolute inset-0 bg-gradient-to-b from-purple-600 via-pink-600 to-red-600 opacity-80"
        animate={spinning ? {
          opacity: [0.8, 0.4, 0.8],
        } : {}}
        transition={{ duration: 0.3, repeat: spinning ? Infinity : 0 }}
      />
      
      {/* Animated metallic border with glow */}
      <motion.div
        className="absolute inset-0 rounded-3xl border-4"
        animate={spinning ? {
          borderColor: [
            'rgba(255, 215, 0, 1)',
            'rgba(255, 140, 0, 1)',
            'rgba(255, 20, 147, 1)',
            'rgba(255, 215, 0, 1)',
          ],
          boxShadow: [
            'inset 0 0 30px rgba(255, 215, 0, 0.8)',
            'inset 0 0 30px rgba(255, 140, 0, 0.8)',
            'inset 0 0 30px rgba(255, 20, 147, 0.8)',
            'inset 0 0 30px rgba(255, 215, 0, 0.8)',
          ],
        } : {
          borderColor: 'rgba(255, 215, 0, 0.8)',
          boxShadow: 'inset 0 0 20px rgba(255, 215, 0, 0.5)',
        }}
        transition={{ duration: 0.3, repeat: spinning ? Infinity : 0 }}
      />
      
      {/* Content */}
      <div className="relative h-full flex items-center justify-center z-10">
        <motion.div
          className="text-5xl font-black"
          animate={{
            y: spinning ? [0, -25, 0] : 0,
            scale: spinning ? [1, 1.3, 1] : 1,
            rotate: spinning ? [0, 10, -10, 0] : 0,
          }}
          transition={{
            duration: 0.1,
            repeat: spinning ? Infinity : 0,
            ease: 'easeInOut',
          }}
          style={{
            textShadow: '0 0 15px rgba(255, 255, 255, 1), 0 0 30px rgba(255, 215, 0, 0.8), 0 0 45px rgba(255, 165, 0, 0.6), 0 0 60px rgba(255, 140, 0, 0.4)',
            filter: 'drop-shadow(0 0 10px rgba(255, 215, 0, 1))',
          }}
        >
          {displayValue}
        </motion.div>
      </div>

      {/* Top overlay with shine */}
      <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-white/70 via-white/30 to-transparent pointer-events-none z-20"></div>
      
      {/* Bottom overlay */}
      <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none z-20"></div>
      
      {/* Multiple animated shine effects */}
      {spinning && (
        <>
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent z-30"
            initial={{ x: '-100%', rotate: -15 }}
            animate={{ x: '200%', rotate: -15 }}
            transition={{
              duration: 0.5,
              repeat: Infinity,
              ease: 'linear',
            }}
          />
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-300/40 to-transparent z-30"
            initial={{ x: '-100%', rotate: 15 }}
            animate={{ x: '200%', rotate: 15 }}
            transition={{
              duration: 0.7,
              repeat: Infinity,
              ease: 'linear',
              delay: 0.2,
            }}
          />
        </>
      )}

      {/* Enhanced glow particles */}
      {spinning && (
        <div className="absolute inset-0 pointer-events-none z-10">
          {[...Array(10)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full"
              style={{
                width: `${4 + Math.random() * 4}px`,
                height: `${4 + Math.random() * 4}px`,
                background: i % 3 === 0 ? '#fbbf24' : i % 3 === 1 ? '#f97316' : '#ec4899',
                boxShadow: `0 0 ${10 + Math.random() * 10}px ${i % 3 === 0 ? '#fbbf24' : i % 3 === 1 ? '#f97316' : '#ec4899'}`,
              }}
              initial={{
                x: '50%',
                y: '50%',
                opacity: 0,
              }}
              animate={{
                x: `${Math.random() * 100}%`,
                y: `${Math.random() * 100}%`,
                opacity: [0, 1, 0],
                scale: [0, 2, 0],
              }}
              transition={{
                duration: 1 + Math.random(),
                repeat: Infinity,
                delay: i * 0.15,
              }}
            />
          ))}
        </div>
      )}

      {/* Corner decorations */}
      <div className="absolute top-2 left-2 w-3 h-3 bg-yellow-300 rounded-full opacity-80 z-20" style={{ boxShadow: '0 0 10px rgba(255, 215, 0, 0.8)' }}></div>
      <div className="absolute top-2 right-2 w-3 h-3 bg-yellow-300 rounded-full opacity-80 z-20" style={{ boxShadow: '0 0 10px rgba(255, 215, 0, 0.8)' }}></div>
      <div className="absolute bottom-2 left-2 w-3 h-3 bg-yellow-300 rounded-full opacity-80 z-20" style={{ boxShadow: '0 0 10px rgba(255, 215, 0, 0.8)' }}></div>
      <div className="absolute bottom-2 right-2 w-3 h-3 bg-yellow-300 rounded-full opacity-80 z-20" style={{ boxShadow: '0 0 10px rgba(255, 215, 0, 0.8)' }}></div>
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
    <div ref={containerRef} className="relative w-full max-w-4xl mx-auto">
      {showConfetti && (
        <Confetti
          width={windowSize.width || window.innerWidth}
          height={windowSize.height || window.innerHeight}
          recycle={false}
          numberOfPieces={800}
          gravity={0.3}
          colors={['#fbbf24', '#f97316', '#ec4899', '#8b5cf6', '#3b82f6', '#10b981']}
        />
      )}

      <motion.div
        className="relative p-10 rounded-3xl shadow-2xl border-4 overflow-hidden"
        initial={false}
        animate={{
          background: spinning
            ? [
                'linear-gradient(135deg, #1e1b4b 0%, #312e81 25%, #581c87 50%, #7c2d12 75%, #991b1b 100%)',
                'linear-gradient(135deg, #312e81 0%, #581c87 25%, #7c2d12 50%, #991b1b 75%, #1e1b4b 100%)',
                'linear-gradient(135deg, #1e1b4b 0%, #312e81 25%, #581c87 50%, #7c2d12 75%, #991b1b 100%)',
              ]
            : 'linear-gradient(135deg, #0f172a 0%, #1e293b 25%, #312e81 50%, #581c87 75%, #7c2d12 100%)',
          borderColor: spinning
            ? [
                'rgba(255, 215, 0, 1)',
                'rgba(255, 140, 0, 1)',
                'rgba(255, 20, 147, 1)',
                'rgba(255, 215, 0, 1)',
              ]
            : 'rgba(255, 215, 0, 0.6)',
          boxShadow: spinning
            ? [
                '0 0 60px rgba(255, 215, 0, 0.8), 0 0 120px rgba(255, 165, 0, 0.6), 0 0 180px rgba(255, 140, 0, 0.4), inset 0 0 60px rgba(255, 215, 0, 0.3)',
                '0 0 60px rgba(255, 140, 0, 0.8), 0 0 120px rgba(255, 20, 147, 0.6), 0 0 180px rgba(255, 215, 0, 0.4), inset 0 0 60px rgba(255, 140, 0, 0.3)',
                '0 0 60px rgba(255, 215, 0, 0.8), 0 0 120px rgba(255, 165, 0, 0.6), 0 0 180px rgba(255, 140, 0, 0.4), inset 0 0 60px rgba(255, 215, 0, 0.3)',
              ]
            : '0 0 40px rgba(255, 215, 0, 0.4), 0 0 80px rgba(255, 165, 0, 0.3), inset 0 0 40px rgba(255, 215, 0, 0.15)',
        }}
        transition={{ duration: 0.5, repeat: spinning ? Infinity : 0 }}
      >
        {/* Animated background particles - more and brighter */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(40)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full"
              style={{
                width: `${2 + Math.random() * 3}px`,
                height: `${2 + Math.random() * 3}px`,
                background: i % 4 === 0 ? '#fbbf24' : i % 4 === 1 ? '#f97316' : i % 4 === 2 ? '#ec4899' : '#8b5cf6',
                boxShadow: `0 0 ${8 + Math.random() * 8}px ${i % 4 === 0 ? '#fbbf24' : i % 4 === 1 ? '#f97316' : i % 4 === 2 ? '#ec4899' : '#8b5cf6'}`,
              }}
              initial={{
                x: Math.random() * 100 + '%',
                y: Math.random() * 100 + '%',
                opacity: 0,
              }}
              animate={{
                y: [null, Math.random() * 100 + '%'],
                opacity: [0, 1, 0],
                scale: [0, 1.5, 0],
              }}
              transition={{
                duration: 2 + Math.random() * 3,
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
            />
          ))}
        </div>

        {/* Animated gradient overlay */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-yellow-500/20 via-pink-500/20 to-purple-500/20 pointer-events-none"
          animate={spinning ? {
            opacity: [0.2, 0.5, 0.2],
            background: [
              'linear-gradient(135deg, rgba(251, 191, 36, 0.2), rgba(236, 72, 153, 0.2), rgba(139, 92, 246, 0.2))',
              'linear-gradient(135deg, rgba(236, 72, 153, 0.3), rgba(139, 92, 246, 0.3), rgba(251, 191, 36, 0.3))',
              'linear-gradient(135deg, rgba(251, 191, 36, 0.2), rgba(236, 72, 153, 0.2), rgba(139, 92, 246, 0.2))',
            ],
          } : {}}
          transition={{ duration: 1, repeat: spinning ? Infinity : 0 }}
        />

        {/* Content */}
        <div className="relative z-10">
          <motion.div
            className="text-center mb-10"
            initial={false}
            animate={{
              scale: spinning ? [1, 1.08, 1] : 1,
            }}
            transition={{ duration: 0.3, repeat: spinning ? Infinity : 0 }}
          >
            <motion.h2
              className="text-5xl md:text-6xl font-black mb-4"
              animate={spinning ? {
                background: [
                  'linear-gradient(90deg, #fbbf24, #f97316, #ec4899)',
                  'linear-gradient(90deg, #ec4899, #8b5cf6, #3b82f6)',
                  'linear-gradient(90deg, #3b82f6, #10b981, #fbbf24)',
                  'linear-gradient(90deg, #fbbf24, #f97316, #ec4899)',
                ],
              } : {
                background: 'linear-gradient(90deg, #fbbf24, #f97316, #ec4899)',
              }}
              transition={{ duration: 0.5, repeat: spinning ? Infinity : 0 }}
              style={{
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                textShadow: '0 0 30px rgba(255, 215, 0, 0.6)',
                filter: 'drop-shadow(0 0 15px rgba(255, 215, 0, 0.9))',
              }}
            >
              {brandName}
            </motion.h2>
            <motion.p
              className="text-2xl text-yellow-200 font-bold"
              animate={spinning ? {
                scale: [1, 1.05, 1],
                textShadow: [
                  '0 0 10px rgba(255, 215, 0, 0.8)',
                  '0 0 20px rgba(255, 215, 0, 1)',
                  '0 0 10px rgba(255, 215, 0, 0.8)',
                ],
              } : {}}
              transition={{ duration: 0.5, repeat: spinning ? Infinity : 0 }}
            >
              Крутите слот и выигрывайте призы!
            </motion.p>
          </motion.div>

          <div className="flex justify-center items-center mb-10 relative">
            {/* Connecting lines between wheels */}
            <motion.div
              className="absolute top-1/2 left-1/2 w-full h-1 bg-gradient-to-r from-transparent via-yellow-400 to-transparent -translate-y-1/2 -translate-x-1/2 z-0"
              animate={spinning ? {
                opacity: [0.3, 0.8, 0.3],
                scaleX: [1, 1.1, 1],
              } : {
                opacity: 0.2,
              }}
              transition={{ duration: 0.3, repeat: spinning ? Infinity : 0 }}
            />
            
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

          <div className="text-center mb-8">
            <motion.button
              onClick={handleSpin}
              disabled={spinning}
              className="relative px-16 py-6 rounded-3xl font-black text-2xl text-white overflow-hidden uppercase tracking-wider"
              whileHover={!spinning ? { scale: 1.08, y: -2 } : {}}
              whileTap={!spinning ? { scale: 0.95 } : {}}
              animate={{
                background: spinning
                  ? 'linear-gradient(135deg, #6b7280, #9ca3af)'
                  : [
                      'linear-gradient(135deg, #f59e0b, #ef4444, #ec4899, #8b5cf6)',
                      'linear-gradient(135deg, #8b5cf6, #3b82f6, #10b981, #f59e0b)',
                      'linear-gradient(135deg, #f59e0b, #ef4444, #ec4899, #8b5cf6)',
                    ],
                boxShadow: spinning
                  ? '0 0 30px rgba(107, 114, 128, 0.6)'
                  : [
                      '0 0 40px rgba(245, 158, 11, 0.8), 0 0 80px rgba(239, 68, 68, 0.6), 0 0 120px rgba(236, 72, 153, 0.4)',
                      '0 0 50px rgba(139, 92, 246, 0.8), 0 0 100px rgba(59, 130, 246, 0.6), 0 0 150px rgba(16, 185, 129, 0.4)',
                      '0 0 40px rgba(245, 158, 11, 0.8), 0 0 80px rgba(239, 68, 68, 0.6), 0 0 120px rgba(236, 72, 153, 0.4)',
                    ],
              }}
              transition={{ duration: 2, repeat: spinning ? 0 : Infinity }}
            >
              {spinning ? (
                <motion.span
                  animate={{ opacity: [1, 0.4, 1] }}
                  transition={{ duration: 0.4, repeat: Infinity }}
                >
                  Крутится...
                </motion.span>
              ) : (
                <>
                  <span className="relative z-10">🎰 Крутить!</span>
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                    animate={{
                      x: ['-100%', '200%'],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: 'linear',
                    }}
                  />
                  {/* Button glow particles */}
                  {[...Array(6)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute w-2 h-2 bg-white rounded-full"
                      style={{
                        left: `${20 + i * 15}%`,
                        top: '50%',
                      }}
                      animate={{
                        y: ['-50%', '-150%'],
                        opacity: [0, 1, 0],
                        scale: [0, 1, 0],
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        delay: i * 0.2,
                      }}
                    />
                  ))}
                </>
              )}
            </motion.button>
          </div>

          <AnimatePresence>
            {combination && (
              <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className={`mt-8 p-8 rounded-3xl border-4 shadow-2xl relative overflow-hidden ${
                  isWin
                    ? 'bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 border-yellow-300'
                    : 'bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 border-pink-400'
                }`}
              >
                {/* Animated background shine */}
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
                <motion.p
                  className="text-center text-2xl md:text-3xl font-black text-white relative z-10"
                  animate={isWin ? {
                    scale: [1, 1.15, 1],
                    textShadow: [
                      '0 0 15px rgba(0, 0, 0, 0.9), 0 0 30px rgba(255, 255, 255, 0.6)',
                      '0 0 20px rgba(0, 0, 0, 0.9), 0 0 40px rgba(255, 255, 255, 0.8)',
                      '0 0 15px rgba(0, 0, 0, 0.9), 0 0 30px rgba(255, 255, 255, 0.6)',
                    ],
                  } : {}}
                  transition={{
                    duration: 0.5,
                    repeat: isWin ? Infinity : 0,
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
