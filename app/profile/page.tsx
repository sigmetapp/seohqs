'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface UserProfile {
  id: number;
  email: string;
  name?: string;
  picture?: string;
  avatar?: string;
  googleId?: string;
  hasPassword: boolean;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface TeamMember {
  id: number;
  email: string;
  name?: string;
  username: string;
  firstLogin: boolean;
  createdAt: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Состояния для формы установки пароля
  const [showSetPassword, setShowSetPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);
  
  // Состояния для формы изменения пароля
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [changePasswordError, setChangePasswordError] = useState<string | null>(null);
  const [changePasswordSuccess, setChangePasswordSuccess] = useState<string | null>(null);
  const [changePasswordLoading, setChangePasswordLoading] = useState(false);

  // Состояния для редактирования имени
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameLoading, setNameLoading] = useState(false);

  // Состояния для аватара
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Состояния для команды
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberName, setNewMemberName] = useState('');
  const [teamError, setTeamError] = useState<string | null>(null);
  const [teamSuccess, setTeamSuccess] = useState<string | null>(null);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [teamLoading, setTeamLoading] = useState(false);

  // Состояния для удаления аккаунта
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    fetchProfile();
    fetchTeamMembers();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/auth/user/profile');
      const data = await response.json();
      
      if (data.success && data.user) {
        setUser(data.user);
        setNewName(data.user.name || '');
      } else {
        if (response.status === 401) {
          router.push('/');
        } else {
          setError(data.error || 'Ошибка загрузки профиля');
        }
      }
    } catch (err: any) {
      setError('Ошибка загрузки профиля');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamMembers = async () => {
    setLoadingTeam(true);
    try {
      const response = await fetch('/api/auth/user/team');
      const data = await response.json();
      
      if (data.success) {
        setTeamMembers(data.members || []);
      }
    } catch (err: any) {
      console.error('Ошибка загрузки команды:', err);
    } finally {
      setLoadingTeam(false);
    }
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!password || password.length < 6) {
      setPasswordError('Пароль должен содержать минимум 6 символов');
      return;
    }

    if (password !== passwordConfirm) {
      setPasswordError('Пароли не совпадают');
      return;
    }

    setPasswordLoading(true);

    try {
      const response = await fetch('/api/auth/user/password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (data.success) {
        setPasswordSuccess('Пароль успешно установлен');
        setPassword('');
        setPasswordConfirm('');
        setShowSetPassword(false);
        fetchProfile();
      } else {
        setPasswordError(data.error || 'Ошибка установки пароля');
      }
    } catch (err: any) {
      setPasswordError('Ошибка установки пароля');
      console.error(err);
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangePasswordError(null);
    setChangePasswordSuccess(null);

    if (!currentPassword) {
      setChangePasswordError('Введите текущий пароль');
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setChangePasswordError('Новый пароль должен содержать минимум 6 символов');
      return;
    }

    if (newPassword !== newPasswordConfirm) {
      setChangePasswordError('Новые пароли не совпадают');
      return;
    }

    setChangePasswordLoading(true);

    try {
      const response = await fetch('/api/auth/user/password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password: newPassword,
          currentPassword,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setChangePasswordSuccess('Пароль успешно изменен');
        setCurrentPassword('');
        setNewPassword('');
        setNewPasswordConfirm('');
        setShowChangePassword(false);
      } else {
        setChangePasswordError(data.error || 'Ошибка изменения пароля');
      }
    } catch (err: any) {
      setChangePasswordError('Ошибка изменения пароля');
      console.error(err);
    } finally {
      setChangePasswordLoading(false);
    }
  };

  const handleUpdateName = async () => {
    if (!newName.trim()) {
      setNameError('Имя не может быть пустым');
      return;
    }

    setNameLoading(true);
    setNameError(null);

    try {
      const response = await fetch('/api/auth/user/profile/update', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newName.trim() }),
      });

      const data = await response.json();

      if (data.success) {
        setUser(data.user);
        setEditingName(false);
      } else {
        setNameError(data.error || 'Ошибка обновления имени');
      }
    } catch (err: any) {
      setNameError('Ошибка обновления имени');
      console.error(err);
    } finally {
      setNameLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setAvatarError('Файл должен быть изображением');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setAvatarError('Размер изображения не должен превышать 2MB');
      return;
    }

    setAvatarLoading(true);
    setAvatarError(null);

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        
        try {
          const response = await fetch('/api/auth/user/profile/avatar', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ avatar: base64 }),
          });

          const data = await response.json();

          if (data.success) {
            setUser(prev => prev ? { ...prev, avatar: data.avatar } : null);
          } else {
            setAvatarError(data.error || 'Ошибка загрузки аватара');
          }
        } catch (err: any) {
          setAvatarError('Ошибка загрузки аватара');
          console.error(err);
        } finally {
          setAvatarLoading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setAvatarError('Ошибка загрузки аватара');
      setAvatarLoading(false);
    }
  };

  const getDefaultAvatar = (name?: string, email?: string) => {
    const initial = name ? name.charAt(0).toUpperCase() : (email ? email.charAt(0).toUpperCase() : 'U');
    return `data:image/svg+xml,${encodeURIComponent(`<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="200" fill="#3b82f6"/><text x="50%" y="50%" font-size="80" font-family="Arial" fill="white" text-anchor="middle" dominant-baseline="middle">${initial}</text></svg>`)}`;
  };

  const handleAddTeamMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setTeamError(null);
    setTeamSuccess(null);
    setGeneratedPassword(null);

    if (!newMemberEmail.trim()) {
      setTeamError('Email обязателен');
      return;
    }

    setTeamLoading(true);

    try {
      const response = await fetch('/api/auth/user/team', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: newMemberEmail.trim(),
          name: newMemberName.trim() || null,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setTeamSuccess('Участник команды добавлен');
        setNewMemberEmail('');
        setNewMemberName('');
        setShowAddMember(false);
        setGeneratedPassword(data.password);
        fetchTeamMembers();
      } else {
        setTeamError(data.error || 'Ошибка добавления участника');
      }
    } catch (err: any) {
      setTeamError('Ошибка добавления участника');
      console.error(err);
    } finally {
      setTeamLoading(false);
    }
  };

  const handleDeleteTeamMember = async (memberId: number) => {
    if (!confirm('Вы уверены, что хотите удалить этого участника?')) {
      return;
    }

    setTeamLoading(true);
    setTeamError(null);
    setTeamSuccess(null);

    try {
      const response = await fetch('/api/auth/user/team', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ memberId }),
      });

      const data = await response.json();

      if (data.success) {
        setTeamSuccess('Участник команды удален');
        fetchTeamMembers();
      } else {
        setTeamError(data.error || 'Ошибка удаления участника');
      }
    } catch (err: any) {
      setTeamError('Ошибка удаления участника');
      console.error(err);
    } finally {
      setTeamLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    setDeleteError(null);

    try {
      const response = await fetch('/api/auth/user/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ confirm: true }),
      });

      const data = await response.json();

      if (data.success) {
        router.push('/');
      } else {
        setDeleteError(data.error || 'Ошибка удаления аккаунта');
      }
    } catch (err: any) {
      setDeleteError('Ошибка удаления аккаунта');
      console.error(err);
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Загрузка...</div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-red-400 text-xl">{error || 'Пользователь не найден'}</div>
      </div>
    );
  }

  const avatarUrl = user.avatar || user.picture || getDefaultAvatar(user.name, user.email);

  return (
    <div className="min-h-screen bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Профиль пользователя</h1>

        {/* Информация о пользователе */}
        <div className="bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">Информация о пользователе</h2>
          
          <div className="space-y-4">
            {/* Аватар */}
            <div className="flex items-center space-x-4">
              <div className="relative">
                <img
                  src={avatarUrl}
                  alt={user.name || user.email}
                  className="h-24 w-24 rounded-full object-cover"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={avatarLoading}
                  className="absolute bottom-0 right-0 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Изменить аватар"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </div>
              {avatarLoading && (
                <div className="text-gray-400 text-sm">Загрузка...</div>
              )}
              {avatarError && (
                <div className="text-red-400 text-sm">{avatarError}</div>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Email</label>
              <div className="text-white text-lg">{user.email}</div>
            </div>

            {/* Имя с возможностью редактирования */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Имя</label>
              {editingName ? (
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="flex-1 bg-gray-700 text-white px-4 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                    placeholder="Введите имя"
                  />
                  <button
                    onClick={handleUpdateName}
                    disabled={nameLoading}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {nameLoading ? 'Сохранение...' : 'Сохранить'}
                  </button>
                  <button
                    onClick={() => {
                      setEditingName(false);
                      setNewName(user.name || '');
                      setNameError(null);
                    }}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded font-medium transition-colors"
                  >
                    Отмена
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <div className="text-white text-lg">{user.name || 'Не указано'}</div>
                  <button
                    onClick={() => {
                      setEditingName(true);
                      setNewName(user.name || '');
                    }}
                    className="text-blue-400 hover:text-blue-300 text-sm"
                  >
                    Изменить
                  </button>
                </div>
              )}
              {nameError && (
                <div className="text-red-400 text-sm mt-1">{nameError}</div>
              )}
            </div>

            {user.googleId && (
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Google ID</label>
                <div className="text-gray-300 text-sm font-mono">{user.googleId}</div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Пароль</label>
              <div className="text-white">
                {user.hasPassword ? (
                  <span className="text-green-400">✓ Установлен</span>
                ) : (
                  <span className="text-yellow-400">⚠ Не установлен</span>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Дата регистрации</label>
              <div className="text-gray-300 text-sm">
                {new Date(user.createdAt).toLocaleString('ru-RU')}
              </div>
            </div>

            {user.deletedAt && (
              <div className="bg-yellow-900/50 border border-yellow-500 text-yellow-200 px-4 py-3 rounded">
                <p className="font-semibold">Аккаунт запланирован к удалению</p>
                <p className="text-sm mt-1">
                  Дата удаления: {new Date(user.deletedAt).toLocaleString('ru-RU')}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Установка пароля */}
        {!user.hasPassword && (
          <div className="bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-white mb-4">Установить пароль</h2>
            
            {!showSetPassword ? (
              <button
                onClick={() => setShowSetPassword(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium transition-colors"
              >
                Установить пароль
              </button>
            ) : (
              <form onSubmit={handleSetPassword} className="space-y-4">
                {passwordError && (
                  <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded">
                    {passwordError}
                  </div>
                )}
                {passwordSuccess && (
                  <div className="bg-green-900/50 border border-green-500 text-green-200 px-4 py-3 rounded">
                    {passwordSuccess}
                  </div>
                )}
                
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                    Новый пароль
                  </label>
                  <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-gray-700 text-white px-4 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                    required
                    minLength={6}
                  />
                </div>

                <div>
                  <label htmlFor="passwordConfirm" className="block text-sm font-medium text-gray-300 mb-2">
                    Подтвердите пароль
                  </label>
                  <input
                    type="password"
                    id="passwordConfirm"
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    className="w-full bg-gray-700 text-white px-4 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                    required
                    minLength={6}
                  />
                </div>

                <div className="flex space-x-4">
                  <button
                    type="submit"
                    disabled={passwordLoading}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {passwordLoading ? 'Сохранение...' : 'Установить пароль'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowSetPassword(false);
                      setPassword('');
                      setPasswordConfirm('');
                      setPasswordError(null);
                      setPasswordSuccess(null);
                    }}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded font-medium transition-colors"
                  >
                    Отмена
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Изменение пароля */}
        {user.hasPassword && (
          <div className="bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-white mb-4">Изменить пароль</h2>
            
            {!showChangePassword ? (
              <button
                onClick={() => setShowChangePassword(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium transition-colors"
              >
                Изменить пароль
              </button>
            ) : (
              <form onSubmit={handleChangePassword} className="space-y-4">
                {changePasswordError && (
                  <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded">
                    {changePasswordError}
                  </div>
                )}
                {changePasswordSuccess && (
                  <div className="bg-green-900/50 border border-green-500 text-green-200 px-4 py-3 rounded">
                    {changePasswordSuccess}
                  </div>
                )}
                
                <div>
                  <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-300 mb-2">
                    Текущий пароль
                  </label>
                  <input
                    type="password"
                    id="currentPassword"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full bg-gray-700 text-white px-4 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-gray-300 mb-2">
                    Новый пароль
                  </label>
                  <input
                    type="password"
                    id="newPassword"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-gray-700 text-white px-4 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                    required
                    minLength={6}
                  />
                </div>

                <div>
                  <label htmlFor="newPasswordConfirm" className="block text-sm font-medium text-gray-300 mb-2">
                    Подтвердите новый пароль
                  </label>
                  <input
                    type="password"
                    id="newPasswordConfirm"
                    value={newPasswordConfirm}
                    onChange={(e) => setNewPasswordConfirm(e.target.value)}
                    className="w-full bg-gray-700 text-white px-4 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                    required
                    minLength={6}
                  />
                </div>

                <div className="flex space-x-4">
                  <button
                    type="submit"
                    disabled={changePasswordLoading}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {changePasswordLoading ? 'Сохранение...' : 'Изменить пароль'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowChangePassword(false);
                      setCurrentPassword('');
                      setNewPassword('');
                      setNewPasswordConfirm('');
                      setChangePasswordError(null);
                      setChangePasswordSuccess(null);
                    }}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded font-medium transition-colors"
                  >
                    Отмена
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Команда */}
        <div className="bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Команда</h2>
            {teamMembers.length < 3 && (
              <button
                onClick={() => setShowAddMember(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium transition-colors"
              >
                Добавить участника
              </button>
            )}
          </div>

          {teamError && (
            <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded mb-4">
              {teamError}
            </div>
          )}

          {teamSuccess && (
            <div className="bg-green-900/50 border border-green-500 text-green-200 px-4 py-3 rounded mb-4">
              {teamSuccess}
            </div>
          )}

          {generatedPassword && (
            <div className="bg-blue-900/50 border border-blue-500 text-blue-200 px-4 py-3 rounded mb-4">
              <p className="font-semibold">Участник добавлен!</p>
              <p className="text-sm mt-1">Сгенерированный пароль: <code className="bg-blue-800 px-2 py-1 rounded">{generatedPassword}</code></p>
              <p className="text-xs mt-2 text-blue-300">Сохраните этот пароль! Участник сможет изменить его при первом входе.</p>
            </div>
          )}

          {showAddMember && (
            <form onSubmit={handleAddTeamMember} className="mb-6 p-4 bg-gray-700 rounded-lg space-y-4">
              <div>
                <label htmlFor="memberEmail" className="block text-sm font-medium text-gray-300 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  id="memberEmail"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  className="w-full bg-gray-600 text-white px-4 py-2 rounded border border-gray-500 focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label htmlFor="memberName" className="block text-sm font-medium text-gray-300 mb-2">
                  Имя (необязательно)
                </label>
                <input
                  type="text"
                  id="memberName"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  className="w-full bg-gray-600 text-white px-4 py-2 rounded border border-gray-500 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="flex space-x-4">
                <button
                  type="submit"
                  disabled={teamLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {teamLoading ? 'Добавление...' : 'Добавить'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddMember(false);
                    setNewMemberEmail('');
                    setNewMemberName('');
                    setTeamError(null);
                    setTeamSuccess(null);
                    setGeneratedPassword(null);
                  }}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded font-medium transition-colors"
                >
                  Отмена
                </button>
              </div>
            </form>
          )}

          {loadingTeam ? (
            <div className="text-gray-400">Загрузка...</div>
          ) : teamMembers.length === 0 ? (
            <div className="text-gray-400">Участники команды отсутствуют</div>
          ) : (
            <div className="space-y-3">
              {teamMembers.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                  <div>
                    <div className="text-white font-medium">{member.name || member.email}</div>
                    <div className="text-gray-400 text-sm">{member.email}</div>
                    <div className="text-gray-500 text-xs mt-1">Логин: {member.username}</div>
                    {member.firstLogin && (
                      <span className="inline-block mt-1 text-xs bg-yellow-900 text-yellow-200 px-2 py-1 rounded">
                        Требуется смена пароля при первом входе
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteTeamMember(member.id)}
                    disabled={teamLoading}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Удалить
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Удаление аккаунта */}
        <div className="bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Удаление аккаунта</h2>
          <p className="text-gray-400 mb-4">
            При удалении аккаунта вся информация (сайты, карточки и прочее) будет удалена в течение 14 дней. 
            Вы сможете отменить удаление в течение этого периода.
          </p>

          {deleteError && (
            <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded mb-4">
              {deleteError}
            </div>
          )}

          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-medium transition-colors"
            >
              Удалить аккаунт
            </button>
          ) : (
            <div className="space-y-4">
              <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded">
                <p className="font-semibold">Внимание!</p>
                <p className="text-sm mt-1">
                  Вы уверены, что хотите удалить аккаунт? Это действие нельзя отменить после истечения 14 дней.
                </p>
              </div>
              <div className="flex space-x-4">
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteLoading}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleteLoading ? 'Удаление...' : 'Да, удалить аккаунт'}
                </button>
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeleteError(null);
                  }}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded font-medium transition-colors"
                >
                  Отмена
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
