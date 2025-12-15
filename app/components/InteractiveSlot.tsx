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
  theme: 'neon' | 'luxury' | 'vibrant';
}

function ClassicWheel({ values, spinning, result, onSpinComplete, index }: SlotWheelProps) {
  const [displayValue, setDisplayValue] = useState(values[0]);

  useEffect(() => {
    if (spinning) {
      const interval = setInterval(() => {
        const randomIndex = Math.floor(Math.random() * values.length);
        setDisplayValue(values[randomIndex]);
      }, 50);

      const timeout = setTimeout(() => {
        clearInterval(interval);
        if (result) setDisplayValue(result);
        if (onSpinComplete) setTimeout(onSpinComplete, 300);
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
        animate={{ y: spinning ? [0, -10, 0] : 0, filter: spinning ? "blur(1px)" : "none" }}
        transition={{ duration: 0.1, repeat: spinning ? Infinity : 0 }}
      >
        <span className="text-3xl sm:text-4xl font-bold text-gray-800">{displayValue}</span>
      </motion.div>
      <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-black/30 to-transparent pointer-events-none z-10"></div>
      <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-black/30 to-transparent pointer-events-none z-10"></div>
      <div className="absolute top-1/2 left-0 right-0 h-10 -translate-y-1/2 bg-gradient-to-b from-white/0 via-white/50 to-white/0 pointer-events-none z-10"></div>
    </div>
  );
}

function ModernWheel({ values, spinning, result, onSpinComplete, index }: SlotWheelProps) {
  const [displayValue, setDisplayValue] = useState(values[0]);

  useEffect(() => {
    if (spinning) {
      const interval = setInterval(() => {
        const randomIndex = Math.floor(Math.random() * values.length);
        setDisplayValue(values[randomIndex]);
      }, 30); // Faster updates for digital feel

      const timeout = setTimeout(() => {
        clearInterval(interval);
        if (result) setDisplayValue(result);
        if (onSpinComplete) setTimeout(onSpinComplete, 100); // Snappier stop
      }, 1500 + index * 100); // Faster sequence

      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
  }, [spinning, result, values, onSpinComplete, index]);

  return (
    <div className="relative w-24 h-32 sm:w-32 sm:h-40 mx-1 sm:mx-2 overflow-hidden bg-black border border-yellow-600/30 rounded-none">
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        animate={{ opacity: spinning ? [0.5, 1, 0.5] : 1, scale: spinning ? [0.9, 1.1, 0.9] : 1 }}
        transition={{ duration: 0.2, repeat: spinning ? Infinity : 0 }}
      >
        <span className="text-4xl sm:text-5xl font-mono text-yellow-100 drop-shadow-[0_0_10px_rgba(253,224,71,0.8)]">
          {displayValue}
        </span>
      </motion.div>
      {/* Scanlines */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-20 bg-[length:100%_2px,3px_100%] pointer-events-none"></div>
    </div>
  );
}

function RetroWheel({ values, spinning, result, onSpinComplete, index }: SlotWheelProps) {
  const [displayValue, setDisplayValue] = useState(values[0]);

  useEffect(() => {
    if (spinning) {
      const interval = setInterval(() => {
        const randomIndex = Math.floor(Math.random() * values.length);
        setDisplayValue(values[randomIndex]);
      }, 80); // Slower, clunkier feel

      const timeout = setTimeout(() => {
        clearInterval(interval);
        if (result) setDisplayValue(result);
        if (onSpinComplete) setTimeout(onSpinComplete, 400);
      }, 2500 + index * 400); // Longer sequence

      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
  }, [spinning, result, values, onSpinComplete, index]);

  return (
    <div className="relative w-24 h-32 sm:w-32 sm:h-40 mx-1 sm:mx-2 overflow-hidden bg-white border-4 border-pink-500 rounded-2xl shadow-[inset_0_0_20px_rgba(236,72,153,0.3)]">
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        animate={spinning ? { y: ['-100%', '100%'] } : { y: 0 }}
        transition={spinning ? { duration: 0.2, repeat: Infinity, ease: "linear" } : { type: "spring", stiffness: 300, damping: 15 }}
      >
        <span className="text-4xl sm:text-5xl font-black text-pink-600">{displayValue}</span>
      </motion.div>
      <div className="absolute inset-0 border-4 border-white/50 rounded-xl pointer-events-none z-20"></div>
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
  soundEnabled?: boolean;
}

const TRANSLATIONS = {
    ru: { spin: 'Крутить', spinning: 'Крутится...', win: 'Победа!', playReal: 'Играть на деньги', congrats: 'Поздравляем! Вы выиграли!' },
    en: { spin: 'SPIN', spinning: 'SPINNING...', win: 'WIN!', playReal: 'PLAY FOR REAL MONEY', congrats: 'Congratulations! You won!' },
    es: { spin: 'GIRAR', spinning: 'GIRANDO...', win: '¡GANASTE!', playReal: 'JUGAR CON DINERO REAL', congrats: '¡Felicidades! ¡Ganaste!' },
    fr: { spin: 'TOURNER', spinning: 'TOURNE...', win: 'GAGNÉ !', playReal: "JOUER POUR DE L'ARGENT", congrats: 'Félicitations ! Vous avez gagné !' },
    de: { spin: 'DREHEN', spinning: 'DREHT SICH...', win: 'GEWONNEN!', playReal: 'UM ECHTES GELD SPIELEN', congrats: 'Herzlichen Glückwunsch! Sie haben gewonnen!' }
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
    container: 'bg-black border-yellow-900 rounded-none',
    background: 'bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-yellow-900/20 via-black to-black',
    lights: 'border-yellow-400/20',
    headerBox: 'bg-transparent border-b border-yellow-600/50 rounded-none shadow-none',
    headerText: 'from-yellow-100 via-yellow-200 to-yellow-400 font-serif tracking-widest',
    screen: 'bg-black border-x-0 border-y-2 border-yellow-500/50 rounded-none shadow-none',
    payline: 'bg-yellow-500/30',
    arrow: 'border-l-yellow-600',
    button: 'from-gray-800 to-black border-yellow-600/50 shadow-[0_0_15px_rgba(234,179,8,0.2)] font-serif',
    buttonCta: 'from-yellow-600 to-yellow-800 border-yellow-400 shadow-[0_0_25px_rgba(234,179,8,0.4)]',
    resultBox: 'bg-black/90 border-t border-b border-yellow-500/50 rounded-none shadow-none',
    resultText: 'text-yellow-100 font-serif tracking-widest'
  },
  vibrant: {
    container: 'bg-indigo-500 border-b-8 border-r-8 border-indigo-700 rounded-3xl',
    background: 'bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-pink-400 via-purple-500 to-indigo-500',
    lights: 'border-white/40 border-dashed',
    headerBox: 'bg-white border-4 border-indigo-200 shadow-[4px_4px_0_rgba(0,0,0,0.2)]',
    headerText: 'text-indigo-900 font-black',
    screen: 'bg-indigo-800 border-4 border-white/50 rounded-2xl shadow-inner',
    payline: 'bg-pink-400',
    arrow: 'border-l-pink-400',
    button: 'bg-pink-500 border-b-4 border-pink-700 shadow-lg hover:translate-y-1 active:border-b-0 active:translate-y-2 text-black',
    buttonCta: 'bg-cyan-400 border-b-4 border-cyan-600 shadow-lg text-white hover:translate-y-1 active:border-b-0',
    resultBox: 'bg-white border-4 border-indigo-300 rounded-xl shadow-xl transform -rotate-1',
    resultText: 'text-indigo-900 font-black'
  }
};

export default function InteractiveSlot({
  brandName = 'CASINO',
  values1 = ['🍒', '🍋', '🍇', '🍉', '🔔', '💎'],
  values2 = ['7️⃣', '🍀', '🎲', '🎰', '🃏', '👑'],
  values3 = ['💰', '💵', '🪙', '🧧', '🏦', '💳'],
  offerUrl = '#',
  language = 'ru',
  theme = 'neon',
  soundEnabled = false
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

  // Sound logic
  const playSound = (type: 'spin' | 'stop' | 'win') => {
    if (!soundEnabled || typeof window === 'undefined') return;
    
    try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;
        
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        const now = ctx.currentTime;
        
        if (type === 'spin') {
            // High pitch rapid beeps
            osc.type = 'square';
            osc.frequency.setValueAtTime(600, now);
            osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            osc.start(now);
            osc.stop(now + 0.1);
        } else if (type === 'stop') {
            // Heavy thud
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(100, now);
            osc.frequency.exponentialRampToValueAtTime(40, now + 0.2);
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
            osc.start(now);
            osc.stop(now + 0.2);
        } else if (type === 'win') {
            // Major chord arpeggio
            const notes = [523.25, 659.25, 783.99, 1046.50]; // C major
            notes.forEach((freq, i) => {
                const oscN = ctx.createOscillator();
                const gainN = ctx.createGain();
                oscN.connect(gainN);
                gainN.connect(ctx.destination);
                oscN.type = 'sine';
                oscN.frequency.value = freq;
                gainN.gain.setValueAtTime(0, now + i * 0.1);
                gainN.gain.linearRampToValueAtTime(0.1, now + i * 0.1 + 0.05);
                gainN.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.5);
                oscN.start(now + i * 0.1);
                oscN.stop(now + i * 0.1 + 0.6);
            });
        }
    } catch (e) {
        console.error('Audio playback failed', e);
    }
  };

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
    
    // Play start sound
    if (soundEnabled) {
        playSound('spin');
        // Loop spin sound effect roughly
        const spinSoundInterval = setInterval(() => playSound('spin'), 150);
        setTimeout(() => clearInterval(spinSoundInterval), 1500); // Stop when first wheel stops mostly
    }

    // Generate results
    const result1 = values1[Math.floor(Math.random() * values1.length)];
    const result2 = values2[Math.floor(Math.random() * values2.length)];
    const result3 = values3[Math.floor(Math.random() * values3.length)];

    // Timing varies by theme
    const baseDelay = theme === 'luxury' ? 1000 : theme === 'vibrant' ? 2000 : 1500;
    const stagger = theme === 'luxury' ? 200 : theme === 'vibrant' ? 600 : 500;

    // Start
    setWheel1Spinning(true);
    setTimeout(() => {
      setWheel1Spinning(false);
      setResults(prev => prev ? [result1, prev[1], prev[2]] : [result1, '', '']);
      playSound('stop');
      
      setWheel2Spinning(true);
      setTimeout(() => {
        setWheel2Spinning(false);
        setResults(prev => prev ? [prev[0], result2, prev[2]] : [result1, result2, '']);
        playSound('stop');
        
        setWheel3Spinning(true);
        setTimeout(() => {
          setWheel3Spinning(false);
          setResults([result1, result2, result3]);
          setSpinning(false);
          playSound('stop');

          setCombination(`${texts.congrats} ${result1} ${result2} ${result3}`);
          setShowConfetti(true);
          playSound('win');
          setSpinFinished(true);
          
          setTimeout(() => setShowConfetti(false), 5000);
        }, baseDelay);
      }, baseDelay);
    }, baseDelay);
  };

  const isWin = !!combination;

  // Determine Wheel Component
  const WheelComponent = theme === 'luxury' ? ModernWheel : theme === 'vibrant' ? RetroWheel : ClassicWheel;

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
            <h2 className={`text-3xl sm:text-4xl font-black uppercase tracking-wider ${
              theme === 'vibrant' 
                ? styles.headerText 
                : `text-transparent bg-clip-text bg-gradient-to-r ${styles.headerText}`
            }`}>
              {brandName}
            </h2>
          </div>
        </div>

        {/* Slot Screen Area */}
        <div className={`relative bg-gradient-to-b rounded-xl border-4 shadow-inner mb-8 ${styles.screen}`}>
            {/* Screen Glare */}
            {theme === 'neon' && <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-white/5 to-transparent pointer-events-none rounded-lg z-20"></div>}

            <div className={`flex justify-center items-center gap-2 sm:gap-4 py-4 px-2 rounded-lg shadow-inner ${theme === 'vibrant' ? 'bg-indigo-900/50' : 'bg-black/40'}`}>
                <WheelComponent
                    values={values1}
                    spinning={wheel1Spinning}
                    result={results?.[0]}
                    index={0}
                    theme={theme}
                />
                <WheelComponent
                    values={values2}
                    spinning={wheel2Spinning}
                    result={results?.[1]}
                    index={1}
                    theme={theme}
                />
                <WheelComponent
                    values={values3}
                    spinning={wheel3Spinning}
                    result={results?.[2]}
                    index={2}
                    theme={theme}
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
               {theme !== 'vibrant' && <div className="absolute inset-0 rounded-full overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-[50%] bg-gradient-to-b from-white/20 to-transparent"></div>
               </div>}
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
               {theme !== 'vibrant' && <div className="absolute inset-0 rounded-full overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-[50%] bg-gradient-to-b from-white/20 to-transparent"></div>
               </div>}
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
