'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

export type CountryCode = 'UK' | 'DE' | 'FR' | 'ES' | 'IT' | 'PT' | 'BR' | 'BG' | 'HU' | 'FI' | 'NO';

export interface Casino {
  name: string;
  url: string;
}

export interface PaymentMethod {
  id: string;
  name: Record<CountryCode, string>;
  icon: string;
  status: 'available' | 'limited' | 'unavailable';
  popularity: number; // 1-5, где 5 самый популярный
  minDeposit?: string;
  maxDeposit?: string;
  processingTime?: string | Record<CountryCode, string>;
  casinos?: Casino[];
}

const PAYMENT_METHODS: PaymentMethod[] = [
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
];

const TRANSLATIONS: Record<CountryCode, {
  title: string;
  subtitle: string;
  method: string;
  status: string;
  popularity: string;
  available: string;
  limited: string;
  unavailable: string;
  minDeposit: string;
  maxDeposit: string;
  processingTime: string;
  topMethods: string;
  topCasinos: string;
  playNow: string;
}> = {
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

export type TableStyle = 'classic' | 'modern' | 'minimal';

interface PaymentMethodsTableProps {
  country: CountryCode;
  showDetails?: boolean;
  casinos?: Record<string, Casino[]>; // methodId -> casinos
  countryFlag?: string; // Flag emoji for the selected country
  style?: TableStyle; // Table style variant
}

export default function PaymentMethodsTable({ country, showDetails = true, casinos, countryFlag, style = 'classic' }: PaymentMethodsTableProps) {
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const t = TRANSLATIONS[country];
  
  // Style configurations
  const getStyleClasses = () => {
    switch (style) {
      // 2) Light style (for white websites)
      case 'modern':
        return {
          container: 'bg-white',
          header: 'bg-transparent',
          headerText: 'text-slate-950',
          tableHeader: 'bg-slate-50',
          row: 'hover:bg-slate-50',
          selectedRow: 'bg-blue-50',
          border: 'border-slate-200',
          card: 'bg-white border-slate-200',
          details: 'bg-slate-50 border-slate-200',
          textStrong: 'text-slate-950',
          text: 'text-slate-700',
          textMuted: 'text-slate-500',
          badgeRing: 'ring-1 ring-black/5',
          detailsCard: 'bg-white/70',
        };
      // 3) Casino / landing style (colorful)
      case 'minimal':
        return {
          container: 'bg-gradient-to-br from-[#070A16] via-[#1A0636] to-[#062A4B]',
          header: 'bg-transparent',
          headerText: 'text-white',
          tableHeader: 'bg-gradient-to-r from-amber-500/15 via-fuchsia-500/15 to-cyan-400/15',
          row: 'hover:bg-white/5',
          selectedRow: 'bg-gradient-to-r from-amber-500/10 via-fuchsia-500/10 to-cyan-400/10',
          border: 'border-white/10',
          card: 'bg-black/25 border-white/10',
          details: 'bg-gradient-to-r from-black/40 via-fuchsia-950/25 to-black/40 border-amber-400/20',
          textStrong: 'text-white',
          text: 'text-white/85',
          textMuted: 'text-white/60',
          badgeRing: 'ring-1 ring-white/10',
          detailsCard: 'bg-black/20',
        };
      // 1) Dark style (keep dark, improve proportions a bit)
      default: // classic
        return {
          container: 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950',
          header: 'bg-transparent',
          headerText: 'text-white',
          tableHeader: 'bg-slate-900/70',
          row: 'hover:bg-white/5',
          selectedRow: 'bg-blue-500/10',
          border: 'border-slate-700/50',
          card: 'bg-slate-900/40 border-slate-700/50',
          details: 'bg-gradient-to-r from-slate-900/70 to-slate-950/70 border-slate-700/50',
          textStrong: 'text-white',
          text: 'text-slate-200',
          textMuted: 'text-slate-400',
          badgeRing: 'ring-1 ring-white/10',
          detailsCard: 'bg-white/5',
        };
    }
  };
  
  const styleClasses = getStyleClasses();
  const iconSizeClass = style === 'classic' ? 'text-xl' : 'text-2xl';
  
  // Get top 5 by popularity and merge with custom casinos
  const topMethods = [...PAYMENT_METHODS]
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, 5)
    .map(method => ({
      ...method,
      casinos: casinos?.[method.id] || method.casinos || [],
    }));
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-500';
      case 'limited':
        return 'bg-yellow-500';
      case 'unavailable':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
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
  };

  const getPopularityStars = (popularity: number) => {
    return '⭐'.repeat(popularity) + '☆'.repeat(5 - popularity);
  };

  return (
    <div className={`w-full max-w-6xl mx-auto p-2 sm:p-4 md:p-6 ${styleClasses.container} rounded-xl sm:rounded-2xl shadow-xl border ${styleClasses.border} min-w-0`}>
      {/* Header */}
      <div className={`text-center mb-4 sm:mb-6 md:mb-8 p-2 sm:p-4 rounded-xl ${style === 'modern' ? styleClasses.header : ''}`}>
        <h2 className={`text-xl sm:text-2xl md:text-3xl lg:text-4xl font-extrabold mb-1 sm:mb-2 md:mb-3 ${
          style === 'modern' 
            ? styleClasses.headerText 
            : 'bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 dark:from-blue-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent'
        }`}>
          {t.title}
        </h2>
        <p className={`text-xs sm:text-sm md:text-base lg:text-lg px-1 sm:px-2 ${
          style === 'modern' 
            ? styleClasses.headerText + ' opacity-90' 
            : 'text-gray-600 dark:text-gray-300'
        }`}>
          {t.subtitle}
        </p>
      </div>

      {/* Desktop Table View */}
      <div className="desktop-table-view hidden md:block overflow-x-auto w-full">
        <table className="w-full">
          <thead>
            <tr className={`${styleClasses.tableHeader} border-b-2 ${styleClasses.border}`}>
              <th className={`text-left py-4 px-4 font-bold ${styleClasses.textStrong}`}>{t.method}</th>
              <th className={`text-center py-4 px-4 font-bold ${styleClasses.textStrong}`}>{t.status}</th>
              <th className={`text-center py-4 px-4 font-bold ${styleClasses.textStrong}`}>{t.popularity}</th>
              {showDetails && (
                <>
                  <th className={`text-center py-4 px-4 font-bold ${styleClasses.textStrong}`}>{t.minDeposit}</th>
                  <th className={`text-center py-4 px-4 font-bold ${styleClasses.textStrong}`}>{t.maxDeposit}</th>
                  <th className={`text-center py-4 px-4 font-bold ${styleClasses.textStrong}`}>{t.processingTime}</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {topMethods.map((method, index) => (
              <motion.tr
                key={method.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`
                  border-b ${styleClasses.border}
                  ${styleClasses.row}
                  transition-colors cursor-pointer
                  ${selectedMethod === method.id ? styleClasses.selectedRow : ''}
                `}
                onClick={() => setSelectedMethod(selectedMethod === method.id ? null : method.id)}
              >
                <td className="py-4 px-4">
                  <div className="flex items-center gap-3">
                    <span className={iconSizeClass}>{method.icon}</span>
                    <div className="flex items-center gap-2">
                      {countryFlag && (
                        <span className="text-lg" title={country}>{countryFlag}</span>
                      )}
                      <span className={`font-semibold ${styleClasses.textStrong}`}>
                        {method.name[country]}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4 text-center">
                  <span className={`
                    inline-block px-3 py-1 rounded-full text-xs font-semibold text-white
                    ${getStatusColor(method.status)}
                  `}>
                    {getStatusText(method.status)}
                  </span>
                </td>
                <td className="py-4 px-4 text-center">
                  <span className="text-lg" title={`${method.popularity}/5`}>
                    {getPopularityStars(method.popularity)}
                  </span>
                </td>
                {showDetails && (
                  <>
                    <td className={`py-4 px-4 text-center ${styleClasses.text}`}>
                      {method.minDeposit || '-'}
                    </td>
                    <td className={`py-4 px-4 text-center ${styleClasses.text}`}>
                      {method.maxDeposit || '-'}
                    </td>
                    <td className={`py-4 px-4 text-center ${styleClasses.text}`}>
                      {typeof method.processingTime === 'object' 
                        ? method.processingTime[country] || '-' 
                        : method.processingTime || '-'}
                    </td>
                  </>
                )}
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Selected Method Details - Desktop only */}
      {selectedMethod && showDetails && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className={`hidden md:block mt-4 sm:mt-6 p-4 sm:p-6 ${styleClasses.details} rounded-xl border ${styleClasses.border}`}
        >
          {(() => {
            const method = topMethods.find(m => m.id === selectedMethod);
            if (!method) return null;
            return (
              <div className="flex items-start gap-4">
                <span className="text-4xl">{method.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {countryFlag && (
                      <span className="text-2xl" title={country}>{countryFlag}</span>
                    )}
                    <h3 className={`text-xl sm:text-2xl font-bold ${styleClasses.textStrong}`}>
                      {method.name[country]}
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-4">
                    <div>
                      <p className={`text-sm ${styleClasses.textMuted} mb-1`}>{t.minDeposit}</p>
                      <p className={`text-lg font-semibold ${styleClasses.textStrong}`}>{method.minDeposit}</p>
                    </div>
                    <div>
                      <p className={`text-sm ${styleClasses.textMuted} mb-1`}>{t.maxDeposit}</p>
                      <p className={`text-lg font-semibold ${styleClasses.textStrong}`}>{method.maxDeposit}</p>
                    </div>
                    <div>
                      <p className={`text-sm ${styleClasses.textMuted} mb-1`}>{t.processingTime}</p>
                      <p className={`text-lg font-semibold ${styleClasses.textStrong}`}>
                        {typeof method.processingTime === 'object' 
                          ? method.processingTime[country] || '-' 
                          : method.processingTime || '-'}
                      </p>
                    </div>
                  </div>
                  
                  {/* Top Casinos */}
                  {method.casinos && method.casinos.length > 0 && (
                    <div className={`mt-4 sm:mt-6 pt-4 sm:pt-6 border-t ${style === 'modern' ? 'border-blue-200' : 'border-white/10'}`}>
                      <h4 className={`text-base sm:text-lg font-bold ${styleClasses.textStrong} mb-3 sm:mb-4`}>
                        {t.topCasinos}
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                        {method.casinos.map((casino, idx) => (
                          <motion.a
                            key={idx}
                            href={casino.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className={`group p-4 rounded-lg border-2 transition-all shadow-sm hover:shadow-md ${style === 'modern'
                              ? 'bg-white border-slate-200 hover:border-blue-500'
                              : `bg-white/5 border-white/10 hover:border-blue-400/60 ${styleClasses.badgeRing}`
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className={`text-lg font-bold ${styleClasses.textStrong} group-hover:text-blue-400 transition-colors`}>
                                {casino.name}
                              </span>
                              <span className="text-xl">🎰</span>
                            </div>
                            <span className="text-sm text-blue-400 font-medium">
                              {t.playNow} →
                            </span>
                          </motion.a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </motion.div>
      )}

      {/* Mobile Card View - Always visible on mobile */}
      <div className="mobile-table-view block md:hidden space-y-3 sm:space-y-4 w-full min-h-[200px]">
        {topMethods && topMethods.length > 0 ? (
          <>
            {topMethods.map((method, index) => (
          <div key={method.id} className="w-full">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`
                w-full p-4 rounded-xl border-2 transition-all cursor-pointer touch-manipulation
                ${selectedMethod === method.id 
                  ? style === 'modern'
                    ? 'bg-blue-50 border-blue-300 shadow-lg'
                    : style === 'minimal'
                    ? 'bg-gradient-to-r from-amber-500/10 via-fuchsia-500/10 to-cyan-400/10 border-amber-400/30 shadow-lg'
                    : 'bg-white/5 border-blue-400/40 shadow-lg'
                  : `${styleClasses.card} active:scale-[0.98] hover:border-white/20`}
              `}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setSelectedMethod(selectedMethod === method.id ? null : method.id);
              }}
              whileTap={{ scale: 0.98 }}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className={`${iconSizeClass} flex-shrink-0`}>{method.icon}</span>
                  <div className="flex items-center gap-1.5 min-w-0">
                    {countryFlag && (
                      <span className="text-base flex-shrink-0" title={country}>{countryFlag}</span>
                    )}
                    <span className={`font-bold ${styleClasses.textStrong} text-base truncate`}>
                      {method.name[country]}
                    </span>
                  </div>
                </div>
                <span className={`
                  inline-block px-2.5 py-1 rounded-full text-xs font-semibold text-white flex-shrink-0 ${styleClasses.badgeRing}
                  ${getStatusColor(method.status)}
                `}>
                  {getStatusText(method.status)}
                </span>
              </div>

              {/* Popularity */}
              <div className="mb-3">
                <div className={`text-xs ${styleClasses.textMuted} mb-1`}>{t.popularity}</div>
                <div className="text-sm sm:text-base break-words">{getPopularityStars(method.popularity)}</div>
              </div>

              {/* Details */}
              {showDetails && (
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="min-w-0">
                    <div className={`mb-1 truncate ${styleClasses.textMuted}`}>{t.minDeposit}</div>
                    <div className={`font-semibold truncate ${styleClasses.textStrong}`}>{method.minDeposit || '-'}</div>
                  </div>
                  <div className="min-w-0">
                    <div className={`mb-1 truncate ${styleClasses.textMuted}`}>{t.maxDeposit}</div>
                    <div className={`font-semibold truncate ${styleClasses.textStrong}`}>{method.maxDeposit || '-'}</div>
                  </div>
                  <div className="min-w-0">
                    <div className={`mb-1 truncate ${styleClasses.textMuted}`}>{t.processingTime}</div>
                    <div className={`font-semibold truncate ${styleClasses.textStrong}`}>
                      {typeof method.processingTime === 'object' 
                        ? method.processingTime[country] || '-' 
                        : method.processingTime || '-'}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Expand indicator */}
              <div className={`mt-3 pt-3 border-t ${style === 'modern' ? 'border-slate-200' : 'border-white/10'} flex items-center justify-center`}>
                <span className={`text-xs ${styleClasses.textMuted}`}>
                  {selectedMethod === method.id ? 'Нажмите, чтобы свернуть' : 'Нажмите для подробностей'}
                </span>
              </div>
            </motion.div>

            {/* Mobile Details - открывается сразу под карточкой */}
            {selectedMethod === method.id && showDetails && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className={`w-full p-4 ${styleClasses.details} rounded-xl border ${styleClasses.border} overflow-visible`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-3xl flex-shrink-0">{method.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      {countryFlag && (
                        <span className="text-xl flex-shrink-0" title={country}>{countryFlag}</span>
                      )}
                      <h3 className={`text-lg font-bold ${styleClasses.textStrong} break-words`}>
                        {method.name[country]}
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 gap-2 mt-3">
                      <div className={`flex justify-between items-center p-3 ${styleClasses.detailsCard} rounded-lg ${styleClasses.badgeRing}`}>
                        <span className={`text-xs sm:text-sm ${styleClasses.textMuted}`}>{t.minDeposit}</span>
                        <span className={`text-sm sm:text-base font-semibold ${styleClasses.textStrong} ml-2`}>{method.minDeposit}</span>
                      </div>
                      <div className={`flex justify-between items-center p-3 ${styleClasses.detailsCard} rounded-lg ${styleClasses.badgeRing}`}>
                        <span className={`text-xs sm:text-sm ${styleClasses.textMuted}`}>{t.maxDeposit}</span>
                        <span className={`text-sm sm:text-base font-semibold ${styleClasses.textStrong} ml-2`}>{method.maxDeposit}</span>
                      </div>
                      <div className={`flex justify-between items-center p-3 ${styleClasses.detailsCard} rounded-lg ${styleClasses.badgeRing}`}>
                        <span className={`text-xs sm:text-sm ${styleClasses.textMuted}`}>{t.processingTime}</span>
                        <span className={`text-sm sm:text-base font-semibold ${styleClasses.textStrong} ml-2 break-words text-right`}>
                          {typeof method.processingTime === 'object' 
                            ? method.processingTime[country] || '-' 
                            : method.processingTime || '-'}
                        </span>
                      </div>
                    </div>
                    
                    {/* Top Casinos */}
                    {method.casinos && method.casinos.length > 0 && (
                      <div className={`mt-4 pt-4 border-t ${style === 'modern' ? 'border-blue-200' : 'border-white/10'}`}>
                        <h4 className={`text-base font-bold ${styleClasses.textStrong} mb-3`}>
                          {t.topCasinos}
                        </h4>
                        <div className="space-y-2">
                          {method.casinos.map((casino, idx) => (
                            <motion.a
                              key={idx}
                              href={casino.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: idx * 0.1 }}
                              className={`group block p-3 rounded-lg border-2 transition-all shadow-sm touch-manipulation ${style === 'modern'
                                ? 'bg-white border-slate-200 active:border-blue-500'
                                : `bg-white/5 border-white/10 active:border-blue-400/60 ${styleClasses.badgeRing}`
                              }`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex items-center justify-between">
                                <span className={`text-sm font-bold ${styleClasses.textStrong} group-active:text-blue-400 transition-colors break-words pr-2`}>
                                  {casino.name}
                                </span>
                                <span className="text-lg flex-shrink-0">🎰</span>
                              </div>
                              <span className="text-xs text-blue-400 font-medium mt-1 block">
                                {t.playNow} →
                              </span>
                            </motion.a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </div>
            ))}
          </>
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <p className="text-lg font-semibold">Нет доступных методов оплаты</p>
            <p className="text-sm mt-2">Попробуйте обновить страницу</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-6 text-center">
        <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-widest font-semibold">
          Verified by SEOHQS
        </span>
      </div>
    </div>
  );
}
