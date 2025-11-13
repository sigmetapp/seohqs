'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { GoogleSearchConsoleData, PostbackData } from '@/lib/types';

export default function SiteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const siteId = params.id as string;

  const [site, setSite] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'google' | 'postbacks'>('overview');
  const [googleData, setGoogleData] = useState<GoogleSearchConsoleData[]>([]);
  const [queries, setQueries] = useState<Array<{ query: string; clicks: number; impressions: number; ctr: number; position: number }>>([]);
  const [pages, setPages] = useState<Array<{ page: string; clicks: number; impressions: number; ctr: number; position: number }>>([]);
  const [countries, setCountries] = useState<Array<{ country: string; clicks: number; impressions: number; ctr: number; position: number }>>([]);
  const [postbacks, setPostbacks] = useState<PostbackData[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    googleSearchConsoleUrl: '',
  });
  const [availableSites, setAvailableSites] = useState<Array<{ siteUrl: string; permissionLevel: string }>>([]);
  const [loadingSites, setLoadingSites] = useState(false);

  useEffect(() => {
    if (siteId) {
      loadSite();
    }
  }, [siteId]);

  useEffect(() => {
    if (site) {
      setEditForm({
        googleSearchConsoleUrl: site.googleSearchConsoleUrl || '',
      });
    }
  }, [site]);

  useEffect(() => {
    if (site && activeTab !== 'overview') {
      loadTabData();
    }
  }, [site, activeTab]);

  const loadSite = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/sites/${siteId}`);
      const data = await response.json();
      if (data.success) {
        setSite(data.site);
      }
    } catch (err) {
      console.error('Error loading site:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadTabData = async () => {
    try {
      setLoadingData(true);
      if (activeTab === 'google') {
        // Загружаем основные данные (по дням)
        const response = await fetch(`/api/sites/${siteId}/google-console`);
        const data = await response.json();
        if (data.success) {
          setGoogleData(data.data || []);
        }
        
        // Загружаем детальные данные (запросы, страницы, гео)
        await loadDetailedData();
      } else if (activeTab === 'postbacks') {
        const response = await fetch(`/api/sites/${siteId}/postbacks`);
        const data = await response.json();
        if (data.success) {
          setPostbacks(data.postbacks || []);
        }
      }
    } catch (err) {
      console.error('Error loading tab data:', err);
    } finally {
      setLoadingData(false);
    }
  };

  const loadDetailedData = async () => {
    try {
      setLoadingDetails(true);
      
      // Загружаем данные параллельно
      const [queriesRes, pagesRes, countriesRes] = await Promise.all([
        fetch(`/api/sites/${siteId}/google-console/queries`).catch(() => ({ json: async () => ({ success: false, data: [] }) })),
        fetch(`/api/sites/${siteId}/google-console/pages`).catch(() => ({ json: async () => ({ success: false, data: [] }) })),
        fetch(`/api/sites/${siteId}/google-console/countries`).catch(() => ({ json: async () => ({ success: false, data: [] }) })),
      ]);
      
      const queriesData = await queriesRes.json();
      const pagesData = await pagesRes.json();
      const countriesData = await countriesRes.json();
      
      if (queriesData.success) {
        setQueries(queriesData.data || []);
      }
      if (pagesData.success) {
        setPages(pagesData.data || []);
      }
      if (countriesData.success) {
        setCountries(countriesData.data || []);
      }
    } catch (err) {
      console.error('Error loading detailed data:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleSyncGoogle = async () => {
    try {
      setLoadingData(true);
      
      // Проверяем наличие необходимых настроек перед синхронизацией
      if (!site?.googleConsoleStatus?.hasOAuth) {
        const shouldGoToIntegrations = confirm(
          'Для синхронизации необходимо авторизоваться через Google. Перейти на страницу интеграций?'
        );
        if (shouldGoToIntegrations) {
          window.location.href = '/integrations';
        }
        return;
      }
      
      // Если URL не указан, пытаемся синхронизировать автоматически
      // Система попытается найти сайт по домену
      if (!site?.googleConsoleStatus?.hasUrl) {
        const shouldProceed = confirm(
          'URL сайта не указан. Система попытается автоматически найти сайт в Google Search Console по домену. Продолжить?'
        );
        if (!shouldProceed) {
          return;
        }
      }
      
      const response = await fetch(`/api/sites/${siteId}/google-console/sync`, {
        method: 'POST',
      });
      
      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        throw new Error(`Ошибка сервера: ${response.status} ${response.statusText}`);
      }
      
      if (data.success) {
        loadTabData();
        alert(`Данные Google Search Console обновлены. Загружено ${data.count || 0} записей.`);
        // Перезагружаем детальные данные после синхронизации
        await loadDetailedData();
      } else {
        const errorMessage = data.error || 'Ошибка синхронизации';
        console.error('Google sync error:', errorMessage);
        alert(errorMessage);
      }
    } catch (err: any) {
      console.error('Error syncing Google:', err);
      const errorMessage = err.message || 'Ошибка синхронизации Google Search Console';
      alert(errorMessage);
    } finally {
      setLoadingData(false);
    }
  };


  const handleUpdateSite = async () => {
    try {
      const response = await fetch(`/api/sites/${siteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...site,
          googleSearchConsoleUrl: editForm.googleSearchConsoleUrl || undefined,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setSite(data.site);
        setShowEditModal(false);
        alert('Настройки сайта обновлены');
      } else {
        alert(data.error || 'Ошибка обновления сайта');
      }
    } catch (err) {
      console.error('Error updating site:', err);
      alert('Ошибка обновления сайта');
    }
  };

  if (loading && !site) {
    return (
      <main className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">Загрузка...</div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <button
            onClick={() => router.push('/sites')}
            className="text-blue-400 hover:text-blue-300 mb-4"
          >
            ← Назад к сайтам
          </button>
          <h1 className="text-4xl font-bold mb-2">{site?.name || 'Сайт'}</h1>
          <p className="text-gray-400">{site?.domain}</p>
        </div>

        {/* Вкладки */}
        <div className="border-b border-gray-700 mb-6">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', label: 'Обзор' },
              { id: 'google', label: 'Google Console' },
              { id: 'postbacks', label: 'Постбеки' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Контент вкладок */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="text-sm text-gray-400 mb-2">Домен</div>
                <div className="text-xl font-bold">{site?.domain}</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="text-sm text-gray-400 mb-2">Google Console</div>
                <div className="text-xl font-bold mb-2">
                  {site?.hasGoogleConsoleConnection ? (
                    <span className="text-green-400">Подключено</span>
                  ) : (
                    <span className="text-yellow-400">Не подключено</span>
                  )}
                </div>
                {!site?.hasGoogleConsoleConnection && (
                  <div className="text-xs text-gray-400 space-y-1">
                    {!site?.googleConsoleStatus?.hasOAuth && (
                      <div>
                        ⚠️ OAuth не настроен.{' '}
                        <a href="/integrations" className="text-blue-400 hover:underline">
                          Настроить
                        </a>
                      </div>
                    )}
                    {site?.googleConsoleStatus?.hasOAuth && !site?.googleConsoleStatus?.hasUrl && (
                      <div>
                        ⚠️ URL не указан.{' '}
                        <button
                          onClick={() => setShowEditModal(true)}
                          className="text-blue-400 hover:underline"
                        >
                          Указать
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">Настройки сайта</h3>
                <button
                  onClick={() => setShowEditModal(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm"
                >
                  Редактировать
                </button>
              </div>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-400">Google Search Console URL:</span>{' '}
                  <span className="text-gray-300">
                    {site?.googleSearchConsoleUrl || 'Не указан'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'google' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Данные Google Search Console</h2>
              <div className="flex gap-2">
                {!site?.hasGoogleConsoleConnection && (
                  <div className="flex items-center gap-2 text-sm text-yellow-400 mr-4">
                    {!site?.googleConsoleStatus?.hasOAuth ? (
                      <>
                        <span>⚠️ OAuth не настроен</span>
                        <a
                          href="/integrations"
                          className="text-blue-400 hover:underline"
                        >
                          Настроить
                        </a>
                      </>
                    ) : !site?.googleConsoleStatus?.hasUrl ? (
                      <>
                        <span>ℹ️ URL не указан (будет определен автоматически по домену)</span>
                        <button
                          onClick={() => setShowEditModal(true)}
                          className="text-blue-400 hover:underline ml-2"
                        >
                          Указать вручную
                        </button>
                      </>
                    ) : null}
                  </div>
                )}
                <button
                  onClick={handleSyncGoogle}
                  disabled={loadingData}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loadingData ? 'Синхронизация...' : 'Синхронизировать'}
                </button>
              </div>
            </div>
            {!site?.hasGoogleConsoleConnection && (
              <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4">
                <p className="text-yellow-300 text-sm">
                  {!site?.googleConsoleStatus?.hasOAuth
                    ? 'Для синхронизации данных необходимо авторизоваться через Google в разделе Интеграции.'
                    : !site?.googleConsoleStatus?.hasUrl
                    ? 'URL сайта не указан. Система автоматически попытается найти сайт в Google Search Console по домену. Если это не сработает, укажите URL вручную.'
                    : 'Подключение не настроено.'}
                </p>
              </div>
            )}
            {loadingData || loadingDetails ? (
              <div className="text-center py-8">Загрузка данных...</div>
            ) : googleData.length === 0 && queries.length === 0 && pages.length === 0 && countries.length === 0 ? (
              <div className="bg-gray-800 rounded-lg p-8 text-center border border-gray-700">
                <p className="text-gray-400">Данные не загружены. Нажмите "Синхронизировать" для загрузки данных.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Общая статистика */}
                {googleData.length > 0 && (
                  <div className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
                    <h3 className="text-lg font-bold p-4 border-b border-gray-700">Показы и клики по дням</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-700">
                          <tr>
                            <th className="px-4 py-3 text-left">Дата</th>
                            <th className="px-4 py-3 text-left">Клики</th>
                            <th className="px-4 py-3 text-left">Показы</th>
                            <th className="px-4 py-3 text-left">CTR</th>
                            <th className="px-4 py-3 text-left">Позиция</th>
                          </tr>
                        </thead>
                        <tbody>
                          {googleData.map((item, index) => (
                            <tr key={index} className="border-t border-gray-700">
                              <td className="px-4 py-3">{new Date(item.date).toLocaleDateString('ru-RU')}</td>
                              <td className="px-4 py-3">{item.clicks}</td>
                              <td className="px-4 py-3">{item.impressions}</td>
                              <td className="px-4 py-3">{(item.ctr * 100).toFixed(2)}%</td>
                              <td className="px-4 py-3">{item.position.toFixed(1)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Поисковые запросы */}
                {queries.length > 0 && (
                  <div className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
                    <h3 className="text-lg font-bold p-4 border-b border-gray-700">Поисковые запросы</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-700">
                          <tr>
                            <th className="px-4 py-3 text-left">Запрос</th>
                            <th className="px-4 py-3 text-left">Клики</th>
                            <th className="px-4 py-3 text-left">Показы</th>
                            <th className="px-4 py-3 text-left">CTR</th>
                            <th className="px-4 py-3 text-left">Позиция</th>
                          </tr>
                        </thead>
                        <tbody>
                          {queries.slice(0, 50).map((item, index) => (
                            <tr key={index} className="border-t border-gray-700">
                              <td className="px-4 py-3">{item.query}</td>
                              <td className="px-4 py-3">{item.clicks}</td>
                              <td className="px-4 py-3">{item.impressions}</td>
                              <td className="px-4 py-3">{(item.ctr * 100).toFixed(2)}%</td>
                              <td className="px-4 py-3">{item.position.toFixed(1)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {queries.length > 50 && (
                      <div className="p-4 text-sm text-gray-400 border-t border-gray-700">
                        Показано 50 из {queries.length} запросов
                      </div>
                    )}
                  </div>
                )}

                {/* Страницы */}
                {pages.length > 0 && (
                  <div className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
                    <h3 className="text-lg font-bold p-4 border-b border-gray-700">Страницы</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-700">
                          <tr>
                            <th className="px-4 py-3 text-left">Страница</th>
                            <th className="px-4 py-3 text-left">Клики</th>
                            <th className="px-4 py-3 text-left">Показы</th>
                            <th className="px-4 py-3 text-left">CTR</th>
                            <th className="px-4 py-3 text-left">Позиция</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pages.slice(0, 50).map((item, index) => (
                            <tr key={index} className="border-t border-gray-700">
                              <td className="px-4 py-3">
                                <a 
                                  href={item.page} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-400 hover:underline truncate block max-w-md"
                                  title={item.page}
                                >
                                  {item.page}
                                </a>
                              </td>
                              <td className="px-4 py-3">{item.clicks}</td>
                              <td className="px-4 py-3">{item.impressions}</td>
                              <td className="px-4 py-3">{(item.ctr * 100).toFixed(2)}%</td>
                              <td className="px-4 py-3">{item.position.toFixed(1)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {pages.length > 50 && (
                      <div className="p-4 text-sm text-gray-400 border-t border-gray-700">
                        Показано 50 из {pages.length} страниц
                      </div>
                    )}
                  </div>
                )}

                {/* География (страны) */}
                {countries.length > 0 && (
                  <div className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
                    <h3 className="text-lg font-bold p-4 border-b border-gray-700">География</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-700">
                          <tr>
                            <th className="px-4 py-3 text-left">Страна</th>
                            <th className="px-4 py-3 text-left">Клики</th>
                            <th className="px-4 py-3 text-left">Показы</th>
                            <th className="px-4 py-3 text-left">CTR</th>
                            <th className="px-4 py-3 text-left">Позиция</th>
                          </tr>
                        </thead>
                        <tbody>
                          {countries.map((item, index) => (
                            <tr key={index} className="border-t border-gray-700">
                              <td className="px-4 py-3">{item.country}</td>
                              <td className="px-4 py-3">{item.clicks}</td>
                              <td className="px-4 py-3">{item.impressions}</td>
                              <td className="px-4 py-3">{(item.ctr * 100).toFixed(2)}%</td>
                              <td className="px-4 py-3">{item.position.toFixed(1)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'postbacks' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Постбеки с партнерок</h2>
            {loadingData ? (
              <div className="text-center py-8">Загрузка данных...</div>
            ) : postbacks.length === 0 ? (
              <div className="bg-gray-800 rounded-lg p-8 text-center border border-gray-700">
                <p className="text-gray-400 mb-4">Постбеки не найдены</p>
                <p className="text-sm text-gray-500">
                  Настройте endpoint для приема постбеков: <code className="bg-gray-900 px-2 py-1 rounded">/api/sites/{siteId}/postbacks</code>
                </p>
              </div>
            ) : (
              <div className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
                <table className="w-full">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left">Дата</th>
                      <th className="px-4 py-3 text-left">Партнерка</th>
                      <th className="px-4 py-3 text-left">Событие</th>
                      <th className="px-4 py-3 text-left">Сумма</th>
                    </tr>
                  </thead>
                  <tbody>
                    {postbacks.map((postback, index) => (
                      <tr key={index} className="border-t border-gray-700">
                        <td className="px-4 py-3">{new Date(postback.date).toLocaleString('ru-RU')}</td>
                        <td className="px-4 py-3">{postback.network}</td>
                        <td className="px-4 py-3">{postback.event}</td>
                        <td className="px-4 py-3">
                          {postback.amount} {postback.currency}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Модальное окно редактирования сайта */}
        {showEditModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md border border-gray-700">
              <h2 className="text-2xl font-bold mb-4">Редактировать сайт</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Google Search Console URL <span className="text-gray-500 text-xs">(необязательно)</span>
                  </label>
                  <input
                    type="text"
                    value={editForm.googleSearchConsoleUrl}
                    onChange={(e) =>
                      setEditForm({ ...editForm, googleSearchConsoleUrl: e.target.value })
                    }
                    className="w-full px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                    placeholder="sc-domain:example.com или https://example.com"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Если URL не указан, система автоматически найдет сайт в Google Search Console по домену "{site?.domain}". 
                    Поддерживаются форматы:{' '}
                    <code className="bg-gray-900 px-1 rounded">sc-domain:example.com</code>,{' '}
                    <code className="bg-gray-900 px-1 rounded">https://example.com</code>
                  </p>
                  {site?.googleConsoleStatus?.hasOAuth && (
                    <button
                      onClick={async () => {
                        try {
                          setLoadingSites(true);
                          const response = await fetch('/api/sites/google-console-sites');
                          const data = await response.json();
                          if (data.success) {
                            setAvailableSites(data.sites);
                          } else {
                            alert('Ошибка загрузки списка сайтов: ' + (data.error || 'Неизвестная ошибка'));
                          }
                        } catch (error: any) {
                          alert('Ошибка загрузки списка сайтов: ' + error.message);
                        } finally {
                          setLoadingSites(false);
                        }
                      }}
                      className="mt-2 text-sm text-blue-400 hover:underline"
                      disabled={loadingSites}
                    >
                      {loadingSites ? 'Загрузка...' : 'Показать доступные сайты из Google Search Console'}
                    </button>
                  )}
                  {availableSites.length > 0 && (
                    <div className="mt-2 max-h-40 overflow-y-auto border border-gray-600 rounded bg-gray-900">
                      {availableSites.map((gscSite, index) => (
                        <button
                          key={index}
                          onClick={() => {
                            setEditForm({ ...editForm, googleSearchConsoleUrl: gscSite.siteUrl });
                            setAvailableSites([]);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-gray-800 text-sm border-b border-gray-700 last:border-b-0"
                        >
                          <div className="font-medium">{gscSite.siteUrl}</div>
                          <div className="text-xs text-gray-500">{gscSite.permissionLevel}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleUpdateSite}
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
                  >
                    Сохранить
                  </button>
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
                  >
                    Отмена
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
