(function() {
  'use strict';

  // Получаем параметры из data-атрибутов скрипта
  var script = document.currentScript || document.querySelector('script[data-country]');
  var country = script?.getAttribute('data-country') || 'UK';
  var casinosDataStr = script?.getAttribute('data-casinos') || '{}';
  var customCasinos = {};
  try {
    customCasinos = JSON.parse(casinosDataStr.replace(/&quot;/g, '"'));
  } catch(e) {
    customCasinos = {};
  }

  var uniqueId = 'seohqs-tabsgen-' + Math.random().toString(36).slice(2, 11);

  var paymentMethods = [
    {
      id: 'visa',
      name: {
        UK: 'Visa',
        DE: 'Visa',
        FR: 'Visa',
        ES: 'Visa',
        IT: 'Visa',
        PT: 'Visa',
        BR: 'Visa',
        BG: 'Visa',
        HU: 'Visa',
        FI: 'Visa',
        NO: 'Visa',
      },
      icon: '💳',
      status: 'available',
      popularity: 5,
      minDeposit: '€10',
      maxDeposit: '€5,000',
      processingTime: {
        UK: 'Instant',
        DE: 'Sofort',
        FR: 'Instantané',
        ES: 'Instantáneo',
        IT: 'Istantaneo',
        PT: 'Instantâneo',
        BR: 'Instantâneo',
        BG: 'Моментално',
        HU: 'Azonnali',
        FI: 'Heti',
        NO: 'Øyeblikkelig',
      },
    },
    {
      id: 'mastercard',
      name: {
        UK: 'Mastercard',
        DE: 'Mastercard',
        FR: 'Mastercard',
        ES: 'Mastercard',
        IT: 'Mastercard',
        PT: 'Mastercard',
        BR: 'Mastercard',
        BG: 'Mastercard',
        HU: 'Mastercard',
        FI: 'Mastercard',
        NO: 'Mastercard',
      },
      icon: '💳',
      status: 'available',
      popularity: 5,
      minDeposit: '€10',
      maxDeposit: '€5,000',
      processingTime: {
        UK: 'Instant',
        DE: 'Sofort',
        FR: 'Instantané',
        ES: 'Instantáneo',
        IT: 'Istantaneo',
        PT: 'Instantâneo',
        BR: 'Instantâneo',
        BG: 'Моментално',
        HU: 'Azonnali',
        FI: 'Heti',
        NO: 'Øyeblikkelig',
      },
    },
    {
      id: 'skrill',
      name: {
        UK: 'Skrill',
        DE: 'Skrill',
        FR: 'Skrill',
        ES: 'Skrill',
        IT: 'Skrill',
        PT: 'Skrill',
        BR: 'Skrill',
        BG: 'Skrill',
        HU: 'Skrill',
        FI: 'Skrill',
        NO: 'Skrill',
      },
      icon: '💼',
      status: 'available',
      popularity: 4,
      minDeposit: '€5',
      maxDeposit: '€10,000',
      processingTime: {
        UK: 'Instant',
        DE: 'Sofort',
        FR: 'Instantané',
        ES: 'Instantáneo',
        IT: 'Istantaneo',
        PT: 'Instantâneo',
        BR: 'Instantâneo',
        BG: 'Моментално',
        HU: 'Azonnali',
        FI: 'Heti',
        NO: 'Øyeblikkelig',
      },
    },
    {
      id: 'neteller',
      name: {
        UK: 'Neteller',
        DE: 'Neteller',
        FR: 'Neteller',
        ES: 'Neteller',
        IT: 'Neteller',
        PT: 'Neteller',
        BR: 'Neteller',
        BG: 'Neteller',
        HU: 'Neteller',
        FI: 'Neteller',
        NO: 'Neteller',
      },
      icon: '💼',
      status: 'available',
      popularity: 4,
      minDeposit: '€5',
      maxDeposit: '€10,000',
      processingTime: {
        UK: 'Instant',
        DE: 'Sofort',
        FR: 'Instantané',
        ES: 'Instantáneo',
        IT: 'Istantaneo',
        PT: 'Instantâneo',
        BR: 'Instantâneo',
        BG: 'Моментално',
        HU: 'Azonnali',
        FI: 'Heti',
        NO: 'Øyeblikkelig',
      },
    },
    {
      id: 'paysafecard',
      name: {
        UK: 'Paysafecard',
        DE: 'Paysafecard',
        FR: 'Paysafecard',
        ES: 'Paysafecard',
        IT: 'Paysafecard',
        PT: 'Paysafecard',
        BR: 'Paysafecard',
        BG: 'Paysafecard',
        HU: 'Paysafecard',
        FI: 'Paysafecard',
        NO: 'Paysafecard',
      },
      icon: '🎫',
      status: 'limited',
      popularity: 3,
      minDeposit: '€10',
      maxDeposit: '€500',
      processingTime: 'Мгновенно',
    },
  ];

  var translations = {
    UK: {
      title: 'Top Payment Methods',
      subtitle: 'Most popular payment methods for casino and slots',
      method: 'Payment Method',
      status: 'Status',
      popularity: 'Popularity',
      available: 'Available',
      limited: 'Limited',
      unavailable: 'Unavailable',
      minDeposit: 'Min Deposit',
      maxDeposit: 'Max Deposit',
      processingTime: 'Processing Time',
      topMethods: 'Top 5 Payment Methods',
      topCasinos: 'Top Casinos',
      playNow: 'Play Now',
    },
    DE: {
      title: 'Top Zahlungsmethoden',
      subtitle: 'Beliebteste Zahlungsmethoden für Casino und Slots',
      method: 'Zahlungsmethode',
      status: 'Status',
      popularity: 'Beliebtheit',
      available: 'Verfügbar',
      limited: 'Eingeschränkt',
      unavailable: 'Nicht verfügbar',
      minDeposit: 'Mindestbetrag',
      maxDeposit: 'Höchstbetrag',
      processingTime: 'Bearbeitungszeit',
      topMethods: 'Top 5 Zahlungsmethoden',
      topCasinos: 'Top Casinos',
      playNow: 'Jetzt Spielen',
    },
    FR: {
      title: 'Méthodes de Paiement Populaires',
      subtitle: 'Méthodes de paiement les plus populaires pour casino et machines à sous',
      method: 'Méthode de Paiement',
      status: 'Statut',
      popularity: 'Popularité',
      available: 'Disponible',
      limited: 'Limité',
      unavailable: 'Indisponible',
      minDeposit: 'Dépôt Min',
      maxDeposit: 'Dépôt Max',
      processingTime: 'Délai de Traitement',
      topMethods: 'Top 5 Méthodes de Paiement',
      topCasinos: 'Meilleurs Casinos',
      playNow: 'Jouer Maintenant',
    },
    ES: {
      title: 'Métodos de Pago Populares',
      subtitle: 'Métodos de pago más populares para casino y tragamonedas',
      method: 'Método de Pago',
      status: 'Estado',
      popularity: 'Popularidad',
      available: 'Disponible',
      limited: 'Limitado',
      unavailable: 'No Disponible',
      minDeposit: 'Depósito Mín',
      maxDeposit: 'Depósito Máx',
      processingTime: 'Tiempo de Procesamiento',
      topMethods: 'Top 5 Métodos de Pago',
      topCasinos: 'Mejores Casinos',
      playNow: 'Jugar Ahora',
    },
    IT: {
      title: 'Metodi di Pagamento Popolari',
      subtitle: 'Metodi di pagamento più popolari per casino e slot',
      method: 'Metodo di Pagamento',
      status: 'Stato',
      popularity: 'Popolarità',
      available: 'Disponibile',
      limited: 'Limitato',
      unavailable: 'Non Disponibile',
      minDeposit: 'Deposito Min',
      maxDeposit: 'Deposito Max',
      processingTime: 'Tempo di Elaborazione',
      topMethods: 'Top 5 Metodi di Pagamento',
      topCasinos: 'Migliori Casinò',
      playNow: 'Gioca Ora',
    },
    PT: {
      title: 'Métodos de Pagamento Populares',
      subtitle: 'Métodos de pagamento mais populares para casino e slots',
      method: 'Método de Pagamento',
      status: 'Status',
      popularity: 'Popularidade',
      available: 'Disponível',
      limited: 'Limitado',
      unavailable: 'Indisponível',
      minDeposit: 'Depósito Mín',
      maxDeposit: 'Depósito Máx',
      processingTime: 'Tempo de Processamento',
      topMethods: 'Top 5 Métodos de Pagamento',
      topCasinos: 'Melhores Casinos',
      playNow: 'Jogar Agora',
    },
    BR: {
      title: 'Métodos de Pagamento Populares',
      subtitle: 'Métodos de pagamento mais populares para cassino e slots',
      method: 'Método de Pagamento',
      status: 'Status',
      popularity: 'Popularidade',
      available: 'Disponível',
      limited: 'Limitado',
      unavailable: 'Indisponível',
      minDeposit: 'Depósito Mín',
      maxDeposit: 'Depósito Máx',
      processingTime: 'Tempo de Processamento',
      topMethods: 'Top 5 Métodos de Pagamento',
      topCasinos: 'Melhores Cassinos',
      playNow: 'Jogar Agora',
    },
    BG: {
      title: 'Популярни Методи за Плащане',
      subtitle: 'Най-популярните методи за плащане за казино и слотове',
      method: 'Метод за Плащане',
      status: 'Статус',
      popularity: 'Популярност',
      available: 'Наличен',
      limited: 'Ограничен',
      unavailable: 'Недостъпен',
      minDeposit: 'Мин. Депозит',
      maxDeposit: 'Макс. Депозит',
      processingTime: 'Време за Обработка',
      topMethods: 'Топ 5 Методи за Плащане',
      topCasinos: 'Топ Казина',
      playNow: 'Играй Сега',
    },
    HU: {
      title: 'Népszerű Fizetési Módok',
      subtitle: 'Legnépszerűbb fizetési módok kaszinóhoz és nyerőgépekhez',
      method: 'Fizetési Mód',
      status: 'Állapot',
      popularity: 'Népszerűség',
      available: 'Elérhető',
      limited: 'Korlátozott',
      unavailable: 'Nem Elérhető',
      minDeposit: 'Min. Befizetés',
      maxDeposit: 'Max. Befizetés',
      processingTime: 'Feldolgozási Idő',
      topMethods: 'Top 5 Fizetési Mód',
      topCasinos: 'Legjobb Kaszinók',
      playNow: 'Játék Most',
    },
    FI: {
      title: 'Suosituimmat Maksutavat',
      subtitle: 'Suosituimmat maksutavat kasinolle ja kolikkopeleille',
      method: 'Maksutapa',
      status: 'Tila',
      popularity: 'Suosio',
      available: 'Saatavilla',
      limited: 'Rajoitettu',
      unavailable: 'Ei Saatavilla',
      minDeposit: 'Min. Talletus',
      maxDeposit: 'Max. Talletus',
      processingTime: 'Käsittelyaika',
      topMethods: 'Top 5 Maksutapa',
      topCasinos: 'Parhaat Kasinot',
      playNow: 'Pelaa Nyt',
    },
    NO: {
      title: 'Populære Betalingsmetoder',
      subtitle: 'Mest populære betalingsmetoder for casino og spilleautomater',
      method: 'Betalingsmetode',
      status: 'Status',
      popularity: 'Popularitet',
      available: 'Tilgjengelig',
      limited: 'Begrenset',
      unavailable: 'Ikke Tilgjengelig',
      minDeposit: 'Min. Innskudd',
      maxDeposit: 'Max. Innskudd',
      processingTime: 'Behandlingstid',
      topMethods: 'Top 5 Betalingsmetoder',
      topCasinos: 'Beste Casinoer',
      playNow: 'Spill Nå',
    },
  };

  var t = translations[country] || translations.UK;

  // Get top 5 by popularity and merge with custom casinos
  var topMethods = paymentMethods
    .slice()
    .sort(function(a, b) { return b.popularity - a.popularity; })
    .slice(0, 5)
    .map(function(method) {
      var newMethod = {};
      for (var key in method) {
        if (method.hasOwnProperty(key)) {
          newMethod[key] = method[key];
        }
      }
      newMethod.casinos = customCasinos[method.id] || method.casinos || [];
      return newMethod;
    });

  function getStatusColor(status) {
    switch (status) {
      case 'available':
        return '#10b981'; // green-500
      case 'limited':
        return '#eab308'; // yellow-500
      case 'unavailable':
        return '#ef4444'; // red-500
      default:
        return '#6b7280'; // gray-500
    }
  }

  function getStatusText(status) {
    switch (status) {
      case 'available':
        return t.available;
      case 'limited':
        return t.limited;
      case 'unavailable':
        return t.unavailable;
      default:
        return '';
    }
  }

  function getPopularityStars(popularity) {
    var stars = '';
    for (var i = 0; i < popularity; i++) {
      stars += '⭐';
    }
    for (var j = 0; j < 5 - popularity; j++) {
      stars += '☆';
    }
    return stars;
  }

  // Создаем стили
  var styles = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

    #${uniqueId}-widget {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 1000px;
      margin: 0 auto;
      padding: 32px;
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      border: 1px solid #e5e7eb;
      box-sizing: border-box;
    }

    @media (prefers-color-scheme: dark) {
      #${uniqueId}-widget {
        background: #1f2937;
        border-color: #374151;
        color: white;
      }
    }

    #${uniqueId}-widget * {
      box-sizing: border-box;
    }

    .${uniqueId}-header {
      text-align: center;
      margin-bottom: 32px;
    }

    .${uniqueId}-title {
      margin: 0 0 12px 0;
      font-size: 32px;
      font-weight: 800;
      background: linear-gradient(to right, #2563eb, #9333ea, #db2777);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .${uniqueId}-subtitle {
      font-size: 18px;
      color: #6b7280;
      margin: 0;
    }

    @media (prefers-color-scheme: dark) {
      .${uniqueId}-subtitle {
        color: #9ca3af;
      }
    }

    .${uniqueId}-table-container {
      overflow-x: auto;
    }

    .${uniqueId}-table {
      width: 100%;
      border-collapse: collapse;
    }

    .${uniqueId}-thead {
      border-bottom: 2px solid #d1d5db;
    }

    @media (prefers-color-scheme: dark) {
      .${uniqueId}-thead {
        border-bottom-color: #4b5563;
      }
    }

    .${uniqueId}-th {
      text-align: left;
      padding: 16px;
      font-weight: 700;
      color: #111827;
    }

    @media (prefers-color-scheme: dark) {
      .${uniqueId}-th {
        color: white;
      }
    }

    .${uniqueId}-th-center {
      text-align: center;
    }

    .${uniqueId}-tbody .${uniqueId}-tr {
      border-bottom: 1px solid #e5e7eb;
      transition: background-color 0.2s;
      cursor: pointer;
    }

    @media (prefers-color-scheme: dark) {
      .${uniqueId}-tbody .${uniqueId}-tr {
        border-bottom-color: #374151;
      }
    }

    .${uniqueId}-tbody .${uniqueId}-tr:hover {
      background-color: #f9fafb;
    }

    @media (prefers-color-scheme: dark) {
      .${uniqueId}-tbody .${uniqueId}-tr:hover {
        background-color: rgba(31, 41, 55, 0.5);
      }
    }

    .${uniqueId}-tbody .${uniqueId}-tr.selected {
      background-color: #eff6ff;
    }

    @media (prefers-color-scheme: dark) {
      .${uniqueId}-tbody .${uniqueId}-tr.selected {
        background-color: rgba(30, 58, 138, 0.2);
      }
    }

    .${uniqueId}-td {
      padding: 16px;
    }

    .${uniqueId}-td-center {
      text-align: center;
    }

    .${uniqueId}-method-cell {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .${uniqueId}-method-icon {
      font-size: 24px;
    }

    .${uniqueId}-method-name {
      font-weight: 600;
      color: #111827;
    }

    @media (prefers-color-scheme: dark) {
      .${uniqueId}-method-name {
        color: white;
      }
    }

    .${uniqueId}-status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 600;
      color: white;
    }

    .${uniqueId}-popularity {
      font-size: 18px;
    }

    .${uniqueId}-details {
      margin-top: 24px;
      padding: 24px;
      background: linear-gradient(to right, #eff6ff, #f3e8ff);
      border-radius: 12px;
      border: 1px solid #bfdbfe;
      display: none;
      animation: ${uniqueId}-fadeIn 0.3s ease-out;
    }

    @media (prefers-color-scheme: dark) {
      .${uniqueId}-details {
        background: linear-gradient(to right, rgba(30, 58, 138, 0.2), rgba(147, 51, 234, 0.2));
        border-color: #1e40af;
      }
    }

    .${uniqueId}-details.show {
      display: block;
    }

    @keyframes ${uniqueId}-fadeIn {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .${uniqueId}-details-content {
      display: flex;
      align-items: flex-start;
      gap: 16px;
    }

    .${uniqueId}-details-icon {
      font-size: 40px;
    }

    .${uniqueId}-details-info {
      flex: 1;
    }

    .${uniqueId}-details-title {
      font-size: 24px;
      font-weight: 700;
      margin: 0 0 16px 0;
      color: #111827;
    }

    @media (prefers-color-scheme: dark) {
      .${uniqueId}-details-title {
        color: white;
      }
    }

    .${uniqueId}-details-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin-top: 16px;
    }

    @media (max-width: 768px) {
      .${uniqueId}-details-grid {
        grid-template-columns: 1fr;
      }
    }

    .${uniqueId}-details-item {
      display: flex;
      flex-direction: column;
    }

    .${uniqueId}-details-label {
      font-size: 14px;
      color: #6b7280;
      margin-bottom: 4px;
    }

    @media (prefers-color-scheme: dark) {
      .${uniqueId}-details-label {
        color: #9ca3af;
      }
    }

    .${uniqueId}-details-value {
      font-size: 18px;
      font-weight: 600;
      color: #111827;
    }

    @media (prefers-color-scheme: dark) {
      .${uniqueId}-details-value {
        color: white;
      }
    }

    .${uniqueId}-casinos-section {
      margin-top: 24px;
      padding-top: 24px;
      border-top: 1px solid #bfdbfe;
      display: none;
    }

    @media (prefers-color-scheme: dark) {
      .${uniqueId}-casinos-section {
        border-top-color: #1e40af;
      }
    }

    .${uniqueId}-casinos-title {
      font-size: 18px;
      font-weight: 700;
      margin: 0 0 16px 0;
      color: #111827;
    }

    @media (prefers-color-scheme: dark) {
      .${uniqueId}-casinos-title {
        color: white;
      }
    }

    .${uniqueId}-casinos-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }

    @media (max-width: 768px) {
      .${uniqueId}-casinos-grid {
        grid-template-columns: 1fr;
      }
    }

    .${uniqueId}-casino-card {
      padding: 16px;
      background: white;
      border-radius: 8px;
      border: 2px solid #e5e7eb;
      transition: all 0.2s;
      text-decoration: none;
      display: block;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    @media (prefers-color-scheme: dark) {
      .${uniqueId}-casino-card {
        background: #374151;
        border-color: #4b5563;
      }
    }

    .${uniqueId}-casino-card:hover {
      border-color: #2563eb;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      transform: translateY(-2px);
    }

    @media (prefers-color-scheme: dark) {
      .${uniqueId}-casino-card:hover {
        border-color: #3b82f6;
      }
    }

    .${uniqueId}-casino-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
    }

    .${uniqueId}-casino-name {
      font-size: 18px;
      font-weight: 700;
      color: #111827;
      transition: color 0.2s;
    }

    @media (prefers-color-scheme: dark) {
      .${uniqueId}-casino-name {
        color: white;
      }
    }

    .${uniqueId}-casino-card:hover .${uniqueId}-casino-name {
      color: #2563eb;
    }

    @media (prefers-color-scheme: dark) {
      .${uniqueId}-casino-card:hover .${uniqueId}-casino-name {
        color: #3b82f6;
      }
    }

    .${uniqueId}-casino-icon {
      font-size: 20px;
    }

    .${uniqueId}-casino-link {
      font-size: 14px;
      color: #2563eb;
      font-weight: 500;
    }

    @media (prefers-color-scheme: dark) {
      .${uniqueId}-casino-link {
        color: #3b82f6;
      }
    }

    .${uniqueId}-footer {
        margin-top: 24px;
        text-align: center;
        font-size: 10px;
        color: #6b7280;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        font-weight: 600;
    }

    @media (prefers-color-scheme: dark) {
      .${uniqueId}-footer {
        color: #9ca3af;
      }
    }

    @media (max-width: 768px) {
      #${uniqueId}-widget {
        padding: 16px;
      }
      .${uniqueId}-title {
        font-size: 24px;
      }
      .${uniqueId}-subtitle {
        font-size: 16px;
      }
      .${uniqueId}-th,
      .${uniqueId}-td {
        padding: 12px 8px;
        font-size: 14px;
      }
    }
  `;

  // Добавляем стили в head
  var styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);

  function initWidget() {
    var container = document.getElementById('seohqs-payment-methods-widget');
    if (!container) return;

    var widgetContainer = document.createElement('div');
    widgetContainer.id = `${uniqueId}-widget`;

    // Header
    var header = document.createElement('div');
    header.className = `${uniqueId}-header`;
    var title = document.createElement('h2');
    title.className = `${uniqueId}-title`;
    title.textContent = t.title;
    var subtitle = document.createElement('p');
    subtitle.className = `${uniqueId}-subtitle`;
    subtitle.textContent = t.subtitle;
    header.appendChild(title);
    header.appendChild(subtitle);
    widgetContainer.appendChild(header);

    // Table
    var tableContainer = document.createElement('div');
    tableContainer.className = `${uniqueId}-table-container`;
    var table = document.createElement('table');
    table.className = `${uniqueId}-table`;

    // Header row
    var thead = document.createElement('thead');
    thead.className = `${uniqueId}-thead`;
    var headerRow = document.createElement('tr');
    var headers = [t.method, t.status, t.popularity, t.minDeposit, t.maxDeposit, t.processingTime];
    headers.forEach(function(headerText) {
      var th = document.createElement('th');
      th.className = `${uniqueId}-th ${uniqueId}-th-center`;
      th.textContent = headerText;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Body
    var tbody = document.createElement('tbody');
    tbody.className = `${uniqueId}-tbody`;
    var selectedMethod = null;

    topMethods.forEach(function(method, index) {
      var row = document.createElement('tr');
      row.className = `${uniqueId}-tr`;
      row.setAttribute('data-method-id', method.id);

      // Method name
      var tdMethod = document.createElement('td');
      tdMethod.className = `${uniqueId}-td`;
      var methodCell = document.createElement('div');
      methodCell.className = `${uniqueId}-method-cell`;
      var icon = document.createElement('span');
      icon.className = `${uniqueId}-method-icon`;
      icon.textContent = method.icon;
      var name = document.createElement('span');
      name.className = `${uniqueId}-method-name`;
      name.textContent = method.name[country] || method.name.UK;
      methodCell.appendChild(icon);
      methodCell.appendChild(name);
      tdMethod.appendChild(methodCell);
      row.appendChild(tdMethod);

      // Status
      var tdStatus = document.createElement('td');
      tdStatus.className = `${uniqueId}-td ${uniqueId}-td-center`;
      var statusBadge = document.createElement('span');
      statusBadge.className = `${uniqueId}-status-badge`;
      statusBadge.style.backgroundColor = getStatusColor(method.status);
      statusBadge.textContent = getStatusText(method.status);
      tdStatus.appendChild(statusBadge);
      row.appendChild(tdStatus);

      // Popularity
      var tdPopularity = document.createElement('td');
      tdPopularity.className = `${uniqueId}-td ${uniqueId}-td-center`;
      var popularitySpan = document.createElement('span');
      popularitySpan.className = `${uniqueId}-popularity`;
      popularitySpan.textContent = getPopularityStars(method.popularity);
      popularitySpan.title = method.popularity + '/5';
      tdPopularity.appendChild(popularitySpan);
      row.appendChild(tdPopularity);

      // Min Deposit
      var tdMinDeposit = document.createElement('td');
      tdMinDeposit.className = `${uniqueId}-td ${uniqueId}-td-center`;
      tdMinDeposit.textContent = method.minDeposit || '-';
      row.appendChild(tdMinDeposit);

      // Max Deposit
      var tdMaxDeposit = document.createElement('td');
      tdMaxDeposit.className = `${uniqueId}-td ${uniqueId}-td-center`;
      tdMaxDeposit.textContent = method.maxDeposit || '-';
      row.appendChild(tdMaxDeposit);

      // Processing Time
      var tdProcessingTime = document.createElement('td');
      tdProcessingTime.className = `${uniqueId}-td ${uniqueId}-td-center`;
      var processingTimeValue = typeof method.processingTime === 'object' 
        ? (method.processingTime[country] || '-')
        : (method.processingTime || '-');
      tdProcessingTime.textContent = processingTimeValue;
      row.appendChild(tdProcessingTime);

      // Click handler
      row.addEventListener('click', function() {
        var wasSelected = selectedMethod === method.id;
        
        // Remove previous selection
        if (selectedMethod) {
          var prevRow = tbody.querySelector('[data-method-id="' + selectedMethod + '"]');
          if (prevRow) prevRow.classList.remove('selected');
          detailsDiv.classList.remove('show');
        }

        if (!wasSelected) {
          selectedMethod = method.id;
          row.classList.add('selected');
          
          // Update details
          detailsIcon.textContent = method.icon;
          detailsTitle.textContent = method.name[country] || method.name.UK;
          minDepositValue.textContent = method.minDeposit || '-';
          maxDepositValue.textContent = method.maxDeposit || '-';
          var processingTimeVal = typeof method.processingTime === 'object' 
            ? (method.processingTime[country] || '-')
            : (method.processingTime || '-');
          processingTimeValue.textContent = processingTimeVal;
          
          // Update casinos
          casinosGrid.innerHTML = '';
          if (method.casinos && method.casinos.length > 0) {
            method.casinos.forEach(function(casino, idx) {
              var casinoCard = document.createElement('a');
              casinoCard.href = casino.url;
              casinoCard.target = '_blank';
              casinoCard.rel = 'noopener noreferrer';
              casinoCard.className = `${uniqueId}-casino-card`;
              casinoCard.innerHTML = `
                <div class="${uniqueId}-casino-header">
                  <span class="${uniqueId}-casino-name">${casino.name}</span>
                  <span class="${uniqueId}-casino-icon">🎰</span>
                </div>
                <span class="${uniqueId}-casino-link">${t.playNow} →</span>
              `;
              casinosGrid.appendChild(casinoCard);
            });
            casinosSection.style.display = 'block';
          } else {
            casinosSection.style.display = 'none';
          }
          
          detailsDiv.classList.add('show');
        } else {
          selectedMethod = null;
        }
      });

      tbody.appendChild(row);
    });

    table.appendChild(tbody);
    tableContainer.appendChild(table);
    widgetContainer.appendChild(tableContainer);

    // Details section
    var detailsDiv = document.createElement('div');
    detailsDiv.className = `${uniqueId}-details`;
    var detailsContent = document.createElement('div');
    detailsContent.className = `${uniqueId}-details-content`;
    var detailsIcon = document.createElement('span');
    detailsIcon.className = `${uniqueId}-details-icon`;
    var detailsInfo = document.createElement('div');
    detailsInfo.className = `${uniqueId}-details-info`;
    var detailsTitle = document.createElement('h3');
    detailsTitle.className = `${uniqueId}-details-title`;
    var detailsGrid = document.createElement('div');
    detailsGrid.className = `${uniqueId}-details-grid`;
    
    var minDepositItem = document.createElement('div');
    minDepositItem.className = `${uniqueId}-details-item`;
    var minDepositLabel = document.createElement('p');
    minDepositLabel.className = `${uniqueId}-details-label`;
    minDepositLabel.textContent = t.minDeposit;
    var minDepositValue = document.createElement('p');
    minDepositValue.className = `${uniqueId}-details-value`;
    minDepositItem.appendChild(minDepositLabel);
    minDepositItem.appendChild(minDepositValue);

    var maxDepositItem = document.createElement('div');
    maxDepositItem.className = `${uniqueId}-details-item`;
    var maxDepositLabel = document.createElement('p');
    maxDepositLabel.className = `${uniqueId}-details-label`;
    maxDepositLabel.textContent = t.maxDeposit;
    var maxDepositValue = document.createElement('p');
    maxDepositValue.className = `${uniqueId}-details-value`;
    maxDepositItem.appendChild(maxDepositLabel);
    maxDepositItem.appendChild(maxDepositValue);

    var processingTimeItem = document.createElement('div');
    processingTimeItem.className = `${uniqueId}-details-item`;
    var processingTimeLabel = document.createElement('p');
    processingTimeLabel.className = `${uniqueId}-details-label`;
    processingTimeLabel.textContent = t.processingTime;
    var processingTimeValue = document.createElement('p');
    processingTimeValue.className = `${uniqueId}-details-value`;
    processingTimeItem.appendChild(processingTimeLabel);
    processingTimeItem.appendChild(processingTimeValue);

    detailsGrid.appendChild(minDepositItem);
    detailsGrid.appendChild(maxDepositItem);
    detailsGrid.appendChild(processingTimeItem);
    detailsInfo.appendChild(detailsTitle);
    detailsInfo.appendChild(detailsGrid);
    
    // Casinos section
    var casinosSection = document.createElement('div');
    casinosSection.className = `${uniqueId}-casinos-section`;
    var casinosTitle = document.createElement('h4');
    casinosTitle.className = `${uniqueId}-casinos-title`;
    casinosTitle.textContent = t.topCasinos;
    var casinosGrid = document.createElement('div');
    casinosGrid.className = `${uniqueId}-casinos-grid`;
    casinosSection.appendChild(casinosTitle);
    casinosSection.appendChild(casinosGrid);
    detailsInfo.appendChild(casinosSection);
    
    detailsContent.appendChild(detailsIcon);
    detailsContent.appendChild(detailsInfo);
    detailsDiv.appendChild(detailsContent);
    widgetContainer.appendChild(detailsDiv);

    // Footer
    var footer = document.createElement('div');
    footer.className = `${uniqueId}-footer`;
    footer.textContent = 'Verified by SEOHQS';
    widgetContainer.appendChild(footer);

    container.innerHTML = '';
    container.appendChild(widgetContainer);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWidget);
  } else {
    initWidget();
  }
})();
