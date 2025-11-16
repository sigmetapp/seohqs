'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { SiteTask, TaskMessage } from '@/lib/types';

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const siteId = params.id as string;
  const taskId = params.taskId as string;

  const [task, setTask] = useState<SiteTask | null>(null);
  const [messages, setMessages] = useState<TaskMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
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

  useEffect(() => {
    if (taskId) {
      loadTask();
      loadMessages();
    }
  }, [taskId]);

  useEffect(() => {
    if (task) {
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
    }
  }, [task]);

  const loadTask = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/sites/${siteId}/tasks/${taskId}`);
      const data = await response.json();
      if (data.success) {
        setTask(data.task);
      } else {
        alert(data.error || 'Ошибка загрузки задачи');
      }
    } catch (err) {
      console.error('Error loading task:', err);
      alert('Ошибка загрузки задачи');
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async () => {
    try {
      setLoadingMessages(true);
      const response = await fetch(`/api/sites/${siteId}/tasks/${taskId}/messages`);
      const data = await response.json();
      if (data.success) {
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error('Error loading messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  const loadUsers = async () => {
    try {
      setLoadingUsers(true);
      // Загружаем список пользователей (можно создать отдельный API endpoint)
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

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    try {
      setSendingMessage(true);
      const response = await fetch(`/api/sites/${siteId}/tasks/${taskId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: newMessage }),
      });
      const data = await response.json();
      if (data.success) {
        setNewMessage('');
        loadMessages();
      } else {
        alert(data.error || 'Ошибка отправки сообщения');
      }
    } catch (err) {
      console.error('Error sending message:', err);
      alert('Ошибка отправки сообщения');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleUpdateTask = async () => {
    try {
      const response = await fetch(`/api/sites/${siteId}/tasks/${taskId}`, {
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
        setShowEditModal(false);
        loadTask();
      } else {
        alert(data.error || 'Ошибка обновления задачи');
      }
    } catch (err) {
      console.error('Error updating task:', err);
      alert('Ошибка обновления задачи');
    }
  };

  const formatTime = (minutes: number | undefined) => {
    if (!minutes) return '—';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}ч ${mins}м`;
    }
    return `${mins}м`;
  };

  if (loading && !task) {
    return (
      <main className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">Загрузка...</div>
        </div>
      </main>
    );
  }

  if (!task) {
    return (
      <main className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">Задача не найдена</div>
        </div>
      </main>
    );
  }

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
  const isOverdue = task.deadline && new Date(task.deadline) < new Date() && task.status !== 'completed';
  const priorityColor = task.priority 
    ? task.priority >= 8 ? 'text-red-400 border-red-400' 
      : task.priority >= 5 ? 'text-yellow-400 border-yellow-400' 
      : 'text-green-400 border-green-400'
    : 'text-gray-400 border-gray-400';

  return (
    <main className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => router.push(`/sites/${siteId}?tab=tasks`)}
            className="text-blue-400 hover:text-blue-300 mb-4"
          >
            ← Назад к задачам
          </button>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-4xl font-bold mb-2">{task.title}</h1>
              <div className="flex items-center gap-3 flex-wrap">
                <span className={`px-3 py-1 rounded text-sm font-medium ${statusColors[task.status]}`}>
                  {statusLabels[task.status]}
                </span>
                {task.priority && (
                  <span className={`px-3 py-1 rounded text-sm font-medium ${priorityColor} border`}>
                    Приоритет: {task.priority}/10
                  </span>
                )}
                {isOverdue && (
                  <span className="px-3 py-1 rounded text-sm font-medium bg-red-600">
                    Просрочено
                  </span>
                )}
                {task.tags && task.tags.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {task.tags.map((tag, idx) => (
                      <span key={idx} className="px-2 py-1 rounded text-xs bg-gray-700 text-gray-300">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={() => {
                setShowEditModal(true);
                if (users.length === 0) loadUsers();
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
            >
              Редактировать
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Основная информация */}
          <div className="lg:col-span-2 space-y-6">
            {/* Описание */}
            {task.description && (
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h2 className="text-xl font-bold mb-3">Описание</h2>
                <p className="text-gray-300 whitespace-pre-wrap">{task.description}</p>
              </div>
            )}

            {/* Комментарии (процесс реализации) */}
            {task.comments && (
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h2 className="text-xl font-bold mb-3">Комментарии (процесс реализации)</h2>
                <p className="text-gray-300 whitespace-pre-wrap">{task.comments}</p>
              </div>
            )}

            {/* Подзадачи */}
            {task.subtasks && task.subtasks.length > 0 && (
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h2 className="text-xl font-bold mb-3">Подзадачи</h2>
                <div className="space-y-2">
                  {task.subtasks.map((subtask) => (
                    <div key={subtask.id} className="bg-gray-900 rounded p-3 border border-gray-700">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded text-xs ${statusColors[subtask.status]}`}>
                              {statusLabels[subtask.status]}
                            </span>
                            <span className="font-medium">{subtask.title}</span>
                          </div>
                          {subtask.description && (
                            <p className="text-sm text-gray-400 mt-1">{subtask.description}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Сообщения */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h2 className="text-xl font-bold mb-4">Сообщения</h2>
              
              {/* Список сообщений */}
              <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
                {loadingMessages ? (
                  <div className="text-center py-4 text-gray-400">Загрузка сообщений...</div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-4 text-gray-400">Сообщений пока нет</div>
                ) : (
                  messages.map((msg) => (
                    <div key={msg.id} className="bg-gray-900 rounded p-4 border border-gray-700">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold">
                            {msg.user?.name?.[0]?.toUpperCase() || msg.user?.email?.[0]?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <div className="font-medium">
                              {msg.user?.name || msg.user?.email || 'Анонимный пользователь'}
                            </div>
                            <div className="text-xs text-gray-400">
                              {new Date(msg.createdAt).toLocaleString('ru-RU')}
                            </div>
                          </div>
                        </div>
                      </div>
                      <p className="text-gray-300 whitespace-pre-wrap">{msg.message}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Форма отправки сообщения */}
              <div className="border-t border-gray-700 pt-4">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      handleSendMessage();
                    }
                  }}
                  className="w-full px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none mb-2"
                  rows={3}
                  placeholder="Напишите сообщение... (Ctrl+Enter для отправки)"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || sendingMessage}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sendingMessage ? 'Отправка...' : 'Отправить'}
                </button>
              </div>
            </div>
          </div>

          {/* Боковая панель */}
          <div className="space-y-6">
            {/* Детали задачи */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-bold mb-4">Детали задачи</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <div className="text-gray-400 mb-1">Исполнитель</div>
                  <div className="text-gray-300">
                    {task.assignee ? (task.assignee.name || task.assignee.email) : 'Не назначен'}
                  </div>
                </div>
                <div>
                  <div className="text-gray-400 mb-1">Срок выполнения</div>
                  <div className="text-gray-300">
                    {task.deadline ? new Date(task.deadline).toLocaleDateString('ru-RU') : 'Не установлен'}
                  </div>
                </div>
                <div>
                  <div className="text-gray-400 mb-1">Оценка времени</div>
                  <div className="text-gray-300">{formatTime(task.estimatedTime)}</div>
                </div>
                <div>
                  <div className="text-gray-400 mb-1">Фактическое время</div>
                  <div className="text-gray-300">{formatTime(task.actualTime)}</div>
                </div>
                <div>
                  <div className="text-gray-400 mb-1">Создано</div>
                  <div className="text-gray-300">
                    {new Date(task.createdAt).toLocaleString('ru-RU')}
                  </div>
                </div>
                <div>
                  <div className="text-gray-400 mb-1">Обновлено</div>
                  <div className="text-gray-300">
                    {new Date(task.updatedAt).toLocaleString('ru-RU')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Модальное окно редактирования */}
        {showEditModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-700">
              <h2 className="text-2xl font-bold mb-4">Редактировать задачу</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Название задачи *
                  </label>
                  <input
                    type="text"
                    value={taskForm.title}
                    onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Описание
                  </label>
                  <textarea
                    value={taskForm.description}
                    onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Статус
                    </label>
                    <select
                      value={taskForm.status}
                      onChange={(e) => setTaskForm({ ...taskForm, status: e.target.value as any })}
                      className="w-full px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                    >
                      <option value="pending">В ожидании</option>
                      <option value="in_progress">В работе</option>
                      <option value="completed">Завершено</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Приоритет (1-10)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={taskForm.priority}
                      onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Срок выполнения
                    </label>
                    <input
                      type="date"
                      value={taskForm.deadline}
                      onChange={(e) => setTaskForm({ ...taskForm, deadline: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Исполнитель
                    </label>
                    <select
                      value={taskForm.assigneeId}
                      onChange={(e) => setTaskForm({ ...taskForm, assigneeId: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                      onFocus={loadUsers}
                      disabled={loadingUsers}
                    >
                      <option value="">Не назначен</option>
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
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Оценка времени (минуты)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={taskForm.estimatedTime}
                      onChange={(e) => setTaskForm({ ...taskForm, estimatedTime: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Фактическое время (минуты)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={taskForm.actualTime}
                      onChange={(e) => setTaskForm({ ...taskForm, actualTime: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Теги (через запятую)
                  </label>
                  <input
                    type="text"
                    value={taskForm.tags}
                    onChange={(e) => setTaskForm({ ...taskForm, tags: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                    placeholder="bug, feature, urgent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Комментарии (процесс реализации)
                  </label>
                  <textarea
                    value={taskForm.comments}
                    onChange={(e) => setTaskForm({ ...taskForm, comments: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                    rows={5}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleUpdateTask}
                    disabled={!taskForm.title}
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
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
