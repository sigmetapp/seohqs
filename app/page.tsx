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
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [showDebug, setShowDebug] = useState(true);
  const [filters, setFilters] = useState({
    topic: '',
    country: '',
    model: '',
    search: '',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const loadData = async () => {
    const debug: any = {
      timestamp: new Date().toISOString(),
      steps: [],
      errors: [],
      apiStatus: null,
      dbStatus: null,
    };

    try {
      setLoading(true);
      debug.steps.push('Начало загрузки данных');

      // Проверяем API
      try {
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
        debug.steps.push(`Проверка API: ${baseUrl}/api/data`);
        
        const response = await fetch(`${baseUrl}/api/data`, {
          cache: 'no-store',
        });
        
        debug.apiStatus = {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          url: `${baseUrl}/api/data`,
        };

        if (!response.ok) {
          debug.errors.push(`API вернул ошибку: ${response.status} ${response.statusText}`);
          const errorText = await response.text();
          debug.apiError = errorText;
        } else {
          const result = await response.json();
          debug.steps.push('API ответ получен');
          debug.apiResponse = result;
          
          const data = result.offers || [];
          setOffers(data);
          
          debug.dbStatus = {
            offersCount: data.length,
            hasData: data.length > 0,
          };
          
          // Показываем форму загрузки только если данных нет
          if (data.length === 0) {
            setShowUpload(true);
          } else {
            setShowUpload(false);
          }
        }
      } catch (apiError: any) {
        debug.errors.push(`Ошибка при запросе к API: ${apiError.message}`);
        debug.apiError = apiError.toString();
        setOffers([]);
        setShowUpload(true);
      }
    } catch (error: any) {
      debug.errors.push(`Общая ошибка: ${error.message}`);
      debug.generalError = error.toString();
      console.error('Error loading data:', error);
      setOffers([]);
      setShowUpload(true);
    } finally {
      setLoading(false);
      debug.steps.push('Загрузка завершена');
      setDebugInfo(debug);
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
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-4xl font-bold mb-2">Affiliate Catalog</h1>
              <p className="text-gray-400">
                Всего программ: {offers.length} | Отфильтровано: {filteredOffers.length}
              </p>
            </div>
            <button
              onClick={() => setShowDebug(!showDebug)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm"
            >
              {showDebug ? 'Скрыть' : 'Показать'} отладку
            </button>
          </div>

          {/* Отладочная информация */}
          {showDebug && debugInfo && (
            <div className="bg-gray-800 rounded-lg p-6 mb-6 border border-purple-500">
              <h2 className="text-xl font-bold mb-4 text-purple-300">Отладочная информация</h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-300 mb-2">Время:</h3>
                  <p className="text-gray-400 text-sm">{debugInfo.timestamp}</p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-300 mb-2">Шаги выполнения:</h3>
                  <ul className="list-disc list-inside text-gray-400 text-sm space-y-1">
                    {debugInfo.steps.map((step: string, idx: number) => (
                      <li key={idx}>{step}</li>
                    ))}
                  </ul>
                </div>

                {debugInfo.apiStatus && (
                  <div>
                    <h3 className="font-semibold text-gray-300 mb-2">Статус API:</h3>
                    <div className="bg-gray-700 rounded p-3 text-sm">
                      <p className={debugInfo.apiStatus.ok ? 'text-green-400' : 'text-red-400'}>
                        Статус: {debugInfo.apiStatus.status} {debugInfo.apiStatus.statusText}
                      </p>
                      <p className="text-gray-400">URL: {debugInfo.apiStatus.url}</p>
                      {debugInfo.apiError && (
                        <p className="text-red-400 mt-2">Ошибка: {debugInfo.apiError}</p>
                      )}
                    </div>
                  </div>
                )}

                {debugInfo.dbStatus && (
                  <div>
                    <h3 className="font-semibold text-gray-300 mb-2">Статус базы данных:</h3>
                    <div className="bg-gray-700 rounded p-3 text-sm">
                      <p className={debugInfo.dbStatus.hasData ? 'text-green-400' : 'text-yellow-400'}>
                        Записей в БД: {debugInfo.dbStatus.offersCount}
                      </p>
                    </div>
                  </div>
                )}

                {debugInfo.apiResponse && (
                  <div>
                    <h3 className="font-semibold text-gray-300 mb-2">Ответ API:</h3>
                    <div className="bg-gray-700 rounded p-3 text-sm overflow-auto max-h-40">
                      <pre className="text-gray-300 text-xs">
                        {JSON.stringify(debugInfo.apiResponse, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}

                {debugInfo.errors && debugInfo.errors.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-red-400 mb-2">Ошибки:</h3>
                    <ul className="list-disc list-inside text-red-400 text-sm space-y-1">
                      {debugInfo.errors.map((error: string, idx: number) => (
                        <li key={idx}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div>
                  <h3 className="font-semibold text-gray-300 mb-2">Окружение:</h3>
                  <div className="bg-gray-700 rounded p-3 text-sm">
                    <p className="text-gray-400">URL: {typeof window !== 'undefined' ? window.location.href : 'N/A'}</p>
                    <p className="text-gray-400">Origin: {typeof window !== 'undefined' ? window.location.origin : 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
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
