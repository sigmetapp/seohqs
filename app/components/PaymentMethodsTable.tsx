'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

export type CountryCode = 'UK' | 'DE' | 'FR' | 'ES' | 'IT' | 'PT' | 'BR' | 'BG' | 'HU' | 'FI' | 'NO';

export interface PaymentMethod {
  id: string;
  name: Record<CountryCode, string>;
  icon: string;
  status: 'available' | 'limited' | 'unavailable';
  popularity: number; // 1-5, где 5 самый популярный
  minDeposit?: string;
  maxDeposit?: string;
  processingTime?: string;
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
  },
};

interface PaymentMethodsTableProps {
  country: CountryCode;
  showDetails?: boolean;
}

export default function PaymentMethodsTable({ country, showDetails = true }: PaymentMethodsTableProps) {
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const t = TRANSLATIONS[country];
  
  // Get top 5 by popularity
  const topMethods = [...PAYMENT_METHODS]
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, 5);

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
    <div className="w-full max-w-6xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl md:text-4xl font-extrabold mb-3 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 dark:from-blue-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
          {t.title}
        </h2>
        <p className="text-lg text-gray-600 dark:text-gray-300">
          {t.subtitle}
        </p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-gray-300 dark:border-gray-600">
              <th className="text-left py-4 px-4 font-bold text-gray-900 dark:text-white">{t.method}</th>
              <th className="text-center py-4 px-4 font-bold text-gray-900 dark:text-white">{t.status}</th>
              <th className="text-center py-4 px-4 font-bold text-gray-900 dark:text-white">{t.popularity}</th>
              {showDetails && (
                <>
                  <th className="text-center py-4 px-4 font-bold text-gray-900 dark:text-white">{t.minDeposit}</th>
                  <th className="text-center py-4 px-4 font-bold text-gray-900 dark:text-white">{t.maxDeposit}</th>
                  <th className="text-center py-4 px-4 font-bold text-gray-900 dark:text-white">{t.processingTime}</th>
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
                  border-b border-gray-200 dark:border-gray-700 
                  hover:bg-gray-50 dark:hover:bg-gray-700/50 
                  transition-colors cursor-pointer
                  ${selectedMethod === method.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
                `}
                onClick={() => setSelectedMethod(selectedMethod === method.id ? null : method.id)}
              >
                <td className="py-4 px-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{method.icon}</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {method.name[country]}
                    </span>
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
                    <td className="py-4 px-4 text-center text-gray-700 dark:text-gray-300">
                      {method.minDeposit || '-'}
                    </td>
                    <td className="py-4 px-4 text-center text-gray-700 dark:text-gray-300">
                      {method.maxDeposit || '-'}
                    </td>
                    <td className="py-4 px-4 text-center text-gray-700 dark:text-gray-300">
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

      {/* Selected Method Details */}
      {selectedMethod && showDetails && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mt-6 p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl border border-blue-200 dark:border-blue-800"
        >
          {(() => {
            const method = topMethods.find(m => m.id === selectedMethod);
            if (!method) return null;
            return (
              <div className="flex items-start gap-4">
                <span className="text-4xl">{method.icon}</span>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    {method.name[country]}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t.minDeposit}</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">{method.minDeposit}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t.maxDeposit}</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">{method.maxDeposit}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t.processingTime}</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {typeof method.processingTime === 'object' 
                          ? method.processingTime[country] || '-' 
                          : method.processingTime || '-'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </motion.div>
      )}

      {/* Footer */}
      <div className="mt-6 text-center">
        <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-widest font-semibold">
          Verified by SEOHQS
        </span>
      </div>
    </div>
  );
}
