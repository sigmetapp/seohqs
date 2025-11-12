'use client';

import { AffiliateOffer } from '../utils/parseCSV';

interface FiltersProps {
  offers: AffiliateOffer[];
  filters: {
    topic: string;
    country: string;
    model: string;
    search: string;
  };
  onFilterChange: (key: string, value: string) => void;
}

export default function Filters({ offers, filters, onFilterChange }: FiltersProps) {
  // Получаем уникальные значения для фильтров
  const topics = Array.from(new Set(offers.map(o => o.topic).filter(t => t !== 'N/A'))).sort();
  const countries = Array.from(new Set(offers.map(o => o.country).filter(c => c !== 'N/A'))).sort();
  const models = Array.from(new Set(offers.map(o => o.model).filter(m => m !== 'N/A'))).sort();

  return (
    <div className="bg-gray-800 p-6 rounded-lg mb-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Поиск */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Поиск по названию
          </label>
          <input
            type="text"
            value={filters.search}
            onChange={(e) => onFilterChange('search', e.target.value)}
            placeholder="Введите название..."
            className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Тематика */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Тематика
          </label>
          <select
            value={filters.topic}
            onChange={(e) => onFilterChange('topic', e.target.value)}
            className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Все тематики</option>
            {topics.map((topic) => (
              <option key={topic} value={topic}>
                {topic}
              </option>
            ))}
          </select>
        </div>

        {/* Страна */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Страна
          </label>
          <select
            value={filters.country}
            onChange={(e) => onFilterChange('country', e.target.value)}
            className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Все страны</option>
            {countries.map((country) => (
              <option key={country} value={country}>
                {country}
              </option>
            ))}
          </select>
        </div>

        {/* Модель вознаграждения */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Модель вознаграждения
          </label>
          <select
            value={filters.model}
            onChange={(e) => onFilterChange('model', e.target.value)}
            className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Все модели</option>
            {models.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
