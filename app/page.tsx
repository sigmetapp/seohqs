'use client';

import { useState, useEffect } from 'react';

interface Offer {
  id: number;
  name: string;
  topic: string;
  country: string;
  model: string;
  cr: number;
  ecpc: number;
  epc: number;
}

export default function Home() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/data');
      const data = await response.json();
      
      // Выводим отладочную информацию в консоль
      console.log('API Response:', data);
      if (data.debug) {
        console.log('Debug info:', data.debug);
      }
      
      if (data.success) {
        setOffers(data.offers || []);
      } else {
        const errorMsg = data.error || 'Ошибка загрузки данных';
        setError(errorMsg);
        if (data.tableMissing) {
          console.error('Таблица не существует. Создайте таблицу в Supabase согласно инструкции в SUPABASE_SETUP.md');
        }
        if (data.debug) {
          console.error('Debug details:', data.debug);
        }
      }
    } catch (err: any) {
      console.error('Fetch error:', err);
      setError(err.message || 'Ошибка подключения');
    } finally {
      setLoading(false);
    }
  };

  const loadTestData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/seed', { method: 'POST' });
      const data = await response.json();
      
      // Выводим отладочную информацию в консоль
      console.log('Seed API Response:', data);
      if (data.debug) {
        console.log('Seed Debug info:', data.debug);
      }
      
      if (data.success) {
        await loadData();
      } else {
        const errorMsg = data.error || 'Ошибка загрузки тестовых данных';
        setError(errorMsg);
        if (data.tableMissing) {
          console.error('Таблица не существует. Создайте таблицу в Supabase согласно инструкции в SUPABASE_SETUP.md');
        }
        if (data.debug) {
          console.error('Seed Debug details:', data.debug);
        }
      }
    } catch (err: any) {
      console.error('Seed fetch error:', err);
      setError(err.message || 'Ошибка подключения');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl mb-4">Загрузка...</div>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">Тестовая страница</h1>
          <div className="flex gap-4 mb-4">
            <button
              onClick={loadData}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
            >
              Обновить данные
            </button>
            <button
              onClick={loadTestData}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded"
            >
              Загрузить тестовые данные
            </button>
          </div>
          <p className="text-gray-400">
            Записей в базе: {offers.length}
          </p>
        </div>

        {error && (
          <div className="bg-red-900 border border-red-700 rounded p-4 mb-6">
            <p className="text-red-200 font-bold">Ошибка: {error}</p>
          </div>
        )}

        {/* Отладочная информация */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6 border border-purple-500">
          <h2 className="text-xl font-bold mb-4 text-purple-300">Отладочная информация</h2>
          <div className="space-y-2 text-sm">
            <p className="text-gray-400">
              <strong>Переменные окружения:</strong>
            </p>
            <ul className="list-disc list-inside text-gray-300 ml-4">
              <li>NEXT_PUBLIC_SUPABASE_URL: {typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_SUPABASE_URL ? '✓ установлена' : '✗ не установлена') : 'проверка на сервере'}</li>
              <li>NEXT_PUBLIC_SUPABASE_ANON_KEY: {typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✓ установлена' : '✗ не установлена') : 'проверка на сервере'}</li>
              <li>SUPABASE_SERVICE_ROLE_KEY: {typeof window !== 'undefined' ? 'проверка на сервере' : 'проверка на сервере'}</li>
            </ul>
            <p className="text-gray-400 mt-4">
              <strong>Примечание:</strong> Проверьте ответ API в консоли браузера (F12) для подробной информации о подключении к базе данных.
            </p>
          </div>
        </div>

        {offers.length === 0 && !error && (
          <div className="bg-yellow-900 border border-yellow-700 rounded p-4 mb-6">
            <p className="text-yellow-200">
              База данных пуста. Нажмите "Загрузить тестовые данные" для заполнения.
            </p>
          </div>
        )}

        {offers.length > 0 && (
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left">ID</th>
                  <th className="px-4 py-3 text-left">Название</th>
                  <th className="px-4 py-3 text-left">Тема</th>
                  <th className="px-4 py-3 text-left">Страна</th>
                  <th className="px-4 py-3 text-left">Модель</th>
                  <th className="px-4 py-3 text-left">CR</th>
                  <th className="px-4 py-3 text-left">ECPC</th>
                  <th className="px-4 py-3 text-left">EPC</th>
                </tr>
              </thead>
              <tbody>
                {offers.map((offer) => (
                  <tr key={offer.id} className="border-t border-gray-700">
                    <td className="px-4 py-3">{offer.id}</td>
                    <td className="px-4 py-3">{offer.name}</td>
                    <td className="px-4 py-3">{offer.topic}</td>
                    <td className="px-4 py-3">{offer.country}</td>
                    <td className="px-4 py-3">{offer.model}</td>
                    <td className="px-4 py-3">{offer.cr}</td>
                    <td className="px-4 py-3">{offer.ecpc}</td>
                    <td className="px-4 py-3">{offer.epc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
