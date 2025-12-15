(function() {
  'use strict';

  // Получаем параметры из data-атрибутов скрипта
  var script = document.currentScript || document.querySelector('script[data-brand-name]');
  var brandName = script?.getAttribute('data-brand-name') || 'Ваш бренд';
  var values1Str = script?.getAttribute('data-values1') || '🎁,💎,⭐,🏆,🎯,💫';
  var values2Str = script?.getAttribute('data-values2') || 'Скидка,Бонус,Подарок,Акция,Приз,Выигрыш';
  var values3Str = script?.getAttribute('data-values3') || '10%,20%,30%,50%,100%,200%';

  var values1 = values1Str.split(',').map(function(v) { return v.trim(); }).filter(Boolean);
  var values2 = values2Str.split(',').map(function(v) { return v.trim(); }).filter(Boolean);
  var values3 = values3Str.split(',').map(function(v) { return v.trim(); }).filter(Boolean);

  // Создаем стили с gambling-стилем
  var styles = `
    @keyframes spin {
      0% { transform: translateY(0) rotate(0deg); }
      100% { transform: translateY(-100%) rotate(360deg); }
    }
    @keyframes glow {
      0%, 100% { box-shadow: 0 0 20px rgba(255, 215, 0, 0.3), 0 0 40px rgba(255, 165, 0, 0.2); }
      50% { box-shadow: 0 0 30px rgba(255, 215, 0, 0.8), 0 0 60px rgba(255, 165, 0, 0.6), 0 0 90px rgba(255, 140, 0, 0.4); }
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.9; transform: scale(1.05); }
    }
    @keyframes shine {
      0% { transform: translateX(-100%) skewX(-15deg); }
      100% { transform: translateX(200%) skewX(-15deg); }
    }
    @keyframes float {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-10px); }
    }
    @keyframes sparkle {
      0%, 100% { opacity: 0; transform: scale(0) rotate(0deg); }
      50% { opacity: 1; transform: scale(1.5) rotate(180deg); }
    }
    
    #seohqs-slot-widget {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
      max-width: 700px;
      margin: 0 auto;
      padding: 32px;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 25%, #312e81 50%, #581c87 75%, #7c2d12 100%);
      border-radius: 24px;
      box-shadow: 0 0 30px rgba(255, 215, 0, 0.3), 0 0 60px rgba(255, 165, 0, 0.2), inset 0 0 30px rgba(255, 215, 0, 0.1);
      border: 4px solid rgba(255, 215, 0, 0.4);
      position: relative;
      overflow: hidden;
    }
    
    #seohqs-slot-widget::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
      animation: shine 3s infinite;
    }
    
    .seohqs-slot-header {
      text-align: center;
      margin-bottom: 32px;
      position: relative;
      z-index: 10;
    }
    
    .seohqs-slot-title {
      font-size: 36px;
      font-weight: 900;
      background: linear-gradient(to right, #fbbf24, #f97316, #ec4899);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin-bottom: 12px;
      text-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
      filter: drop-shadow(0 0 10px rgba(255, 215, 0, 0.8));
      animation: float 3s ease-in-out infinite;
    }
    
    .seohqs-slot-subtitle {
      color: #fef3c7;
      font-size: 18px;
      font-weight: 600;
    }
    
    .seohqs-slot-wheels {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 20px;
      margin-bottom: 32px;
      position: relative;
      z-index: 10;
    }
    
    .seohqs-slot-wheel {
      position: relative;
      width: 144px;
      height: 192px;
      overflow: hidden;
      border-radius: 16px;
      background: linear-gradient(to bottom, #fbbf24, #f97316, #dc2626);
      border: 4px solid rgba(255, 215, 0, 0.8);
      box-shadow: 0 0 20px rgba(255, 215, 0, 0.5), inset 0 0 20px rgba(255, 215, 0, 0.3);
      transition: all 0.3s ease;
    }
    
    .seohqs-slot-wheel.spinning {
      animation: glow 0.5s ease-in-out infinite;
      transform: scale(1.05);
    }
    
    .seohqs-slot-wheel-content {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 32px;
      font-weight: 900;
      color: #ffffff;
      text-shadow: 0 0 10px rgba(255, 255, 255, 0.8), 0 0 20px rgba(255, 215, 0, 0.6), 0 0 30px rgba(255, 165, 0, 0.4);
      filter: drop-shadow(0 0 8px rgba(255, 215, 0, 0.8));
      transition: transform 0.05s linear;
    }
    
    .seohqs-slot-wheel.spinning .seohqs-slot-wheel-content {
      animation: spin 0.1s linear infinite;
    }
    
    .seohqs-slot-wheel-overlay-top {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 33.33%;
      background: linear-gradient(to bottom, rgba(255, 255, 255, 0.6), transparent);
      pointer-events: none;
      z-index: 20;
    }
    
    .seohqs-slot-wheel-overlay-bottom {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 33.33%;
      background: linear-gradient(to top, rgba(0, 0, 0, 0.4), transparent);
      pointer-events: none;
      z-index: 20;
    }
    
    .seohqs-slot-wheel-shine {
      position: absolute;
      top: 0;
      left: -100%;
      width: 50%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
      animation: shine 1s infinite;
      z-index: 15;
    }
    
    .seohqs-slot-button {
      display: block;
      width: 100%;
      padding: 20px 40px;
      border-radius: 16px;
      font-size: 20px;
      font-weight: 900;
      color: white;
      background: linear-gradient(135deg, #f59e0b, #ef4444, #ec4899, #8b5cf6);
      border: none;
      cursor: pointer;
      box-shadow: 0 0 30px rgba(245, 158, 11, 0.6), 0 0 60px rgba(239, 68, 68, 0.4);
      transition: all 0.3s ease;
      margin: 0 auto;
      position: relative;
      overflow: hidden;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    
    .seohqs-slot-button::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
      animation: shine 2s infinite;
    }
    
    .seohqs-slot-button:hover:not(:disabled) {
      transform: scale(1.05);
      box-shadow: 0 0 40px rgba(245, 158, 11, 0.8), 0 0 80px rgba(239, 68, 68, 0.6);
    }
    
    .seohqs-slot-button:active:not(:disabled) {
      transform: scale(0.95);
    }
    
    .seohqs-slot-button:disabled {
      background: linear-gradient(135deg, #6b7280, #9ca3af);
      cursor: not-allowed;
      box-shadow: 0 0 20px rgba(107, 114, 128, 0.5);
    }
    
    .seohqs-slot-result {
      margin-top: 24px;
      padding: 24px;
      background: linear-gradient(135deg, #fbbf24, #f97316, #dc2626);
      border-radius: 16px;
      border: 4px solid rgba(255, 215, 0, 0.8);
      box-shadow: 0 0 30px rgba(255, 215, 0, 0.6), 0 0 60px rgba(255, 165, 0, 0.4);
      text-align: center;
      font-size: 20px;
      font-weight: 900;
      color: #ffffff;
      text-shadow: 0 0 10px rgba(0, 0, 0, 0.8), 0 0 20px rgba(255, 255, 255, 0.5);
      animation: pulse 2s ease-in-out infinite;
      position: relative;
      overflow: hidden;
    }
    
    .seohqs-slot-result::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
      animation: shine 2s infinite;
    }
    
    .seohqs-slot-particles {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 5;
    }
    
    .seohqs-slot-particle {
      position: absolute;
      width: 4px;
      height: 4px;
      background: #fbbf24;
      border-radius: 50%;
      box-shadow: 0 0 6px rgba(251, 191, 36, 0.8);
      animation: sparkle 2s ease-in-out infinite;
    }
    
    @media (max-width: 640px) {
      #seohqs-slot-widget {
        padding: 20px;
      }
      .seohqs-slot-wheels {
        gap: 12px;
      }
      .seohqs-slot-wheel {
        width: 100px;
        height: 140px;
      }
      .seohqs-slot-wheel-content {
        font-size: 24px;
      }
      .seohqs-slot-title {
        font-size: 28px;
      }
      .seohqs-slot-button {
        padding: 16px 24px;
        font-size: 18px;
      }
    }
  `;

  // Добавляем стили в head
  var styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);

  // Функция создания частиц
  function createParticles(container) {
    var particlesContainer = document.createElement('div');
    particlesContainer.className = 'seohqs-slot-particles';
    
    for (var i = 0; i < 15; i++) {
      var particle = document.createElement('div');
      particle.className = 'seohqs-slot-particle';
      particle.style.left = Math.random() * 100 + '%';
      particle.style.top = Math.random() * 100 + '%';
      particle.style.animationDelay = Math.random() * 2 + 's';
      particle.style.animationDuration = (1 + Math.random() * 2) + 's';
      particlesContainer.appendChild(particle);
    }
    
    container.appendChild(particlesContainer);
  }

  // Функция создания колеса
  function createWheel(values, index) {
    var wheel = document.createElement('div');
    wheel.className = 'seohqs-slot-wheel';
    wheel.id = 'seohqs-wheel-' + index;

    var content = document.createElement('div');
    content.className = 'seohqs-slot-wheel-content';
    content.textContent = values[0];
    wheel.appendChild(content);

    var overlayTop = document.createElement('div');
    overlayTop.className = 'seohqs-slot-wheel-overlay-top';
    wheel.appendChild(overlayTop);

    var overlayBottom = document.createElement('div');
    overlayBottom.className = 'seohqs-slot-wheel-overlay-bottom';
    wheel.appendChild(overlayBottom);
    
    var shine = document.createElement('div');
    shine.className = 'seohqs-slot-wheel-shine';
    wheel.appendChild(shine);

    return wheel;
  }

  // Функция вращения колеса
  function spinWheel(wheel, values, result, onComplete) {
    var content = wheel.querySelector('.seohqs-slot-wheel-content');
    wheel.classList.add('spinning');

    var interval = setInterval(function() {
      var randomValue = values[Math.floor(Math.random() * values.length)];
      content.textContent = randomValue;
    }, 50);

    setTimeout(function() {
      clearInterval(interval);
      content.textContent = result;
      wheel.classList.remove('spinning');
      if (onComplete) {
        setTimeout(onComplete, 300);
      }
    }, 2000);
  }

  // Комбинации
  var combinations = {
    '🎁-Скидка-10%': '🎉 Поздравляем! Вы получили подарок со скидкой 10%!',
    '💎-Бонус-20%': '✨ Отлично! Драгоценный бонус 20% ваш!',
    '⭐-Подарок-30%': '🌟 Удивительно! Звездный подарок 30%!',
    '🏆-Акция-50%': '🏅 Потрясающе! Трофейная акция 50%!',
    '🎯-Приз-100%': '🎊 Невероятно! Точно в цель - приз 100%!',
    '💫-Выигрыш-200%': '🚀 Фантастика! Максимальный выигрыш 200%!',
  };

  // Инициализация виджета
  function initWidget() {
    var container = document.getElementById('seohqs-slot-widget');
    if (!container) {
      console.error('Container #seohqs-slot-widget not found');
      return;
    }

    // Очищаем контейнер
    container.innerHTML = '';

    // Создаем частицы
    createParticles(container);

    // Создаем заголовок
    var header = document.createElement('div');
    header.className = 'seohqs-slot-header';
    var title = document.createElement('h2');
    title.className = 'seohqs-slot-title';
    title.textContent = brandName;
    var subtitle = document.createElement('p');
    subtitle.className = 'seohqs-slot-subtitle';
    subtitle.textContent = 'Крутите слот и выигрывайте призы!';
    header.appendChild(title);
    header.appendChild(subtitle);
    container.appendChild(header);

    // Создаем колеса
    var wheelsContainer = document.createElement('div');
    wheelsContainer.className = 'seohqs-slot-wheels';
    var wheel1 = createWheel(values1, 1);
    var wheel2 = createWheel(values2, 2);
    var wheel3 = createWheel(values3, 3);
    wheelsContainer.appendChild(wheel1);
    wheelsContainer.appendChild(wheel2);
    wheelsContainer.appendChild(wheel3);
    container.appendChild(wheelsContainer);

    // Создаем кнопку
    var button = document.createElement('button');
    button.className = 'seohqs-slot-button';
    button.textContent = '🎰 Крутить!';
    button.id = 'seohqs-spin-button';
    container.appendChild(button);

    // Результат
    var resultDiv = document.createElement('div');
    resultDiv.className = 'seohqs-slot-result';
    resultDiv.id = 'seohqs-result';
    resultDiv.style.display = 'none';
    container.appendChild(resultDiv);

    // Обработчик клика
    var spinning = false;
    button.addEventListener('click', function() {
      if (spinning) return;
      spinning = true;
      button.disabled = true;
      button.textContent = 'Крутится...';
      resultDiv.style.display = 'none';

      // Генерируем результаты
      var result1 = values1[Math.floor(Math.random() * values1.length)];
      var result2 = values2[Math.floor(Math.random() * values2.length)];
      var result3 = values3[Math.floor(Math.random() * values3.length)];

      // Вращаем колеса
      spinWheel(wheel1, values1, result1, function() {
        spinWheel(wheel2, values2, result2, function() {
          spinWheel(wheel3, values3, result3, function() {
            // Показываем результат
            var combo = result1 + '-' + result2 + '-' + result3;
            var message = combinations[combo] || '🎲 Выпало: ' + result1 + ' ' + result2 + ' ' + result3;
            resultDiv.textContent = message;
            resultDiv.style.display = 'block';

            spinning = false;
            button.disabled = false;
            button.textContent = '🎰 Крутить!';
          });
        });
      });
    });
  }

  // Инициализируем при загрузке DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWidget);
  } else {
    initWidget();
  }
})();
