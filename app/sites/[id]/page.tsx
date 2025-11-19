'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { GoogleSearchConsoleData, PostbackData, SiteTask, ProjectLink, SiteStatus } from '@/lib/types';
import { useI18n } from '@/lib/i18n-context';

export default function SiteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { t } = useI18n();
  const siteId = params.id as string;

  const [site, setSite] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'google' | 'postbacks' | 'link-profile'>('overview');
  const [googleData, setGoogleData] = useState<GoogleSearchConsoleData[]>([]);
  const [queries, setQueries] = useState<Array<{ query: string; clicks: number; impressions: number; ctr: number; position: number }>>([]);
  const [pages, setPages] = useState<Array<{ page: string; clicks: number; impressions: number; ctr: number; position: number }>>([]);
  const [countries, setCountries] = useState<Array<{ country: string; clicks: number; impressions: number; ctr: number; position: number }>>([]);
  const [postbacks, setPostbacks] = useState<PostbackData[]>([]);
  const [tasks, setTasks] = useState<SiteTask[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<SiteTask | null>(null);
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    status: 'pending' as 'pending' | 'in_progress' | 'completed',
    deadline: '',
    comments: '',
    priority: '',
    assigneeId: '',
    tags: '',
    estimatedTime: '',
    actualTime: '',
  });
  const [users, setUsers] = useState<Array<{ id: number; email: string; name?: string }>>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<number>(30);
  const [overviewPeriod, setOverviewPeriod] = useState<number>(30);
  const [overviewGoogleData, setOverviewGoogleData] = useState<GoogleSearchConsoleData[]>([]);
  const [linkProject, setLinkProject] = useState<any>(null);
  const [loadingLinkProject, setLoadingLinkProject] = useState(false);
  const [linkProjectLinks, setLinkProjectLinks] = useState<ProjectLink[]>([]);
  const [loadingLinkProjectLinks, setLoadingLinkProjectLinks] = useState(false);
  const [showUploadLinksModal, setShowUploadLinksModal] = useState(false);
  const [uploadLinksText, setUploadLinksText] = useState('');
  const [checkingLinks, setCheckingLinks] = useState(false);
  const [siteStatuses, setSiteStatuses] = useState<SiteStatus[]>([]);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [editingStatusId, setEditingStatusId] = useState<number | null>(null);
  const [editingStatusForm, setEditingStatusForm] = useState({ name: '', color: '#6b7280' });

  useEffect(() => {
    if (siteId) {
      loadSite();
    }
    loadSiteStatuses();
  }, [siteId]);


  useEffect(() => {
    if (site) {
      if (activeTab === 'overview') {
        loadOverviewData();
        loadTasks(); // Загружаем задачи для блока в обзоре
      } else if (activeTab === 'tasks') {
        loadTasks();
      } else if (activeTab === 'link-profile') {
        loadLinkProject();
      } else {
        loadTabData();
      }
    }
  }, [site, activeTab]);

  useEffect(() => {
    if (site && activeTab === 'google') {
      loadGoogleDataWithPeriod();
    }
  }, [site, activeTab, selectedPeriod]);

  useEffect(() => {
    if (site && activeTab === 'overview') {
      loadOverviewData();
    }
  }, [site, activeTab, overviewPeriod]);

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

  const loadOverviewData = async () => {
    try {
      setLoadingData(true);
      // Загружаем данные Google Console для обзора с выбранным периодом
      const response = await fetch(`/api/sites/${siteId}/google-console/daily?days=${overviewPeriod}`);
      const data = await response.json();
      if (data.success) {
        setOverviewGoogleData(data.data || []);
      }
    } catch (err) {
      console.error('Error loading overview data:', err);
    } finally {
      setLoadingData(false);
    }
  };

  const loadGoogleDataWithPeriod = async () => {
    try {
      setLoadingData(true);
      const response = await fetch(`/api/sites/${siteId}/google-console/daily?days=${selectedPeriod}`);
      const data = await response.json();
      if (data.success) {
        setGoogleData(data.data || []);
      }
      await loadDetailedData();
    } catch (err) {
      console.error('Error loading Google data:', err);
    } finally {
      setLoadingData(false);
    }
  };

  const loadTabData = async () => {
    try {
      setLoadingData(true);
      if (activeTab === 'google') {
        await loadGoogleDataWithPeriod();
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

  const loadTasks = async () => {
    try {
      setLoadingTasks(true);
      const response = await fetch(`/api/sites/${siteId}/tasks`);
      const data = await response.json();
      if (data.success) {
        setTasks(data.tasks || []);
      }
    } catch (err) {
      console.error('Error loading tasks:', err);
    } finally {
      setLoadingTasks(false);
    }
  };

  const loadLinkProject = async () => {
    try {
      setLoadingLinkProject(true);
      const response = await fetch(`/api/sites/${siteId}/link-profile-project`);
      const data = await response.json();
      if (data.success) {
        setLinkProject(data.project);
        if (data.project?.id) {
          loadLinkProjectLinks(data.project.id);
        }
      }
    } catch (err) {
      console.error('Error loading link project:', err);
    } finally {
      setLoadingLinkProject(false);
    }
  };

  const loadLinkProjectLinks = async (projectId: number) => {
    try {
      setLoadingLinkProjectLinks(true);
      const response = await fetch(`/api/link-profile/projects/${projectId}/links`);
      const data = await response.json();
      if (data.success) {
        setLinkProjectLinks(data.links || []);
      }
    } catch (err) {
      console.error('Error loading link project links:', err);
    } finally {
      setLoadingLinkProjectLinks(false);
    }
  };

  const handleUploadLinks = async () => {
    if (!linkProject?.id) return;
    try {
      const urlLines = uploadLinksText
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      if (urlLines.length === 0) {
        alert(t('sites.enterUrl'));
        return;
      }

      const response = await fetch(`/api/link-profile/projects/${linkProject.id}/links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: urlLines }),
      });

      const data = await response.json();
      if (data.success) {
        setShowUploadLinksModal(false);
        setUploadLinksText('');
        loadLinkProjectLinks(linkProject.id);
      } else {
        alert(data.error || t('sites.uploadLinksError'));
      }
    } catch (err) {
      console.error('Error uploading links:', err);
      alert(t('sites.uploadLinksError'));
    }
  };

  const handleCheckLinks = async () => {
    if (!linkProject?.id) return;
    try {
      setCheckingLinks(true);
      const response = await fetch(`/api/link-profile/projects/${linkProject.id}/links/check`, {
        method: 'POST',
      });
      const data = await response.json();
      if (data.success) {
        loadLinkProjectLinks(linkProject.id);
        alert(t('sites.checkedLinks').replace('{count}', data.checked.toString()));
      } else {
        alert(data.error || t('sites.checkLinksError'));
      }
    } catch (err) {
      console.error('Error checking links:', err);
      alert(t('sites.checkLinksError'));
    } finally {
      setCheckingLinks(false);
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
          t('sites.syncNeedsAuth')
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
          t('sites.syncAutoFind')
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
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }
      
      if (data.success) {
        loadTabData();
        alert(t('sites.syncSuccess').replace('{count}', (data.count || 0).toString()));
        // Перезагружаем детальные данные после синхронизации
        await loadDetailedData();
      } else {
        const errorMessage = data.error || t('sites.syncError');
        console.error('Google sync error:', errorMessage);
        alert(errorMessage);
      }
    } catch (err: any) {
      console.error('Error syncing Google:', err);
      const errorMessage = err.message || t('sites.syncError');
      alert(errorMessage);
    } finally {
      setLoadingData(false);
    }
  };



  const handleCreateTask = async () => {
    try {
      const response = await fetch(`/api/sites/${siteId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: taskForm.title,
          description: taskForm.description,
          status: taskForm.status,
          deadline: taskForm.deadline || undefined,
          comments: taskForm.comments,
          priority: taskForm.priority ? parseInt(taskForm.priority) : undefined,
          assigneeId: taskForm.assigneeId ? parseInt(taskForm.assigneeId) : undefined,
          tags: taskForm.tags ? taskForm.tags.split(',').map(t => t.trim()).filter(t => t) : undefined,
          estimatedTime: taskForm.estimatedTime ? parseInt(taskForm.estimatedTime) : undefined,
          actualTime: taskForm.actualTime ? parseInt(taskForm.actualTime) : undefined,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setShowTaskModal(false);
        setTaskForm({ 
          title: '', 
          description: '', 
          status: 'pending', 
          deadline: '', 
          comments: '', 
          priority: '',
          assigneeId: '',
          tags: '',
          estimatedTime: '',
          actualTime: '',
        });
        loadTasks();
      } else {
        alert(data.error || t('sites.createTaskError'));
      }
    } catch (err) {
      console.error('Error creating task:', err);
      alert(t('sites.createTaskError'));
    }
  };

  const handleUpdateTask = async () => {
    if (!editingTask) return;
    try {
      const response = await fetch(`/api/sites/${siteId}/tasks/${editingTask.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: taskForm.title,
          description: taskForm.description,
          status: taskForm.status,
          deadline: taskForm.deadline || undefined,
          comments: taskForm.comments,
          priority: taskForm.priority ? parseInt(taskForm.priority) : undefined,
          assigneeId: taskForm.assigneeId ? parseInt(taskForm.assigneeId) : undefined,
          tags: taskForm.tags ? taskForm.tags.split(',').map(t => t.trim()).filter(t => t) : undefined,
          estimatedTime: taskForm.estimatedTime ? parseInt(taskForm.estimatedTime) : undefined,
          actualTime: taskForm.actualTime ? parseInt(taskForm.actualTime) : undefined,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setShowTaskModal(false);
        setEditingTask(null);
        setTaskForm({ 
          title: '', 
          description: '', 
          status: 'pending', 
          deadline: '', 
          comments: '', 
          priority: '',
          assigneeId: '',
          tags: '',
          estimatedTime: '',
          actualTime: '',
        });
        loadTasks();
      } else {
        alert(data.error || t('sites.updateTaskError'));
      }
    } catch (err) {
      console.error('Error updating task:', err);
      alert(t('sites.updateTaskError'));
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    if (!confirm(t('sites.deleteTask'))) return;
    try {
      const response = await fetch(`/api/sites/${siteId}/tasks/${taskId}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        loadTasks();
      } else {
        alert(data.error || t('sites.deleteTaskError'));
      }
    } catch (err) {
      console.error('Error deleting task:', err);
      alert(t('sites.deleteTaskError'));
    }
  };

  const openTaskModal = (task?: SiteTask) => {
    if (task) {
      setEditingTask(task);
      setTaskForm({
        title: task.title,
        description: task.description || '',
        status: task.status,
        deadline: task.deadline ? new Date(task.deadline).toISOString().split('T')[0] : '',
        comments: task.comments || '',
        priority: task.priority?.toString() || '',
        assigneeId: task.assigneeId?.toString() || '',
        tags: task.tags?.join(', ') || '',
        estimatedTime: task.estimatedTime?.toString() || '',
        actualTime: task.actualTime?.toString() || '',
      });
    } else {
      setEditingTask(null);
      setTaskForm({ 
        title: '', 
        description: '', 
        status: 'pending', 
        deadline: '', 
        comments: '', 
        priority: '',
        assigneeId: '',
        tags: '',
        estimatedTime: '',
        actualTime: '',
      });
    }
    setShowTaskModal(true);
    if (users.length === 0) loadUsers();
  };

  const loadUsers = async () => {
    try {
      setLoadingUsers(true);
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setUsers(data.users || []);
        }
      }
    } catch (err) {
      console.error('Error loading users:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadSiteStatuses = async () => {
    try {
      const response = await fetch('/api/site-statuses');
      const data = await response.json();
      if (data.success) {
        setSiteStatuses(data.statuses || []);
      }
    } catch (err) {
      console.error('Error loading site statuses:', err);
    }
  };

  const handleUpdateSiteStatus = async (statusId: number | null) => {
    try {
      const response = await fetch(`/api/sites/${siteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...site,
          statusId,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setSite(data.site);
        setShowStatusModal(false);
      } else {
        alert(data.error || t('sites.updateStatusError'));
      }
    } catch (err) {
      console.error('Error updating site status:', err);
      alert(t('sites.updateStatusError'));
    }
  };

  const handleStartEditStatus = (status: SiteStatus) => {
    setEditingStatusId(status.id);
    setEditingStatusForm({ name: status.name, color: status.color });
  };

  const handleCancelEditStatus = () => {
    setEditingStatusId(null);
    setEditingStatusForm({ name: '', color: '#6b7280' });
  };

  const handleSaveStatus = async (statusId: number) => {
    try {
      const response = await fetch(`/api/site-statuses/${statusId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingStatusForm.name,
          color: editingStatusForm.color,
        }),
      });
      const data = await response.json();
      if (data.success) {
        // Обновляем список статусов
        await loadSiteStatuses();
        setEditingStatusId(null);
        setEditingStatusForm({ name: '', color: '#6b7280' });
        // Если это был текущий статус сайта, обновляем и сайт
        if (site?.statusId === statusId) {
          await loadSite();
        }
      } else {
        alert(data.error || t('sites.saveStatusError'));
      }
    } catch (err) {
      console.error('Error saving status:', err);
      alert(t('sites.saveStatusError'));
    }
  };

  if (loading && !site) {
    return (
      <main className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-white p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center text-gray-900 dark:text-white">{t('common.loading')}</div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <button
            onClick={() => router.push('/sites')}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 mb-4"
          >
            {t('sites.backToSites')}
          </button>
          <div className="flex items-center gap-4 mb-2">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">{site?.name || t('sites.site')}</h1>
            {site?.status && (
              <span
                className="px-3 py-1 rounded-full text-sm font-medium"
                style={{
                  backgroundColor: site.status.color + '20',
                  color: site.status.color,
                  border: `1px solid ${site.status.color}40`,
                }}
              >
                {site.status.name}
              </span>
            )}
            <button
              onClick={() => setShowStatusModal(true)}
              className="px-3 py-1 text-sm text-gray-700 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300 border border-gray-300 dark:border-gray-600 rounded hover:border-gray-400 dark:hover:border-gray-500 bg-white dark:bg-gray-800"
            >
              {site?.status ? t('sites.changeStatus') : t('sites.setStatus')}
            </button>
          </div>
          <p className="text-gray-700 dark:text-gray-400">{site?.domain}</p>
        </div>

        {/* Вкладки */}
        <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', label: t('sites.overview') },
              { id: 'tasks', label: t('sites.tasks') },
              { id: 'link-profile', label: t('sites.linkProfile') },
              { id: 'google', label: t('sites.googleConsole') },
              { id: 'postbacks', label: t('sites.postbacks') },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-700 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-300'
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
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <div className="text-sm text-gray-700 dark:text-gray-400 mb-2">{t('sites.domain')}</div>
                <div className="text-xl font-bold text-gray-900 dark:text-white">{site?.domain}</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <div className="text-sm text-gray-700 dark:text-gray-400 mb-2">{t('sites.googleConsole')}</div>
                <div className="text-xl font-bold mb-2">
                  {site?.hasGoogleConsoleConnection ? (
                    <span className="text-green-600 dark:text-green-400">{t('sites.connected')}</span>
                  ) : (
                    <span className="text-yellow-600 dark:text-yellow-400">{t('sites.notConnected')}</span>
                  )}
                </div>
                {!site?.hasGoogleConsoleConnection && (
                  <div className="text-xs text-gray-700 dark:text-gray-400 space-y-1">
                    {!site?.googleConsoleStatus?.hasOAuth && (
                      <div>
                        ⚠️ {t('sites.oauthNotConfigured')}.{' '}
                        <a href="/integrations" className="text-blue-600 dark:text-blue-400 hover:underline">
                          {t('sites.configure')}
                        </a>
                      </div>
                    )}
                    {site?.googleConsoleStatus?.hasOAuth && !site?.googleConsoleStatus?.hasUrl && (
                      <div>
                        ⚠️ {t('sites.urlNotSpecified')}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Блок с открытыми задачами */}
            {tasks.length > 0 && tasks.filter(t => t.status !== 'completed').length > 0 && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('sites.openTasks')}</h3>
                  <button
                    onClick={() => setActiveTab('tasks')}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                  >
                    {t('sites.allTasks')}
                  </button>
                </div>
                <div className="space-y-3">
                  {tasks
                    .filter(t => t.status !== 'completed')
                    .sort((a, b) => {
                      // Сначала просроченные, потом по приоритету, потом по дедлайну
                      const aOverdue = a.deadline && new Date(a.deadline) < new Date();
                      const bOverdue = b.deadline && new Date(b.deadline) < new Date();
                      if (aOverdue && !bOverdue) return -1;
                      if (!aOverdue && bOverdue) return 1;
                      if (a.priority && b.priority) {
                        if (b.priority !== a.priority) return b.priority - a.priority;
                      }
                      if (a.deadline && b.deadline) {
                        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
                      }
                      if (a.deadline) return -1;
                      if (b.deadline) return 1;
                      return 0;
                    })
                    .slice(0, 5)
                    .map((task) => {
                      const isOverdue = task.deadline && new Date(task.deadline) < new Date();
                      const statusColors = {
                        pending: 'bg-yellow-600',
                        in_progress: 'bg-blue-600',
                        completed: 'bg-green-600',
                      };
                      const statusLabels = {
                        pending: t('sites.pending'),
                        in_progress: t('sites.inProgress'),
                        completed: t('sites.completed'),
                      };
                      return (
                        <div
                          key={task.id}
                          className={`p-3 rounded border ${
                            isOverdue ? 'border-red-500 bg-red-500/10' : 'border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-700/30'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[task.status]}`}>
                                  {statusLabels[task.status]}
                                </span>
                                {isOverdue && (
                                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-600 text-white">
                                    {t('sites.overdue')}
                                  </span>
                                )}
                                {task.priority && (
                                  <span className={`px-2 py-0.5 rounded text-xs font-medium border ${
                                    task.priority >= 8 ? 'text-red-400 border-red-400' 
                                    : task.priority >= 5 ? 'text-yellow-400 border-yellow-400' 
                                    : 'text-green-400 border-green-400'
                                  }`}>
                                    {t('sites.priority')}: {task.priority}/10
                                  </span>
                                )}
                              </div>
                              <h4 className="font-medium text-sm mb-1 truncate text-gray-900 dark:text-white">{task.title}</h4>
                              {task.deadline && (
                                <div className={`text-xs ${
                                  isOverdue ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-400'
                                }`}>
                                  {t('sites.deadline')}: {new Date(task.deadline).toLocaleDateString('en-US', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric'
                                  })}
                                </div>
                              )}
                            </div>
                            <button
                              onClick={() => router.push(`/sites/${siteId}/tasks/${task.id}`)}
                              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs flex-shrink-0 text-white"
                            >
                              {t('sites.open')}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
                {tasks.filter(t => t.status !== 'completed').length > 5 && (
                  <div className="mt-4 text-center">
                    <button
                      onClick={() => setActiveTab('tasks')}
                      className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                    >
                      {t('sites.showAllTasks').replace('{count}', tasks.filter(t => t.status !== 'completed').length.toString())}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Объединенный блок Google Console с графиком */}
            {overviewGoogleData.length > 0 && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('sites.googleConsole')}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-700 dark:text-gray-400">{t('sites.period')}:</span>
                    <div className="flex gap-1">
                      {[7, 14, 30, 60, 90].map((days) => (
                        <button
                          key={days}
                          onClick={() => setOverviewPeriod(days)}
                          className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                            overviewPeriod === days
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                          }`}
                        >
                          {days} {t('sites.daysShort')}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Статистика */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div>
                    <div className="text-sm text-gray-700 dark:text-gray-400 mb-1">{t('sites.totalImpressions')}</div>
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {overviewGoogleData.reduce((sum, d) => sum + d.impressions, 0).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-700 dark:text-gray-400 mb-1">{t('sites.totalClicks')}</div>
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {overviewGoogleData.reduce((sum, d) => sum + d.clicks, 0).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-700 dark:text-gray-400 mb-1">{t('sites.avgCtr')}</div>
                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                      {overviewGoogleData.length > 0
                        ? ((overviewGoogleData.reduce((sum, d) => sum + d.ctr, 0) / overviewGoogleData.length) * 100).toFixed(2)
                        : '0.00'}%
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-700 dark:text-gray-400 mb-1">{t('sites.avgPosition')}</div>
                    <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                      {overviewGoogleData.length > 0
                        ? (overviewGoogleData.reduce((sum, d) => sum + d.position, 0) / overviewGoogleData.length).toFixed(1)
                        : '—'}
                    </div>
                  </div>
                </div>

                {/* График */}
                <div>
                  <h4 className="text-md font-semibold mb-4 text-gray-900 dark:text-white">{t('sites.impressionsClicksChart')}</h4>
                  {loadingData ? (
                    <div className="h-64 flex items-center justify-center text-gray-700 dark:text-gray-400 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        <span>{t('sites.loadingData')}</span>
                      </div>
                    </div>
                  ) : overviewGoogleData.length > 0 ? (
                    <div className="relative w-full">
                      <div className="h-64 relative w-full">
                        <svg width="100%" height="100%" viewBox="0 0 800 200" preserveAspectRatio="none" className="overflow-visible">
                          <defs>
                            <linearGradient id="overviewImpressionsGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                            </linearGradient>
                            <linearGradient id="overviewClicksGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                            </linearGradient>
                          </defs>
                          
                          {/* Фоновая сетка */}
                          {[0, 1, 2, 3, 4].map((i) => (
                            <line
                              key={`grid-h-${i}`}
                              x1="50"
                              y1={20 + (i * 35)}
                              x2="750"
                              y2={20 + (i * 35)}
                              stroke="#374151"
                              strokeWidth="0.5"
                              opacity="0.3"
                            />
                          ))}
                          
                          {/* Оси */}
                          <line
                            x1="50"
                            y1="175"
                            x2="750"
                            y2="175"
                            stroke="#6b7280"
                            strokeWidth="2"
                          />
                          <line
                            x1="50"
                            y1="20"
                            x2="50"
                            y2="175"
                            stroke="#6b7280"
                            strokeWidth="2"
                          />
                          
                          {/* Данные */}
                          {overviewGoogleData.map((item, index) => {
                            const padding = 50;
                            const width = 700;
                            const height = 155;
                            const maxImpressions = Math.max(...overviewGoogleData.map(d => d.impressions), 1);
                            const maxClicks = Math.max(...overviewGoogleData.map(d => d.clicks), 1);
                            const maxValue = Math.max(maxImpressions, maxClicks);
                            const x = padding + (index / (overviewGoogleData.length - 1 || 1)) * width;
                            const impressionsY = 175 - (item.impressions / maxValue) * height;
                            const clicksY = 175 - (item.clicks / maxValue) * height;
                            
                            return (
                              <g key={index}>
                                <circle
                                  cx={x}
                                  cy={impressionsY}
                                  r="4"
                                  fill="#3b82f6"
                                  stroke="#1e40af"
                                  strokeWidth="1.5"
                                />
                                <circle
                                  cx={x}
                                  cy={clicksY}
                                  r="4"
                                  fill="#10b981"
                                  stroke="#047857"
                                  strokeWidth="1.5"
                                />
                              </g>
                            );
                          })}
                          
                          {/* Линии */}
                          {overviewGoogleData.length > 1 && (
                            <>
                              <polygon
                                points={`50,175 ${overviewGoogleData.map((item, index) => {
                                  const padding = 50;
                                  const width = 700;
                                  const height = 155;
                                  const maxImpressions = Math.max(...overviewGoogleData.map(d => d.impressions), 1);
                                  const maxClicks = Math.max(...overviewGoogleData.map(d => d.clicks), 1);
                                  const maxValue = Math.max(maxImpressions, maxClicks);
                                  const x = padding + (index / (overviewGoogleData.length - 1)) * width;
                                  const y = 175 - (item.impressions / maxValue) * height;
                                  return `${x},${y}`;
                                }).join(' ')} 750,175`}
                                fill="url(#overviewImpressionsGradient)"
                              />
                              <polyline
                                points={overviewGoogleData.map((item, index) => {
                                  const padding = 50;
                                  const width = 700;
                                  const height = 155;
                                  const maxImpressions = Math.max(...overviewGoogleData.map(d => d.impressions), 1);
                                  const maxClicks = Math.max(...overviewGoogleData.map(d => d.clicks), 1);
                                  const maxValue = Math.max(maxImpressions, maxClicks);
                                  const x = padding + (index / (overviewGoogleData.length - 1)) * width;
                                  const y = 175 - (item.impressions / maxValue) * height;
                                  return `${x},${y}`;
                                }).join(' ')}
                                fill="none"
                                stroke="#3b82f6"
                                strokeWidth="2.5"
                                opacity="0.9"
                              />
                              <polygon
                                points={`50,175 ${overviewGoogleData.map((item, index) => {
                                  const padding = 50;
                                  const width = 700;
                                  const height = 155;
                                  const maxImpressions = Math.max(...overviewGoogleData.map(d => d.impressions), 1);
                                  const maxClicks = Math.max(...overviewGoogleData.map(d => d.clicks), 1);
                                  const maxValue = Math.max(maxImpressions, maxClicks);
                                  const x = padding + (index / (overviewGoogleData.length - 1)) * width;
                                  const y = 175 - (item.clicks / maxValue) * height;
                                  return `${x},${y}`;
                                }).join(' ')} 750,175`}
                                fill="url(#overviewClicksGradient)"
                              />
                              <polyline
                                points={overviewGoogleData.map((item, index) => {
                                  const padding = 50;
                                  const width = 700;
                                  const height = 155;
                                  const maxImpressions = Math.max(...overviewGoogleData.map(d => d.impressions), 1);
                                  const maxClicks = Math.max(...overviewGoogleData.map(d => d.clicks), 1);
                                  const maxValue = Math.max(maxImpressions, maxClicks);
                                  const x = padding + (index / (overviewGoogleData.length - 1)) * width;
                                  const y = 175 - (item.clicks / maxValue) * height;
                                  return `${x},${y}`;
                                }).join(' ')}
                                fill="none"
                                stroke="#10b981"
                                strokeWidth="2.5"
                                opacity="0.9"
                              />
                            </>
                          )}
                        </svg>
                        
                        {/* Легенда */}
                        <div className="absolute top-3 left-3 flex flex-col gap-2">
                          <div className="flex items-center gap-2 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm px-2 py-1 rounded border border-gray-300 dark:border-gray-700 shadow-sm">
                            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">{t('sites.impressions')}:</span>
                            <span className="text-xs font-bold text-gray-900 dark:text-white">
                              {overviewGoogleData.reduce((sum, d) => sum + d.impressions, 0).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm px-2 py-1 rounded border border-gray-300 dark:border-gray-700 shadow-sm">
                            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                            <span className="text-xs font-semibold text-green-600 dark:text-green-400">{t('sites.clicks')}:</span>
                            <span className="text-xs font-bold text-gray-900 dark:text-white">
                              {overviewGoogleData.reduce((sum, d) => sum + d.clicks, 0).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center text-gray-700 dark:text-gray-500 text-sm">
                      <div className="text-center">
                        <div className="text-gray-700 dark:text-gray-400 mb-1">{t('sites.noData')}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-500">{t('sites.noDataPeriod')}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('sites.tasks')}</h2>
              <button
                onClick={() => openTaskModal()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white"
              >
                + {t('sites.createTask')}
              </button>
            </div>
            {loadingTasks ? (
              <div className="text-center py-8 text-gray-700 dark:text-gray-400">{t('sites.loadingTasks')}</div>
            ) : tasks.length === 0 ? (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-8 text-center border border-gray-200 dark:border-gray-700">
                <p className="text-gray-700 dark:text-gray-400 mb-4">{t('sites.noTasks')}</p>
                <button
                  onClick={() => openTaskModal()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white"
                >
                  {t('sites.createFirstTask')}
                </button>
              </div>
            ) : (
              <>
                {/* Активные задачи */}
                {tasks.filter(t => t.status !== 'completed').length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">{t('sites.activeTasks')}</h3>
                    {tasks
                      .filter(t => t.status !== 'completed')
                      .sort((a, b) => (b.priority || 0) - (a.priority || 0))
                      .map((task) => {
                        const isOverdue = task.deadline && new Date(task.deadline) < new Date() && task.status !== 'completed';
                        const statusColors = {
                          pending: 'bg-yellow-600',
                          in_progress: 'bg-blue-600',
                          completed: 'bg-green-600',
                        };
                        const statusLabels = {
                          pending: 'В ожидании',
                          in_progress: 'В работе',
                          completed: 'Завершено',
                        };
                        const priorityColor = task.priority 
                          ? task.priority >= 8 ? 'text-red-400 border-red-400' 
                            : task.priority >= 5 ? 'text-yellow-400 border-yellow-400' 
                            : 'text-green-400 border-green-400'
                          : 'text-gray-600 dark:text-gray-400 border-gray-400 dark:border-gray-400';
                        return (
                          <div
                            key={task.id}
                            className={`bg-gray-50 dark:bg-gray-800 rounded-lg p-5 border ${
                              isOverdue ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'
                            }`}
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <h3 
                                    className="text-lg font-bold cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-gray-900 dark:text-white"
                                    onClick={() => router.push(`/sites/${siteId}/tasks/${task.id}`)}
                                  >
                                    {task.title}
                                  </h3>
                                  <span className={`px-2 py-1 rounded text-xs font-medium text-white ${statusColors[task.status]}`}>
                                    {statusLabels[task.status]}
                                  </span>
                                  {task.priority && (
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${priorityColor} border`}>
                                      {t('sites.priority')}: {task.priority}/10
                                    </span>
                                  )}
                                  {isOverdue && (
                                    <span className="px-2 py-1 rounded text-xs font-medium bg-red-600 text-white">
                                      {t('sites.overdue')}
                                    </span>
                                  )}
                                </div>
                                {task.description && (
                                  <p className="text-gray-700 dark:text-gray-400 text-sm mb-3">{task.description}</p>
                                )}
                                {task.comments && (
                                  <div className="bg-gray-100 dark:bg-gray-900 rounded p-3 mb-3 border border-gray-200 dark:border-gray-700">
                                    <div className="text-xs text-gray-600 dark:text-gray-500 mb-1">{t('sites.commentsLabel')}</div>
                                    <p className="text-gray-700 dark:text-gray-300 text-sm whitespace-pre-wrap">{task.comments}</p>
                                  </div>
                                )}
                                <div className="flex items-center gap-4 text-sm text-gray-700 dark:text-gray-400">
                                  {task.deadline && (
                                    <span>
                                      {t('sites.deadline')}: {new Date(task.deadline).toLocaleDateString('en-US')}
                                    </span>
                                  )}
                                  <span>
                                    {t('sites.createdAt')}: {new Date(task.createdAt).toLocaleDateString('en-US')}
                                  </span>
                                </div>
                              </div>
                              <div className="flex gap-2 ml-4">
                                <button
                                  onClick={() => router.push(`/sites/${siteId}/tasks/${task.id}`)}
                                  className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm text-white"
                                >
                                  {t('sites.open')}
                                </button>
                                <button
                                  onClick={() => openTaskModal(task)}
                                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm text-white"
                                >
                                  {t('sites.edit')}
                                </button>
                                <button
                                  onClick={() => handleDeleteTask(task.id)}
                                  className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm text-white"
                                >
                                  {t('sites.delete')}
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
                
                {/* Завершенные задачи */}
                {tasks.filter(t => t.status === 'completed').length > 0 && (
                  <div className="space-y-3 mt-8">
                    <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">{t('sites.completedTasks')}</h3>
                    {tasks
                      .filter(t => t.status === 'completed')
                      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                      .map((task) => {
                        const statusColors = {
                          pending: 'bg-yellow-600',
                          in_progress: 'bg-blue-600',
                          completed: 'bg-green-600',
                        };
                        const statusLabels = {
                          pending: t('sites.pending'),
                          in_progress: t('sites.inProgress'),
                          completed: t('sites.completed'),
                        };
                        return (
                          <div
                            key={task.id}
                            className="bg-gray-50 dark:bg-gray-800 rounded-lg p-5 border border-gray-200 dark:border-gray-700 opacity-75"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <h3 
                                    className="text-lg font-bold line-through cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-gray-900 dark:text-white"
                                    onClick={() => router.push(`/sites/${siteId}/tasks/${task.id}`)}
                                  >
                                    {task.title}
                                  </h3>
                                  <span className={`px-2 py-1 rounded text-xs font-medium text-white ${statusColors[task.status]}`}>
                                    {statusLabels[task.status]}
                                  </span>
                                </div>
                                {task.description && (
                                  <p className="text-gray-600 dark:text-gray-500 text-sm mb-3 line-through">{task.description}</p>
                                )}
                                {task.comments && (
                                  <div className="bg-gray-100 dark:bg-gray-900 rounded p-3 mb-3 border border-gray-200 dark:border-gray-700">
                                    <div className="text-xs text-gray-600 dark:text-gray-500 mb-1">{t('sites.commentsLabelShort')}</div>
                                    <p className="text-gray-700 dark:text-gray-400 text-sm whitespace-pre-wrap">{task.comments}</p>
                                  </div>
                                )}
                                <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-500">
                                  {task.deadline && (
                                    <span>
                                      {t('sites.deadline')}: {new Date(task.deadline).toLocaleDateString('en-US')}
                                    </span>
                                  )}
                                  <span>
                                    {t('sites.completedAt')}: {new Date(task.updatedAt).toLocaleDateString('en-US')}
                                  </span>
                                </div>
                              </div>
                              <div className="flex gap-2 ml-4">
                                <button
                                  onClick={() => router.push(`/sites/${siteId}/tasks/${task.id}`)}
                                  className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm text-white"
                                >
                                  {t('sites.open')}
                                </button>
                                <button
                                  onClick={() => openTaskModal(task)}
                                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm text-white"
                                >
                                  {t('sites.edit')}
                                </button>
                                <button
                                  onClick={() => handleDeleteTask(task.id)}
                                  className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm text-white"
                                >
                                  {t('sites.delete')}
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'google' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('sites.googleSearchConsoleData')}</h2>
              <div className="flex gap-2 flex-wrap">
                {!site?.hasGoogleConsoleConnection && (
                  <div className="flex items-center gap-2 text-sm text-yellow-600 dark:text-yellow-400 mr-4">
                    {!site?.googleConsoleStatus?.hasOAuth ? (
                      <>
                        <span>⚠️ {t('sites.oauthNotConfigured')}</span>
                        <a
                          href="/integrations"
                          className="text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {t('sites.configure')}
                        </a>
                      </>
                    ) : !site?.googleConsoleStatus?.hasUrl ? (
                      <>
                        <span>ℹ️ {t('sites.urlNotSpecified')}</span>
                      </>
                    ) : null}
                  </div>
                )}
                <button
                  onClick={handleSyncGoogle}
                  disabled={loadingData}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loadingData ? t('sites.syncing') : t('sites.sync')}
                </button>
              </div>
            </div>
            {/* Селектор периода */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-700 dark:text-gray-400">{t('sites.period')}:</span>
                <div className="flex gap-2">
                  {[7, 14, 30, 60, 90].map((days) => (
                    <button
                      key={days}
                      onClick={() => setSelectedPeriod(days)}
                      className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                        selectedPeriod === days
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                      }`}
                    >
                      {days} {t('sites.days')}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {!site?.hasGoogleConsoleConnection && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
                <p className="text-yellow-800 dark:text-yellow-300 text-sm">
                  {!site?.googleConsoleStatus?.hasOAuth
                    ? t('sites.syncNeedsOAuth')
                    : !site?.googleConsoleStatus?.hasUrl
                    ? t('sites.syncUrlHint')
                    : t('sites.notConnected')}
                </p>
              </div>
            )}
            {loadingData || loadingDetails ? (
              <div className="text-center py-8 text-gray-700 dark:text-gray-400">{t('sites.loadingData')}</div>
            ) : googleData.length === 0 && queries.length === 0 && pages.length === 0 && countries.length === 0 ? (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-8 text-center border border-gray-200 dark:border-gray-700">
                <p className="text-gray-700 dark:text-gray-400">{t('sites.dataNotLoaded')}</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Общая статистика */}
                {googleData.length > 0 && (
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-bold p-3 border-b border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white">{t('sites.impressionsClicksByDay')}</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-100 dark:bg-gray-700">
                          <tr>
                            <th className="px-2 py-2 text-left text-xs text-gray-900 dark:text-white">{t('sites.date')}</th>
                            <th className="px-2 py-2 text-left text-xs text-gray-900 dark:text-white">{t('sites.clicks')}</th>
                            <th className="px-2 py-2 text-left text-xs text-gray-900 dark:text-white">{t('sites.impressions')}</th>
                            <th className="px-2 py-2 text-left text-xs text-gray-900 dark:text-white">{t('sites.ctr')}</th>
                            <th className="px-2 py-2 text-left text-xs text-gray-900 dark:text-white">{t('sites.position')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {googleData.map((item, index) => (
                            <tr key={index} className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-750">
                              <td className="px-2 py-2 text-xs text-gray-900 dark:text-white">{new Date(item.date).toLocaleDateString('en-US', { day: '2-digit', month: '2-digit' })}</td>
                              <td className="px-2 py-2 text-gray-900 dark:text-white">{item.clicks.toLocaleString()}</td>
                              <td className="px-2 py-2 text-gray-900 dark:text-white">{item.impressions.toLocaleString()}</td>
                              <td className="px-2 py-2 text-gray-900 dark:text-white">{(item.ctr * 100).toFixed(2)}%</td>
                              <td className="px-2 py-2 text-gray-900 dark:text-white">{item.position.toFixed(1)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Поисковые запросы */}
                {queries.length > 0 && (
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-bold p-3 border-b border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white">{t('sites.searchQueries')}</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-100 dark:bg-gray-700">
                          <tr>
                            <th className="px-2 py-2 text-left text-xs text-gray-900 dark:text-white">{t('sites.query')}</th>
                            <th className="px-2 py-2 text-left text-xs text-gray-900 dark:text-white">{t('sites.clicks')}</th>
                            <th className="px-2 py-2 text-left text-xs text-gray-900 dark:text-white">{t('sites.impressions')}</th>
                            <th className="px-2 py-2 text-left text-xs text-gray-900 dark:text-white">{t('sites.ctr')}</th>
                            <th className="px-2 py-2 text-left text-xs text-gray-900 dark:text-white">{t('sites.position')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {queries.slice(0, 50).map((item, index) => (
                            <tr key={index} className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-750">
                              <td className="px-2 py-2 text-gray-900 dark:text-white">{item.query}</td>
                              <td className="px-2 py-2 text-gray-900 dark:text-white">{item.clicks.toLocaleString()}</td>
                              <td className="px-2 py-2 text-gray-900 dark:text-white">{item.impressions.toLocaleString()}</td>
                              <td className="px-2 py-2 text-gray-900 dark:text-white">{(item.ctr * 100).toFixed(2)}%</td>
                              <td className="px-2 py-2 text-gray-900 dark:text-white">{item.position.toFixed(1)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {queries.length > 50 && (
                      <div className="p-3 text-xs text-gray-700 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700">
                        {t('home.showingQueries')} {queries.length} {t('home.queries')}
                      </div>
                    )}
                  </div>
                )}

                {/* Страницы */}
                {pages.length > 0 && (
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-bold p-3 border-b border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white">{t('sites.pages')}</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-100 dark:bg-gray-700">
                          <tr>
                            <th className="px-2 py-2 text-left text-xs text-gray-900 dark:text-white">{t('sites.page')}</th>
                            <th className="px-2 py-2 text-left text-xs text-gray-900 dark:text-white">{t('sites.clicks')}</th>
                            <th className="px-2 py-2 text-left text-xs text-gray-900 dark:text-white">{t('sites.impressions')}</th>
                            <th className="px-2 py-2 text-left text-xs text-gray-900 dark:text-white">{t('sites.ctr')}</th>
                            <th className="px-2 py-2 text-left text-xs text-gray-900 dark:text-white">{t('sites.position')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pages.slice(0, 50).map((item, index) => (
                            <tr key={index} className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-750">
                              <td className="px-2 py-2">
                                <a 
                                  href={item.page} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-600 dark:text-blue-400 hover:underline truncate block max-w-md"
                                  title={item.page}
                                >
                                  {item.page}
                                </a>
                              </td>
                              <td className="px-2 py-2 text-gray-900 dark:text-white">{item.clicks.toLocaleString()}</td>
                              <td className="px-2 py-2 text-gray-900 dark:text-white">{item.impressions.toLocaleString()}</td>
                              <td className="px-2 py-2 text-gray-900 dark:text-white">{(item.ctr * 100).toFixed(2)}%</td>
                              <td className="px-2 py-2 text-gray-900 dark:text-white">{item.position.toFixed(1)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {pages.length > 50 && (
                      <div className="p-3 text-xs text-gray-700 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700">
                        {t('home.showingPages')} {pages.length} {t('home.pages')}
                      </div>
                    )}
                  </div>
                )}

                {/* География (страны) */}
                {countries.length > 0 && (
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-bold p-3 border-b border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white">{t('sites.geography')}</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-100 dark:bg-gray-700">
                          <tr>
                            <th className="px-2 py-2 text-left text-xs text-gray-900 dark:text-white">{t('sites.country')}</th>
                            <th className="px-2 py-2 text-left text-xs text-gray-900 dark:text-white">{t('sites.clicks')}</th>
                            <th className="px-2 py-2 text-left text-xs text-gray-900 dark:text-white">{t('sites.impressions')}</th>
                            <th className="px-2 py-2 text-left text-xs text-gray-900 dark:text-white">{t('sites.ctr')}</th>
                            <th className="px-2 py-2 text-left text-xs text-gray-900 dark:text-white">{t('sites.position')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {countries.map((item, index) => (
                            <tr key={index} className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-750">
                              <td className="px-2 py-2 text-gray-900 dark:text-white">{item.country}</td>
                              <td className="px-2 py-2 text-gray-900 dark:text-white">{item.clicks.toLocaleString()}</td>
                              <td className="px-2 py-2 text-gray-900 dark:text-white">{item.impressions.toLocaleString()}</td>
                              <td className="px-2 py-2 text-gray-900 dark:text-white">{(item.ctr * 100).toFixed(2)}%</td>
                              <td className="px-2 py-2 text-gray-900 dark:text-white">{item.position.toFixed(1)}</td>
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

        {activeTab === 'link-profile' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('sites.linkProfile')}</h2>
            </div>
            {loadingLinkProject ? (
              <div className="text-center py-8 text-gray-700 dark:text-gray-400">{t('sites.loadingProject')}</div>
            ) : linkProject ? (
              <>
                {/* Статистика */}
                {!loadingLinkProjectLinks && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">{linkProjectLinks.length}</div>
                      <div className="text-sm text-gray-700 dark:text-gray-400">{t('sites.totalLinks')}</div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-green-200 dark:border-green-700">
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {linkProjectLinks.filter((l) => l.status === 'indexed').length}
                      </div>
                      <div className="text-sm text-gray-700 dark:text-gray-400">{t('sites.indexed')}</div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-red-200 dark:border-red-700">
                      <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                        {linkProjectLinks.filter((l) => l.status === 'not_found').length}
                      </div>
                      <div className="text-sm text-gray-700 dark:text-gray-400">{t('sites.notFound')}</div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-yellow-200 dark:border-yellow-700">
                      <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                        {linkProjectLinks.filter((l) => l.status === 'pending').length}
                      </div>
                      <div className="text-sm text-gray-700 dark:text-gray-400">{t('sites.pendingCheck')}</div>
                    </div>
                  </div>
                )}

                {/* Действия */}
                <div className="flex gap-4">
                  <button
                    onClick={() => setShowUploadLinksModal(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white"
                  >
                    + {t('sites.uploadLinks')}
                  </button>
                  <button
                    onClick={handleCheckLinks}
                    disabled={checkingLinks || linkProjectLinks.length === 0}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-white disabled:opacity-50"
                  >
                    {checkingLinks ? t('sites.checking') : t('sites.checkAllLinks')}
                  </button>
                </div>

                {/* Таблица ссылок */}
                {loadingLinkProjectLinks ? (
                  <div className="text-center py-8 text-gray-700 dark:text-gray-400">{t('sites.loadingLinks')}</div>
                ) : (
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                    <table className="w-full">
                      <thead className="bg-gray-100 dark:bg-gray-700">
                        <tr>
                          <th className="px-4 py-3 text-left text-gray-900 dark:text-white">URL</th>
                          <th className="px-4 py-3 text-left text-gray-900 dark:text-white">{t('sites.targetUrl')}</th>
                          <th className="px-4 py-3 text-left text-gray-900 dark:text-white">{t('sites.status')}</th>
                          <th className="px-4 py-3 text-left text-gray-900 dark:text-white">{t('sites.lastCheck')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {linkProjectLinks.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-4 py-8 text-center text-gray-700 dark:text-gray-400">
                              {t('sites.linksNotLoaded')}
                            </td>
                          </tr>
                        ) : (
                          linkProjectLinks.map((link) => (
                            <tr key={link.id} className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-750">
                              <td className="px-4 py-3">
                                <a
                                  href={link.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 dark:text-blue-400 hover:underline"
                                >
                                  {link.url}
                                </a>
                              </td>
                              <td className="px-4 py-3 text-gray-700 dark:text-gray-400">{link.targetUrl}</td>
                              <td className="px-4 py-3">
                                <span
                                  className={`px-2 py-1 rounded text-xs ${
                                    link.status === 'indexed'
                                      ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300'
                                      : link.status === 'not_found'
                                      ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-300'
                                      : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-300'
                                  }`}
                                >
                                  {link.status === 'indexed'
                                    ? t('sites.indexed')
                                    : link.status === 'not_found'
                                    ? t('sites.notFound')
                                    : t('sites.pendingCheck')}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-gray-700 dark:text-gray-400 text-sm">
                                {link.lastChecked
                                  ? new Date(link.lastChecked).toLocaleString('en-US')
                                  : '—'}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-8 text-center border border-gray-200 dark:border-gray-700">
                <p className="text-gray-700 dark:text-gray-400 mb-4">{t('sites.projectLoadError')}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'postbacks' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('sites.postbacks')}</h2>
            {loadingData ? (
              <div className="text-center py-8 text-gray-700 dark:text-gray-400">{t('sites.loadingData')}</div>
            ) : postbacks.length === 0 ? (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-8 text-center border border-gray-200 dark:border-gray-700">
                <p className="text-gray-700 dark:text-gray-400 mb-4">{t('sites.noPostbacks')}</p>
                <p className="text-sm text-gray-600 dark:text-gray-500">
                  {t('sites.postbackEndpoint')} <code className="bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded text-gray-900 dark:text-gray-100">/api/sites/{siteId}/postbacks</code>
                </p>
              </div>
            ) : (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                <table className="w-full">
                  <thead className="bg-gray-100 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-gray-900 dark:text-white">{t('sites.date')}</th>
                      <th className="px-4 py-3 text-left text-gray-900 dark:text-white">{t('sites.network')}</th>
                      <th className="px-4 py-3 text-left text-gray-900 dark:text-white">{t('sites.event')}</th>
                      <th className="px-4 py-3 text-left text-gray-900 dark:text-white">{t('sites.amount')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {postbacks.map((postback, index) => (
                      <tr key={index} className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-750">
                        <td className="px-4 py-3 text-gray-900 dark:text-white">{new Date(postback.date).toLocaleString('en-US')}</td>
                        <td className="px-4 py-3 text-gray-900 dark:text-white">{postback.network}</td>
                        <td className="px-4 py-3 text-gray-900 dark:text-white">{postback.event}</td>
                        <td className="px-4 py-3 text-gray-900 dark:text-white">
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

        {/* Модальное окно выбора статуса */}
        {showStatusModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md border border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">{t('sites.selectStatus')}</h2>
              <div className="space-y-2 mb-4 max-h-96 overflow-y-auto">
                {siteStatuses.map((status) => (
                  <div
                    key={status.id}
                    className={`rounded border transition-colors ${
                      site?.statusId === status.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    {editingStatusId === status.id ? (
                      <div className="p-4 space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {t('sites.statusName')}
                          </label>
                          <input
                            type="text"
                            value={editingStatusForm.name}
                            onChange={(e) => setEditingStatusForm({ ...editingStatusForm, name: e.target.value })}
                            className="w-full px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded border border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:outline-none"
                            placeholder={t('sites.statusName')}
                            autoFocus
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {t('sites.statusColor')}
                          </label>
                          <div className="flex items-center gap-3">
                            <input
                              type="color"
                              value={editingStatusForm.color}
                              onChange={(e) => setEditingStatusForm({ ...editingStatusForm, color: e.target.value })}
                              className="w-16 h-10 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                            />
                            <input
                              type="text"
                              value={editingStatusForm.color}
                              onChange={(e) => setEditingStatusForm({ ...editingStatusForm, color: e.target.value })}
                              className="flex-1 px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded border border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:outline-none font-mono text-sm"
                              placeholder="#6b7280"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSaveStatus(status.id)}
                            disabled={!editingStatusForm.name.trim()}
                            className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm text-white disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {t('sites.save')}
                          </button>
                          <button
                            onClick={handleCancelEditStatus}
                            className="flex-1 px-3 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded text-sm text-gray-900 dark:text-white"
                          >
                            {t('sites.cancel')}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleUpdateSiteStatus(status.id)}
                        className={`w-full text-left px-4 py-3 rounded transition-colors text-gray-900 dark:text-white ${
                          site?.statusId === status.id
                            ? ''
                            : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-4 h-4 rounded-full flex-shrink-0"
                            style={{ backgroundColor: status.color }}
                          ></div>
                          <span className="font-medium flex-1">{status.name}</span>
                          {site?.statusId === status.id && (
                            <span className="text-blue-600 dark:text-blue-400">✓</span>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartEditStatus(status);
                            }}
                            className="ml-2 px-2 py-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-sm"
                            title={t('sites.editStatus')}
                          >
                            ✏️
                          </button>
                        </div>
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => handleUpdateSiteStatus(null)}
                  className={`w-full text-left px-4 py-3 rounded border transition-colors ${
                    !site?.statusId
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10'
                      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-gray-700 dark:text-gray-400">{t('sites.noStatus')}</span>
                    {!site?.statusId && (
                      <span className="ml-auto text-blue-600 dark:text-blue-400">✓</span>
                    )}
                  </div>
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowStatusModal(false);
                    setEditingStatusId(null);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded text-gray-900 dark:text-white"
                >
                  {t('sites.close')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Модальное окно задачи */}
        {showTaskModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
                {editingTask ? t('sites.editTask') : t('sites.createTaskTitle')}
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('sites.taskTitle')} *
                  </label>
                  <input
                    type="text"
                    value={taskForm.title}
                    onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                    className="w-full px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded border border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:outline-none"
                    placeholder={t('sites.taskTitlePlaceholder')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('sites.description')}
                  </label>
                  <textarea
                    value={taskForm.description}
                    onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                    className="w-full px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded border border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:outline-none"
                    rows={3}
                    placeholder={t('sites.descriptionPlaceholder')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('sites.status')}
                  </label>
                  <select
                    value={taskForm.status}
                    onChange={(e) => setTaskForm({ ...taskForm, status: e.target.value as any })}
                    className="w-full px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded border border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="pending">{t('sites.pending')}</option>
                    <option value="in_progress">{t('sites.inProgress')}</option>
                    <option value="completed">{t('sites.completed')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('sites.deadlineDate')}
                  </label>
                  <input
                    type="date"
                    value={taskForm.deadline}
                    onChange={(e) => setTaskForm({ ...taskForm, deadline: e.target.value })}
                    className="w-full px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded border border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('sites.priorityLabel')}
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={taskForm.priority}
                      onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                      className="w-full px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded border border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:outline-none"
                      placeholder={t('sites.priorityPlaceholder')}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('sites.assignee')}
                    </label>
                    <select
                      value={taskForm.assigneeId}
                      onChange={(e) => setTaskForm({ ...taskForm, assigneeId: e.target.value })}
                      className="w-full px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded border border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:outline-none"
                      disabled={loadingUsers}
                    >
                      <option value="">{t('sites.notAssigned')}</option>
                      {users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.name || user.email}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('sites.estimatedTime')}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={taskForm.estimatedTime}
                      onChange={(e) => setTaskForm({ ...taskForm, estimatedTime: e.target.value })}
                      className="w-full px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded border border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:outline-none"
                      placeholder={t('sites.estimatedTimePlaceholder')}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('sites.actualTime')}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={taskForm.actualTime}
                      onChange={(e) => setTaskForm({ ...taskForm, actualTime: e.target.value })}
                      className="w-full px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded border border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:outline-none"
                      placeholder={t('sites.actualTimePlaceholder')}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('sites.tags')}
                  </label>
                  <input
                    type="text"
                    value={taskForm.tags}
                    onChange={(e) => setTaskForm({ ...taskForm, tags: e.target.value })}
                    className="w-full px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded border border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:outline-none"
                    placeholder={t('sites.tagsPlaceholder')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('sites.comments')}
                  </label>
                  <textarea
                    value={taskForm.comments}
                    onChange={(e) => setTaskForm({ ...taskForm, comments: e.target.value })}
                    className="w-full px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded border border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:outline-none"
                    rows={5}
                    placeholder={t('sites.commentsPlaceholder')}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={editingTask ? handleUpdateTask : handleCreateTask}
                    disabled={!taskForm.title}
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {editingTask ? t('sites.save') : t('sites.create')}
                  </button>
                  <button
                    onClick={() => {
                      setShowTaskModal(false);
                      setEditingTask(null);
                      setTaskForm({ 
                        title: '', 
                        description: '', 
                        status: 'pending', 
                        deadline: '', 
                        comments: '', 
                        priority: '',
                        assigneeId: '',
                        tags: '',
                        estimatedTime: '',
                        actualTime: '',
                      });
                    }}
                    className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded text-gray-900 dark:text-white"
                  >
                    {t('sites.cancel')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Модальное окно загрузки ссылок */}
        {showUploadLinksModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl border border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">{t('sites.uploadLinksTitle')}</h2>
              <p className="text-gray-700 dark:text-gray-400 text-sm mb-4">
                {t('sites.uploadLinksDesc')}
              </p>
              <textarea
                value={uploadLinksText}
                onChange={(e) => setUploadLinksText(e.target.value)}
                className="w-full px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded border border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:outline-none font-mono text-sm"
                rows={10}
                placeholder="https://example.com/page1&#10;https://example.com/page2&#10;https://example.com/page3"
              />
              <div className="flex gap-2 mt-4">
                <button
                  onClick={handleUploadLinks}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white"
                >
                  {t('sites.upload')}
                </button>
                <button
                  onClick={() => setShowUploadLinksModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded text-gray-900 dark:text-white"
                >
                  {t('sites.cancel')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
