(function() {
  'use strict';

  // Получаем параметры из data-атрибутов скрипта
  var script = document.currentScript || document.querySelector('script[data-brand-name]');
  var brandName = script?.getAttribute('data-brand-name') || 'CASINO';
  var values1Str = script?.getAttribute('data-values1') || '🍒,🍋,🍇,🍉,🔔,💎';
  var values2Str = script?.getAttribute('data-values2') || '7️⃣,🍀,🎲,🎰,🃏,👑';
  var values3Str = script?.getAttribute('data-values3') || '💰,💵,🪙,🧧,🏦,💳';
  var offerUrl = script?.getAttribute('data-offer-url') || '#';
  var language = script?.getAttribute('data-language') || 'ru';
  var theme = script?.getAttribute('data-theme') || 'neon';

  var values1 = values1Str.split(',').map(function(v) { return v.trim(); }).filter(Boolean);
  var values2 = values2Str.split(',').map(function(v) { return v.trim(); }).filter(Boolean);
  var values3 = values3Str.split(',').map(function(v) { return v.trim(); }).filter(Boolean);

  var uniqueId = 'seohqs-' + Math.random().toString(36).slice(2, 11);

  var translations = {
    ru: {
        spin: 'Крутить',
        spinning: 'Крутится...',
        playReal: 'Играть на деньги',
        congrats: 'Поздравляем! Вы выиграли!'
    },
    en: {
        spin: 'SPIN',
        spinning: 'SPINNING...',
        playReal: 'PLAY FOR REAL MONEY',
        congrats: 'Congratulations! You won!'
    },
    es: {
        spin: 'GIRAR',
        spinning: 'GIRANDO...',
        playReal: 'JUGAR CON DINERO REAL',
        congrats: '¡Felicidades! ¡Ganaste!'
    },
    fr: {
        spin: 'TOURNER',
        spinning: 'TOURNE...',
        playReal: "JOUER POUR DE L'ARGENT",
        congrats: 'Félicitations ! Vous avez gagné !'
    },
    de: {
        spin: 'DREHEN',
        spinning: 'DREHT SICH...',
        playReal: 'UM ECHTES GELD SPIELEN',
        congrats: 'Herzlichen Glückwunsch! Sie haben gewonnen!'
    }
  };

  var texts = translations[language] || translations.en;

  var themeStyles = {
    neon: {
      bg: '#111827',
      bgGrad: 'radial-gradient(circle at center, #581c87, #111827, #000000)',
      border: '#1f2937',
      borderLights: 'rgba(234, 179, 8, 0.5)',
      titleBg: 'rgba(0, 0, 0, 0.6)',
      titleBorder: 'rgba(234, 179, 8, 0.3)',
      titleText: 'linear-gradient(to right, #fef08a, #facc15, #ca8a04)',
      screenBg: 'linear-gradient(to bottom, #1f2937, #000000)',
      screenBorder: 'rgba(202, 138, 4, 0.6)',
      btnBg: 'linear-gradient(to bottom, #ef4444, #b91c1c)',
      btnBorder: '#f87171',
      btnShadow: 'rgb(153, 27, 27)',
      ctaBg: 'linear-gradient(to bottom, #22c55e, #15803d)',
      ctaBorder: '#4ade80',
      ctaShadow: 'rgba(34,197,94,0.6)',
      resultBg: 'rgba(0, 0, 0, 0.8)',
      resultBorder: 'rgba(234, 179, 8, 0.4)',
      resultText: '#facc15',
      payline: 'rgba(239, 68, 68, 0.5)',
      arrow: '#ef4444'
    },
    luxury: {
      bg: '#000000',
      bgGrad: 'radial-gradient(ellipse at center, rgba(113, 63, 18, 0.4), #000000)',
      border: '#713f12',
      borderLights: 'rgba(250, 204, 21, 0.6)',
      titleBg: 'rgba(0, 0, 0, 0.8)',
      titleBorder: '#ca8a04',
      titleText: 'linear-gradient(to right, #fef9c3, #fde047, #eab308)',
      screenBg: 'linear-gradient(to bottom, #111827, #000000)',
      screenBorder: '#eab308',
      btnBg: 'linear-gradient(to bottom, #ca8a04, #854d0e)',
      btnBorder: '#facc15',
      btnShadow: 'rgb(161, 98, 7)',
      ctaBg: 'linear-gradient(to bottom, #eab308, #a16207)',
      ctaBorder: '#fde047',
      ctaShadow: 'rgba(234, 179, 8, 0.6)',
      resultBg: 'rgba(0, 0, 0, 0.9)',
      resultBorder: '#eab308',
      resultText: '#fef08a',
      payline: 'rgba(234, 179, 8, 0.5)',
      arrow: '#eab308'
    },
    vibrant: {
      bg: '#312e81',
      bgGrad: 'radial-gradient(circle at top, #ec4899, #581c87, #312e81)',
      border: '#3730a3',
      borderLights: 'rgba(255, 255, 255, 0.4)',
      titleBg: 'rgba(255, 255, 255, 0.1)',
      titleBorder: 'rgba(255, 255, 255, 0.3)',
      titleText: 'linear-gradient(to right, #f9a8d4, #d8b4fe, #a5b4fc)',
      screenBg: 'linear-gradient(to bottom, #312e81, #581c87)',
      screenBorder: 'rgba(236, 72, 153, 0.6)',
      btnBg: 'linear-gradient(to bottom, #ec4899, #9333ea)',
      btnBorder: '#f472b6',
      btnShadow: 'rgb(192, 38, 211)',
      ctaBg: 'linear-gradient(to bottom, #06b6d4, #2563eb)',
      ctaBorder: '#22d3ee',
      ctaShadow: 'rgba(34, 211, 238, 0.6)',
      resultBg: 'rgba(49, 46, 129, 0.9)',
      resultBorder: 'rgba(236, 72, 153, 0.5)',
      resultText: '#f9a8d4',
      payline: 'rgba(236, 72, 153, 0.5)',
      arrow: '#ec4899'
    }
  };

  var s = themeStyles[theme] || themeStyles.neon;

  // Создаем стили с modern casino-стилем
  var styles = `
    @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@700;900&display=swap');

    #${uniqueId}-widget {
      font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 600px;
      margin: 0 auto;
      padding: 40px;
      background: ${s.bg};
      border-radius: 30px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      border: 4px solid ${s.border};
      position: relative;
      overflow: hidden;
      box-sizing: border-box;
      color: white;
    }

    #${uniqueId}-widget * {
      box-sizing: border-box;
    }

    /* Background texture */
    #${uniqueId}-widget::before {
      content: '';
      position: absolute;
      inset: 0;
      opacity: 0.2;
      background: ${s.bgGrad};
      pointer-events: none;
    }

    /* Blinking border lights */
    #${uniqueId}-widget::after {
      content: '';
      position: absolute;
      inset: 10px;
      border: 2px dashed ${s.borderLights};
      border-radius: 20px;
      pointer-events: none;
      animation: ${uniqueId}-pulse 2s infinite;
    }

    @keyframes ${uniqueId}-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .${uniqueId}-header {
      position: relative;
      z-index: 10;
      text-align: center;
      margin-bottom: 24px;
    }

    .${uniqueId}-title-container {
      display: inline-block;
      padding: 8px 32px;
      background: ${s.titleBg};
      border-radius: 9999px;
      border: 1px solid ${s.titleBorder};
      backdrop-filter: blur(4px);
      box-shadow: 0 0 15px ${s.titleBorder};
    }

    .${uniqueId}-title {
      margin: 0;
      font-size: 32px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      background: ${s.titleText};
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .${uniqueId}-screen {
      position: relative;
      background: ${s.screenBg};
      padding: 16px;
      border-radius: 12px;
      border: 4px solid ${s.screenBorder};
      box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.6);
      margin-bottom: 32px;
      z-index: 10;
    }

    .${uniqueId}-wheels-container {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 12px;
      padding: 16px 8px;
      background: rgba(0, 0, 0, 0.4);
      border-radius: 8px;
      box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.6);
      position: relative;
    }

    .${uniqueId}-wheel {
      position: relative;
      width: 100px;
      height: 140px;
      background: linear-gradient(to bottom, #f3f4f6, #e5e7eb);
      border-radius: 8px;
      overflow: hidden;
      border-left: 1px solid #9ca3af;
      border-right: 1px solid #9ca3af;
      box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.2);
    }

    .${uniqueId}-wheel-content {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 36px;
      font-weight: 700;
      color: #1f2937;
    }

    /* 3D Cylinder Effect Shadows */
    .${uniqueId}-wheel::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 24px;
      background: linear-gradient(to bottom, rgba(0,0,0,0.3), transparent);
      pointer-events: none;
      z-index: 2;
    }

    .${uniqueId}-wheel::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 24px;
      background: linear-gradient(to top, rgba(0,0,0,0.3), transparent);
      pointer-events: none;
      z-index: 2;
    }
    
    .${uniqueId}-wheel-shine {
        position: absolute;
        top: 50%;
        left: 0;
        right: 0;
        height: 40px;
        transform: translateY(-50%);
        background: linear-gradient(to bottom, transparent, rgba(255,255,255,0.6), transparent);
        pointer-events: none;
        z-index: 5;
    }

    /* Payline */
    .${uniqueId}-payline {
      position: absolute;
      top: 50%;
      left: 0;
      right: 0;
      height: 2px;
      background: ${s.payline};
      z-index: 20;
      transform: translateY(-50%);
      pointer-events: none;
      box-shadow: 0 0 5px ${s.payline};
    }
    
    .${uniqueId}-payline-arrow-left {
        position: absolute;
        top: 50%;
        left: -8px;
        transform: translateY(-50%);
        width: 0; 
        height: 0; 
        border-top: 6px solid transparent;
        border-bottom: 6px solid transparent; 
        border-left: 8px solid ${s.arrow}; 
        z-index: 20;
    }
    
    .${uniqueId}-payline-arrow-right {
        position: absolute;
        top: 50%;
        right: -8px;
        transform: translateY(-50%);
        width: 0; 
        height: 0; 
        border-top: 6px solid transparent;
        border-bottom: 6px solid transparent;
        border-right: 8px solid ${s.arrow}; 
        z-index: 20;
    }

    .${uniqueId}-controls {
      display: flex;
      justify-content: center;
      position: relative;
      z-index: 10;
    }

    .${uniqueId}-button {
      position: relative;
      padding: 16px 48px;
      background: ${s.btnBg};
      border: 2px solid ${s.btnBorder};
      border-radius: 9999px;
      color: white;
      font-family: inherit;
      font-size: 20px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      cursor: pointer;
      box-shadow: 0 6px 0 ${s.btnShadow}, 0 10px 20px rgba(0,0,0,0.4);
      transition: all 0.1s;
      overflow: hidden;
    }
    
    .${uniqueId}-button.cta {
        background: ${s.ctaBg};
        border-color: ${s.ctaBorder};
        box-shadow: 0 0 20px ${s.ctaShadow};
        animation: ${uniqueId}-pulse-cta 2s infinite;
    }

    @keyframes ${uniqueId}-pulse-cta {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
    }

    .${uniqueId}-button:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 0 ${s.btnShadow}, 0 15px 25px rgba(0,0,0,0.5);
    }
    
    .${uniqueId}-button.cta:hover {
         transform: scale(1.05) translateY(-2px);
         box-shadow: 0 0 30px ${s.ctaShadow};
    }

    .${uniqueId}-button:active:not(:disabled) {
      transform: translateY(2px);
      box-shadow: 0 2px 0 ${s.btnShadow}, 0 5px 10px rgba(0,0,0,0.4);
    }

    .${uniqueId}-button:disabled {
      filter: grayscale(0.5);
      cursor: not-allowed;
      opacity: 0.8;
    }

    .${uniqueId}-button-shine {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 50%;
        background: linear-gradient(to bottom, rgba(255,255,255,0.2), transparent);
        pointer-events: none;
    }

    .${uniqueId}-result {
      margin-top: 24px;
      padding: 16px;
      background: ${s.resultBg};
      border: 1px solid ${s.resultBorder};
      border-radius: 8px;
      text-align: center;
      font-size: 18px;
      font-weight: 700;
      color: #e5e7eb;
      backdrop-filter: blur(8px);
      box-shadow: 0 0 20px rgba(0,0,0,0.2);
      display: none;
      position: relative;
      z-index: 10;
      animation: ${uniqueId}-popIn 0.3s ease-out forwards;
    }

    @keyframes ${uniqueId}-popIn {
        from { opacity: 0; transform: scale(0.8); }
        to { opacity: 1; transform: scale(1); }
    }

    .${uniqueId}-win-text {
        color: ${s.resultText};
        text-shadow: 0 0 5px rgba(255,255,255,0.5);
    }
    
    .${uniqueId}-footer {
        text-align: center;
        margin-top: 16px;
        font-size: 10px;
        color: #6b7280;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        font-weight: 600;
        position: relative;
        z-index: 10;
    }

    @media (max-width: 480px) {
      #${uniqueId}-widget {
        padding: 24px;
        border-radius: 20px;
      }
      .${uniqueId}-title {
        font-size: 24px;
      }
      .${uniqueId}-wheel {
        width: 70px;
        height: 100px;
      }
      .${uniqueId}-wheel-content {
        font-size: 24px;
      }
      .${uniqueId}-button {
        padding: 12px 32px;
        font-size: 16px;
      }
    }
  `;

  // Добавляем стили в head
  var styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);

  // Функция создания колеса
  function createWheel(values, index) {
    var wheel = document.createElement('div');
    wheel.className = `${uniqueId}-wheel`;
    wheel.id = `${uniqueId}-wheel-` + index;

    var content = document.createElement('div');
    content.className = `${uniqueId}-wheel-content`;
    content.textContent = values[0];
    wheel.appendChild(content);
    
    var shine = document.createElement('div');
    shine.className = `${uniqueId}-wheel-shine`;
    wheel.appendChild(shine);

    return wheel;
  }

  // Функция вращения колеса (простая JS анимация)
  function spinWheel(wheel, values, result, onComplete) {
    var content = wheel.querySelector(`.${uniqueId}-wheel-content`);
    var isSpinning = true;
    
    // Эффект размытия
    content.style.filter = 'blur(1px)';
    
    var spinInterval = setInterval(function() {
        var randomValue = values[Math.floor(Math.random() * values.length)];
        content.textContent = randomValue;
        // Небольшой "шейк" по вертикали
        content.style.transform = `translateY(${Math.random() * 4 - 2}px)`;
    }, 50);

    // Остановка
    setTimeout(function() {
      clearInterval(spinInterval);
      content.textContent = result;
      content.style.filter = 'none';
      content.style.transform = 'translateY(0)';
      
      if (onComplete) {
        setTimeout(onComplete, 300);
      }
    }, 1500); // 1.5 сек вращения
  }

  function initWidget() {
    var container = document.getElementById('seohqs-slot-widget');
    if (!container) {
      // Попробуем найти контейнер, созданный пользователем, если ID стандартный
      container = document.getElementById('seohqs-slot-widget');
      if (!container) return; // Если все еще нет, выходим
    }
    
    // Переименуем ID, чтобы применить scoped стили, или обернем
    // Проще создать новый контейнер внутри целевого
    var widgetContainer = document.createElement('div');
    widgetContainer.id = `${uniqueId}-widget`;
    
    container.innerHTML = ''; // Очистка
    container.appendChild(widgetContainer);

    // Header
    var header = document.createElement('div');
    header.className = `${uniqueId}-header`;
    var titleContainer = document.createElement('div');
    titleContainer.className = `${uniqueId}-title-container`;
    var title = document.createElement('h2');
    title.className = `${uniqueId}-title`;
    title.textContent = brandName;
    titleContainer.appendChild(title);
    header.appendChild(titleContainer);
    widgetContainer.appendChild(header);

    // Screen Area
    var screen = document.createElement('div');
    screen.className = `${uniqueId}-screen`;
    
    // Payline arrows
    var arrowLeft = document.createElement('div');
    arrowLeft.className = `${uniqueId}-payline-arrow-left`;
    screen.appendChild(arrowLeft);
    
    var arrowRight = document.createElement('div');
    arrowRight.className = `${uniqueId}-payline-arrow-right`;
    screen.appendChild(arrowRight);

    var wheelsContainer = document.createElement('div');
    wheelsContainer.className = `${uniqueId}-wheels-container`;
    
    // Payline
    var payline = document.createElement('div');
    payline.className = `${uniqueId}-payline`;
    wheelsContainer.appendChild(payline);

    var wheel1 = createWheel(values1, 1);
    var wheel2 = createWheel(values2, 2);
    var wheel3 = createWheel(values3, 3);
    wheelsContainer.appendChild(wheel1);
    wheelsContainer.appendChild(wheel2);
    wheelsContainer.appendChild(wheel3);
    
    screen.appendChild(wheelsContainer);
    widgetContainer.appendChild(screen);

    // Controls
    var controls = document.createElement('div');
    controls.className = `${uniqueId}-controls`;
    
    // Button
    var button = document.createElement('button');
    button.className = `${uniqueId}-button`;
    button.innerHTML = '<span style="position: relative; z-index: 2;">' + texts.spin + '</span><div class="' + uniqueId + '-button-shine"></div>';
    controls.appendChild(button);
    widgetContainer.appendChild(controls);

    // Result
    var resultDiv = document.createElement('div');
    resultDiv.className = `${uniqueId}-result`;
    widgetContainer.appendChild(resultDiv);
    
    // Footer
    var footer = document.createElement('div');
    footer.className = `${uniqueId}-footer`;
    footer.textContent = 'Verified by SEOHQS';
    widgetContainer.appendChild(footer);

    // Logic
    var spinning = false;
    var spinFinished = false;

    button.addEventListener('click', function() {
      if (spinFinished) {
          window.open(offerUrl, '_blank');
          return;
      }

      if (spinning) return;
      
      spinning = true;
      button.disabled = true;
      button.querySelector('span').textContent = texts.spinning;
      resultDiv.style.display = 'none';
      resultDiv.className = `${uniqueId}-result`; // Reset classes if any

      var result1 = values1[Math.floor(Math.random() * values1.length)];
      var result2 = values2[Math.floor(Math.random() * values2.length)];
      var result3 = values3[Math.floor(Math.random() * values3.length)];

      // Cascade spinning
      spinWheel(wheel1, values1, result1, function() {
        spinWheel(wheel2, values2, result2, function() {
          spinWheel(wheel3, values3, result3, function() {
            var message = texts.congrats + ' ' + result1 + ' ' + result2 + ' ' + result3;
            
            resultDiv.textContent = message;
            resultDiv.style.display = 'block';
            resultDiv.classList.add(`${uniqueId}-win-text`);

            spinning = false;
            spinFinished = true;
            
            // Transform button to CTA
            button.disabled = false;
            button.classList.add('cta');
            button.querySelector('span').textContent = texts.playReal;
          });
        });
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWidget);
  } else {
    initWidget();
  }
})();
