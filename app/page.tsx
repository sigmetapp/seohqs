'use client';

import { useState, useEffect, useMemo } from 'react';
import { parseCSVFiles, AffiliateOffer } from './utils/parseCSV';
import Filters from './components/Filters';
import Table from './components/Table';
import Loader from './components/Loader';
import FileUpload from './components/FileUpload';
import Papa from 'papaparse';

export default function Home() {
  const [offers, setOffers] = useState<AffiliateOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(true); // По умолчанию показываем форму загрузки
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
      const data = await parseCSVFiles();
      setOffers(data);
      // Скрываем форму загрузки только если есть данные
      if (data.length > 0) {
        setShowUpload(false);
      } else {
        setShowUpload(true);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setOffers([]);
      // Всегда показываем форму загрузки при ошибке или отсутствии данных
      setShowUpload(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Загружаем данные при монтировании компонента
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUploadSuccess = () => {
    // Перезагружаем данные после успешной загрузки
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
    setCurrentPage(1); // Сбрасываем на первую страницу при изменении фильтров
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

  return (
    <main className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Affiliate Catalog</h1>
          <p className="text-gray-400">
            Всего программ: {offers.length} | Отфильтровано: {filteredOffers.length}
          </p>
        </div>

        {loading ? (
          <Loader />
        ) : (
          <>
            {/* Показываем загрузку файлов если данных нет или пользователь хочет обновить */}
            {(showUpload || offers.length === 0) && (
              <>
                <FileUpload onUploadSuccess={handleUploadSuccess} />
                {offers.length === 0 && (
                  <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-4 mb-6">
                    <p className="text-yellow-200">
                      Для начала работы загрузите CSV файлы выше. После загрузки данные будут автоматически отображаться.
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Показываем кнопку для повторной загрузки если данные есть */}
            {!showUpload && offers.length > 0 && (
              <div className="mb-6 flex justify-between items-center">
                <button
                  onClick={() => setShowUpload(true)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm"
                >
                  Загрузить/Обновить CSV файлы
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
          </>
        )}
      </div>
    </main>
  );
}
