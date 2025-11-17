'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Site, Tag } from '@/lib/types';

export default function SitesPage() {
  const [sites, setSites] = useState<Site[]>([]);
  const [googleConsoleAggregatedData, setGoogleConsoleAggregatedData] = useState<Array<{
    id: number;
    domain: string;
    name: string;
    hasGoogleConsoleConnection: boolean;
    googleConsoleSiteUrl: string | null;
    totalImpressions: number;
    totalClicks: number;
    totalPostbacks: number;
    indexedPages: number | null;
    referringDomains: number | null;
    backlinks: number | null;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAggregatedData, setLoadingAggregatedData] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSite, setNewSite] = useState({
    name: '',
    domain: '',
    category: '',
    googleSearchConsoleUrl: '',
  });
  const [categories, setCategories] = useState<string[]>([]);
  // Состояние для вкладки "Все сайты" - период для показов и кликов
  const [selectedPeriodAllSites, setSelectedPeriodAllSites] = useState<number>(30); // 7, 30, 90, 180 дней
  const [sitesStats, setSitesStats] = useState<Record<number, { tasks: { total: number; open: number; closed: number }; links: number }>>({});
  const [loadingStats, setLoadingStats] = useState(false);
  // Теги
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [showTagModal, setShowTagModal] = useState(false);
  const [tagModalSiteId, setTagModalSiteId] = useState<number | null>(null);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3b82f6');

  useEffect(() => {
    loadSites();
    loadCategories();
    loadAggregatedData();
    loadTags();
  }, [selectedPeriodAllSites]);

  useEffect(() => {
    if (sites.length > 0) {
      loadSitesStats();
    }
  }, [sites]);

  const loadCategories = async () => {
    try {
      const response = await fetch('/api/data');
      const data = await response.json();
      if (data.success && data.offers) {
        // Получаем уникальные категории из офферов
        const uniqueCategories = Array.from(
          new Set(data.offers.map((offer: any) => offer.topic || offer.category).filter(Boolean))
        ) as string[];
        setCategories(uniqueCategories.sort());
      }
    } catch (err) {
      console.error('Error loading categories:', err);
    }
  };

  const loadSites = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/sites');
      const data = await response.json();
      if (data.success) {
        setSites(data.sites || []);
      }
    } catch (err) {
      console.error('Error loading sites:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAggregatedData = async () => {
    try {
      setLoadingAggregatedData(true);
      const url = `/api/sites/google-console-aggregated?days=${selectedPeriodAllSites}`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.success) {
        setGoogleConsoleAggregatedData(data.sites || []);
      }
    } catch (err) {
      console.error('Error loading aggregated data:', err);
    } finally {
      setLoadingAggregatedData(false);
    }
  };

  const loadSitesStats = async () => {
    try {
      setLoadingStats(true);
      const response = await fetch('/api/sites/stats');
      const data = await response.json();
      if (data.success && data.stats) {
        const statsMap: Record<number, { tasks: { total: number; open: number; closed: number }; links: number }> = {};
        data.stats.forEach((stat: any) => {
          statsMap[stat.siteId] = {
            tasks: stat.tasks,
            links: stat.links,
          };
        });
        setSitesStats(statsMap);
      }
    } catch (err) {
      console.error('Error loading sites stats:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  const loadTags = async () => {
    try {
      const response = await fetch('/api/tags');
      const data = await response.json();
      if (data.success) {
        setTags(data.tags || []);
      }
    } catch (err) {
      console.error('Error loading tags:', err);
    }
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) {
      alert('Введите название тега');
      return;
    }
    try {
      const response = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTagName, color: newTagColor }),
      });
      const data = await response.json();
      if (data.success) {
        setNewTagName('');
        setNewTagColor('#3b82f6');
        loadTags();
      } else {
        alert(data.error || 'Ошибка создания тега');
      }
    } catch (err) {
      console.error('Error creating tag:', err);
      alert('Ошибка создания тега');
    }
  };

  const handleAssignTag = async (siteId: number, tagId: number) => {
    try {
      const response = await fetch(`/api/sites/${siteId}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tagId }),
      });
      if (response.ok) {
        loadSites();
      }
    } catch (err) {
      console.error('Error assigning tag:', err);
    }
  };

  const handleRemoveTag = async (siteId: number, tagId: number) => {
    try {
      const response = await fetch(`/api/sites/${siteId}/tags?tagId=${tagId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        loadSites();
      }
    } catch (err) {
      console.error('Error removing tag:', err);
    }
  };

  // Фильтрация сайтов по тегам
  const filteredSites = useMemo(() => {
    if (selectedTagIds.length === 0) {
      return sites;
    }
    return sites.filter(site => {
      const siteTagIds = (site.tags || []).map(t => t.id);
      return selectedTagIds.some(tagId => siteTagIds.includes(tagId));
    });
  }, [sites, selectedTagIds]);

  const handleCreateSite = async () => {
    try {
      const response = await fetch('/api/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSite),
      });
      const data = await response.json();
      if (data.success) {
        setShowCreateModal(false);
        setNewSite({ name: '', domain: '', category: '', googleSearchConsoleUrl: '' });
        loadSites();
      } else {
        alert(data.error || 'Ошибка создания сайта');
      }
    } catch (err) {
      console.error('Error creating site:', err);
      alert('Ошибка создания сайта');
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">Загрузка...</div>
        </div>
      </main>
    );
  }

  // Функция для нормализации домена из Google Console URL
  const normalizeGoogleConsoleDomain = (siteUrl: string): string => {
    let domain = siteUrl.replace(/^sc-domain:/, '');
    domain = domain.replace(/^https?:\/\//, '');
    domain = domain.replace(/^www\./, '');
    domain = domain.split('/')[0];
    return domain.toLowerCase().trim();
  };

  return (
    <main className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold mb-2">Панель сайтов</h1>
            <p className="text-gray-400">Мониторинг сайтов: Google Console, постбеки</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm"
          >
            + Добавить сайт
          </button>
        </div>


        {
          sites.length === 0 ? (
            <div className="bg-gray-800 rounded-lg p-8 text-center border border-gray-700">
              <p className="text-gray-400 mb-4">Сайты не добавлены</p>
            </div>
          ) : (
            <>
              {/* Фильтры и настройки */}
              <div className="bg-gray-800 rounded-lg p-4 mb-6 border border-gray-700 space-y-4">
                {/* Фильтр по тегам */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm text-gray-400">Фильтр по тегам:</span>
                    <button
                      onClick={() => setShowTagModal(true)}
                      className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs"
                    >
                      + Создать тег
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <button
                        key={tag.id}
                        onClick={() => {
                          setSelectedTagIds(prev =>
                            prev.includes(tag.id)
                              ? prev.filter(id => id !== tag.id)
                              : [...prev, tag.id]
                          );
                        }}
                        className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                          selectedTagIds.includes(tag.id)
                            ? 'ring-2 ring-blue-500'
                            : ''
                        }`}
                        style={{ backgroundColor: tag.color + '40', color: tag.color, borderColor: tag.color }}
                      >
                        {tag.name}
                      </button>
                    ))}
                    {selectedTagIds.length > 0 && (
                      <button
                        onClick={() => setSelectedTagIds([])}
                        className="px-3 py-1 rounded text-xs bg-gray-700 hover:bg-gray-600 text-gray-300"
                      >
                        Сбросить
                      </button>
                    )}
                  </div>
                </div>
                {/* Кнопки выбора периода */}
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-400">Период для показов и кликов:</span>
                  <div className="flex gap-2">
                    {[7, 30, 90, 180].map((days) => (
                      <button
                        key={days}
                        onClick={() => setSelectedPeriodAllSites(days)}
                        className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                          selectedPeriodAllSites === days
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        {days} дней
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-700">
                      <tr>
                        <th className="px-4 py-3 text-left">Домен</th>
                        <th className="px-4 py-3 text-left">Теги</th>
                        <th className="px-4 py-3 text-center" style={{ width: '60px' }}>✓</th>
                        <th className="px-4 py-3 text-left">Задачи</th>
                        <th className="px-4 py-3 text-left">Link Profile</th>
                        <th className="px-4 py-3 text-left">Показы</th>
                        <th className="px-4 py-3 text-left">Клики</th>
                        <th className="px-4 py-3 text-left">Постбеки</th>
                        <th className="px-4 py-3 text-left">Действия</th>
                      </tr>
                    </thead>
                  <tbody>
                    {filteredSites.map((site) => {
                      // Находим соответствующие данные из googleConsoleAggregatedData
                      const siteData = googleConsoleAggregatedData.find(s => s.id === site.id);
                      const stats = sitesStats[site.id];
                      return (
                        <tr key={site.id} className="border-t border-gray-700 hover:bg-gray-750">
                          <td className="px-4 py-3">
                            <div className="font-medium">{site.domain}</div>
                            <div className="text-xs text-gray-500">{site.name}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1 mb-1">
                              {(site.tags || []).map((tag) => (
                                <span
                                  key={tag.id}
                                  className="px-2 py-0.5 rounded text-xs"
                                  style={{ backgroundColor: tag.color + '40', color: tag.color }}
                                >
                                  {tag.name}
                                </span>
                              ))}
                            </div>
                            <button
                              onClick={() => {
                                setTagModalSiteId(site.id);
                                setShowTagModal(true);
                              }}
                              className="text-xs text-blue-400 hover:text-blue-300"
                            >
                              + Добавить тег
                            </button>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {siteData?.hasGoogleConsoleConnection ? (
                              <span className="text-green-400 text-xl" title="Подключено">✓</span>
                            ) : (
                              <span className="text-gray-500 text-xl" title="Не подключено">✗</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {loadingStats ? (
                              <span className="text-gray-500">...</span>
                            ) : stats ? (
                              <div className="text-sm">
                                <div>Всего: {stats.tasks.total}</div>
                                <div className="text-green-400">Открыто: {stats.tasks.open}</div>
                                <div className="text-gray-500">Закрыто: {stats.tasks.closed}</div>
                              </div>
                            ) : (
                              <span className="text-gray-500">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {loadingStats ? (
                              <span className="text-gray-500">...</span>
                            ) : stats ? (
                              <span>{stats.links}</span>
                            ) : (
                              <span className="text-gray-500">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {siteData && siteData.totalImpressions > 0 ? (
                              <span>{siteData.totalImpressions.toLocaleString()}</span>
                            ) : (
                              <span className="text-gray-500">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {siteData && siteData.totalClicks > 0 ? (
                              <span>{siteData.totalClicks.toLocaleString()}</span>
                            ) : (
                              <span className="text-gray-500">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {siteData && siteData.totalPostbacks !== undefined ? (
                              <span>{siteData.totalPostbacks.toLocaleString()}</span>
                            ) : (
                              <span className="text-gray-500">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <Link
                              href={`/sites/${site.id}`}
                              className="text-blue-400 hover:text-blue-300 hover:underline text-sm"
                            >
                              Открыть →
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            </>
          )
        }

        {/* Модальное окно управления тегами */}
        {showTagModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md border border-gray-700 max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold mb-4">
                {tagModalSiteId ? 'Управление тегами сайта' : 'Создать тег'}
              </h2>
              
              {tagModalSiteId ? (
                // Управление тегами для конкретного сайта
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Присвоить тег:
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag) => {
                        const site = sites.find(s => s.id === tagModalSiteId);
                        const isAssigned = (site?.tags || []).some(t => t.id === tag.id);
                        return (
                          <button
                            key={tag.id}
                            onClick={() => {
                              if (isAssigned) {
                                handleRemoveTag(tagModalSiteId, tag.id);
                              } else {
                                handleAssignTag(tagModalSiteId, tag.id);
                              }
                            }}
                            className={`px-3 py-1 rounded text-sm ${
                              isAssigned ? 'ring-2 ring-blue-500' : ''
                            }`}
                            style={{ backgroundColor: tag.color + '40', color: tag.color }}
                          >
                            {tag.name} {isAssigned ? '✓' : '+'}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setShowTagModal(false);
                        setTagModalSiteId(null);
                      }}
                      className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
                    >
                      Закрыть
                    </button>
                  </div>
                </div>
              ) : (
                // Создание нового тега
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Название тега
                    </label>
                    <input
                      type="text"
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      className="w-full px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                      placeholder="Название тега"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Цвет
                    </label>
                    <input
                      type="color"
                      value={newTagColor}
                      onChange={(e) => setNewTagColor(e.target.value)}
                      className="w-full h-10 bg-gray-700 rounded border border-gray-600"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCreateTag}
                      className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
                    >
                      Создать
                    </button>
                    <button
                      onClick={() => {
                        setShowTagModal(false);
                        setTagModalSiteId(null);
                        setNewTagName('');
                        setNewTagColor('#3b82f6');
                      }}
                      className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
                    >
                      Отмена
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Модальное окно создания сайта */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md border border-gray-700">
              <h2 className="text-2xl font-bold mb-4">Добавить сайт</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Название сайта
                  </label>
                  <input
                    type="text"
                    value={newSite.name}
                    onChange={(e) => setNewSite({ ...newSite, name: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                    placeholder="Мой сайт"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Домен
                  </label>
                  <input
                    type="text"
                    value={newSite.domain}
                    onChange={(e) => setNewSite({ ...newSite, domain: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                    placeholder="example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Категория (необязательно)
                  </label>
                  <select
                    value={newSite.category}
                    onChange={(e) => setNewSite({ ...newSite, category: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">Выберите категорию</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                  {categories.length === 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      Загрузите офферы, чтобы увидеть доступные категории
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Google Search Console URL <span className="text-gray-500 text-xs">(необязательно - будет определен автоматически по домену)</span>
                  </label>
                  <input
                    type="text"
                    value={newSite.googleSearchConsoleUrl}
                    onChange={(e) => setNewSite({ ...newSite, googleSearchConsoleUrl: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                    placeholder="https://search.google.com/search-console/..."
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCreateSite}
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
                  >
                    Создать
                  </button>
                  <button
                    onClick={() => setShowCreateModal(false)}
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
