(function() {
  'use strict';

  // Получаем параметры из data-атрибутов скрипта
  var script = document.currentScript;
  // If currentScript is not available (e.g., async loading), find the script by data attributes
  if (!script) {
    // Try to find script with data-tab attribute first (more specific)
    var scriptsWithTab = document.querySelectorAll('script[data-tab][src*="tabsgen.js"]');
    if (scriptsWithTab.length > 0) {
      // Get the script that was most recently added (last in list)
      script = scriptsWithTab[scriptsWithTab.length - 1];
    } else {
      // Fallback to scripts with data-country and tabsgen.js src
      var scripts = document.querySelectorAll('script[data-country][src*="tabsgen.js"]');
      if (scripts.length > 0) {
        script = scripts[scripts.length - 1]; // Get the last matching script
      } else {
        // Last fallback: any script with data-country
        scripts = document.querySelectorAll('script[data-country]');
        script = scripts[scripts.length - 1];
      }
    }
  }
  var country = script?.getAttribute('data-country') || 'UK';
  function normalizeStyle(style) {
    var s = (style || '').toString().trim().toLowerCase();
    if (s === 'dark' || s === 'light' || s === 'casino') return s;
    // Legacy values
    if (s === 'classic') return 'dark';
    if (s === 'modern') return 'light';
    if (s === 'minimal') return 'casino';
    // Default: light (white-site friendly)
    return 'light';
  }
  var tableStyle = normalizeStyle(script?.getAttribute('data-style') || 'light');
  var singleTab = script?.getAttribute('data-tab'); // 'payment-methods', 'best-casino', or 'recent-winnings'
  // Normalize: empty string should be treated as null
  if (singleTab === '' || singleTab === null || singleTab === undefined) {
    singleTab = null;
  }
  
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

  // Small UI strings (mobile hints)
  var uiTranslations = {
    UK: {
      tapToViewCasinos: 'Tap to view casinos',
      tapForDetails: 'Tap for details',
      tapToCollapse: 'Tap to collapse',
    },
    DE: {
      tapToViewCasinos: 'Tippen, um Casinos zu sehen',
      tapForDetails: 'Tippen für Details',
      tapToCollapse: 'Tippen zum Einklappen',
    },
    FR: {
      tapToViewCasinos: 'Appuyez pour voir les casinos',
      tapForDetails: 'Appuyez pour les détails',
      tapToCollapse: 'Appuyez pour réduire',
    },
    ES: {
      tapToViewCasinos: 'Toca para ver casinos',
      tapForDetails: 'Toca para ver detalles',
      tapToCollapse: 'Toca para contraer',
    },
    IT: {
      tapToViewCasinos: 'Tocca per vedere i casinò',
      tapForDetails: 'Tocca per i dettagli',
      tapToCollapse: 'Tocca per chiudere',
    },
    PT: {
      tapToViewCasinos: 'Toque para ver casinos',
      tapForDetails: 'Toque para ver detalhes',
      tapToCollapse: 'Toque para recolher',
    },
    BR: {
      tapToViewCasinos: 'Toque para ver cassinos',
      tapForDetails: 'Toque para ver detalhes',
      tapToCollapse: 'Toque para recolher',
    },
    BG: {
      tapToViewCasinos: 'Докоснете, за да видите казина',
      tapForDetails: 'Докоснете за детайли',
      tapToCollapse: 'Докоснете, за да сгънете',
    },
    HU: {
      tapToViewCasinos: 'Koppints a kaszinókért',
      tapForDetails: 'Koppints a részletekért',
      tapToCollapse: 'Koppints az összecsukáshoz',
    },
    FI: {
      tapToViewCasinos: 'Napauta nähdäksesi kasinot',
      tapForDetails: 'Napauta nähdäksesi tiedot',
      tapToCollapse: 'Napauta sulkeaksesi',
    },
    NO: {
      tapToViewCasinos: 'Trykk for å se casinoer',
      tapForDetails: 'Trykk for detaljer',
      tapToCollapse: 'Trykk for å skjule',
    },
  };

  var ui = uiTranslations[country] || uiTranslations.UK;

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
      case 'light':
        return {
          widgetBg: '#ffffff',
          widgetBgDark: '#1f2937',
          headerBg: 'transparent',
          headerText: '#000000',
          tableHeaderBg: '#f8fafc',
          tableHeaderBgDark: 'linear-gradient(to right, rgba(59, 130, 246, 0.2), rgba(147, 51, 234, 0.2))',
          rowHover: '#f1f5f9',
          rowHoverDark: 'linear-gradient(to right, rgba(59, 130, 246, 0.15), rgba(147, 51, 234, 0.15))',
          selectedRowBg: '#e2e8f0',
          selectedRowBgDark: 'linear-gradient(to right, rgba(59, 130, 246, 0.25), rgba(147, 51, 234, 0.25))',
          borderColor: '#cbd5e1',
          borderColorDark: '#4b5563',
          cardBg: '#ffffff',
          cardBgDark: '#1f2937',
          detailsBg: '#f8fafc',
          detailsBgDark: 'linear-gradient(to right, rgba(59, 130, 246, 0.2), rgba(147, 51, 234, 0.2), rgba(239, 68, 68, 0.2))',
          mobileCardBg: '#ffffff',
          mobileCardBgDark: 'rgba(17, 24, 39, 0.5)',
          mobileSelectedBg: '#e2e8f0',
          mobileSelectedBgDark: 'rgba(30, 58, 138, 0.2)',
          tabActiveBg: 'linear-gradient(to right, #3b82f6, #8b5cf6)',
          tabActiveText: 'white',
          tabInactiveBg: 'transparent',
          tabInactiveText: '#475569',
        };
      case 'casino':
        return {
          widgetBg: '#ffffff',
          widgetBgDark: 'linear-gradient(135deg, #070A16, #1A0636, #062A4B)',
          headerBg: 'transparent',
          headerText: '#ffffff',
          tableHeaderBg: '#f8fafc',
          tableHeaderBgDark: 'linear-gradient(to right, rgba(245, 158, 11, 0.15), rgba(236, 72, 153, 0.15), rgba(34, 211, 238, 0.15))',
          rowHover: '#f1f5f9',
          rowHoverDark: 'rgba(255, 255, 255, 0.05)',
          selectedRowBg: '#e2e8f0',
          selectedRowBgDark: 'linear-gradient(to right, rgba(245, 158, 11, 0.10), rgba(236, 72, 153, 0.10), rgba(34, 211, 238, 0.10))',
          borderColor: '#cbd5e1',
          borderColorDark: 'rgba(255, 255, 255, 0.10)',
          cardBg: '#ffffff',
          cardBgDark: 'rgba(0, 0, 0, 0.25)',
          detailsBg: '#f8fafc',
          detailsBgDark: 'linear-gradient(to right, rgba(0, 0, 0, 0.40), rgba(88, 28, 135, 0.25), rgba(0, 0, 0, 0.40))',
          mobileCardBg: '#ffffff',
          mobileCardBgDark: 'rgba(0, 0, 0, 0.25)',
          mobileSelectedBg: '#e2e8f0',
          mobileSelectedBgDark: 'linear-gradient(to right, rgba(245, 158, 11, 0.10), rgba(236, 72, 153, 0.10), rgba(34, 211, 238, 0.10))',
          tabActiveBg: 'linear-gradient(to right, #f59e0b, #ec4899, #22d3ee)',
          tabActiveText: '#0f172a',
          tabInactiveBg: 'transparent',
          tabInactiveText: 'rgba(255, 255, 255, 0.70)',
        };
      case 'dark':
      default:
        return {
          widgetBg: '#ffffff',
          widgetBgDark: 'linear-gradient(135deg, #020617, #0f172a, #020617)',
          headerBg: 'transparent',
          headerText: '#ffffff',
          tableHeaderBg: '#f8fafc',
          tableHeaderBgDark: 'rgba(15, 23, 42, 0.70)',
          rowHover: '#f1f5f9',
          rowHoverDark: 'rgba(255, 255, 255, 0.05)',
          selectedRowBg: '#e2e8f0',
          selectedRowBgDark: 'rgba(59, 130, 246, 0.10)',
          borderColor: '#cbd5e1',
          borderColorDark: 'rgba(51, 65, 85, 0.50)',
          cardBg: '#ffffff',
          cardBgDark: 'rgba(15, 23, 42, 0.40)',
          detailsBg: '#f8fafc',
          detailsBgDark: 'linear-gradient(to right, rgba(15, 23, 42, 0.70), rgba(2, 6, 23, 0.70))',
          mobileCardBg: '#ffffff',
          mobileCardBgDark: 'rgba(15, 23, 42, 0.40)',
          mobileSelectedBg: '#e2e8f0',
          mobileSelectedBgDark: 'rgba(59, 130, 246, 0.10)',
          tabActiveBg: 'linear-gradient(to right, #3b82f6, #0ea5e9)',
          tabActiveText: 'white',
          tabInactiveBg: 'transparent',
          tabInactiveText: 'rgba(255, 255, 255, 0.70)',
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
    // Style controls palette (fixed), not the host website theme.
    return tableStyle !== 'light';
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
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.1);
      box-sizing: border-box;
    }

    #${uniqueId}-widget * {
      box-sizing: border-box;
    }

    .${uniqueId}-tabs {
      display: flex;
      justify-content: center;
      gap: 4px;
      margin-bottom: 24px;
      flex-wrap: wrap;
      background: ${isDarkMode() ? '#1f2937' : '#f8fafc'};
      padding: 4px;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      border: 1px solid ${isDarkMode() ? '#4b5563' : '#e2e8f0'};
      width: 100%;
      box-sizing: border-box;
    }
    
    @media (max-width: 768px) {
      .${uniqueId}-tabs {
        gap: 2px;
        margin-bottom: 16px;
        padding: 2px;
      }
    }

    .${uniqueId}-tab {
      padding: 10px 16px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s;
      border: none;
      background: transparent;
      display: flex;
      align-items: center;
      gap: 6px;
      flex: 1 1 auto;
      min-width: 0;
      justify-content: center;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    @media (max-width: 768px) {
      .${uniqueId}-tab {
        padding: 8px 12px;
        font-size: 12px;
        gap: 4px;
        flex: 1 1 33.333%;
        min-width: 0;
      }
      
      .${uniqueId}-tab span:first-child {
        font-size: 16px;
        flex-shrink: 0;
      }
      
      .${uniqueId}-tab span:last-child {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }
    
    @media (max-width: 480px) {
      .${uniqueId}-tab {
        padding: 6px 8px;
        font-size: 11px;
        gap: 3px;
      }
      
      .${uniqueId}-tab span:first-child {
        font-size: 14px;
      }
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
      color: ${isDarkMode() ? '#9ca3af' : '#374151'};
      margin: 0;
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
        padding: 12px;
      }
      .${uniqueId}-title {
        font-size: 20px;
        line-height: 1.2;
      }
      .${uniqueId}-subtitle {
        font-size: 13px;
        line-height: 1.4;
      }
      .${uniqueId}-header {
        padding: 12px;
        margin-bottom: 20px;
      }
    }
    
    @media (max-width: 480px) {
      #${uniqueId}-widget {
        padding: 8px;
      }
      .${uniqueId}-title {
        font-size: 18px;
      }
      .${uniqueId}-subtitle {
        font-size: 12px;
      }
      .${uniqueId}-header {
        padding: 8px;
        margin-bottom: 16px;
      }
    }

    .${uniqueId}-thead {
      border-bottom: 2px solid ${isDarkMode() ? '#4b5563' : '#d1d5db'};
    }

    .${uniqueId}-th {
      text-align: left;
      padding: 16px;
      font-weight: 700;
      color: ${isDarkMode() ? 'white' : '#000000'};
    }

    .${uniqueId}-th-center {
      text-align: center;
    }

    .${uniqueId}-tbody .${uniqueId}-tr {
      border-bottom: 1px solid ${isDarkMode() ? '#374151' : '#e5e7eb'};
      transition: background-color 0.2s;
      cursor: pointer;
    }

    .${uniqueId}-tbody .${uniqueId}-tr:hover {
      transition: background-color 0.2s;
      cursor: pointer;
    }

    .${uniqueId}-tbody .${uniqueId}-tr.selected {
      transition: background-color 0.2s;
    }

    .${uniqueId}-td {
      padding: 16px;
      color: ${isDarkMode() ? 'white' : '#000000'};
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
      color: ${isDarkMode() ? 'white' : '#000000'};
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
      color: ${isDarkMode() ? 'white' : '#000000'};
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
      color: ${isDarkMode() ? '#9ca3af' : '#6b7280'};
      margin-bottom: 4px;
    }

    .${uniqueId}-details-value {
      font-size: 18px;
      font-weight: 600;
      color: ${isDarkMode() ? 'white' : '#000000'};
    }

    .${uniqueId}-casinos-section {
      margin-top: 24px;
      padding-top: 24px;
      border-top: 1px solid ${isDarkMode() ? '#1e40af' : '#bfdbfe'};
      display: none;
    }

    .${uniqueId}-casinos-title {
      font-size: 18px;
      font-weight: 700;
      margin: 0 0 16px 0;
      color: ${isDarkMode() ? 'white' : '#000000'};
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
      background: ${isDarkMode() ? 'rgba(255,255,255,0.05)' : 'white'};
      border-radius: 8px;
      border: 2px solid ${isDarkMode() ? 'rgba(255,255,255,0.10)' : '#e5e7eb'};
      transition: all 0.2s;
      text-decoration: none;
      display: block;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    .${uniqueId}-casino-card:hover {
      border-color: ${isDarkMode() ? '#60a5fa' : '#2563eb'};
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      transform: translateY(-2px);
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
      color: ${isDarkMode() ? 'white' : '#000000'};
      transition: color 0.2s;
    }

    .${uniqueId}-casino-card:hover .${uniqueId}-casino-name {
      color: ${isDarkMode() ? '#60a5fa' : '#2563eb'};
    }

    .${uniqueId}-casino-icon {
      font-size: 20px;
    }

    .${uniqueId}-casino-link {
      font-size: 14px;
      color: ${isDarkMode() ? '#60a5fa' : '#2563eb'};
      font-weight: 500;
    }

    .${uniqueId}-footer {
        margin-top: 24px;
        text-align: center;
        font-size: 10px;
        color: ${isDarkMode() ? '#9ca3af' : '#6b7280'};
        text-transform: uppercase;
        letter-spacing: 0.1em;
        font-weight: 600;
    }

    /* Mobile Card Styles (mobile-first, created by script) */
    .${uniqueId}-mobile-cards {
      display: none;
      width: 100%;
    }

    @media (max-width: 767px) {
      #${uniqueId}-widget {
        padding: 12px;
        border-radius: 14px;
      }
      .${uniqueId}-header {
        margin-bottom: 14px;
        padding: 10px;
      }
      .${uniqueId}-table-container {
        display: none;
      }
      .${uniqueId}-mobile-cards {
        display: block;
      }
      .${uniqueId}-details {
        display: none !important; /* desktop expander is irrelevant on mobile */
      }
    }

    @media (max-width: 480px) {
      #${uniqueId}-widget {
        padding: 10px;
      }
      .${uniqueId}-footer {
        margin-top: 16px;
      }
    }

    .${uniqueId}-mobile-card {
      padding: 14px;
      border-radius: 14px;
      border: 1px solid;
      margin-bottom: 12px;
      cursor: pointer;
      transition: transform 0.12s ease, box-shadow 0.12s ease, border-color 0.12s ease, background 0.12s ease;
      touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
      box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    }

    .${uniqueId}-mobile-card:active {
      transform: scale(0.99);
    }

    .${uniqueId}-mobile-card-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 10px;
    }

    .${uniqueId}-mobile-card-name {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
      flex: 1;
    }

    .${uniqueId}-mobile-card-icon {
      font-size: 22px;
      flex-shrink: 0;
    }

    .${uniqueId}-mobile-card-flag {
      font-size: 16px;
      flex-shrink: 0;
    }

    .${uniqueId}-mobile-card-title {
      font-weight: 800;
      font-size: 15px;
      color: #000000;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    @media (prefers-color-scheme: dark) {
      .${uniqueId}-mobile-card-title {
        color: white;
      }
    }

    .${uniqueId}-mobile-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 10px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 700;
      border: 1px solid rgba(0,0,0,0.08);
      white-space: nowrap;
    }

    @media (prefers-color-scheme: dark) {
      .${uniqueId}-mobile-chip {
        border-color: rgba(255,255,255,0.12);
      }
    }

    .${uniqueId}-mobile-card-subgrid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-top: 10px;
    }

    @media (max-width: 360px) {
      .${uniqueId}-mobile-card-subgrid {
        grid-template-columns: 1fr;
      }
    }

    .${uniqueId}-mobile-kv {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      padding: 10px 12px;
      border-radius: 12px;
      background: rgba(255,255,255,0.55);
      border: 1px solid rgba(0,0,0,0.06);
    }

    @media (prefers-color-scheme: dark) {
      .${uniqueId}-mobile-kv {
        background: rgba(17,24,39,0.35);
        border-color: rgba(255,255,255,0.08);
      }
    }

    .${uniqueId}-mobile-k {
      font-size: 11px;
      color: #6b7280;
      font-weight: 600;
      white-space: nowrap;
    }

    @media (prefers-color-scheme: dark) {
      .${uniqueId}-mobile-k {
        color: #9ca3af;
      }
    }

    .${uniqueId}-mobile-v {
      font-size: 12px;
      font-weight: 800;
      color: #111827;
      text-align: right;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    @media (prefers-color-scheme: dark) {
      .${uniqueId}-mobile-v {
        color: white;
      }
    }

    .${uniqueId}-mobile-hint {
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px solid rgba(0,0,0,0.08);
      font-size: 11px;
      color: #6b7280;
      text-align: center;
      font-weight: 600;
    }

    @media (prefers-color-scheme: dark) {
      .${uniqueId}-mobile-hint {
        border-top-color: rgba(255,255,255,0.12);
        color: #9ca3af;
      }
    }

    .${uniqueId}-mobile-expand {
      display: none;
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px dashed rgba(0,0,0,0.12);
    }

    @media (prefers-color-scheme: dark) {
      .${uniqueId}-mobile-expand {
        border-top-color: rgba(255,255,255,0.18);
      }
    }

    .${uniqueId}-mobile-expand.show {
      display: block;
    }

    .${uniqueId}-mobile-links {
      margin-top: 10px;
      display: grid;
      gap: 8px;
    }

    .${uniqueId}-mobile-link {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding: 12px 12px;
      border-radius: 12px;
      border: 1px solid rgba(0,0,0,0.08);
      text-decoration: none;
      color: inherit;
      background: rgba(255,255,255,0.6);
    }

    @media (prefers-color-scheme: dark) {
      .${uniqueId}-mobile-link {
        border-color: rgba(255,255,255,0.12);
        background: rgba(17,24,39,0.35);
      }
    }

    .${uniqueId}-mobile-link strong {
      font-size: 13px;
      font-weight: 800;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .${uniqueId}-mobile-link span {
      font-size: 12px;
      font-weight: 800;
      color: #2563eb;
      white-space: nowrap;
      flex-shrink: 0;
    }

    @media (prefers-color-scheme: dark) {
      .${uniqueId}-mobile-link span {
        color: #60a5fa;
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


  function createPaymentMethodsContent() {
    var content = document.createElement('div');
    
    // Header
    var header = document.createElement('div');
    header.className = `${uniqueId}-header`;
    if (tableStyle === 'light') {
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

    // Mobile cards (rendered by script; visible only on small screens via CSS)
    var mobileCards = document.createElement('div');
    mobileCards.className = `${uniqueId}-mobile-cards`;

    var selectedMobileMethod = null;

    function renderPaymentMethodsMobileCards() {
      mobileCards.innerHTML = '';

      topMethods.forEach(function(method) {
        var card = document.createElement('div');
        card.className = `${uniqueId}-mobile-card`;
        card.setAttribute('data-method-id', method.id);

        // Base styling from styleConfig
        card.style.background = isDarkMode() ? styleConfig.mobileCardBgDark : styleConfig.mobileCardBg;
        card.style.borderColor = isDarkMode() ? styleConfig.borderColorDark : styleConfig.borderColor;

        var headerRow = document.createElement('div');
        headerRow.className = `${uniqueId}-mobile-card-header`;

        var left = document.createElement('div');
        left.className = `${uniqueId}-mobile-card-name`;

        var iconEl = document.createElement('span');
        iconEl.className = `${uniqueId}-mobile-card-icon`;
        iconEl.textContent = method.icon;
        left.appendChild(iconEl);

        if (countryFlag) {
          var flagEl = document.createElement('span');
          flagEl.className = `${uniqueId}-mobile-card-flag`;
          flagEl.textContent = countryFlag;
          left.appendChild(flagEl);
        }

        var titleEl = document.createElement('span');
        titleEl.className = `${uniqueId}-mobile-card-title`;
        titleEl.textContent = method.name[country] || method.name.UK;
        left.appendChild(titleEl);

        headerRow.appendChild(left);

        var statusBadge = document.createElement('span');
        statusBadge.className = `${uniqueId}-mobile-chip`;
        statusBadge.style.backgroundColor = getStatusColor(method.status);
        statusBadge.style.color = 'white';
        statusBadge.textContent = getStatusText(method.status);
        headerRow.appendChild(statusBadge);

        card.appendChild(headerRow);

        // Popularity
        var popularity = document.createElement('div');
        popularity.className = `${uniqueId}-mobile-chip`;
        popularity.style.background = isDarkMode() ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)';
        popularity.textContent = t.paymentMethods.popularity + ': ' + getPopularityStars(method.popularity);
        card.appendChild(popularity);

        // Summary details
        var subgrid = document.createElement('div');
        subgrid.className = `${uniqueId}-mobile-card-subgrid`;

        function addKV(k, v) {
          var kv = document.createElement('div');
          kv.className = `${uniqueId}-mobile-kv`;
          var kEl = document.createElement('div');
          kEl.className = `${uniqueId}-mobile-k`;
          kEl.textContent = k;
          var vEl = document.createElement('div');
          vEl.className = `${uniqueId}-mobile-v`;
          vEl.textContent = v || '-';
          kv.appendChild(kEl);
          kv.appendChild(vEl);
          subgrid.appendChild(kv);
        }

        addKV(t.paymentMethods.minDeposit, method.minDeposit || '-');
        addKV(t.paymentMethods.maxDeposit, method.maxDeposit || '-');

        var processingTimeText = typeof method.processingTime === 'object'
          ? (method.processingTime[country] || '-')
          : (method.processingTime || '-');
        addKV(t.paymentMethods.processingTime, processingTimeText);

        card.appendChild(subgrid);

        var hint = document.createElement('div');
        hint.className = `${uniqueId}-mobile-hint`;
        hint.textContent = ui.tapToViewCasinos;
        card.appendChild(hint);

        // Expand area
        var expand = document.createElement('div');
        expand.className = `${uniqueId}-mobile-expand`;

        if (method.casinos && method.casinos.length > 0) {
          var links = document.createElement('div');
          links.className = `${uniqueId}-mobile-links`;

          method.casinos.forEach(function(casino) {
            if (!casino || !casino.url) return;
            var link = document.createElement('a');
            link.className = `${uniqueId}-mobile-link`;
            link.href = casino.url;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.addEventListener('click', function(e) { e.stopPropagation(); });

            var name = document.createElement('strong');
            name.textContent = casino.name || 'Casino';

            var cta = document.createElement('span');
            cta.textContent = t.paymentMethods.playNow + ' →';

            link.appendChild(name);
            link.appendChild(cta);
            links.appendChild(link);
          });

          expand.appendChild(links);
        } else {
          var empty = document.createElement('div');
          empty.className = `${uniqueId}-mobile-k`;
          empty.style.textAlign = 'center';
          empty.style.paddingTop = '8px';
          empty.textContent = t.paymentMethods.topCasinos + ': -';
          expand.appendChild(empty);
        }

        card.appendChild(expand);

        function applySelectedStyles(isSelected) {
          if (isSelected) {
            card.style.background = isDarkMode() ? styleConfig.mobileSelectedBgDark : styleConfig.mobileSelectedBg;
            card.style.borderColor = isDarkMode() ? '#60a5fa' : '#2563eb';
            card.style.boxShadow = '0 8px 20px rgba(37,99,235,0.12)';
            expand.classList.add('show');
            hint.textContent = 'Tap to collapse';
          } else {
            card.style.background = isDarkMode() ? styleConfig.mobileCardBgDark : styleConfig.mobileCardBg;
            card.style.borderColor = isDarkMode() ? styleConfig.borderColorDark : styleConfig.borderColor;
            card.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
            expand.classList.remove('show');
            hint.textContent = 'Tap to view casinos';
          }
        }

        // initial
        applySelectedStyles(selectedMobileMethod === method.id);

        card.addEventListener('click', function() {
          var wasSelected = selectedMobileMethod === method.id;
          selectedMobileMethod = wasSelected ? null : method.id;

          // Update all cards visuals
          Array.prototype.slice.call(mobileCards.querySelectorAll('.' + uniqueId + '-mobile-card')).forEach(function(el) {
            var id = el.getAttribute('data-method-id');
            var expandEl = el.querySelector('.' + uniqueId + '-mobile-expand');
            var hintEl = el.querySelector('.' + uniqueId + '-mobile-hint');
            if (!expandEl || !hintEl) return;

            var isSelected = id === selectedMobileMethod;
            el.style.background = isSelected
              ? (isDarkMode() ? styleConfig.mobileSelectedBgDark : styleConfig.mobileSelectedBg)
              : (isDarkMode() ? styleConfig.mobileCardBgDark : styleConfig.mobileCardBg);
            el.style.borderColor = isSelected
              ? (isDarkMode() ? '#60a5fa' : '#2563eb')
              : (isDarkMode() ? styleConfig.borderColorDark : styleConfig.borderColor);
            el.style.boxShadow = isSelected
              ? '0 8px 20px rgba(37,99,235,0.12)'
              : '0 1px 2px rgba(0,0,0,0.05)';
            if (isSelected) {
              expandEl.classList.add('show');
              hintEl.textContent = ui.tapToCollapse;
            } else {
              expandEl.classList.remove('show');
              hintEl.textContent = ui.tapToViewCasinos;
            }
          });
        });

        mobileCards.appendChild(card);
      });
    }

    renderPaymentMethodsMobileCards();
    content.appendChild(mobileCards);

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
      th.style.color = isDarkMode() ? 'white' : '#000000';
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
      
      // Add hover effect
      row.addEventListener('mouseenter', function() {
        if (selectedMethod !== method.id) {
          row.style.background = styleConfig.rowHover;
          if (isDarkMode()) {
            row.style.background = styleConfig.rowHoverDark;
          }
        }
      });
      
      row.addEventListener('mouseleave', function() {
        if (selectedMethod !== method.id) {
          row.style.background = '';
        }
      });
      
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
          // Populate details div
          updatePaymentMethodDetails(method);
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

    // Function to update details div content
    function updatePaymentMethodDetails(method) {
      detailsDiv.innerHTML = '';
      
      var detailsContent = document.createElement('div');
      detailsContent.className = `${uniqueId}-details-content`;
      
      var icon = document.createElement('span');
      icon.className = `${uniqueId}-details-icon`;
      icon.textContent = method.icon;
      detailsContent.appendChild(icon);
      
      var info = document.createElement('div');
      info.className = `${uniqueId}-details-info`;
      
      var title = document.createElement('h3');
      title.className = `${uniqueId}-details-title`;
      if (countryFlag) {
        title.innerHTML = countryFlag + ' ' + (method.name[country] || method.name.UK);
      } else {
        title.textContent = method.name[country] || method.name.UK;
      }
      info.appendChild(title);
      
      var grid = document.createElement('div');
      grid.className = `${uniqueId}-details-grid`;
      
      // Min Deposit
      var minDepositItem = document.createElement('div');
      minDepositItem.className = `${uniqueId}-details-item`;
      var minDepositLabel = document.createElement('p');
      minDepositLabel.className = `${uniqueId}-details-label`;
      minDepositLabel.textContent = t.paymentMethods.minDeposit;
      var minDepositValue = document.createElement('p');
      minDepositValue.className = `${uniqueId}-details-value`;
      minDepositValue.textContent = method.minDeposit || '-';
      minDepositItem.appendChild(minDepositLabel);
      minDepositItem.appendChild(minDepositValue);
      grid.appendChild(minDepositItem);
      
      // Max Deposit
      var maxDepositItem = document.createElement('div');
      maxDepositItem.className = `${uniqueId}-details-item`;
      var maxDepositLabel = document.createElement('p');
      maxDepositLabel.className = `${uniqueId}-details-label`;
      maxDepositLabel.textContent = t.paymentMethods.maxDeposit;
      var maxDepositValue = document.createElement('p');
      maxDepositValue.className = `${uniqueId}-details-value`;
      maxDepositValue.textContent = method.maxDeposit || '-';
      maxDepositItem.appendChild(maxDepositLabel);
      maxDepositItem.appendChild(maxDepositValue);
      grid.appendChild(maxDepositItem);
      
      // Processing Time
      var processingTimeItem = document.createElement('div');
      processingTimeItem.className = `${uniqueId}-details-item`;
      var processingTimeLabel = document.createElement('p');
      processingTimeLabel.className = `${uniqueId}-details-label`;
      processingTimeLabel.textContent = t.paymentMethods.processingTime;
      var processingTimeValue = document.createElement('p');
      processingTimeValue.className = `${uniqueId}-details-value`;
      var processingTimeText = typeof method.processingTime === 'object' 
        ? (method.processingTime[country] || '-')
        : (method.processingTime || '-');
      processingTimeValue.textContent = processingTimeText;
      processingTimeItem.appendChild(processingTimeLabel);
      processingTimeItem.appendChild(processingTimeValue);
      grid.appendChild(processingTimeItem);
      
      info.appendChild(grid);
      
      // Top Casinos section
      if (method.casinos && method.casinos.length > 0) {
        var casinosSection = document.createElement('div');
        casinosSection.className = `${uniqueId}-casinos-section`;
        casinosSection.style.display = 'block';
        
        var casinosTitle = document.createElement('h4');
        casinosTitle.className = `${uniqueId}-casinos-title`;
        casinosTitle.textContent = t.paymentMethods.topCasinos;
        casinosSection.appendChild(casinosTitle);
        
        var casinosGrid = document.createElement('div');
        casinosGrid.className = `${uniqueId}-casinos-grid`;
        
        method.casinos.forEach(function(casino) {
          var casinoCard = document.createElement('a');
          casinoCard.className = `${uniqueId}-casino-card`;
          casinoCard.href = casino.url;
          casinoCard.target = '_blank';
          casinoCard.rel = 'noopener noreferrer';
          
          var casinoHeader = document.createElement('div');
          casinoHeader.className = `${uniqueId}-casino-header`;
          
          var casinoName = document.createElement('span');
          casinoName.className = `${uniqueId}-casino-name`;
          casinoName.textContent = casino.name;
          casinoHeader.appendChild(casinoName);
          
          var casinoIcon = document.createElement('span');
          casinoIcon.className = `${uniqueId}-casino-icon`;
          casinoIcon.textContent = '🎰';
          casinoHeader.appendChild(casinoIcon);
          
          casinoCard.appendChild(casinoHeader);
          
          var casinoLink = document.createElement('span');
          casinoLink.className = `${uniqueId}-casino-link`;
          casinoLink.textContent = t.paymentMethods.playNow + ' →';
          casinoCard.appendChild(casinoLink);
          
          casinosGrid.appendChild(casinoCard);
        });
        
        casinosSection.appendChild(casinosGrid);
        info.appendChild(casinosSection);
      }
      
      detailsContent.appendChild(info);
      detailsDiv.appendChild(detailsContent);
    }

    return content;
  }

  function createBestCasinoContent() {
    var content = document.createElement('div');
    
    // Header
    var header = document.createElement('div');
    header.className = `${uniqueId}-header`;
    if (tableStyle === 'light') {
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

    // Mobile cards
    var mobileCards = document.createElement('div');
    mobileCards.className = `${uniqueId}-mobile-cards`;
    var selectedMobileCasino = null;

    function renderBestCasinoMobileCards() {
      mobileCards.innerHTML = '';
      bestCasinos.slice(0, 5).forEach(function(casino, index) {
        var card = document.createElement('div');
        card.className = `${uniqueId}-mobile-card`;
        card.setAttribute('data-casino-index', String(index));
        card.style.background = isDarkMode() ? styleConfig.mobileCardBgDark : styleConfig.mobileCardBg;
        card.style.borderColor = isDarkMode() ? styleConfig.borderColorDark : styleConfig.borderColor;

        var headerRow = document.createElement('div');
        headerRow.className = `${uniqueId}-mobile-card-header`;

        var left = document.createElement('div');
        left.className = `${uniqueId}-mobile-card-name`;

        var iconEl = document.createElement('span');
        iconEl.className = `${uniqueId}-mobile-card-icon`;
        iconEl.textContent = '🎲';
        left.appendChild(iconEl);

        var titleEl = document.createElement('span');
        titleEl.className = `${uniqueId}-mobile-card-title`;
        titleEl.textContent = casino.name || ('Casino ' + (index + 1));
        left.appendChild(titleEl);

        headerRow.appendChild(left);

        var ratingChip = document.createElement('span');
        ratingChip.className = `${uniqueId}-mobile-chip`;
        ratingChip.style.background = isDarkMode() ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)';
        ratingChip.textContent = getRatingStars(casino.rating || 5);
        headerRow.appendChild(ratingChip);

        card.appendChild(headerRow);

        var subgrid = document.createElement('div');
        subgrid.className = `${uniqueId}-mobile-card-subgrid`;

        function addKV(k, v) {
          var kv = document.createElement('div');
          kv.className = `${uniqueId}-mobile-kv`;
          var kEl = document.createElement('div');
          kEl.className = `${uniqueId}-mobile-k`;
          kEl.textContent = k;
          var vEl = document.createElement('div');
          vEl.className = `${uniqueId}-mobile-v`;
          vEl.textContent = v || '-';
          kv.appendChild(kEl);
          kv.appendChild(vEl);
          subgrid.appendChild(kv);
        }

        addKV(t.bestCasino.bonus, casino.bonus || '-');
        addKV(t.bestCasino.minDeposit, casino.minDeposit || '-');
        addKV(t.bestCasino.license, casino.license || '-');

        card.appendChild(subgrid);

        var hint = document.createElement('div');
        hint.className = `${uniqueId}-mobile-hint`;
        hint.textContent = ui.tapForDetails;
        card.appendChild(hint);

        var expand = document.createElement('div');
        expand.className = `${uniqueId}-mobile-expand`;

        if (casino.url) {
          var link = document.createElement('a');
          link.className = `${uniqueId}-mobile-link`;
          link.href = casino.url;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          link.addEventListener('click', function(e) { e.stopPropagation(); });

          var name = document.createElement('strong');
          name.textContent = t.bestCasino.playNow;
          var cta = document.createElement('span');
          cta.textContent = '→';
          link.appendChild(name);
          link.appendChild(cta);
          expand.appendChild(link);
        }

        card.appendChild(expand);

        card.addEventListener('click', function() {
          var wasSelected = selectedMobileCasino === index;
          selectedMobileCasino = wasSelected ? null : index;

          Array.prototype.slice.call(mobileCards.querySelectorAll('.' + uniqueId + '-mobile-card')).forEach(function(el) {
            var idx = parseInt(el.getAttribute('data-casino-index') || '-1', 10);
            var expandEl = el.querySelector('.' + uniqueId + '-mobile-expand');
            var hintEl = el.querySelector('.' + uniqueId + '-mobile-hint');
            if (!expandEl || !hintEl) return;

            var isSelected = idx === selectedMobileCasino;
            el.style.background = isSelected
              ? (isDarkMode() ? styleConfig.mobileSelectedBgDark : styleConfig.mobileSelectedBg)
              : (isDarkMode() ? styleConfig.mobileCardBgDark : styleConfig.mobileCardBg);
            el.style.borderColor = isSelected
              ? (isDarkMode() ? '#60a5fa' : '#2563eb')
              : (isDarkMode() ? styleConfig.borderColorDark : styleConfig.borderColor);
            el.style.boxShadow = isSelected
              ? '0 8px 20px rgba(37,99,235,0.12)'
              : '0 1px 2px rgba(0,0,0,0.05)';
            if (isSelected) {
              expandEl.classList.add('show');
              hintEl.textContent = ui.tapToCollapse;
            } else {
              expandEl.classList.remove('show');
              hintEl.textContent = ui.tapForDetails;
            }
          });
        });

        mobileCards.appendChild(card);
      });
    }

    renderBestCasinoMobileCards();
    content.appendChild(mobileCards);

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
      th.style.color = isDarkMode() ? 'white' : '#000000';
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    var tbody = document.createElement('tbody');
    tbody.className = `${uniqueId}-tbody`;
    var selectedCasino = null;
    
    var detailsDiv = document.createElement('div');
    detailsDiv.className = `${uniqueId}-details`;
    detailsDiv.style.background = styleConfig.detailsBg;
    detailsDiv.style.border = '1px solid ' + styleConfig.borderColor;
    if (isDarkMode()) {
      detailsDiv.style.background = styleConfig.detailsBgDark;
      detailsDiv.style.borderColor = styleConfig.borderColorDark;
    }

    bestCasinos.slice(0, 5).forEach(function(casino, index) {
      var row = document.createElement('tr');
      row.className = `${uniqueId}-tr`;
      row.setAttribute('data-casino-index', index);
      
      // Add hover effect
      row.addEventListener('mouseenter', function() {
        if (selectedCasino !== index) {
          row.style.background = styleConfig.rowHover;
          if (isDarkMode()) {
            row.style.background = styleConfig.rowHoverDark;
          }
        }
      });
      
      row.addEventListener('mouseleave', function() {
        if (selectedCasino !== index) {
          row.style.background = '';
        }
      });
      
      row.addEventListener('click', function() {
        var wasSelected = selectedCasino === index;
        if (selectedCasino !== null) {
          var prevRow = tbody.querySelector('[data-casino-index="' + selectedCasino + '"]');
          if (prevRow) {
            prevRow.classList.remove('selected');
            prevRow.style.background = '';
          }
          detailsDiv.classList.remove('show');
        }
        if (!wasSelected) {
          selectedCasino = index;
          row.classList.add('selected');
          row.style.background = styleConfig.selectedRowBg;
          if (isDarkMode()) {
            row.style.background = styleConfig.selectedRowBgDark;
          }
          // Populate details div
          updateBestCasinoDetails(casino);
          detailsDiv.classList.add('show');
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
    content.appendChild(detailsDiv);

    // Function to update details div content
    function updateBestCasinoDetails(casino) {
      detailsDiv.innerHTML = '';
      
      var detailsContent = document.createElement('div');
      detailsContent.className = `${uniqueId}-details-content`;
      
      var icon = document.createElement('span');
      icon.className = `${uniqueId}-details-icon`;
      icon.textContent = '🎲';
      detailsContent.appendChild(icon);
      
      var info = document.createElement('div');
      info.className = `${uniqueId}-details-info`;
      
      var title = document.createElement('h3');
      title.className = `${uniqueId}-details-title`;
      title.textContent = casino.name;
      info.appendChild(title);
      
      var grid = document.createElement('div');
      grid.className = `${uniqueId}-details-grid`;
      
      // Rating
      var ratingItem = document.createElement('div');
      ratingItem.className = `${uniqueId}-details-item`;
      var ratingLabel = document.createElement('p');
      ratingLabel.className = `${uniqueId}-details-label`;
      ratingLabel.textContent = t.bestCasino.rating;
      var ratingValue = document.createElement('p');
      ratingValue.className = `${uniqueId}-details-value`;
      ratingValue.textContent = getRatingStars(casino.rating || 5);
      ratingItem.appendChild(ratingLabel);
      ratingItem.appendChild(ratingValue);
      grid.appendChild(ratingItem);
      
      // Bonus
      var bonusItem = document.createElement('div');
      bonusItem.className = `${uniqueId}-details-item`;
      var bonusLabel = document.createElement('p');
      bonusLabel.className = `${uniqueId}-details-label`;
      bonusLabel.textContent = t.bestCasino.bonus;
      var bonusValue = document.createElement('p');
      bonusValue.className = `${uniqueId}-details-value`;
      bonusValue.textContent = casino.bonus || '-';
      bonusItem.appendChild(bonusLabel);
      bonusItem.appendChild(bonusValue);
      grid.appendChild(bonusItem);
      
      // Min Deposit
      var minDepositItem = document.createElement('div');
      minDepositItem.className = `${uniqueId}-details-item`;
      var minDepositLabel = document.createElement('p');
      minDepositLabel.className = `${uniqueId}-details-label`;
      minDepositLabel.textContent = t.bestCasino.minDeposit;
      var minDepositValue = document.createElement('p');
      minDepositValue.className = `${uniqueId}-details-value`;
      minDepositValue.textContent = casino.minDeposit || '-';
      minDepositItem.appendChild(minDepositLabel);
      minDepositItem.appendChild(minDepositValue);
      grid.appendChild(minDepositItem);
      
      info.appendChild(grid);
      
      // Play Now button
      if (casino.url) {
        var playButton = document.createElement('a');
        playButton.href = casino.url;
        playButton.target = '_blank';
        playButton.rel = 'noopener noreferrer';
        playButton.style.display = 'inline-block';
        playButton.style.marginTop = '16px';
        playButton.style.padding = '12px 24px';
        playButton.style.background = '#2563eb';
        playButton.style.color = 'white';
        playButton.style.fontWeight = '600';
        playButton.style.borderRadius = '8px';
        playButton.style.textDecoration = 'none';
        playButton.style.transition = 'background-color 0.2s';
        playButton.textContent = t.bestCasino.playNow + ' →';
        playButton.addEventListener('mouseenter', function() {
          playButton.style.background = '#1d4ed8';
        });
        playButton.addEventListener('mouseleave', function() {
          playButton.style.background = '#2563eb';
        });
        info.appendChild(playButton);
      }
      
      detailsContent.appendChild(info);
      detailsDiv.appendChild(detailsContent);
    }

    return content;
  }

  function createRecentWinningsContent() {
    var content = document.createElement('div');
    
    // Header
    var header = document.createElement('div');
    header.className = `${uniqueId}-header`;
    if (tableStyle === 'light') {
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

    // Mobile cards
    var mobileCards = document.createElement('div');
    mobileCards.className = `${uniqueId}-mobile-cards`;
    var selectedMobileWinning = null;

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
      th.style.color = isDarkMode() ? 'white' : '#000000';
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    var tbody = document.createElement('tbody');
    tbody.className = `${uniqueId}-tbody`;
    
    var detailsDiv = document.createElement('div');
    detailsDiv.className = `${uniqueId}-details`;
    detailsDiv.style.background = styleConfig.detailsBg;
    detailsDiv.style.border = '1px solid ' + styleConfig.borderColor;
    if (isDarkMode()) {
      detailsDiv.style.background = styleConfig.detailsBgDark;
      detailsDiv.style.borderColor = styleConfig.borderColorDark;
    }

    function renderRecentWinningsTableAndMobile() {
      // Reset selections
      selectedWinning = null;
      selectedMobileWinning = null;
      detailsDiv.classList.remove('show');

      // Table rows
      tbody.innerHTML = '';
      displayedWinnings.forEach(function(winning, index) {
        var row = document.createElement('tr');
        row.className = `${uniqueId}-tr`;
        row.setAttribute('data-winning-index', index);
        
        // Add hover effect
        row.addEventListener('mouseenter', function() {
          if (selectedWinning !== index) {
            row.style.background = styleConfig.rowHover;
            if (isDarkMode()) {
              row.style.background = styleConfig.rowHoverDark;
            }
          }
        });
        
        row.addEventListener('mouseleave', function() {
          if (selectedWinning !== index) {
            row.style.background = '';
          }
        });
        
        row.addEventListener('click', function() {
          var wasSelected = selectedWinning === index;
          if (selectedWinning !== null) {
            var prevRow = tbody.querySelector('[data-winning-index="' + selectedWinning + '"]');
            if (prevRow) {
              prevRow.classList.remove('selected');
              prevRow.style.background = '';
            }
            detailsDiv.classList.remove('show');
          }
          if (!wasSelected) {
            selectedWinning = index;
            row.classList.add('selected');
            row.style.background = styleConfig.selectedRowBg;
            if (isDarkMode()) {
              row.style.background = styleConfig.selectedRowBgDark;
            }
            // Populate details div
            updateWinningDetails(winning);
            detailsDiv.classList.add('show');
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

      // Mobile cards
      mobileCards.innerHTML = '';
      displayedWinnings.forEach(function(winning, index) {
        var card = document.createElement('div');
        card.className = `${uniqueId}-mobile-card`;
        card.setAttribute('data-winning-index', String(index));
        card.style.background = isDarkMode() ? styleConfig.mobileCardBgDark : styleConfig.mobileCardBg;
        card.style.borderColor = isDarkMode() ? styleConfig.borderColorDark : styleConfig.borderColor;

        var headerRow = document.createElement('div');
        headerRow.className = `${uniqueId}-mobile-card-header`;

        var left = document.createElement('div');
        left.className = `${uniqueId}-mobile-card-name`;

        var iconEl = document.createElement('span');
        iconEl.className = `${uniqueId}-mobile-card-icon`;
        iconEl.textContent = '🎲';
        left.appendChild(iconEl);

        var titleEl = document.createElement('span');
        titleEl.className = `${uniqueId}-mobile-card-title`;
        titleEl.textContent = winning.casino || 'Casino';
        left.appendChild(titleEl);

        headerRow.appendChild(left);

        var amountChip = document.createElement('span');
        amountChip.className = `${uniqueId}-mobile-chip`;
        amountChip.style.background = isDarkMode() ? 'rgba(16,185,129,0.18)' : 'rgba(16,185,129,0.12)';
        amountChip.style.borderColor = isDarkMode() ? 'rgba(52,211,153,0.35)' : 'rgba(16,185,129,0.25)';
        amountChip.style.color = isDarkMode() ? '#34d399' : '#059669';
        amountChip.textContent = winning.amount || '-';
        headerRow.appendChild(amountChip);

        card.appendChild(headerRow);

        var subgrid = document.createElement('div');
        subgrid.className = `${uniqueId}-mobile-card-subgrid`;

        function addKV(k, v) {
          var kv = document.createElement('div');
          kv.className = `${uniqueId}-mobile-kv`;
          var kEl = document.createElement('div');
          kEl.className = `${uniqueId}-mobile-k`;
          kEl.textContent = k;
          var vEl = document.createElement('div');
          vEl.className = `${uniqueId}-mobile-v`;
          vEl.textContent = v || '-';
          kv.appendChild(kEl);
          kv.appendChild(vEl);
          subgrid.appendChild(kv);
        }

        addKV(t.recentWinnings.player, winning.player || '-');
        addKV(t.recentWinnings.game, winning.game || '-');
        addKV(t.recentWinnings.date, winning.date || '-');

        card.appendChild(subgrid);

        var hint = document.createElement('div');
        hint.className = `${uniqueId}-mobile-hint`;
        hint.textContent = ui.tapForDetails;
        card.appendChild(hint);

        var expand = document.createElement('div');
        expand.className = `${uniqueId}-mobile-expand`;

        if (winning.url) {
          var link = document.createElement('a');
          link.className = `${uniqueId}-mobile-link`;
          link.href = winning.url;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          link.addEventListener('click', function(e) { e.stopPropagation(); });

          var name = document.createElement('strong');
          name.textContent = t.recentWinnings.playNow;
          var cta = document.createElement('span');
          cta.textContent = '→';
          link.appendChild(name);
          link.appendChild(cta);
          expand.appendChild(link);
        }
        card.appendChild(expand);

        card.addEventListener('click', function() {
          var wasSelected = selectedMobileWinning === index;
          selectedMobileWinning = wasSelected ? null : index;

          Array.prototype.slice.call(mobileCards.querySelectorAll('.' + uniqueId + '-mobile-card')).forEach(function(el) {
            var idx = parseInt(el.getAttribute('data-winning-index') || '-1', 10);
            var expandEl = el.querySelector('.' + uniqueId + '-mobile-expand');
            var hintEl = el.querySelector('.' + uniqueId + '-mobile-hint');
            if (!expandEl || !hintEl) return;

            var isSelected = idx === selectedMobileWinning;
            el.style.background = isSelected
              ? (isDarkMode() ? styleConfig.mobileSelectedBgDark : styleConfig.mobileSelectedBg)
              : (isDarkMode() ? styleConfig.mobileCardBgDark : styleConfig.mobileCardBg);
            el.style.borderColor = isSelected
              ? (isDarkMode() ? '#60a5fa' : '#2563eb')
              : (isDarkMode() ? styleConfig.borderColorDark : styleConfig.borderColor);
            el.style.boxShadow = isSelected
              ? '0 8px 20px rgba(37,99,235,0.12)'
              : '0 1px 2px rgba(0,0,0,0.05)';
            if (isSelected) {
              expandEl.classList.add('show');
              hintEl.textContent = ui.tapToCollapse;
            } else {
              expandEl.classList.remove('show');
              hintEl.textContent = ui.tapForDetails;
            }
          });
        });

        mobileCards.appendChild(card);
      });
    }

    // Initial render
    renderRecentWinningsTableAndMobile();

    table.appendChild(tbody);
    tableContainer.appendChild(table);
    content.appendChild(tableContainer);
    content.appendChild(detailsDiv);
    content.appendChild(mobileCards);

    // Function to update details div content
    function updateWinningDetails(winning) {
      detailsDiv.innerHTML = '';
      
      var detailsContent = document.createElement('div');
      detailsContent.className = `${uniqueId}-details-content`;
      
      var icon = document.createElement('span');
      icon.className = `${uniqueId}-details-icon`;
      icon.textContent = '🎲';
      detailsContent.appendChild(icon);
      
      var info = document.createElement('div');
      info.className = `${uniqueId}-details-info`;
      
      var title = document.createElement('h3');
      title.className = `${uniqueId}-details-title`;
      title.textContent = winning.casino;
      info.appendChild(title);
      
      var grid = document.createElement('div');
      grid.className = `${uniqueId}-details-grid`;
      grid.style.gridTemplateColumns = 'repeat(2, 1fr)';
      
      // Player
      var playerItem = document.createElement('div');
      playerItem.className = `${uniqueId}-details-item`;
      var playerLabel = document.createElement('p');
      playerLabel.className = `${uniqueId}-details-label`;
      playerLabel.textContent = t.recentWinnings.player;
      var playerValue = document.createElement('p');
      playerValue.className = `${uniqueId}-details-value`;
      playerValue.textContent = winning.player;
      playerItem.appendChild(playerLabel);
      playerItem.appendChild(playerValue);
      grid.appendChild(playerItem);
      
      // Amount
      var amountItem = document.createElement('div');
      amountItem.className = `${uniqueId}-details-item`;
      var amountLabel = document.createElement('p');
      amountLabel.className = `${uniqueId}-details-label`;
      amountLabel.textContent = t.recentWinnings.amount;
      var amountValue = document.createElement('p');
      amountValue.className = `${uniqueId}-details-value`;
      amountValue.style.color = '#10b981';
      if (isDarkMode()) {
        amountValue.style.color = '#34d399';
      }
      amountValue.textContent = winning.amount;
      amountItem.appendChild(amountLabel);
      amountItem.appendChild(amountValue);
      grid.appendChild(amountItem);
      
      // Game
      var gameItem = document.createElement('div');
      gameItem.className = `${uniqueId}-details-item`;
      var gameLabel = document.createElement('p');
      gameLabel.className = `${uniqueId}-details-label`;
      gameLabel.textContent = t.recentWinnings.game;
      var gameValue = document.createElement('p');
      gameValue.className = `${uniqueId}-details-value`;
      gameValue.textContent = winning.game;
      gameItem.appendChild(gameLabel);
      gameItem.appendChild(gameValue);
      grid.appendChild(gameItem);
      
      // Date
      var dateItem = document.createElement('div');
      dateItem.className = `${uniqueId}-details-item`;
      var dateLabel = document.createElement('p');
      dateLabel.className = `${uniqueId}-details-label`;
      dateLabel.textContent = t.recentWinnings.date;
      var dateValue = document.createElement('p');
      dateValue.className = `${uniqueId}-details-value`;
      dateValue.textContent = winning.date;
      dateItem.appendChild(dateLabel);
      dateItem.appendChild(dateValue);
      grid.appendChild(dateItem);
      
      info.appendChild(grid);
      
      // Play Now button
      if (winning.url) {
        var playButton = document.createElement('a');
        playButton.href = winning.url;
        playButton.target = '_blank';
        playButton.rel = 'noopener noreferrer';
        playButton.style.display = 'inline-block';
        playButton.style.marginTop = '16px';
        playButton.style.padding = '12px 24px';
        playButton.style.background = '#2563eb';
        playButton.style.color = 'white';
        playButton.style.fontWeight = '600';
        playButton.style.borderRadius = '8px';
        playButton.style.textDecoration = 'none';
        playButton.style.transition = 'background-color 0.2s';
        playButton.textContent = t.recentWinnings.playNow + ' →';
        playButton.addEventListener('mouseenter', function() {
          playButton.style.background = '#1d4ed8';
        });
        playButton.addEventListener('mouseleave', function() {
          playButton.style.background = '#2563eb';
        });
        info.appendChild(playButton);
      }
      
      detailsContent.appendChild(info);
      detailsDiv.appendChild(detailsContent);
    }

    // Auto-update winnings every 30 seconds
    if (allWinnings.length > 5) {
      setInterval(function() {
        displayedWinnings = selectRandomWinnings(allWinnings);
        renderRecentWinningsTableAndMobile();
      }, 30000);
    }

    return content;
  }

  // Separate initialization functions for each tab type
  function initPaymentMethodsOnly() {
    var container = document.getElementById('seohqs-payment-methods-widget');
    if (!container) return;

    var widgetContainer = document.createElement('div');
    widgetContainer.id = `${uniqueId}-widget`;
    widgetContainer.style.background = styleConfig.widgetBg;
    widgetContainer.style.border = '1px solid ' + styleConfig.borderColor;
    widgetContainer.style.color = '#000000';
    if (isDarkMode()) {
      widgetContainer.style.background = styleConfig.widgetBgDark;
      widgetContainer.style.borderColor = styleConfig.borderColorDark;
      widgetContainer.style.color = 'white';
    }

    // Only Payment Methods content - no tabs navigation
    var paymentMethodsContent = createPaymentMethodsContent();
    paymentMethodsContent.style.display = 'block'; // Always visible
    widgetContainer.appendChild(paymentMethodsContent);

    // Footer
    var footer = document.createElement('div');
    footer.className = `${uniqueId}-footer`;
    footer.textContent = 'Verified by SEOHQS';
    widgetContainer.appendChild(footer);

    container.innerHTML = '';
    container.appendChild(widgetContainer);
  }

  function initBestCasinoOnly() {
    var container = document.getElementById('seohqs-payment-methods-widget');
    if (!container) return;

    var widgetContainer = document.createElement('div');
    widgetContainer.id = `${uniqueId}-widget`;
    widgetContainer.style.background = styleConfig.widgetBg;
    widgetContainer.style.border = '1px solid ' + styleConfig.borderColor;
    widgetContainer.style.color = '#000000';
    if (isDarkMode()) {
      widgetContainer.style.background = styleConfig.widgetBgDark;
      widgetContainer.style.borderColor = styleConfig.borderColorDark;
      widgetContainer.style.color = 'white';
    }

    // Only Best Casino content - no tabs navigation
    var bestCasinoContent = createBestCasinoContent();
    bestCasinoContent.style.display = 'block'; // Always visible
    widgetContainer.appendChild(bestCasinoContent);

    // Footer
    var footer = document.createElement('div');
    footer.className = `${uniqueId}-footer`;
    footer.textContent = 'Verified by SEOHQS';
    widgetContainer.appendChild(footer);

    container.innerHTML = '';
    container.appendChild(widgetContainer);
  }

  function initRecentWinningsOnly() {
    var container = document.getElementById('seohqs-payment-methods-widget');
    if (!container) return;

    var widgetContainer = document.createElement('div');
    widgetContainer.id = `${uniqueId}-widget`;
    widgetContainer.style.background = styleConfig.widgetBg;
    widgetContainer.style.border = '1px solid ' + styleConfig.borderColor;
    widgetContainer.style.color = '#000000';
    if (isDarkMode()) {
      widgetContainer.style.background = styleConfig.widgetBgDark;
      widgetContainer.style.borderColor = styleConfig.borderColorDark;
      widgetContainer.style.color = 'white';
    }

    // Only Recent Winnings content - no tabs navigation
    var recentWinningsContent = createRecentWinningsContent();
    recentWinningsContent.style.display = 'block'; // Always visible
    widgetContainer.appendChild(recentWinningsContent);

    // Footer
    var footer = document.createElement('div');
    footer.className = `${uniqueId}-footer`;
    footer.textContent = 'Verified by SEOHQS';
    widgetContainer.appendChild(footer);

    container.innerHTML = '';
    container.appendChild(widgetContainer);
  }

  // Main initialization - route to appropriate function based on singleTab
  function initWidget() {
    if (singleTab === 'payment-methods') {
      initPaymentMethodsOnly();
    } else if (singleTab === 'best-casino') {
      initBestCasinoOnly();
    } else if (singleTab === 'recent-winnings') {
      initRecentWinningsOnly();
    } else {
      // Multi-tab mode - show all tabs with navigation
      var container = document.getElementById('seohqs-payment-methods-widget');
      if (!container) return;

      var widgetContainer = document.createElement('div');
      widgetContainer.id = `${uniqueId}-widget`;
      widgetContainer.style.background = styleConfig.widgetBg;
      widgetContainer.style.border = '1px solid ' + styleConfig.borderColor;
      widgetContainer.style.color = '#000000'; // Black text by default
      if (isDarkMode()) {
        widgetContainer.style.background = styleConfig.widgetBgDark;
        widgetContainer.style.borderColor = styleConfig.borderColorDark;
        widgetContainer.style.color = 'white';
      }

      // Tabs Navigation (only show if not single tab mode)
      var activeTab = 'payment-methods';
      
      var tabsContainer = document.createElement('div');
      tabsContainer.className = `${uniqueId}-tabs`;
      if (isDarkMode()) {
        tabsContainer.style.background = '#1f2937';
        tabsContainer.style.borderColor = '#4b5563';
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

      // All three tab contents for multi-tab mode
      var paymentMethodsContent = createPaymentMethodsContent();
      paymentMethodsContent.setAttribute('data-content', 'payment-methods');
      paymentMethodsContent.classList.add(uniqueId + '-tab-content', 'active');
      widgetContainer.appendChild(paymentMethodsContent);

      var bestCasinoContent = createBestCasinoContent();
      bestCasinoContent.setAttribute('data-content', 'best-casino');
      bestCasinoContent.classList.add(uniqueId + '-tab-content');
      widgetContainer.appendChild(bestCasinoContent);

      var recentWinningsContent = createRecentWinningsContent();
      recentWinningsContent.setAttribute('data-content', 'recent-winnings');
      recentWinningsContent.classList.add(uniqueId + '-tab-content');
      widgetContainer.appendChild(recentWinningsContent);

      // Footer
      var footer = document.createElement('div');
      footer.className = `${uniqueId}-footer`;
      footer.textContent = 'Verified by SEOHQS';
      widgetContainer.appendChild(footer);

      container.innerHTML = '';
      container.appendChild(widgetContainer);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWidget);
  } else {
    initWidget();
  }
})();
