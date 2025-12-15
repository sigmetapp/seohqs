(function() {
  'use strict';

  // Получаем параметры из data-атрибутов скрипта
  var script = document.currentScript || document.querySelector('script[data-brand-name]');
  var brandName = script?.getAttribute('data-brand-name') || 'Ваш бренд';
  var values1Str = script?.getAttribute('data-values1') || '🎁,💎,⭐,🏆,🎯,💫';
  var values2Str = script?.getAttribute('data-values2') || 'Скидка,Бонус,Подарок,Акция,Приз,Выигрыш';
  var values3Str = script?.getAttribute('data-values3') || '10%,20%,30%,50%,100%,200%';

  var values1 = values1Str.split(',').map(v => v.trim()).filter(Boolean);
  var values2 = values2Str.split(',').map(v => v.trim()).filter(Boolean);
  var values3 = values3Str.split(',').map(v => v.trim()).filter(Boolean);

  // Создаем стили
  var styles = `
    #seohqs-slot-widget {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
      max-width: 600px;
      margin: 0 auto;
      padding: 24px;
      background: linear-gradient(135deg, #eff6ff 0%, #f3e8ff 50%, #fce7f3 100%);
      border-radius: 16px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      border: 1px solid rgba(0, 0, 0, 0.1);
    }
    .seohqs-slot-header {
      text-align: center;
      margin-bottom: 24px;
    }
    .seohqs-slot-title {
      font-size: 28px;
      font-weight: 700;
      color: #1f2937;
      margin-bottom: 8px;
    }
    .seohqs-slot-subtitle {
      color: #6b7280;
      font-size: 16px;
    }
    .seohqs-slot-wheels {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 16px;
      margin-bottom: 24px;
    }
    .seohqs-slot-wheel {
      position: relative;
      width: 128px;
      height: 160px;
      overflow: hidden;
      border-radius: 12px;
      background: linear-gradient(to bottom, #f3f4f6, #e5e7eb);
      border: 2px solid #d1d5db;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }
    .seohqs-slot-wheel-content {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      font-weight: 700;
      color: #1f2937;
      transition: transform 0.1s;
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
      background: linear-gradient(to bottom, rgba(255, 255, 255, 0.5), transparent);
      pointer-events: none;
    }
    .seohqs-slot-wheel-overlay-bottom {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 33.33%;
      background: linear-gradient(to top, rgba(255, 255, 255, 0.5), transparent);
      pointer-events: none;
    }
    .seohqs-slot-button {
      display: block;
      width: 100%;
      padding: 16px 32px;
      border-radius: 12px;
      font-size: 18px;
      font-weight: 700;
      color: white;
      background: linear-gradient(to right, #2563eb, #9333ea, #db2777);
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      transition: all 0.2s;
      margin: 0 auto;
    }
    .seohqs-slot-button:hover:not(:disabled) {
      transform: scale(1.05);
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    }
    .seohqs-slot-button:active:not(:disabled) {
      transform: scale(0.95);
    }
    .seohqs-slot-button:disabled {
      background: #9ca3af;
      cursor: not-allowed;
    }
    .seohqs-slot-result {
      margin-top: 24px;
      padding: 16px;
      background: white;
      border-radius: 12px;
      border: 2px solid #fbbf24;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      text-align: center;
      font-size: 18px;
      font-weight: 600;
      color: #1f2937;
      animation: pulse 2s ease-in-out infinite;
    }
    @keyframes spin {
      from { transform: translateY(0); }
      to { transform: translateY(-100%); }
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.8; }
    }
    @media (max-width: 640px) {
      #seohqs-slot-widget {
        padding: 16px;
      }
      .seohqs-slot-wheels {
        gap: 8px;
      }
      .seohqs-slot-wheel {
        width: 96px;
        height: 120px;
      }
      .seohqs-slot-wheel-content {
        font-size: 18px;
      }
      .seohqs-slot-title {
        font-size: 24px;
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

    return wheel;
  }

  // Функция вращения колеса
  function spinWheel(wheel, values, result, onComplete) {
    var content = wheel.querySelector('.seohqs-slot-wheel-content');
    wheel.classList.add('spinning');

    var interval = setInterval(function() {
      var randomValue = values[Math.floor(Math.random() * values.length)];
      content.textContent = randomValue;
    }, 100);

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
