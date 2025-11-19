'use client';

import { useState, useEffect } from 'react';
import { useI18n } from '@/lib/i18n-context';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface User {
  id: number;
  email: string;
  name?: string;
  createdAt?: string;
  updatedAt?: string;
  sitesCount?: number;
}

const ADMIN_EMAIL = 'admin@buylink.pro';

export default function AdminUsersPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showResetDataModal, setShowResetDataModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({ email: '', name: '', password: '' });
  const [resetPasswordData, setResetPasswordData] = useState({ password: '', confirmPassword: '' });

  useEffect(() => {
    checkAuthorization();
  }, []);

  const checkAuthorization = async () => {
    try {
      const response = await fetch('/api/auth/user/me');
      const data = await response.json();
      
      if (data.success && data.user) {
        // Сравниваем email без учета регистра и пробелов
        const userEmail = (data.user.email || '').trim().toLowerCase();
        const adminEmail = ADMIN_EMAIL.trim().toLowerCase();
        
        if (userEmail === adminEmail) {
          setAuthorized(true);
          loadUsers();
        } else {
          // Не авторизован как администратор - перенаправляем на главную
          router.push('/');
        }
      } else {
        // Не авторизован - перенаправляем на главную
        router.push('/');
      }
    } catch (error) {
      console.error('Ошибка проверки авторизации:', error);
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/users');
      const data = await response.json();
      
      if (data.success) {
        setUsers(data.users || []);
      } else {
        showMessage('error', data.error || 'Ошибка загрузки пользователей');
      }
    } catch (error: any) {
      showMessage('error', error.message || 'Ошибка загрузки пользователей');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email) {
      showMessage('error', 'Email обязателен');
      return;
    }

    if (formData.password && formData.password.length < 6) {
      showMessage('error', 'Пароль должен содержать минимум 6 символов');
      return;
    }

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          name: formData.name || undefined,
          password: formData.password || undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        showMessage('success', 'Пользователь успешно создан');
        setShowCreateModal(false);
        setFormData({ email: '', name: '', password: '' });
        loadUsers();
      } else {
        showMessage('error', data.error || 'Ошибка создания пользователя');
      }
    } catch (error: any) {
      showMessage('error', error.message || 'Ошибка создания пользователя');
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedUser) return;

    try {
      const response = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedUser.id,
          email: formData.email,
          name: formData.name || undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        showMessage('success', 'Пользователь успешно обновлен');
        setShowEditModal(false);
        setSelectedUser(null);
        setFormData({ email: '', name: '', password: '' });
        loadUsers();
      } else {
        showMessage('error', data.error || 'Ошибка обновления пользователя');
      }
    } catch (error: any) {
      showMessage('error', error.message || 'Ошибка обновления пользователя');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedUser) return;

    if (!resetPasswordData.password) {
      showMessage('error', 'Пароль обязателен');
      return;
    }

    if (resetPasswordData.password.length < 6) {
      showMessage('error', 'Пароль должен содержать минимум 6 символов');
      return;
    }

    if (resetPasswordData.password !== resetPasswordData.confirmPassword) {
      showMessage('error', 'Пароли не совпадают');
      return;
    }

    try {
      const response = await fetch(`/api/users/${selectedUser.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: resetPasswordData.password,
        }),
      });

      const data = await response.json();

      if (data.success) {
        showMessage('success', 'Пароль успешно изменен');
        setShowResetPasswordModal(false);
        setSelectedUser(null);
        setResetPasswordData({ password: '', confirmPassword: '' });
      } else {
        showMessage('error', data.error || 'Ошибка сброса пароля');
      }
    } catch (error: any) {
      showMessage('error', error.message || 'Ошибка сброса пароля');
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      const response = await fetch(`/api/users?id=${selectedUser.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        showMessage('success', 'Пользователь успешно удален');
        setShowDeleteModal(false);
        setSelectedUser(null);
        loadUsers();
      } else {
        showMessage('error', data.error || 'Ошибка удаления пользователя');
      }
    } catch (error: any) {
      showMessage('error', error.message || 'Ошибка удаления пользователя');
    }
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setFormData({ email: user.email, name: user.name || '', password: '' });
    setShowEditModal(true);
  };

  const openResetPasswordModal = (user: User) => {
    setSelectedUser(user);
    setResetPasswordData({ password: '', confirmPassword: '' });
    setShowResetPasswordModal(true);
  };

  const openDeleteModal = (user: User) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  const openResetDataModal = (user: User) => {
    setSelectedUser(user);
    setShowResetDataModal(true);
  };

  const handleResetUserData = async () => {
    if (!selectedUser) return;

    if (!confirm(`Вы уверены, что хотите сбросить все данные пользователя ${selectedUser.email}? Это удалит все его сайты, задачи, теги, интеграции и другие данные. Пользователь сможет заново добавить все данные.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/users/${selectedUser.id}/reset-sites`, {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        showMessage('success', data.message || 'Все данные пользователя успешно сброшены');
        setShowResetDataModal(false);
        setSelectedUser(null);
        loadUsers();
      } else {
        showMessage('error', data.error || 'Ошибка сброса данных пользователя');
      }
    } catch (error: any) {
      showMessage('error', error.message || 'Ошибка сброса данных пользователя');
    }
  };

  if (loading || !authorized) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Проверка доступа...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Управление пользователями
            </h1>
            <button
              onClick={() => {
                setFormData({ email: '', name: '', password: '' });
                setShowCreateModal(true);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Создать пользователя
            </button>
          </div>

          {message && (
            <div className={`mx-6 mt-4 p-4 rounded-lg ${
              message.type === 'success' 
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
            }`}>
              {message.text}
            </div>
          )}

          <div className="px-6 py-4">
            {loading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-2 text-gray-600 dark:text-gray-400">Загрузка...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Имя
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Кол-во сайтов
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Создан
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Действия
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                          Пользователи не найдены
                        </td>
                      </tr>
                    ) : (
                      users.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                            {user.id}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                            {user.email}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                            {user.name || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 font-medium">
                            {user.sitesCount !== undefined ? user.sitesCount : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {user.createdAt ? new Date(user.createdAt).toLocaleDateString('ru-RU') : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                            <button
                              onClick={() => openEditModal(user)}
                              className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                            >
                              Редактировать
                            </button>
                            <button
                              onClick={() => openResetPasswordModal(user)}
                              className="text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300"
                            >
                              Сбросить пароль
                            </button>
                            <button
                              onClick={() => openResetDataModal(user)}
                              className="text-orange-600 hover:text-orange-900 dark:text-orange-400 dark:hover:text-orange-300"
                            >
                              Сбросить данные
                            </button>
                            <button
                              onClick={() => openDeleteModal(user)}
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                            >
                              Удалить
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Создать пользователя</h2>
            <form onSubmit={handleCreateUser}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Имя
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Пароль (опционально)
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  minLength={6}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setFormData({ email: '', name: '', password: '' });
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Создать
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Редактировать пользователя</h2>
            <form onSubmit={handleUpdateUser}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Имя
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedUser(null);
                    setFormData({ email: '', name: '', password: '' });
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetPasswordModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
              Сбросить пароль для {selectedUser.email}
            </h2>
            <form onSubmit={handleResetPassword}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Новый пароль *
                </label>
                <input
                  type="password"
                  value={resetPasswordData.password}
                  onChange={(e) => setResetPasswordData({ ...resetPasswordData, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                  minLength={6}
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Подтвердите пароль *
                </label>
                <input
                  type="password"
                  value={resetPasswordData.confirmPassword}
                  onChange={(e) => setResetPasswordData({ ...resetPasswordData, confirmPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                  minLength={6}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowResetPasswordModal(false);
                    setSelectedUser(null);
                    setResetPasswordData({ password: '', confirmPassword: '' });
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
                >
                  Сбросить пароль
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset User Data Modal */}
      {showResetDataModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Сбросить все данные пользователя</h2>
            <p className="mb-4 text-gray-700 dark:text-gray-300">
              Вы уверены, что хотите сбросить все данные пользователя <strong>{selectedUser.email}</strong>? 
              Это действие удалит:
            </p>
            <ul className="mb-4 text-sm text-gray-600 dark:text-gray-400 list-disc list-inside space-y-1">
              <li>Все сайты пользователя</li>
              <li>Все задачи и связанные данные</li>
              <li>Все теги</li>
              <li>Все интеграции (Google аккаунты, GSC интеграции)</li>
              <li>Все ссылочные проекты</li>
              <li>Данные Google Search Console</li>
            </ul>
            <p className="mb-4 text-sm text-orange-600 dark:text-orange-400 font-medium">
              Пользователь сможет заново добавить все данные после сброса.
            </p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowResetDataModal(false);
                  setSelectedUser(null);
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Отмена
              </button>
              <button
                onClick={handleResetUserData}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
              >
                Сбросить данные
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Modal */}
      {showDeleteModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Удалить пользователя</h2>
            <p className="mb-4 text-gray-700 dark:text-gray-300">
              Вы уверены, что хотите удалить пользователя <strong>{selectedUser.email}</strong>? 
              Это действие нельзя отменить.
            </p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedUser(null);
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Отмена
              </button>
              <button
                onClick={handleDeleteUser}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Footer */}
      <footer className="mt-8 bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center">
            <Link
              href="/"
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
            >
              Главная страница
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
