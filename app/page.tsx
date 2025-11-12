'use client';

import { useState, useEffect, useMemo } from 'react';
import { loadDataFromDB, AffiliateOffer } from './utils/parseCSV';
import Filters from './components/Filters';
import Table from './components/Table';
import Loader from './components/Loader';
import FileUpload from './components/FileUpload';
import Papa from 'papaparse';

export default function Home() {
  const [offers, setOffers] = useState<AffiliateOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [filters, setFilters] = useState({
    topic: '',
    country: '',
    model: '',
    search: '',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await loadDataFromDB();
      setOffers(data);
      
      // Показываем форму загрузки только если данных нет
      if (data.length === 0) {
        setShowUpload(true);
      } else {
        setShowUpload(false);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setOffers([]);
      setShowUpload(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Просто загружаем данные, миграции можно запустить вручную через /api/migrate
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUploadSuccess = () => {
    loadData();
  };

  // Фильтрация данных
  const filteredOffers = useMemo(() => {
    return offers.filter((offer) => {
      const matchesTopic = !filters.topic || offer.topic === filters.topic;
      const matchesCountry = !filters.country || offer.country === filters.country;
      const matchesModel = !filters.model || offer.model === filters.model;
      const matchesSearch =
        !filters.search ||
        offer.name.toLowerCase().includes(filters.search.toLowerCase());

      return matchesTopic && matchesCountry && matchesModel && matchesSearch;
    });
  }, [offers, filters]);

  // Пагинация
  const totalPages = Math.ceil(filteredOffers.length / itemsPerPage);
  const paginatedOffers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return filteredOffers.slice(start, end);
  }, [filteredOffers, currentPage]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const exportToCSV = () => {
    const csv = Papa.unparse(filteredOffers);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'affiliate_offers.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return <Loader />;
  }

  return (
    <main className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Affiliate Catalog</h1>
          <p className="text-gray-400">
            Всего программ: {offers.length} | Отфильтровано: {filteredOffers.length}
          </p>
        </div>

        {/* Показываем форму загрузки если данных нет или пользователь хочет загрузить */}
        {showUpload && (
          <>
            <FileUpload onUploadSuccess={handleUploadSuccess} />
            {offers.length === 0 && (
              <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-4 mb-6">
                <p className="text-yellow-200">
                  База данных пуста. Загрузите CSV файлы выше для начала работы.
                </p>
              </div>
            )}
          </>
        )}

        {/* Показываем кнопку для загрузки если данные есть */}
        {!showUpload && offers.length > 0 && (
          <div className="mb-6 flex justify-between items-center">
            <button
              onClick={() => setShowUpload(true)}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm"
            >
              Загрузить новые CSV файлы
            </button>
          </div>
        )}

        {offers.length > 0 && (
          <>
            <Filters
              offers={offers}
              filters={filters}
              onFilterChange={handleFilterChange}
            />

            <div className="mb-4 flex justify-end">
              <button
                onClick={exportToCSV}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
              >
                Export CSV
              </button>
            </div>

            <div className="bg-gray-800 rounded-lg p-6">
              <Table data={paginatedOffers} />
            </div>

            {/* Пагинация */}
            {totalPages > 1 && (
              <div className="mt-6 flex justify-center items-center gap-2">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Назад
                </button>
                <span className="text-gray-300 px-4">
                  Страница {currentPage} из {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Вперёд
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
