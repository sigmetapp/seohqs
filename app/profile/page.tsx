'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n-context';

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
  const { t, language } = useI18n();
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
          setError(data.error || t('profile.errorLoading'));
        }
      }
    } catch (err: any) {
      setError(t('profile.errorLoading'));
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
      console.error('Error loading team:', err);
    } finally {
      setLoadingTeam(false);
    }
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!password || password.length < 6) {
      setPasswordError(t('profile.passwordMinLength'));
      return;
    }

    if (password !== passwordConfirm) {
      setPasswordError(t('profile.passwordsNotMatch'));
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
        setPasswordSuccess(t('profile.passwordSetSuccess'));
        setPassword('');
        setPasswordConfirm('');
        setShowSetPassword(false);
        fetchProfile();
      } else {
        setPasswordError(data.error || t('profile.passwordSetError'));
      }
    } catch (err: any) {
      setPasswordError(t('profile.passwordSetError'));
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
      setChangePasswordError(t('profile.enterCurrentPassword'));
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setChangePasswordError(t('profile.newPasswordMinLength'));
      return;
    }

    if (newPassword !== newPasswordConfirm) {
      setChangePasswordError(t('profile.newPasswordsNotMatch'));
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
        setChangePasswordSuccess(t('profile.passwordChangedSuccess'));
        setCurrentPassword('');
        setNewPassword('');
        setNewPasswordConfirm('');
        setShowChangePassword(false);
      } else {
        setChangePasswordError(data.error || t('profile.passwordChangedError'));
      }
    } catch (err: any) {
      setChangePasswordError(t('profile.passwordChangedError'));
      console.error(err);
    } finally {
      setChangePasswordLoading(false);
    }
  };

  const handleUpdateName = async () => {
    if (!newName.trim()) {
      setNameError(t('profile.nameEmpty'));
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
        setNameError(data.error || t('profile.nameUpdateError'));
      }
    } catch (err: any) {
      setNameError(t('profile.nameUpdateError'));
      console.error(err);
    } finally {
      setNameLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setAvatarError(t('profile.avatarMustBeImage'));
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setAvatarError(t('profile.avatarMaxSize'));
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
            setAvatarError(data.error || t('profile.avatarError'));
          }
        } catch (err: any) {
          setAvatarError(t('profile.avatarError'));
          console.error(err);
        } finally {
          setAvatarLoading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setAvatarError(t('profile.avatarError'));
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
      setTeamError(t('profile.emailRequired'));
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
        setTeamSuccess(t('profile.memberAdded'));
        setNewMemberEmail('');
        setNewMemberName('');
        setShowAddMember(false);
        setGeneratedPassword(data.password);
        fetchTeamMembers();
      } else {
        setTeamError(data.error || t('profile.memberAddError'));
      }
    } catch (err: any) {
      setTeamError(t('profile.memberAddError'));
      console.error(err);
    } finally {
      setTeamLoading(false);
    }
  };

  const handleDeleteTeamMember = async (memberId: number) => {
    if (!confirm(t('profile.confirmDeleteMember'))) {
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
        setTeamSuccess(t('profile.memberDeleted'));
        fetchTeamMembers();
      } else {
        setTeamError(data.error || t('profile.memberDeleteError'));
      }
    } catch (err: any) {
      setTeamError(t('profile.memberDeleteError'));
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
        setDeleteError(data.error || t('profile.deleteAccountError'));
      }
    } catch (err: any) {
      setDeleteError(t('profile.deleteAccountError'));
      console.error(err);
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-900 dark:text-white text-xl">{t('profile.loading')}</div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="text-red-600 dark:text-red-400 text-xl">{error || t('profile.userNotFound')}</div>
      </div>
    );
  }

  const avatarUrl = user.avatar || user.picture || getDefaultAvatar(user.name, user.email);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">{t('profile.title')}</h1>

        {/* Информация о пользователе */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">{t('profile.userInfo')}</h2>
          
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
                  title={t('profile.changeAvatar')}
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
                <div className="text-gray-600 dark:text-gray-400 text-sm">{t('profile.avatarUploading')}</div>
              )}
              {avatarError && (
                <div className="text-red-600 dark:text-red-400 text-sm">{avatarError}</div>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">{t('profile.email')}</label>
              <div className="text-gray-900 dark:text-white text-lg">{user.email}</div>
            </div>

            {/* Имя с возможностью редактирования */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">{t('profile.name')}</label>
              {editingName ? (
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white px-4 py-2 rounded border border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:outline-none"
                    placeholder={t('profile.name')}
                  />
                  <button
                    onClick={handleUpdateName}
                    disabled={nameLoading}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {nameLoading ? t('profile.saving') : t('profile.save')}
                  </button>
                  <button
                    onClick={() => {
                      setEditingName(false);
                      setNewName(user.name || '');
                      setNameError(null);
                    }}
                    className="bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-900 dark:text-white px-4 py-2 rounded font-medium transition-colors"
                  >
                    {t('profile.cancel')}
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <div className="text-gray-900 dark:text-white text-lg">{user.name || t('profile.notSpecified')}</div>
                  <button
                    onClick={() => {
                      setEditingName(true);
                      setNewName(user.name || '');
                    }}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm"
                  >
                    {t('profile.change')}
                  </button>
                </div>
              )}
              {nameError && (
                <div className="text-red-600 dark:text-red-400 text-sm mt-1">{nameError}</div>
              )}
            </div>

            {user.googleId && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">{t('profile.googleId')}</label>
                <div className="text-gray-600 dark:text-gray-300 text-sm font-mono">{user.googleId}</div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">{t('profile.password')}</label>
              <div className="text-gray-900 dark:text-white">
                {user.hasPassword ? (
                  <span className="text-green-600 dark:text-green-400">{t('profile.passwordSet')}</span>
                ) : (
                  <span className="text-yellow-600 dark:text-yellow-400">{t('profile.passwordNotSet')}</span>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">{t('profile.registrationDate')}</label>
              <div className="text-gray-600 dark:text-gray-300 text-sm">
                {new Date(user.createdAt).toLocaleString(language === 'ru' ? 'ru-RU' : 'en-US')}
              </div>
            </div>

            {user.deletedAt && (
              <div className="bg-yellow-50 dark:bg-yellow-900/50 border border-yellow-500 text-yellow-800 dark:text-yellow-200 px-4 py-3 rounded">
                <p className="font-semibold">{t('profile.accountScheduledDeletion')}</p>
                <p className="text-sm mt-1">
                  {t('profile.deletionDate')} {new Date(user.deletedAt).toLocaleString(language === 'ru' ? 'ru-RU' : 'en-US')}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Установка пароля */}
        {!user.hasPassword && (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">{t('profile.setPassword')}</h2>
            
            {!showSetPassword ? (
              <button
                onClick={() => setShowSetPassword(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium transition-colors"
              >
                {t('profile.setPassword')}
              </button>
            ) : (
              <form onSubmit={handleSetPassword} className="space-y-4">
                {passwordError && (
                  <div className="bg-red-50 dark:bg-red-900/50 border border-red-500 text-red-800 dark:text-red-200 px-4 py-3 rounded">
                    {passwordError}
                  </div>
                )}
                {passwordSuccess && (
                  <div className="bg-green-50 dark:bg-green-900/50 border border-green-500 text-green-800 dark:text-green-200 px-4 py-3 rounded">
                    {passwordSuccess}
                  </div>
                )}
                
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('profile.newPassword')}
                  </label>
                  <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white px-4 py-2 rounded border border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:outline-none"
                    required
                    minLength={6}
                  />
                </div>

                <div>
                  <label htmlFor="passwordConfirm" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('profile.confirmPassword')}
                  </label>
                  <input
                    type="password"
                    id="passwordConfirm"
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white px-4 py-2 rounded border border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:outline-none"
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
                    {passwordLoading ? t('profile.saving') : t('profile.setPassword')}
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
                    className="bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-900 dark:text-white px-4 py-2 rounded font-medium transition-colors"
                  >
                    {t('profile.cancel')}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Изменение пароля */}
        {user.hasPassword && (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">{t('profile.changePassword')}</h2>
            
            {!showChangePassword ? (
              <button
                onClick={() => setShowChangePassword(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium transition-colors"
              >
                {t('profile.changePassword')}
              </button>
            ) : (
              <form onSubmit={handleChangePassword} className="space-y-4">
                {changePasswordError && (
                  <div className="bg-red-50 dark:bg-red-900/50 border border-red-500 text-red-800 dark:text-red-200 px-4 py-3 rounded">
                    {changePasswordError}
                  </div>
                )}
                {changePasswordSuccess && (
                  <div className="bg-green-50 dark:bg-green-900/50 border border-green-500 text-green-800 dark:text-green-200 px-4 py-3 rounded">
                    {changePasswordSuccess}
                  </div>
                )}
                
                <div>
                  <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('profile.currentPassword')}
                  </label>
                  <input
                    type="password"
                    id="currentPassword"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white px-4 py-2 rounded border border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('profile.newPassword')}
                  </label>
                  <input
                    type="password"
                    id="newPassword"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white px-4 py-2 rounded border border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:outline-none"
                    required
                    minLength={6}
                  />
                </div>

                <div>
                  <label htmlFor="newPasswordConfirm" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('profile.confirmNewPassword')}
                  </label>
                  <input
                    type="password"
                    id="newPasswordConfirm"
                    value={newPasswordConfirm}
                    onChange={(e) => setNewPasswordConfirm(e.target.value)}
                    className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white px-4 py-2 rounded border border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:outline-none"
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
                    {changePasswordLoading ? t('profile.saving') : t('profile.changePassword')}
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
                    className="bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-900 dark:text-white px-4 py-2 rounded font-medium transition-colors"
                  >
                    {t('profile.cancel')}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Команда */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('profile.team')}</h2>
            {teamMembers.length < 3 && (
              <button
                onClick={() => setShowAddMember(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium transition-colors"
              >
                {t('profile.addMember')}
              </button>
            )}
          </div>

          {teamError && (
            <div className="bg-red-50 dark:bg-red-900/50 border border-red-500 text-red-800 dark:text-red-200 px-4 py-3 rounded mb-4">
              {teamError}
            </div>
          )}

          {teamSuccess && (
            <div className="bg-green-50 dark:bg-green-900/50 border border-green-500 text-green-800 dark:text-green-200 px-4 py-3 rounded mb-4">
              {teamSuccess}
            </div>
          )}

          {generatedPassword && (
            <div className="bg-blue-50 dark:bg-blue-900/50 border border-blue-500 text-blue-800 dark:text-blue-200 px-4 py-3 rounded mb-4">
              <p className="font-semibold">{t('profile.memberAdded')}</p>
              <p className="text-sm mt-1">{t('profile.generatedPassword')} <code className="bg-blue-100 dark:bg-blue-800 px-2 py-1 rounded">{generatedPassword}</code></p>
              <p className="text-xs mt-2 text-blue-700 dark:text-blue-300">{t('profile.savePasswordHint')}</p>
            </div>
          )}

          {showAddMember && (
            <form onSubmit={handleAddTeamMember} className="mb-6 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg space-y-4 border border-gray-200 dark:border-gray-600">
              <div>
                <label htmlFor="memberEmail" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('profile.email')} *
                </label>
                <input
                  type="email"
                  id="memberEmail"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  className="w-full bg-white dark:bg-gray-600 text-gray-900 dark:text-white px-4 py-2 rounded border border-gray-300 dark:border-gray-500 focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label htmlFor="memberName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('profile.name')} ({t('profile.optional')})
                </label>
                <input
                  type="text"
                  id="memberName"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  className="w-full bg-white dark:bg-gray-600 text-gray-900 dark:text-white px-4 py-2 rounded border border-gray-300 dark:border-gray-500 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="flex space-x-4">
                <button
                  type="submit"
                  disabled={teamLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {teamLoading ? t('profile.adding') : t('profile.add')}
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
                  className="bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-900 dark:text-white px-4 py-2 rounded font-medium transition-colors"
                >
                  {t('profile.cancel')}
                </button>
              </div>
            </form>
          )}

          {loadingTeam ? (
            <div className="text-gray-600 dark:text-gray-400">{t('profile.loading')}</div>
          ) : teamMembers.length === 0 ? (
            <div className="text-gray-600 dark:text-gray-400">{t('profile.noTeamMembers')}</div>
          ) : (
            <div className="space-y-3">
              {teamMembers.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-4 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                  <div>
                    <div className="text-gray-900 dark:text-white font-medium">{member.name || member.email}</div>
                    <div className="text-gray-600 dark:text-gray-400 text-sm">{member.email}</div>
                    <div className="text-gray-500 dark:text-gray-500 text-xs mt-1">{t('profile.login')}: {member.username}</div>
                    {member.firstLogin && (
                      <span className="inline-block mt-1 text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded">
                        {t('profile.passwordChangeRequired')}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteTeamMember(member.id)}
                    disabled={teamLoading}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('profile.delete')}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Удаление аккаунта */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">{t('profile.deleteAccount')}</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {t('profile.deleteAccountWarning')}
          </p>

          {deleteError && (
            <div className="bg-red-50 dark:bg-red-900/50 border border-red-500 text-red-800 dark:text-red-200 px-4 py-3 rounded mb-4">
              {deleteError}
            </div>
          )}

          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-medium transition-colors"
            >
              {t('profile.deleteAccount')}
            </button>
          ) : (
            <div className="space-y-4">
              <div className="bg-red-50 dark:bg-red-900/50 border border-red-500 text-red-800 dark:text-red-200 px-4 py-3 rounded">
                <p className="font-semibold">{t('profile.warning')}</p>
                <p className="text-sm mt-1">
                  {t('profile.deleteAccountConfirmText')}
                </p>
              </div>
              <div className="flex space-x-4">
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteLoading}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleteLoading ? t('profile.deleting') : t('profile.confirmDeleteAccount')}
                </button>
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeleteError(null);
                  }}
                  className="bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-900 dark:text-white px-4 py-2 rounded font-medium transition-colors"
                >
                  {t('profile.cancel')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
