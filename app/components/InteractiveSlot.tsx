'use client';

import { useState, useEffect } from 'react';

interface SlotWheelProps {
  values: string[];
  spinning: boolean;
  result?: string;
  onSpinComplete?: () => void;
}

function SlotWheel({ values, spinning, result, onSpinComplete }: SlotWheelProps) {
  const [displayValue, setDisplayValue] = useState(values[0]);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (spinning) {
      setIsAnimating(true);
      const interval = setInterval(() => {
        setDisplayValue(values[Math.floor(Math.random() * values.length)]);
      }, 100);

      const timeout = setTimeout(() => {
        clearInterval(interval);
        if (result) {
          setDisplayValue(result);
        }
        setIsAnimating(false);
        if (onSpinComplete) {
          setTimeout(onSpinComplete, 300);
        }
      }, 2000);

      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
  }, [spinning, result, values, onSpinComplete]);

  return (
    <div className="relative w-32 h-40 mx-2 overflow-hidden rounded-xl bg-gradient-to-b from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 border-2 border-gray-300 dark:border-gray-600 shadow-lg">
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className={`text-2xl font-bold text-gray-800 dark:text-gray-100 transition-transform duration-100 ${
            isAnimating ? 'animate-pulse' : ''
          }`}
        >
          {displayValue}
        </div>
      </div>
      <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-white/50 to-transparent pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-white/50 to-transparent pointer-events-none"></div>
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
  brandName = 'Ваш бренд',
  values1 = ['🎁', '💎', '⭐', '🏆', '🎯', '💫'],
  values2 = ['Скидка', 'Бонус', 'Подарок', 'Акция', 'Приз', 'Выигрыш'],
  values3 = ['10%', '20%', '30%', '50%', '100%', '200%'],
}: InteractiveSlotProps) {
  const [spinning, setSpinning] = useState(false);
  const [results, setResults] = useState<[string, string, string] | null>(null);
  const [combination, setCombination] = useState<string>('');

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
          } else {
            setCombination(`🎲 Выпало: ${result1} ${result2} ${result3}`);
          }
        }, 2000);
      }, 2000);
    }, 2000);
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700">
      <div className="text-center mb-6">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          {brandName}
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Крутите слот и выигрывайте призы!
        </p>
      </div>

      <div className="flex justify-center items-center mb-6">
        <SlotWheel
          values={values1}
          spinning={wheel1Spinning}
          result={results?.[0]}
          onSpinComplete={() => {}}
        />
        <SlotWheel
          values={values2}
          spinning={wheel2Spinning}
          result={results?.[1]}
          onSpinComplete={() => {}}
        />
        <SlotWheel
          values={values3}
          spinning={wheel3Spinning}
          result={results?.[2]}
          onSpinComplete={() => {}}
        />
      </div>

      <div className="text-center mb-6">
        <button
          onClick={handleSpin}
          disabled={spinning}
          className={`px-8 py-4 rounded-xl font-bold text-lg text-white shadow-lg transform transition-all ${
            spinning
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 hover:scale-105 hover:shadow-xl active:scale-95'
          }`}
        >
          {spinning ? 'Крутится...' : '🎰 Крутить!'}
        </button>
      </div>

      {combination && (
        <div className="mt-6 p-4 bg-white dark:bg-gray-800 rounded-xl border-2 border-yellow-400 dark:border-yellow-500 shadow-lg animate-pulse">
          <p className="text-center text-lg font-semibold text-gray-900 dark:text-white">
            {combination}
          </p>
        </div>
      )}
    </div>
  );
}
