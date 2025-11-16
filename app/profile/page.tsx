'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface UserProfile {
  id: number;
  email: string;
  name?: string;
  picture?: string;
  googleId?: string;
  hasPassword: boolean;
  createdAt: string;
  updatedAt: string;
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

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/auth/user/profile');
      const data = await response.json();
      
      if (data.success && data.user) {
        setUser(data.user);
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
        fetchProfile(); // Обновляем профиль
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

  return (
    <div className="min-h-screen bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Профиль пользователя</h1>

        {/* Информация о пользователе */}
        <div className="bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">Информация о пользователе</h2>
          
          <div className="space-y-4">
            {user.picture && (
              <div className="flex items-center space-x-4">
                <img
                  src={user.picture}
                  alt={user.name || user.email}
                  className="h-20 w-20 rounded-full"
                />
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Email</label>
              <div className="text-white text-lg">{user.email}</div>
            </div>

            {user.name && (
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Имя</label>
                <div className="text-white text-lg">{user.name}</div>
              </div>
            )}

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
          <div className="bg-gray-800 rounded-lg shadow-lg p-6">
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
      </div>
    </div>
  );
}
