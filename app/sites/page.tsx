'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { Site, Tag, SiteStatus } from '@/lib/types';
import { useI18n } from '@/lib/i18n-context';

export default function SitesPage() {
  const { t } = useI18n();
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
    // Статусы
    const [statuses, setStatuses] = useState<SiteStatus[]>([]);
    const [selectedStatusIds, setSelectedStatusIds] = useState<number[]>([]);
    const [siteSearchTerm, setSiteSearchTerm] = useState('');
    const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
    const [showTagModal, setShowTagModal] = useState(false);
    const [tagModalSiteId, setTagModalSiteId] = useState<number | null>(null);
    const [newTagName, setNewTagName] = useState('');
    const [newTagColor, setNewTagColor] = useState('#3b82f6');
    const [showEditTagModal, setShowEditTagModal] = useState(false);
    const [editingTagId, setEditingTagId] = useState<number | null>(null);
    const [domainSearch, setDomainSearch] = useState('');
    const [searchResults, setSearchResults] = useState<Site[]>([]);
    const [searching, setSearching] = useState(false);
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const tagsDropdownRef = useRef<HTMLDivElement | null>(null);
    // Sorting state
    const [sortColumn, setSortColumn] = useState<string | null>(null);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    useEffect(() => {
      loadSites();
      loadCategories();
      loadTags();
      loadStatuses();
    }, []);

    const loadStatuses = async () => {
      try {
        const response = await fetch('/api/statuses');
        const data = await response.json();
        if (data.success) {
          setStatuses(data.statuses || []);
        }
      } catch (err) {
        console.error('Error loading statuses:', err);
      }
    };

    useEffect(() => {
      loadAggregatedData();
    }, [selectedPeriodAllSites, selectedTagIds, selectedStatusIds]);

    useEffect(() => {
      if (!isTagDropdownOpen) {
        return;
      }

      const handleClickOutside = (event: MouseEvent) => {
        if (tagsDropdownRef.current && !tagsDropdownRef.current.contains(event.target as Node)) {
          setIsTagDropdownOpen(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [isTagDropdownOpen]);

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
        const params = new URLSearchParams({
          days: String(selectedPeriodAllSites),
        });
        if (selectedTagIds.length > 0) {
          params.append('tagIds', selectedTagIds.join(','));
        }
        if (selectedStatusIds.length > 0) {
          params.append('statusIds', selectedStatusIds.join(','));
        }
        const response = await fetch(`/api/sites/google-console-aggregated?${params.toString()}`);
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
      alert(t('sites.enterTagName'));
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
        alert(data.error || t('sites.tagCreationError'));
      }
    } catch (err) {
      console.error('Error creating tag:', err);
      alert(t('sites.tagCreationError'));
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

  const handleSearchSiteByDomain = async () => {
    if (!domainSearch.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      // Ищем сайт по домену среди существующих сайтов
      const normalizedSearch = domainSearch.toLowerCase().trim().replace(/^www\./, '').replace(/^https?:\/\//, '').split('/')[0];
      const matchingSites = sites.filter(site => {
        const normalizedDomain = site.domain.toLowerCase().trim().replace(/^www\./, '').replace(/^https?:\/\//, '').split('/')[0];
        return normalizedDomain.includes(normalizedSearch) || normalizedSearch.includes(normalizedDomain);
      });
      setSearchResults(matchingSites);
    } catch (err) {
      console.error('Error searching sites:', err);
    } finally {
      setSearching(false);
    }
  };

  // Обновляем результаты поиска при изменении сайтов
  useEffect(() => {
    if (showEditTagModal && domainSearch.trim()) {
      handleSearchSiteByDomain();
    }
  }, [sites]);

  // Debounce для поиска (только когда открыто модальное окно редактирования)
  useEffect(() => {
    if (!showEditTagModal) {
      return;
    }
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    if (domainSearch.trim()) {
      searchTimeoutRef.current = setTimeout(() => {
        handleSearchSiteByDomain();
      }, 300);
    } else {
      setSearchResults([]);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [domainSearch, showEditTagModal]);

  const handleAddSiteToTag = async (siteId: number, tagId: number) => {
    try {
      const response = await fetch(`/api/sites/${siteId}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tagId }),
      });
      if (response.ok) {
        loadSites();
        // Обновляем результаты поиска
        setSearchResults(prev => prev.map(site => {
          if (site.id === siteId) {
            return { ...site, tags: [...(site.tags || []), tags.find(t => t.id === tagId)!] };
          }
          return site;
        }));
      }
    } catch (err) {
      console.error('Error adding site to tag:', err);
    }
  };

  // Фильтрация и сортировка сайтов
    const filteredAndSortedSites = useMemo(() => {
      let result = sites;

      if (selectedTagIds.length > 0) {
        result = result.filter(site => {
          const siteTagIds = (site.tags || []).map(t => t.id);
          return selectedTagIds.some(tagId => siteTagIds.includes(tagId));
        });
      }

      if (selectedStatusIds.length > 0) {
        result = result.filter(site => 
          site.status && selectedStatusIds.includes(site.status.id)
        );
      }

      const normalizedSearch = siteSearchTerm.trim().toLowerCase();
      if (normalizedSearch) {
        result = result.filter(site => {
          const domain = site.domain?.toLowerCase() || '';
          const name = site.name?.toLowerCase() || '';
          return domain.includes(normalizedSearch) || name.includes(normalizedSearch);
        });
      }

      // Сортировка
      if (sortColumn) {
        result = [...result].sort((a, b) => {
          let aValue: number | string = 0;
          let bValue: number | string = 0;

          switch (sortColumn) {
            case 'tasks':
              aValue = sitesStats[a.id]?.tasks?.total || 0;
              bValue = sitesStats[b.id]?.tasks?.total || 0;
              break;
            case 'links':
              aValue = sitesStats[a.id]?.links || 0;
              bValue = sitesStats[b.id]?.links || 0;
              break;
            case 'impressions':
              const aData = googleConsoleAggregatedData.find(s => s.id === a.id);
              const bData = googleConsoleAggregatedData.find(s => s.id === b.id);
              aValue = aData?.totalImpressions || 0;
              bValue = bData?.totalImpressions || 0;
              break;
            case 'clicks':
              const aDataClicks = googleConsoleAggregatedData.find(s => s.id === a.id);
              const bDataClicks = googleConsoleAggregatedData.find(s => s.id === b.id);
              aValue = aDataClicks?.totalClicks || 0;
              bValue = bDataClicks?.totalClicks || 0;
              break;
            case 'postbacks':
              const aDataPostbacks = googleConsoleAggregatedData.find(s => s.id === a.id);
              const bDataPostbacks = googleConsoleAggregatedData.find(s => s.id === b.id);
              aValue = aDataPostbacks?.totalPostbacks || 0;
              bValue = bDataPostbacks?.totalPostbacks || 0;
              break;
            default:
              return 0;
          }

          if (typeof aValue === 'number' && typeof bValue === 'number') {
            return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
          }
          return 0;
        });
      }

      return result;
    }, [sites, selectedTagIds, selectedStatusIds, siteSearchTerm, sortColumn, sortDirection, sitesStats, googleConsoleAggregatedData]);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

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
        alert(data.error || t('sites.siteCreationError'));
      }
    } catch (err) {
      console.error('Error creating site:', err);
      alert(t('sites.siteCreationError'));
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-900 dark:bg-gray-900 bg-white text-white dark:text-white text-gray-900 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">{t('common.loading')}</div>
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
    <main className="min-h-screen bg-gray-900 dark:bg-gray-900 bg-white text-white dark:text-white text-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold mb-2">{t('sites.title')}</h1>
            <p className="text-gray-400 dark:text-gray-400 text-gray-600">{t('sites.description')}</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm text-white"
          >
            {t('sites.addSite')}
          </button>
        </div>


        {
          sites.length === 0 ? (
            <div className="bg-gray-800 dark:bg-gray-800 bg-gray-50 rounded-lg p-8 text-center border border-gray-700 dark:border-gray-700 border-gray-200">
              <p className="text-gray-400 dark:text-gray-400 text-gray-600 mb-4">{t('sites.noSites')}</p>
            </div>
          ) : (
            <>
                {/* Фильтры и настройки - зафиксированы вверху */}
                <div className="sticky top-0 z-40 bg-gray-900 dark:bg-gray-900 bg-white pb-4 mb-6">
                  <div className="bg-gray-800 dark:bg-gray-800 bg-gray-50 rounded-lg p-4 border border-gray-700 dark:border-gray-700 border-gray-200">
                    <div className="flex flex-wrap items-end gap-4">
                      {/* Поиск по домену */}
                      <div className="flex-1 min-w-[200px]">
                        <label className="block text-sm text-gray-400 dark:text-gray-400 text-gray-600 mb-2">
                          {t('sites.searchByDomain')}
                        </label>
                        <input
                          type="text"
                          value={siteSearchTerm}
                          onChange={(e) => setSiteSearchTerm(e.target.value)}
                          placeholder={t('sites.searchPlaceholder')}
                          className="w-full px-4 py-2 bg-gray-700 dark:bg-gray-700 bg-gray-100 text-white dark:text-white text-gray-900 rounded border border-gray-600 dark:border-gray-600 border-gray-300 focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                      {/* Фильтр по тегам */}
                      <div className="flex-1 min-w-[200px]">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-gray-400 dark:text-gray-400 text-gray-600">{t('sites.filterByTags')}</span>
                          <button
                            onClick={() => {
                              setShowTagModal(true);
                              setIsTagDropdownOpen(false);
                            }}
                            className="px-2 py-1 bg-gray-700 dark:bg-gray-700 bg-gray-200 hover:bg-gray-600 dark:hover:bg-gray-600 hover:bg-gray-300 rounded text-xs text-white dark:text-white text-gray-900"
                          >
                            {t('sites.createTag')}
                          </button>
                        </div>
                        <div className="relative" ref={tagsDropdownRef}>
                          <button
                            type="button"
                            onClick={() => setIsTagDropdownOpen((prev) => !prev)}
                            className="w-full flex items-center justify-between px-4 py-2 bg-gray-700 dark:bg-gray-700 bg-gray-100 text-white dark:text-white text-gray-900 rounded border border-gray-600 dark:border-gray-600 border-gray-300 focus:border-blue-500 focus:outline-none"
                          >
                            <span className="text-sm text-white dark:text-white text-gray-900">
                              {selectedTagIds.length > 0
                                ? `${t('sites.selected')}: ${selectedTagIds.length}`
                                : t('sites.allTags')}
                            </span>
                            <svg
                              className={`w-4 h-4 transform transition-transform ${isTagDropdownOpen ? 'rotate-180' : ''}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                          {isTagDropdownOpen && (
                            <div className="absolute z-50 mt-2 w-full bg-gray-900 dark:bg-gray-900 bg-white border border-gray-700 dark:border-gray-700 border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                              {tags.length === 0 ? (
                                <p className="px-3 py-2 text-sm text-gray-400 dark:text-gray-400 text-gray-600">
                                  {t('sites.tagsNotCreated')}
                                </p>
                              ) : (
                                <ul className="divide-y divide-gray-800">
                                  {tags.map((tag) => {
                                    const isSelected = selectedTagIds.includes(tag.id);
                                    return (
                                      <li key={tag.id}>
                                        <label className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-800">
                                          <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => {
                                              setSelectedTagIds((prev) =>
                                                prev.includes(tag.id)
                                                  ? prev.filter((id) => id !== tag.id)
                                                  : [...prev, tag.id]
                                              );
                                            }}
                                            className="h-4 w-4 rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500"
                                          />
                                          <span
                                            className="text-sm font-medium"
                                            style={{ color: tag.color }}
                                          >
                                            {tag.name}
                                          </span>
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setEditingTagId(tag.id);
                                              setShowEditTagModal(true);
                                              setDomainSearch('');
                                              setSearchResults([]);
                                            }}
                                            className="ml-auto text-gray-400 hover:text-gray-200"
                                            title={t('common.edit')}
                                          >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                          </button>
                                        </label>
                                      </li>
                                    );
                                  })}
                                </ul>
                              )}
                              <div className="flex gap-2 p-3 border-t border-gray-800 dark:border-gray-800 border-gray-200 bg-gray-900 dark:bg-gray-900 bg-white">
                                <button
                                  type="button"
                                  onClick={() => setSelectedTagIds([])}
                                  className="flex-1 px-3 py-1 rounded text-xs bg-gray-800 dark:bg-gray-800 bg-gray-100 hover:bg-gray-700 dark:hover:bg-gray-700 hover:bg-gray-200 text-gray-300 dark:text-gray-300 text-gray-700"
                                  disabled={selectedTagIds.length === 0}
                                >
                                  {t('common.reset')}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setIsTagDropdownOpen(false)}
                                  className="flex-1 px-3 py-1 rounded text-xs bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                  {t('common.done')}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      {/* Фильтр по статусам */}
                      <div className="flex-1 min-w-[200px]">
                        <label className="block text-sm text-gray-400 dark:text-gray-400 text-gray-600 mb-2">
                          {t('sites.filterByStatus')}
                        </label>
                        <select
                          value={selectedStatusIds.length > 0 ? selectedStatusIds[0] : ''}
                          onChange={(e) => {
                            const statusId = e.target.value ? parseInt(e.target.value) : null;
                            setSelectedStatusIds(statusId ? [statusId] : []);
                          }}
                          className="w-full px-4 py-2 bg-gray-700 dark:bg-gray-700 bg-gray-100 text-white dark:text-white text-gray-900 rounded border border-gray-600 dark:border-gray-600 border-gray-300 focus:border-blue-500 focus:outline-none"
                        >
                          <option value="">{t('sites.allStatuses')}</option>
                          {statuses.map((status) => (
                            <option key={status.id} value={status.id} style={{ backgroundColor: status.color + '20' }}>
                              {status.name}
                            </option>
                          ))}
                        </select>
                        {/* Показываем цвет выбранного статуса */}
                        {selectedStatusIds.length > 0 && statuses.find(s => s.id === selectedStatusIds[0]) && (
                          <div className="mt-2 flex items-center gap-2">
                            <div 
                              className="w-4 h-4 rounded border border-gray-600"
                              style={{ backgroundColor: statuses.find(s => s.id === selectedStatusIds[0])?.color || '#6b7280' }}
                            />
                            <span className="text-xs text-gray-400">
                              {statuses.find(s => s.id === selectedStatusIds[0])?.name}
                            </span>
                          </div>
                        )}
                      </div>
                      {/* Выбор периода */}
                      <div className="flex items-end gap-2">
                        <span className="text-sm text-gray-400 dark:text-gray-400 text-gray-600 whitespace-nowrap">{t('sites.periodForImpressions')}</span>
                        <select
                          value={selectedPeriodAllSites}
                          onChange={(e) => setSelectedPeriodAllSites(Number(e.target.value))}
                          className="px-4 py-2 bg-gray-700 dark:bg-gray-700 bg-gray-100 text-white dark:text-white text-gray-900 rounded border border-gray-600 dark:border-gray-600 border-gray-300 focus:border-blue-500 focus:outline-none"
                        >
                          {[7, 30, 90, 180].map((days) => (
                            <option key={days} value={days}>
                              {days} {t('sites.days')}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

              <div className="bg-gray-800 dark:bg-gray-800 bg-gray-50 rounded-lg overflow-hidden border border-gray-700 dark:border-gray-700 border-gray-200">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-700 dark:bg-gray-700 bg-gray-100">
                      <tr>
                        <th className="px-4 py-3 text-left text-white dark:text-white text-gray-900">{t('sites.domain')}</th>
                        <th className="px-4 py-3 text-left text-white dark:text-white text-gray-900">{t('sites.tags')}</th>
                        <th className="px-4 py-3 text-center text-white dark:text-white text-gray-900" style={{ width: '60px' }}>✓</th>
                        <th 
                          className="px-4 py-3 text-left cursor-pointer hover:bg-gray-600 dark:hover:bg-gray-600 hover:bg-gray-200 select-none text-white dark:text-white text-gray-900"
                          onClick={() => handleSort('tasks')}
                        >
                          <div className="flex items-center gap-2">
                            {t('sites.tasks')}
                            {sortColumn === 'tasks' && (
                              <span className="text-xs">
                                {sortDirection === 'asc' ? '↑' : '↓'}
                              </span>
                            )}
                          </div>
                        </th>
                        <th 
                          className="px-4 py-3 text-left cursor-pointer hover:bg-gray-600 dark:hover:bg-gray-600 hover:bg-gray-200 select-none text-white dark:text-white text-gray-900"
                          onClick={() => handleSort('links')}
                        >
                          <div className="flex items-center gap-2">
                            {t('sites.linkProfile')}
                            {sortColumn === 'links' && (
                              <span className="text-xs">
                                {sortDirection === 'asc' ? '↑' : '↓'}
                              </span>
                            )}
                          </div>
                        </th>
                        <th 
                          className="px-4 py-3 text-left cursor-pointer hover:bg-gray-600 dark:hover:bg-gray-600 hover:bg-gray-200 select-none text-white dark:text-white text-gray-900"
                          onClick={() => handleSort('impressions')}
                        >
                          <div className="flex items-center gap-2">
                            {t('sites.impressions')}
                            {sortColumn === 'impressions' && (
                              <span className="text-xs">
                                {sortDirection === 'asc' ? '↑' : '↓'}
                              </span>
                            )}
                          </div>
                        </th>
                        <th 
                          className="px-4 py-3 text-left cursor-pointer hover:bg-gray-600 dark:hover:bg-gray-600 hover:bg-gray-200 select-none text-white dark:text-white text-gray-900"
                          onClick={() => handleSort('clicks')}
                        >
                          <div className="flex items-center gap-2">
                            {t('sites.clicks')}
                            {sortColumn === 'clicks' && (
                              <span className="text-xs">
                                {sortDirection === 'asc' ? '↑' : '↓'}
                              </span>
                            )}
                          </div>
                        </th>
                        <th 
                          className="px-4 py-3 text-left cursor-pointer hover:bg-gray-600 dark:hover:bg-gray-600 hover:bg-gray-200 select-none text-white dark:text-white text-gray-900"
                          onClick={() => handleSort('postbacks')}
                        >
                          <div className="flex items-center gap-2">
                            {t('sites.postbacks')}
                            {sortColumn === 'postbacks' && (
                              <span className="text-xs">
                                {sortDirection === 'asc' ? '↑' : '↓'}
                              </span>
                            )}
                          </div>
                        </th>
                        <th className="px-4 py-3 text-left text-white dark:text-white text-gray-900">{t('common.actions')}</th>
                      </tr>
                    </thead>
                  <tbody>
                    {filteredAndSortedSites.map((site) => {
                      // Находим соответствующие данные из googleConsoleAggregatedData
                      const siteData = googleConsoleAggregatedData.find(s => s.id === site.id);
                      const stats = sitesStats[site.id];
                      return (
                        <tr key={site.id} className="border-t border-gray-700 hover:bg-gray-750">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="font-medium text-white dark:text-white text-gray-900">{site.domain}</div>
                              {site.status && (
                                <span
                                  className="px-2 py-0.5 rounded text-xs font-medium"
                                  style={{
                                    backgroundColor: site.status.color + '20',
                                    color: site.status.color,
                                    border: `1px solid ${site.status.color}40`,
                                  }}
                                  title={site.status.name}
                                >
                                  {site.status.name}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-400 dark:text-gray-400 text-gray-600">{site.name}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1 mb-1">
                              {(site.tags || []).map((tag) => (
                                <span
                                  key={tag.id}
                                  className="px-2 py-0.5 rounded text-xs inline-flex items-center gap-1"
                                  style={{ backgroundColor: tag.color + '40', color: tag.color }}
                                >
                                  {tag.name}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRemoveTag(site.id, tag.id);
                                    }}
                                    className="hover:bg-opacity-20 rounded px-0.5"
                                    title={t('sites.removeTag')}
                                  >
                                    ×
                                  </button>
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
                              {t('sites.addTag')}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {siteData?.hasGoogleConsoleConnection ? (
                              <span className="text-green-500 text-xl" title={t('common.connected')}>✓</span>
                            ) : (
                              <span className="text-gray-400 dark:text-gray-400 text-gray-600 text-xl" title={t('common.notConnected')}>✗</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {loadingStats ? (
                              <span className="text-gray-400 dark:text-gray-400 text-gray-600">...</span>
                            ) : stats ? (
                              <div className="text-sm">
                                <div className="text-white dark:text-white text-gray-900">{t('summary.total')}: {stats.tasks.total}</div>
                                <div className="text-green-500">{t('summary.open')}: {stats.tasks.open}</div>
                                <div className="text-gray-400 dark:text-gray-400 text-gray-600">{t('summary.closed')}: {stats.tasks.closed}</div>
                              </div>
                            ) : (
                              <span className="text-gray-400 dark:text-gray-400 text-gray-600">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-white dark:text-white text-gray-900">
                            {loadingStats ? (
                              <span className="text-gray-400 dark:text-gray-400 text-gray-600">...</span>
                            ) : stats ? (
                              <span>{stats.links}</span>
                            ) : (
                              <span className="text-gray-400 dark:text-gray-400 text-gray-600">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-white dark:text-white text-gray-900">
                            {siteData && siteData.totalImpressions > 0 ? (
                              <span>{siteData.totalImpressions.toLocaleString()}</span>
                            ) : (
                              <span className="text-gray-400 dark:text-gray-400 text-gray-600">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-white dark:text-white text-gray-900">
                            {siteData && siteData.totalClicks > 0 ? (
                              <span>{siteData.totalClicks.toLocaleString()}</span>
                            ) : (
                              <span className="text-gray-400 dark:text-gray-400 text-gray-600">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-white dark:text-white text-gray-900">
                            {siteData && siteData.totalPostbacks !== undefined ? (
                              <span>{siteData.totalPostbacks.toLocaleString()}</span>
                            ) : (
                              <span className="text-gray-400 dark:text-gray-400 text-gray-600">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <Link
                              href={`/sites/${site.id}`}
                              className="text-blue-400 dark:text-blue-400 text-blue-600 hover:text-blue-300 dark:hover:text-blue-300 hover:text-blue-700 hover:underline text-sm"
                            >
                              {t('sites.openSite')}
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
            <div className="bg-gray-800 dark:bg-gray-800 bg-white rounded-lg p-6 w-full max-w-md border border-gray-700 dark:border-gray-700 border-gray-200 max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold mb-4 text-white dark:text-white text-gray-900">
                {tagModalSiteId ? t('sites.manageTagsTitle') : t('sites.createTagTitle')}
              </h2>
              
              {tagModalSiteId ? (
                // Управление тегами для конкретного сайта
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 dark:text-gray-300 text-gray-700 mb-2">
                      {t('sites.assignTag')}
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
                      {t('common.close')}
                    </button>
                  </div>
                </div>
              ) : (
                // Создание нового тега
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 dark:text-gray-300 text-gray-700 mb-2">
                      {t('sites.tagName')}
                    </label>
                    <input
                      type="text"
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      className="w-full px-4 py-2 bg-gray-700 dark:bg-gray-700 bg-gray-100 text-white dark:text-white text-gray-900 rounded border border-gray-600 dark:border-gray-600 border-gray-300 focus:border-blue-500 focus:outline-none"
                      placeholder={t('sites.tagNamePlaceholder')}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 dark:text-gray-300 text-gray-700 mb-2">
                      {t('sites.color')}
                    </label>
                    <input
                      type="color"
                      value={newTagColor}
                      onChange={(e) => setNewTagColor(e.target.value)}
                      className="w-full h-10 bg-gray-700 dark:bg-gray-700 bg-gray-100 rounded border border-gray-600 dark:border-gray-600 border-gray-300"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCreateTag}
                      className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white"
                    >
                      {t('common.create')}
                    </button>
                    <button
                      onClick={() => {
                        setShowTagModal(false);
                        setTagModalSiteId(null);
                        setNewTagName('');
                        setNewTagColor('#3b82f6');
                      }}
                      className="flex-1 px-4 py-2 bg-gray-700 dark:bg-gray-700 bg-gray-200 hover:bg-gray-600 dark:hover:bg-gray-600 hover:bg-gray-300 rounded text-white dark:text-white text-gray-900"
                    >
                      {t('common.cancel')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Модальное окно редактирования тега */}
        {showEditTagModal && editingTagId && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 dark:bg-gray-800 bg-white rounded-lg p-6 w-full max-w-md border border-gray-700 dark:border-gray-700 border-gray-200 max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold mb-4 text-white dark:text-white text-gray-900">
                {t('sites.editTagTitle')}: {tags.find(t => t.id === editingTagId)?.name}
              </h2>
              
              <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-300 dark:text-gray-300 text-gray-700 mb-2">
                      {t('sites.addSiteByDomain')}
                    </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={domainSearch}
                      onChange={(e) => {
                        setDomainSearch(e.target.value);
                      }}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleSearchSiteByDomain();
                        }
                      }}
                      className="flex-1 px-4 py-2 bg-gray-700 dark:bg-gray-700 bg-gray-100 text-white dark:text-white text-gray-900 rounded border border-gray-600 dark:border-gray-600 border-gray-300 focus:border-blue-500 focus:outline-none"
                      placeholder={t('sites.domainPlaceholder')}
                    />
                    <button
                      onClick={handleSearchSiteByDomain}
                      disabled={searching || !domainSearch.trim()}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50 disabled:cursor-not-allowed text-white"
                    >
                      {searching ? '...' : t('sites.find')}
                    </button>
                  </div>
                </div>

                {searchResults.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 dark:text-gray-300 text-gray-700 mb-2">
                      {t('sites.foundSites')}
                    </label>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {searchResults.map((site) => {
                        const isTagAssigned = (site.tags || []).some(t => t.id === editingTagId);
                        return (
                          <div
                            key={site.id}
                            className="flex items-center justify-between p-2 bg-gray-700 rounded"
                          >
                            <div>
                              <div className="font-medium text-sm">{site.domain}</div>
                              <div className="text-xs text-gray-400">{site.name}</div>
                            </div>
                            <button
                              onClick={() => {
                                if (isTagAssigned) {
                                  handleRemoveTag(site.id, editingTagId);
                                } else {
                                  handleAddSiteToTag(site.id, editingTagId);
                                }
                              }}
                              className={`px-3 py-1 rounded text-xs ${
                                isTagAssigned
                                  ? 'bg-red-600 hover:bg-red-700'
                                  : 'bg-blue-600 hover:bg-blue-700'
                              }`}
                            >
                              {isTagAssigned ? t('common.delete') : t('common.add')}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {domainSearch.trim() && searchResults.length === 0 && !searching && (
                  <div className="text-sm text-gray-400 dark:text-gray-400 text-gray-600 text-center py-4">
                    {t('sites.noSitesFound')}
                  </div>
                )}

                <div className="flex gap-2 pt-4 border-t border-gray-700 dark:border-gray-700 border-gray-200">
                  <button
                    onClick={() => {
                      setShowEditTagModal(false);
                      setEditingTagId(null);
                      setDomainSearch('');
                      setSearchResults([]);
                    }}
                    className="flex-1 px-4 py-2 bg-gray-700 dark:bg-gray-700 bg-gray-200 hover:bg-gray-600 dark:hover:bg-gray-600 hover:bg-gray-300 rounded text-white dark:text-white text-gray-900"
                  >
                    {t('common.close')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Модальное окно создания сайта */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 dark:bg-gray-800 bg-white rounded-lg p-6 w-full max-w-md border border-gray-700 dark:border-gray-700 border-gray-200">
              <h2 className="text-2xl font-bold mb-4 text-white dark:text-white text-gray-900">{t('sites.addSiteTitle')}</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 dark:text-gray-300 text-gray-700 mb-2">
                    {t('sites.siteName')}
                  </label>
                  <input
                    type="text"
                    value={newSite.name}
                    onChange={(e) => setNewSite({ ...newSite, name: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 dark:bg-gray-700 bg-gray-100 text-white dark:text-white text-gray-900 rounded border border-gray-600 dark:border-gray-600 border-gray-300 focus:border-blue-500 focus:outline-none"
                    placeholder={t('sites.siteNamePlaceholder')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 dark:text-gray-300 text-gray-700 mb-2">
                    {t('sites.siteDomain')}
                  </label>
                  <input
                    type="text"
                    value={newSite.domain}
                    onChange={(e) => setNewSite({ ...newSite, domain: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 dark:bg-gray-700 bg-gray-100 text-white dark:text-white text-gray-900 rounded border border-gray-600 dark:border-gray-600 border-gray-300 focus:border-blue-500 focus:outline-none"
                    placeholder={t('sites.siteDomainPlaceholder')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 dark:text-gray-300 text-gray-700 mb-2">
                    {t('sites.category')}
                  </label>
                  <select
                    value={newSite.category}
                    onChange={(e) => setNewSite({ ...newSite, category: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 dark:bg-gray-700 bg-gray-100 text-white dark:text-white text-gray-900 rounded border border-gray-600 dark:border-gray-600 border-gray-300 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">{t('sites.selectCategory')}</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                  {categories.length === 0 && (
                    <p className="text-xs text-gray-500 dark:text-gray-500 text-gray-600 mt-1">
                      {t('sites.loadOffersForCategories')}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 dark:text-gray-300 text-gray-700 mb-2">
                    {t('sites.googleConsoleUrl')} <span className="text-gray-500 dark:text-gray-500 text-gray-600 text-xs">({t('sites.googleConsoleUrlOptional')})</span>
                  </label>
                  <input
                    type="text"
                    value={newSite.googleSearchConsoleUrl}
                    onChange={(e) => setNewSite({ ...newSite, googleSearchConsoleUrl: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 dark:bg-gray-700 bg-gray-100 text-white dark:text-white text-gray-900 rounded border border-gray-600 dark:border-gray-600 border-gray-300 focus:border-blue-500 focus:outline-none"
                    placeholder={t('sites.googleConsoleUrlPlaceholder')}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCreateSite}
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white"
                  >
                    {t('common.create')}
                  </button>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 px-4 py-2 bg-gray-700 dark:bg-gray-700 bg-gray-200 hover:bg-gray-600 dark:hover:bg-gray-600 hover:bg-gray-300 rounded text-white dark:text-white text-gray-900"
                  >
                    {t('common.cancel')}
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
