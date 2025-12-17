(function() {
  'use strict';

  // Получаем параметры из data-атрибутов скрипта
  var script = document.currentScript || document.querySelector('script[data-country]');
  var country = script?.getAttribute('data-country') || 'UK';
  var tableStyle = script?.getAttribute('data-style') || 'classic';
  var singleTab = script?.getAttribute('data-tab') || null; // 'payment-methods', 'best-casino', or 'recent-winnings'
  
  // Helper function to decode HTML entities
  function decodeHtmlEntities(str) {
    if (!str) return '';
    // Replace HTML entities - must replace &amp; first to avoid double-decoding
    return str
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#x27;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');
  }

  // Parse casinos data
  var casinosDataStr = script?.getAttribute('data-casinos') || '{}';
  var customCasinos = {};
  try {
    var decodedStr = decodeHtmlEntities(casinosDataStr);
    customCasinos = JSON.parse(decodedStr);
  } catch(e) {
    console.error('Error parsing casinos data:', e);
    customCasinos = {};
  }

  // Parse best casinos data
  var bestCasinosDataStr = script?.getAttribute('data-best-casinos') || '[]';
  var bestCasinos = [];
  try {
    var decodedStr = decodeHtmlEntities(bestCasinosDataStr);
    bestCasinos = JSON.parse(decodedStr);
  } catch(e) {
    console.error('Error parsing best casinos data:', e);
    bestCasinos = [];
  }

  // Parse winnings data
  var winningsDataStr = script?.getAttribute('data-winnings') || '[]';
  var allWinnings = [];
  try {
    var decodedStr = decodeHtmlEntities(winningsDataStr);
    allWinnings = JSON.parse(decodedStr);
  } catch(e) {
    console.error('Error parsing winnings data:', e);
    allWinnings = [];
  }

  var countryFlags = {
    UK: '🇬🇧',
    DE: '🇩🇪',
    FR: '🇫🇷',
    ES: '🇪🇸',
    IT: '🇮🇹',
    PT: '🇵🇹',
    BR: '🇧🇷',
    BG: '🇧🇬',
    HU: '🇭🇺',
    FI: '🇫🇮',
    NO: '🇳🇴',
  };
  var countryFlag = countryFlags[country] || '';

  var uniqueId = 'seohqs-tabsgen-' + Math.random().toString(36).slice(2, 11);

  // Translations for all tabs
  var translations = {
    UK: {
      paymentMethods: {
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
      bestCasino: {
        title: 'Best Casino',
        subtitle: 'Top 5 best casinos with best ratings and bonuses',
        casino: 'Casino',
        rating: 'Rating',
        bonus: 'Bonus',
        minDeposit: 'Min Deposit',
        license: 'License',
        playNow: 'Play Now',
      },
      recentWinnings: {
        title: 'Recent Casino Winnings',
        subtitle: 'Latest big wins from our top casinos',
        casino: 'Casino',
        player: 'Player',
        amount: 'Amount',
        game: 'Game',
        date: 'Date',
        playNow: 'Play Now',
      },
    },
    DE: {
      paymentMethods: {
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
      bestCasino: {
        title: 'Bestes Casino',
        subtitle: 'Top 5 beste Casinos mit besten Bewertungen und Boni',
        casino: 'Casino',
        rating: 'Bewertung',
        bonus: 'Bonus',
        minDeposit: 'Mindestbetrag',
        license: 'Lizenz',
        playNow: 'Jetzt Spielen',
      },
      recentWinnings: {
        title: 'Aktuelle Casino-Gewinne',
        subtitle: 'Neueste große Gewinne aus unseren Top-Casinos',
        casino: 'Casino',
        player: 'Spieler',
        amount: 'Betrag',
        game: 'Spiel',
        date: 'Datum',
        playNow: 'Jetzt Spielen',
      },
    },
    FR: {
      paymentMethods: {
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
      bestCasino: {
        title: 'Meilleur Casino',
        subtitle: 'Top 5 meilleurs casinos avec les meilleures notes et bonus',
        casino: 'Casino',
        rating: 'Note',
        bonus: 'Bonus',
        minDeposit: 'Dépôt Min',
        license: 'Licence',
        playNow: 'Jouer Maintenant',
      },
      recentWinnings: {
        title: 'Gains Récents du Casino',
        subtitle: 'Derniers gros gains de nos meilleurs casinos',
        casino: 'Casino',
        player: 'Joueur',
        amount: 'Montant',
        game: 'Jeu',
        date: 'Date',
        playNow: 'Jouer Maintenant',
      },
    },
    ES: {
      paymentMethods: {
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
      bestCasino: {
        title: 'Mejor Casino',
        subtitle: 'Top 5 mejores casinos con mejores calificaciones y bonos',
        casino: 'Casino',
        rating: 'Calificación',
        bonus: 'Bono',
        minDeposit: 'Depósito Mín',
        license: 'Licencia',
        playNow: 'Jugar Ahora',
      },
      recentWinnings: {
        title: 'Ganancias Recientes del Casino',
        subtitle: 'Últimas grandes ganancias de nuestros mejores casinos',
        casino: 'Casino',
        player: 'Jugador',
        amount: 'Cantidad',
        game: 'Juego',
        date: 'Fecha',
        playNow: 'Jugar Ahora',
      },
    },
    IT: {
      paymentMethods: {
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
      bestCasino: {
        title: 'Miglior Casinò',
        subtitle: 'Top 5 migliori casinò con migliori valutazioni e bonus',
        casino: 'Casinò',
        rating: 'Valutazione',
        bonus: 'Bonus',
        minDeposit: 'Deposito Min',
        license: 'Licenza',
        playNow: 'Gioca Ora',
      },
      recentWinnings: {
        title: 'Vincite Recenti del Casinò',
        subtitle: 'Ultime grandi vincite dai nostri migliori casinò',
        casino: 'Casinò',
        player: 'Giocatore',
        amount: 'Importo',
        game: 'Gioco',
        date: 'Data',
        playNow: 'Gioca Ora',
      },
    },
    PT: {
      paymentMethods: {
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
      bestCasino: {
        title: 'Melhor Casino',
        subtitle: 'Top 5 melhores casinos com melhores avaliações e bônus',
        casino: 'Casino',
        rating: 'Avaliação',
        bonus: 'Bônus',
        minDeposit: 'Depósito Mín',
        license: 'Licença',
        playNow: 'Jogar Agora',
      },
      recentWinnings: {
        title: 'Ganhos Recentes do Casino',
        subtitle: 'Últimas grandes vitórias dos nossos melhores casinos',
        casino: 'Casino',
        player: 'Jogador',
        amount: 'Valor',
        game: 'Jogo',
        date: 'Data',
        playNow: 'Jogar Agora',
      },
    },
    BR: {
      paymentMethods: {
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
      bestCasino: {
        title: 'Melhor Cassino',
        subtitle: 'Top 5 melhores cassinos com melhores avaliações e bônus',
        casino: 'Cassino',
        rating: 'Avaliação',
        bonus: 'Bônus',
        minDeposit: 'Depósito Mín',
        license: 'Licença',
        playNow: 'Jogar Agora',
      },
      recentWinnings: {
        title: 'Ganhos Recentes do Cassino',
        subtitle: 'Últimas grandes vitórias dos nossos melhores cassinos',
        casino: 'Cassino',
        player: 'Jogador',
        amount: 'Valor',
        game: 'Jogo',
        date: 'Data',
        playNow: 'Jogar Agora',
      },
    },
    BG: {
      paymentMethods: {
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
      bestCasino: {
        title: 'Най-доброто Казино',
        subtitle: 'Топ 5 най-добри казина с най-добри оценки и бонуси',
        casino: 'Казино',
        rating: 'Оценка',
        bonus: 'Бонус',
        minDeposit: 'Мин. Депозит',
        license: 'Лиценз',
        playNow: 'Играй Сега',
      },
      recentWinnings: {
        title: 'Скорошни Казино Печалби',
        subtitle: 'Последни големи печалби от нашите топ казина',
        casino: 'Казино',
        player: 'Играч',
        amount: 'Сума',
        game: 'Игра',
        date: 'Дата',
        playNow: 'Играй Сега',
      },
    },
    HU: {
      paymentMethods: {
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
      bestCasino: {
        title: 'Legjobb Kaszinó',
        subtitle: 'Top 5 legjobb kaszinó a legjobb értékelésekkel és bónuszokkal',
        casino: 'Kaszinó',
        rating: 'Értékelés',
        bonus: 'Bónusz',
        minDeposit: 'Min. Befizetés',
        license: 'Licenc',
        playNow: 'Játék Most',
      },
      recentWinnings: {
        title: 'Friss Kaszinó Nyeremények',
        subtitle: 'Legújabb nagy nyeremények a legjobb kaszinóinkból',
        casino: 'Kaszinó',
        player: 'Játékos',
        amount: 'Összeg',
        game: 'Játék',
        date: 'Dátum',
        playNow: 'Játék Most',
      },
    },
    FI: {
      paymentMethods: {
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
      bestCasino: {
        title: 'Paras Kasino',
        subtitle: 'Top 5 parasta kasinoa parhaisilla arvioilla ja bonuksilla',
        casino: 'Kasino',
        rating: 'Arvio',
        bonus: 'Bonus',
        minDeposit: 'Min. Talletus',
        license: 'Lisenssi',
        playNow: 'Pelaa Nyt',
      },
      recentWinnings: {
        title: 'Viimeisimmät Kasinovoitot',
        subtitle: 'Viimeisimmät suuret voitot parhaista kasinoistamme',
        casino: 'Kasino',
        player: 'Pelaaja',
        amount: 'Summa',
        game: 'Peli',
        date: 'Päivämäärä',
        playNow: 'Pelaa Nyt',
      },
    },
    NO: {
      paymentMethods: {
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
      bestCasino: {
        title: 'Beste Casino',
        subtitle: 'Top 5 beste casinoer med beste vurderinger og bonuser',
        casino: 'Casino',
        rating: 'Vurdering',
        bonus: 'Bonus',
        minDeposit: 'Min. Innskudd',
        license: 'Lisens',
        playNow: 'Spill Nå',
      },
      recentWinnings: {
        title: 'Nylige Casino Gevinster',
        subtitle: 'Siste store gevinster fra våre beste casinoer',
        casino: 'Casino',
        player: 'Spiller',
        amount: 'Beløp',
        game: 'Spill',
        date: 'Dato',
        playNow: 'Spill Nå',
      },
    },
  };

  var t = translations[country] || translations.UK;

  var paymentMethods = [
    {
      id: 'visa',
      name: {
        UK: 'Visa', DE: 'Visa', FR: 'Visa', ES: 'Visa', IT: 'Visa', PT: 'Visa', BR: 'Visa', BG: 'Visa', HU: 'Visa', FI: 'Visa', NO: 'Visa',
      },
      icon: '💳',
      status: 'available',
      popularity: 5,
      minDeposit: '€10',
      maxDeposit: '€5,000',
      processingTime: {
        UK: 'Instant', DE: 'Sofort', FR: 'Instantané', ES: 'Instantáneo', IT: 'Istantaneo', PT: 'Instantâneo', BR: 'Instantâneo', BG: 'Моментално', HU: 'Azonnali', FI: 'Heti', NO: 'Øyeblikkelig',
      },
    },
    {
      id: 'mastercard',
      name: {
        UK: 'Mastercard', DE: 'Mastercard', FR: 'Mastercard', ES: 'Mastercard', IT: 'Mastercard', PT: 'Mastercard', BR: 'Mastercard', BG: 'Mastercard', HU: 'Mastercard', FI: 'Mastercard', NO: 'Mastercard',
      },
      icon: '💳',
      status: 'available',
      popularity: 5,
      minDeposit: '€10',
      maxDeposit: '€5,000',
      processingTime: {
        UK: 'Instant', DE: 'Sofort', FR: 'Instantané', ES: 'Instantáneo', IT: 'Istantaneo', PT: 'Instantâneo', BR: 'Instantâneo', BG: 'Моментално', HU: 'Azonnali', FI: 'Heti', NO: 'Øyeblikkelig',
      },
    },
    {
      id: 'skrill',
      name: {
        UK: 'Skrill', DE: 'Skrill', FR: 'Skrill', ES: 'Skrill', IT: 'Skrill', PT: 'Skrill', BR: 'Skrill', BG: 'Skrill', HU: 'Skrill', FI: 'Skrill', NO: 'Skrill',
      },
      icon: '💼',
      status: 'available',
      popularity: 4,
      minDeposit: '€5',
      maxDeposit: '€10,000',
      processingTime: {
        UK: 'Instant', DE: 'Sofort', FR: 'Instantané', ES: 'Instantáneo', IT: 'Istantaneo', PT: 'Instantâneo', BR: 'Instantâneo', BG: 'Моментално', HU: 'Azonnali', FI: 'Heti', NO: 'Øyeblikkelig',
      },
    },
    {
      id: 'neteller',
      name: {
        UK: 'Neteller', DE: 'Neteller', FR: 'Neteller', ES: 'Neteller', IT: 'Neteller', PT: 'Neteller', BR: 'Neteller', BG: 'Neteller', HU: 'Neteller', FI: 'Neteller', NO: 'Neteller',
      },
      icon: '💼',
      status: 'available',
      popularity: 4,
      minDeposit: '€5',
      maxDeposit: '€10,000',
      processingTime: {
        UK: 'Instant', DE: 'Sofort', FR: 'Instantané', ES: 'Instantáneo', IT: 'Istantaneo', PT: 'Instantâneo', BR: 'Instantâneo', BG: 'Моментално', HU: 'Azonnali', FI: 'Heti', NO: 'Øyeblikkelig',
      },
    },
    {
      id: 'paysafecard',
      name: {
        UK: 'Paysafecard', DE: 'Paysafecard', FR: 'Paysafecard', ES: 'Paysafecard', IT: 'Paysafecard', PT: 'Paysafecard', BR: 'Paysafecard', BG: 'Paysafecard', HU: 'Paysafecard', FI: 'Paysafecard', NO: 'Paysafecard',
      },
      icon: '🎫',
      status: 'limited',
      popularity: 3,
      minDeposit: '€10',
      maxDeposit: '€500',
      processingTime: {
        UK: 'Instant', DE: 'Sofort', FR: 'Instantané', ES: 'Instantáneo', IT: 'Istantaneo', PT: 'Instantâneo', BR: 'Instantâneo', BG: 'Моментално', HU: 'Azonnali', FI: 'Heti', NO: 'Øyeblikkelig',
      },
    },
  ];

  // Style configuration function
  function getStyleConfig(style) {
    switch(style) {
      case 'modern':
        return {
          widgetBg: 'linear-gradient(to bottom right, #faf5ff, #eff6ff, #fdf2f8)',
          widgetBgDark: 'linear-gradient(to bottom right, rgba(147, 51, 234, 0.3), rgba(59, 130, 246, 0.3), rgba(219, 39, 119, 0.3))',
          headerBg: 'linear-gradient(to right, #9333ea, #2563eb, #db2777)',
          headerText: 'white',
          tableHeaderBg: 'linear-gradient(to right, #e9d5ff, #dbeafe)',
          tableHeaderBgDark: 'linear-gradient(to right, rgba(147, 51, 234, 0.5), rgba(59, 130, 246, 0.5))',
          rowHover: 'linear-gradient(to right, #f3e8ff, #dbeafe)',
          rowHoverDark: 'linear-gradient(to right, rgba(147, 51, 234, 0.3), rgba(59, 130, 246, 0.3))',
          selectedRowBg: 'linear-gradient(to right, #dbeafe, #e9d5ff)',
          selectedRowBgDark: 'linear-gradient(to right, rgba(59, 130, 246, 0.4), rgba(147, 51, 234, 0.4))',
          borderColor: '#c084fc',
          borderColorDark: '#9333ea',
          cardBg: 'linear-gradient(to bottom right, white, #faf5ff)',
          cardBgDark: 'linear-gradient(to bottom right, #1f2937, rgba(147, 51, 234, 0.3))',
          detailsBg: 'linear-gradient(to right, #f3e8ff, #dbeafe, #fce7f3)',
          detailsBgDark: 'linear-gradient(to right, rgba(147, 51, 234, 0.4), rgba(59, 130, 246, 0.4), rgba(219, 39, 119, 0.4))',
          mobileCardBg: 'linear-gradient(to bottom right, #faf5ff, #eff6ff)',
          mobileCardBgDark: 'rgba(17, 24, 39, 0.5)',
          mobileSelectedBg: 'linear-gradient(to right, #dbeafe, #e9d5ff)',
          mobileSelectedBgDark: 'rgba(30, 58, 138, 0.2)',
          tabActiveBg: 'linear-gradient(to right, #9333ea, #2563eb)',
          tabActiveText: 'white',
          tabInactiveBg: 'transparent',
          tabInactiveText: '#6b7280',
        };
      case 'minimal':
        return {
          widgetBg: 'white',
          widgetBgDark: '#111827',
          headerBg: 'transparent',
          headerText: '#111827',
          tableHeaderBg: '#f9fafb',
          tableHeaderBgDark: '#1f2937',
          rowHover: '#f9fafb',
          rowHoverDark: '#1f2937',
          selectedRowBg: '#f3f4f6',
          selectedRowBgDark: '#1f2937',
          borderColor: '#e5e7eb',
          borderColorDark: '#374151',
          cardBg: 'white',
          cardBgDark: '#111827',
          detailsBg: '#f9fafb',
          detailsBgDark: '#1f2937',
          mobileCardBg: '#f9fafb',
          mobileCardBgDark: 'rgba(17, 24, 39, 0.5)',
          mobileSelectedBg: '#f3f4f6',
          mobileSelectedBgDark: '#1f2937',
          tabActiveBg: '#f3f4f6',
          tabActiveText: '#111827',
          tabInactiveBg: 'transparent',
          tabInactiveText: '#6b7280',
        };
      default: // classic
        return {
          widgetBg: 'white',
          widgetBgDark: '#1f2937',
          headerBg: 'transparent',
          headerText: '#111827',
          tableHeaderBg: '#f3f4f6',
          tableHeaderBgDark: '#374151',
          rowHover: '#f9fafb',
          rowHoverDark: 'rgba(31, 41, 55, 0.5)',
          selectedRowBg: '#eff6ff',
          selectedRowBgDark: 'rgba(30, 58, 138, 0.2)',
          borderColor: '#e5e7eb',
          borderColorDark: '#374151',
          cardBg: '#f9fafb',
          cardBgDark: 'rgba(17, 24, 39, 0.5)',
          detailsBg: 'linear-gradient(to right, #eff6ff, #f3e8ff)',
          detailsBgDark: 'linear-gradient(to right, rgba(30, 58, 138, 0.2), rgba(147, 51, 234, 0.2))',
          mobileCardBg: '#f9fafb',
          mobileCardBgDark: 'rgba(17, 24, 39, 0.5)',
          mobileSelectedBg: '#eff6ff',
          mobileSelectedBgDark: 'rgba(30, 58, 138, 0.2)',
          tabActiveBg: '#2563eb',
          tabActiveText: 'white',
          tabInactiveBg: 'transparent',
          tabInactiveText: '#6b7280',
        };
    }
  }

  var styleConfig = getStyleConfig(tableStyle);

  // Get top 5 payment methods by popularity and merge with custom casinos
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
      case 'available': return '#10b981';
      case 'limited': return '#eab308';
      case 'unavailable': return '#ef4444';
      default: return '#6b7280';
    }
  }

  function getStatusText(status) {
    switch (status) {
      case 'available': return t.paymentMethods.available;
      case 'limited': return t.paymentMethods.limited;
      case 'unavailable': return t.paymentMethods.unavailable;
      default: return '';
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

  function getRatingStars(rating) {
    return '⭐'.repeat(rating) + '☆'.repeat(5 - rating);
  }

  function selectRandomWinnings(winnings) {
    var shuffled = winnings.slice().sort(function() { return Math.random() - 0.5; });
    return shuffled.slice(0, 5);
  }

  function isDarkMode() {
    return typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  // Создаем стили
  var styles = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

    #${uniqueId}-widget {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 1200px;
      width: 100%;
      margin: 0 auto;
      padding: 32px;
      border-radius: 16px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      box-sizing: border-box;
    }

    #${uniqueId}-widget * {
      box-sizing: border-box;
    }

    .${uniqueId}-tabs {
      display: flex;
      justify-content: center;
      gap: 8px;
      margin-bottom: 32px;
      flex-wrap: wrap;
      background: white;
      padding: 4px;
      border-radius: 12px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    @media (prefers-color-scheme: dark) {
      .${uniqueId}-tabs {
        background: #1f2937;
      }
    }

    .${uniqueId}-tab {
      padding: 12px 24px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s;
      border: none;
      background: transparent;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .${uniqueId}-tab:hover {
      opacity: 0.8;
    }

    .${uniqueId}-tab-content {
      display: none;
    }

    .${uniqueId}-tab-content.active {
      display: block;
    }

    .${uniqueId}-header {
      text-align: center;
      margin-bottom: 32px;
      padding: 16px;
      border-radius: 12px;
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
      overflow-x: visible;
      width: 100%;
    }

    .${uniqueId}-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: auto;
      min-width: 0;
    }
    
    .${uniqueId}-th,
    .${uniqueId}-td {
      word-wrap: break-word;
      overflow-wrap: break-word;
      white-space: normal;
    }
    
    @media (max-width: 768px) {
      .${uniqueId}-table {
        font-size: 12px;
      }
      .${uniqueId}-th,
      .${uniqueId}-td {
        padding: 8px 4px;
        font-size: 11px;
      }
      .${uniqueId}-method-name {
        font-size: 12px;
      }
      #${uniqueId}-widget {
        padding: 16px;
      }
      .${uniqueId}-title {
        font-size: 24px;
      }
      .${uniqueId}-subtitle {
        font-size: 14px;
      }
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
      transition: background-color 0.2s;
    }

    .${uniqueId}-tbody .${uniqueId}-tr.selected {
      transition: background-color 0.2s;
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
      border-radius: 12px;
      display: none;
      animation: ${uniqueId}-fadeIn 0.3s ease-out;
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

    /* Mobile Card Styles */
    .${uniqueId}-mobile-cards {
      display: none;
    }

    @media (max-width: 767px) {
      .${uniqueId}-table-container {
        display: none;
      }
      .${uniqueId}-mobile-cards {
        display: block;
      }
    }

    .${uniqueId}-mobile-card {
      padding: 16px;
      border-radius: 12px;
      border: 2px solid;
      margin-bottom: 16px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .${uniqueId}-mobile-card:hover {
      opacity: 0.8;
    }

    .${uniqueId}-mobile-card.selected {
      border-width: 2px;
    }

    .${uniqueId}-mobile-card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
    }

    .${uniqueId}-mobile-card-name {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .${uniqueId}-mobile-card-icon {
      font-size: 24px;
    }

    .${uniqueId}-mobile-card-flag {
      font-size: 16px;
    }

    .${uniqueId}-mobile-card-title {
      font-weight: 700;
      font-size: 16px;
      color: #111827;
    }

    @media (prefers-color-scheme: dark) {
      .${uniqueId}-mobile-card-title {
        color: white;
      }
    }

    .${uniqueId}-mobile-card-popularity {
      margin-bottom: 12px;
    }

    .${uniqueId}-mobile-card-popularity-label {
      font-size: 12px;
      color: #6b7280;
      margin-bottom: 4px;
    }

    @media (prefers-color-scheme: dark) {
      .${uniqueId}-mobile-card-popularity-label {
        color: #9ca3af;
      }
    }

    .${uniqueId}-mobile-card-details {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      font-size: 12px;
    }

    .${uniqueId}-mobile-card-detail-item {
      display: flex;
      flex-direction: column;
    }

    .${uniqueId}-mobile-card-detail-label {
      color: #6b7280;
      margin-bottom: 4px;
    }

    @media (prefers-color-scheme: dark) {
      .${uniqueId}-mobile-card-detail-label {
        color: #9ca3af;
      }
    }

    .${uniqueId}-mobile-card-detail-value {
      font-weight: 600;
      color: #111827;
    }

    @media (prefers-color-scheme: dark) {
      .${uniqueId}-mobile-card-detail-value {
        color: white;
      }
    }

    .${uniqueId}-winning-amount {
      font-weight: bold;
      color: #10b981;
      font-size: 18px;
    }

    @media (prefers-color-scheme: dark) {
      .${uniqueId}-winning-amount {
        color: #34d399;
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
    widgetContainer.style.background = styleConfig.widgetBg;
    widgetContainer.style.border = '1px solid ' + styleConfig.borderColor;
    if (isDarkMode()) {
      widgetContainer.style.background = styleConfig.widgetBgDark;
      widgetContainer.style.borderColor = styleConfig.borderColorDark;
      widgetContainer.style.color = 'white';
    }

    // Tabs Navigation (only show if not single tab mode)
    var activeTab = singleTab || 'payment-methods';
    
    if (!singleTab) {
      var tabsContainer = document.createElement('div');
      tabsContainer.className = `${uniqueId}-tabs`;
      if (isDarkMode()) {
        tabsContainer.style.background = '#1f2937';
      }

      function createTab(id, label, icon) {
        var tab = document.createElement('button');
        tab.className = `${uniqueId}-tab`;
        tab.setAttribute('data-tab', id);
        tab.innerHTML = '<span>' + icon + '</span><span>' + label + '</span>';
        tab.style.color = id === activeTab ? styleConfig.tabActiveText : styleConfig.tabInactiveText;
        tab.style.background = id === activeTab ? styleConfig.tabActiveBg : styleConfig.tabInactiveBg;
        if (isDarkMode() && id === activeTab) {
          tab.style.background = styleConfig.tabActiveBg;
        }
        tab.addEventListener('click', function() {
          activeTab = id;
          // Update all tabs
          tabsContainer.querySelectorAll('.' + uniqueId + '-tab').forEach(function(t) {
            var tabId = t.getAttribute('data-tab');
            t.style.color = tabId === activeTab ? styleConfig.tabActiveText : styleConfig.tabInactiveText;
            t.style.background = tabId === activeTab ? styleConfig.tabActiveBg : styleConfig.tabInactiveBg;
            if (isDarkMode() && tabId === activeTab) {
              t.style.background = styleConfig.tabActiveBg;
            }
          });
          // Show/hide content
          widgetContainer.querySelectorAll('.' + uniqueId + '-tab-content').forEach(function(content) {
            content.classList.remove('active');
          });
          var content = widgetContainer.querySelector('[data-content="' + id + '"]');
          if (content) content.classList.add('active');
        });
        return tab;
      }

      tabsContainer.appendChild(createTab('payment-methods', t.paymentMethods.title, '💳'));
      tabsContainer.appendChild(createTab('best-casino', t.bestCasino.title, '🏆'));
      tabsContainer.appendChild(createTab('recent-winnings', t.recentWinnings.title, '💰'));
      
      widgetContainer.appendChild(tabsContainer);
    }

    // Payment Methods Tab Content
    if (singleTab === 'payment-methods' || !singleTab) {
      var paymentMethodsContent = createPaymentMethodsContent();
      paymentMethodsContent.setAttribute('data-content', 'payment-methods');
      paymentMethodsContent.classList.add(uniqueId + '-tab-content');
      if (singleTab === 'payment-methods' || activeTab === 'payment-methods') {
        paymentMethodsContent.classList.add('active');
      }
      widgetContainer.appendChild(paymentMethodsContent);
    }

    // Best Casino Tab Content
    if (singleTab === 'best-casino' || !singleTab) {
      var bestCasinoContent = createBestCasinoContent();
      bestCasinoContent.setAttribute('data-content', 'best-casino');
      bestCasinoContent.classList.add(uniqueId + '-tab-content');
      if (singleTab === 'best-casino' || activeTab === 'best-casino') {
        bestCasinoContent.classList.add('active');
      }
      widgetContainer.appendChild(bestCasinoContent);
    }

    // Recent Winnings Tab Content
    if (singleTab === 'recent-winnings' || !singleTab) {
      var recentWinningsContent = createRecentWinningsContent();
      recentWinningsContent.setAttribute('data-content', 'recent-winnings');
      recentWinningsContent.classList.add(uniqueId + '-tab-content');
      if (singleTab === 'recent-winnings' || activeTab === 'recent-winnings') {
        recentWinningsContent.classList.add('active');
      }
      widgetContainer.appendChild(recentWinningsContent);
    }

    // Footer
    var footer = document.createElement('div');
    footer.className = `${uniqueId}-footer`;
    footer.textContent = 'Verified by SEOHQS';
    widgetContainer.appendChild(footer);

    container.innerHTML = '';
    container.appendChild(widgetContainer);
  }

  function createPaymentMethodsContent() {
    var content = document.createElement('div');
    
    // Header
    var header = document.createElement('div');
    header.className = `${uniqueId}-header`;
    if (tableStyle === 'modern') {
      header.style.background = styleConfig.headerBg;
      header.style.color = styleConfig.headerText;
    }
    var title = document.createElement('h2');
    title.className = `${uniqueId}-title`;
    title.textContent = t.paymentMethods.title;
    var subtitle = document.createElement('p');
    subtitle.className = `${uniqueId}-subtitle`;
    subtitle.textContent = t.paymentMethods.subtitle;
    header.appendChild(title);
    header.appendChild(subtitle);
    content.appendChild(header);

    // Table (same as before, but simplified for brevity)
    var tableContainer = document.createElement('div');
    tableContainer.className = `${uniqueId}-table-container`;
    var table = document.createElement('table');
    table.className = `${uniqueId}-table`;

    var thead = document.createElement('thead');
    thead.className = `${uniqueId}-thead`;
    thead.style.background = styleConfig.tableHeaderBg;
    if (isDarkMode()) {
      thead.style.background = styleConfig.tableHeaderBgDark;
    }
    var headerRow = document.createElement('tr');
    var headers = [t.paymentMethods.method, t.paymentMethods.status, t.paymentMethods.popularity, t.paymentMethods.minDeposit, t.paymentMethods.maxDeposit, t.paymentMethods.processingTime];
    headers.forEach(function(headerText) {
      var th = document.createElement('th');
      th.className = `${uniqueId}-th ${uniqueId}-th-center`;
      th.textContent = headerText;
      th.style.color = isDarkMode() ? 'white' : '#111827';
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    var tbody = document.createElement('tbody');
    tbody.className = `${uniqueId}-tbody`;
    var selectedMethod = null;
    
    var detailsDiv = document.createElement('div');
    detailsDiv.className = `${uniqueId}-details`;
    detailsDiv.style.background = styleConfig.detailsBg;
    detailsDiv.style.border = '1px solid ' + styleConfig.borderColor;
    if (isDarkMode()) {
      detailsDiv.style.background = styleConfig.detailsBgDark;
      detailsDiv.style.borderColor = styleConfig.borderColorDark;
    }

    topMethods.forEach(function(method) {
      var row = document.createElement('tr');
      row.className = `${uniqueId}-tr`;
      row.setAttribute('data-method-id', method.id);
      
      row.addEventListener('click', function() {
        var wasSelected = selectedMethod === method.id;
        if (selectedMethod) {
          var prevRow = tbody.querySelector('[data-method-id="' + selectedMethod + '"]');
          if (prevRow) {
            prevRow.classList.remove('selected');
            prevRow.style.background = '';
          }
          detailsDiv.classList.remove('show');
        }
        if (!wasSelected) {
          selectedMethod = method.id;
          row.classList.add('selected');
          row.style.background = styleConfig.selectedRowBg;
          if (isDarkMode()) {
            row.style.background = styleConfig.selectedRowBgDark;
          }
          detailsDiv.classList.add('show');
        } else {
          selectedMethod = null;
          row.style.background = '';
        }
      });

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
      var processingTimeText = typeof method.processingTime === 'object' 
        ? (method.processingTime[country] || '-')
        : (method.processingTime || '-');
      tdProcessingTime.textContent = processingTimeText;
      row.appendChild(tdProcessingTime);

      tbody.appendChild(row);
    });

    table.appendChild(tbody);
    tableContainer.appendChild(table);
    content.appendChild(tableContainer);
    content.appendChild(detailsDiv);

    return content;
  }

  function createBestCasinoContent() {
    var content = document.createElement('div');
    
    // Header
    var header = document.createElement('div');
    header.className = `${uniqueId}-header`;
    if (tableStyle === 'modern') {
      header.style.background = styleConfig.headerBg;
      header.style.color = styleConfig.headerText;
    }
    var title = document.createElement('h2');
    title.className = `${uniqueId}-title`;
    title.textContent = t.bestCasino.title;
    var subtitle = document.createElement('p');
    subtitle.className = `${uniqueId}-subtitle`;
    subtitle.textContent = t.bestCasino.subtitle;
    header.appendChild(title);
    header.appendChild(subtitle);
    content.appendChild(header);

    // Table
    var tableContainer = document.createElement('div');
    tableContainer.className = `${uniqueId}-table-container`;
    var table = document.createElement('table');
    table.className = `${uniqueId}-table`;

    var thead = document.createElement('thead');
    thead.className = `${uniqueId}-thead`;
    thead.style.background = styleConfig.tableHeaderBg;
    if (isDarkMode()) {
      thead.style.background = styleConfig.tableHeaderBgDark;
    }
    var headerRow = document.createElement('tr');
    var headers = [t.bestCasino.casino, t.bestCasino.rating, t.bestCasino.bonus, t.bestCasino.minDeposit, t.bestCasino.license];
    headers.forEach(function(headerText) {
      var th = document.createElement('th');
      th.className = `${uniqueId}-th ${uniqueId}-th-center`;
      th.textContent = headerText;
      th.style.color = isDarkMode() ? 'white' : '#111827';
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    var tbody = document.createElement('tbody');
    tbody.className = `${uniqueId}-tbody`;
    var selectedCasino = null;

    bestCasinos.slice(0, 5).forEach(function(casino, index) {
      var row = document.createElement('tr');
      row.className = `${uniqueId}-tr`;
      row.setAttribute('data-casino-index', index);
      
      row.addEventListener('click', function() {
        var wasSelected = selectedCasino === index;
        if (selectedCasino !== null) {
          var prevRow = tbody.querySelector('[data-casino-index="' + selectedCasino + '"]');
          if (prevRow) {
            prevRow.classList.remove('selected');
            prevRow.style.background = '';
          }
        }
        if (!wasSelected) {
          selectedCasino = index;
          row.classList.add('selected');
          row.style.background = styleConfig.selectedRowBg;
          if (isDarkMode()) {
            row.style.background = styleConfig.selectedRowBgDark;
          }
        } else {
          selectedCasino = null;
          row.style.background = '';
        }
      });

      // Casino name
      var tdCasino = document.createElement('td');
      tdCasino.className = `${uniqueId}-td`;
      var casinoCell = document.createElement('div');
      casinoCell.className = `${uniqueId}-method-cell`;
      var icon = document.createElement('span');
      icon.className = `${uniqueId}-method-icon`;
      icon.textContent = '🎲';
      var name = document.createElement('span');
      name.className = `${uniqueId}-method-name`;
      name.textContent = casino.name;
      casinoCell.appendChild(icon);
      casinoCell.appendChild(name);
      tdCasino.appendChild(casinoCell);
      row.appendChild(tdCasino);

      // Rating
      var tdRating = document.createElement('td');
      tdRating.className = `${uniqueId}-td ${uniqueId}-td-center`;
      var ratingSpan = document.createElement('span');
      ratingSpan.className = `${uniqueId}-popularity`;
      ratingSpan.textContent = getRatingStars(casino.rating || 5);
      tdRating.appendChild(ratingSpan);
      row.appendChild(tdRating);

      // Bonus
      var tdBonus = document.createElement('td');
      tdBonus.className = `${uniqueId}-td ${uniqueId}-td-center`;
      tdBonus.textContent = casino.bonus || '-';
      row.appendChild(tdBonus);

      // Min Deposit
      var tdMinDeposit = document.createElement('td');
      tdMinDeposit.className = `${uniqueId}-td ${uniqueId}-td-center`;
      tdMinDeposit.textContent = casino.minDeposit || '-';
      row.appendChild(tdMinDeposit);

      // License
      var tdLicense = document.createElement('td');
      tdLicense.className = `${uniqueId}-td ${uniqueId}-td-center`;
      tdLicense.textContent = casino.license || '-';
      row.appendChild(tdLicense);

      tbody.appendChild(row);
    });

    table.appendChild(tbody);
    tableContainer.appendChild(table);
    content.appendChild(tableContainer);

    return content;
  }

  function createRecentWinningsContent() {
    var content = document.createElement('div');
    
    // Header
    var header = document.createElement('div');
    header.className = `${uniqueId}-header`;
    if (tableStyle === 'modern') {
      header.style.background = styleConfig.headerBg;
      header.style.color = styleConfig.headerText;
    }
    var title = document.createElement('h2');
    title.className = `${uniqueId}-title`;
    title.textContent = t.recentWinnings.title;
    var subtitle = document.createElement('p');
    subtitle.className = `${uniqueId}-subtitle`;
    subtitle.textContent = t.recentWinnings.subtitle;
    header.appendChild(title);
    header.appendChild(subtitle);
    content.appendChild(header);

    // Displayed winnings (5 random)
    var displayedWinnings = selectRandomWinnings(allWinnings);
    var selectedWinning = null;

    // Table
    var tableContainer = document.createElement('div');
    tableContainer.className = `${uniqueId}-table-container`;
    var table = document.createElement('table');
    table.className = `${uniqueId}-table`;

    var thead = document.createElement('thead');
    thead.className = `${uniqueId}-thead`;
    thead.style.background = styleConfig.tableHeaderBg;
    if (isDarkMode()) {
      thead.style.background = styleConfig.tableHeaderBgDark;
    }
    var headerRow = document.createElement('tr');
    var headers = [t.recentWinnings.casino, t.recentWinnings.player, t.recentWinnings.amount, t.recentWinnings.game, t.recentWinnings.date];
    headers.forEach(function(headerText) {
      var th = document.createElement('th');
      th.className = `${uniqueId}-th ${uniqueId}-th-center`;
      th.textContent = headerText;
      th.style.color = isDarkMode() ? 'white' : '#111827';
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    var tbody = document.createElement('tbody');
    tbody.className = `${uniqueId}-tbody`;

    displayedWinnings.forEach(function(winning, index) {
      var row = document.createElement('tr');
      row.className = `${uniqueId}-tr`;
      row.setAttribute('data-winning-index', index);
      
      row.addEventListener('click', function() {
        var wasSelected = selectedWinning === index;
        if (selectedWinning !== null) {
          var prevRow = tbody.querySelector('[data-winning-index="' + selectedWinning + '"]');
          if (prevRow) {
            prevRow.classList.remove('selected');
            prevRow.style.background = '';
          }
        }
        if (!wasSelected) {
          selectedWinning = index;
          row.classList.add('selected');
          row.style.background = styleConfig.selectedRowBg;
          if (isDarkMode()) {
            row.style.background = styleConfig.selectedRowBgDark;
          }
        } else {
          selectedWinning = null;
          row.style.background = '';
        }
      });

      // Casino
      var tdCasino = document.createElement('td');
      tdCasino.className = `${uniqueId}-td`;
      var casinoCell = document.createElement('div');
      casinoCell.className = `${uniqueId}-method-cell`;
      var icon = document.createElement('span');
      icon.className = `${uniqueId}-method-icon`;
      icon.textContent = '🎲';
      var name = document.createElement('span');
      name.className = `${uniqueId}-method-name`;
      name.textContent = winning.casino;
      casinoCell.appendChild(icon);
      casinoCell.appendChild(name);
      tdCasino.appendChild(casinoCell);
      row.appendChild(tdCasino);

      // Player
      var tdPlayer = document.createElement('td');
      tdPlayer.className = `${uniqueId}-td ${uniqueId}-td-center`;
      tdPlayer.textContent = winning.player;
      row.appendChild(tdPlayer);

      // Amount
      var tdAmount = document.createElement('td');
      tdAmount.className = `${uniqueId}-td ${uniqueId}-td-center`;
      var amountSpan = document.createElement('span');
      amountSpan.className = `${uniqueId}-winning-amount`;
      amountSpan.textContent = winning.amount;
      tdAmount.appendChild(amountSpan);
      row.appendChild(tdAmount);

      // Game
      var tdGame = document.createElement('td');
      tdGame.className = `${uniqueId}-td ${uniqueId}-td-center`;
      tdGame.textContent = winning.game;
      row.appendChild(tdGame);

      // Date
      var tdDate = document.createElement('td');
      tdDate.className = `${uniqueId}-td ${uniqueId}-td-center`;
      tdDate.textContent = winning.date;
      row.appendChild(tdDate);

      tbody.appendChild(row);
    });

    table.appendChild(tbody);
    tableContainer.appendChild(table);
    content.appendChild(tableContainer);

    // Auto-update winnings every 30 seconds
    if (allWinnings.length > 5) {
      setInterval(function() {
        displayedWinnings = selectRandomWinnings(allWinnings);
        // Re-render table
        tbody.innerHTML = '';
        displayedWinnings.forEach(function(winning, index) {
          var row = document.createElement('tr');
          row.className = `${uniqueId}-tr`;
          row.setAttribute('data-winning-index', index);
          
          row.addEventListener('click', function() {
            var wasSelected = selectedWinning === index;
            if (selectedWinning !== null) {
              var prevRow = tbody.querySelector('[data-winning-index="' + selectedWinning + '"]');
              if (prevRow) {
                prevRow.classList.remove('selected');
                prevRow.style.background = '';
              }
            }
            if (!wasSelected) {
              selectedWinning = index;
              row.classList.add('selected');
              row.style.background = styleConfig.selectedRowBg;
              if (isDarkMode()) {
                row.style.background = styleConfig.selectedRowBgDark;
              }
            } else {
              selectedWinning = null;
              row.style.background = '';
            }
          });

          var tdCasino = document.createElement('td');
          tdCasino.className = `${uniqueId}-td`;
          var casinoCell = document.createElement('div');
          casinoCell.className = `${uniqueId}-method-cell`;
          var icon = document.createElement('span');
          icon.className = `${uniqueId}-method-icon`;
          icon.textContent = '🎲';
          var name = document.createElement('span');
          name.className = `${uniqueId}-method-name`;
          name.textContent = winning.casino;
          casinoCell.appendChild(icon);
          casinoCell.appendChild(name);
          tdCasino.appendChild(casinoCell);
          row.appendChild(tdCasino);

          var tdPlayer = document.createElement('td');
          tdPlayer.className = `${uniqueId}-td ${uniqueId}-td-center`;
          tdPlayer.textContent = winning.player;
          row.appendChild(tdPlayer);

          var tdAmount = document.createElement('td');
          tdAmount.className = `${uniqueId}-td ${uniqueId}-td-center`;
          var amountSpan = document.createElement('span');
          amountSpan.className = `${uniqueId}-winning-amount`;
          amountSpan.textContent = winning.amount;
          tdAmount.appendChild(amountSpan);
          row.appendChild(tdAmount);

          var tdGame = document.createElement('td');
          tdGame.className = `${uniqueId}-td ${uniqueId}-td-center`;
          tdGame.textContent = winning.game;
          row.appendChild(tdGame);

          var tdDate = document.createElement('td');
          tdDate.className = `${uniqueId}-td ${uniqueId}-td-center`;
          tdDate.textContent = winning.date;
          row.appendChild(tdDate);

          tbody.appendChild(row);
        });
        selectedWinning = null;
      }, 30000);
    }

    return content;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWidget);
  } else {
    initWidget();
  }
})();
