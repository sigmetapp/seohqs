'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ProjectLink } from '@/lib/types';

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  
  const [project, setProject] = useState<any>(null);
  const [links, setLinks] = useState<ProjectLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadText, setUploadText] = useState('');
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (projectId) {
      loadProject();
      loadLinks();
    }
  }, [projectId]);

  const loadProject = async () => {
    try {
      const response = await fetch(`/api/link-profile/projects/${projectId}`);
      const data = await response.json();
      if (data.success) {
        setProject(data.project);
      }
    } catch (err) {
      console.error('Error loading project:', err);
    }
  };

  const loadLinks = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/link-profile/projects/${projectId}/links`);
      const data = await response.json();
      if (data.success) {
        setLinks(data.links || []);
      }
    } catch (err) {
      console.error('Error loading links:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadLinks = async () => {
    try {
      const urlLines = uploadText
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      if (urlLines.length === 0) {
        alert('Введите хотя бы один URL');
        return;
      }

      const response = await fetch(`/api/link-profile/projects/${projectId}/links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: urlLines }),
      });

      const data = await response.json();
      if (data.success) {
        setShowUploadModal(false);
        setUploadText('');
        loadLinks();
      } else {
        alert(data.error || 'Ошибка загрузки ссылок');
      }
    } catch (err) {
      console.error('Error uploading links:', err);
      alert('Ошибка загрузки ссылок');
    }
  };

  const handleCheckLinks = async () => {
    try {
      setChecking(true);
      const response = await fetch(`/api/link-profile/projects/${projectId}/links/check`, {
        method: 'POST',
      });
      const data = await response.json();
      if (data.success) {
        loadLinks();
        alert(`Проверено ${data.checked} ссылок`);
      } else {
        alert(data.error || 'Ошибка проверки ссылок');
      }
    } catch (err) {
      console.error('Error checking links:', err);
      alert('Ошибка проверки ссылок');
    } finally {
      setChecking(false);
    }
  };

  if (loading && !project) {
    return (
      <main className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">Загрузка...</div>
        </div>
      </main>
    );
  }

  const indexedCount = links.filter((l) => l.status === 'indexed').length;
  const notFoundCount = links.filter((l) => l.status === 'not_found').length;
  const pendingCount = links.filter((l) => l.status === 'pending').length;

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
          <h1 className="text-4xl font-bold mb-2">{project?.name || 'Проект'}</h1>
          <p className="text-gray-400">{project?.domain}</p>
        </div>

        {/* Статистика */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="text-2xl font-bold">{links.length}</div>
            <div className="text-sm text-gray-400">Всего ссылок</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 border border-green-700">
            <div className="text-2xl font-bold text-green-400">{indexedCount}</div>
            <div className="text-sm text-gray-400">Проиндексировано</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 border border-red-700">
            <div className="text-2xl font-bold text-red-400">{notFoundCount}</div>
            <div className="text-sm text-gray-400">Не найдено</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 border border-yellow-700">
            <div className="text-2xl font-bold text-yellow-400">{pendingCount}</div>
            <div className="text-sm text-gray-400">Ожидает проверки</div>
          </div>
        </div>

        {/* Действия */}
        <div className="mb-6 flex gap-4">
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
          >
            + Загрузить ссылки
          </button>
          <button
            onClick={handleCheckLinks}
            disabled={checking || links.length === 0}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded disabled:opacity-50"
          >
            {checking ? 'Проверка...' : 'Проверить все ссылки'}
          </button>
        </div>

        {/* Таблица ссылок */}
        <div className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left">URL</th>
                <th className="px-4 py-3 text-left">Целевой URL</th>
                <th className="px-4 py-3 text-left">Статус</th>
                <th className="px-4 py-3 text-left">Последняя проверка</th>
              </tr>
            </thead>
            <tbody>
              {links.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                    Ссылки не загружены
                  </td>
                </tr>
              ) : (
                links.map((link) => (
                  <tr key={link.id} className="border-t border-gray-700">
                    <td className="px-4 py-3">
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:underline"
                      >
                        {link.url}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-gray-400">{link.targetUrl}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          link.status === 'indexed'
                            ? 'bg-green-900 text-green-300'
                            : link.status === 'not_found'
                            ? 'bg-red-900 text-red-300'
                            : 'bg-yellow-900 text-yellow-300'
                        }`}
                      >
                        {link.status === 'indexed'
                          ? 'Проиндексировано'
                          : link.status === 'not_found'
                          ? 'Не найдено'
                          : 'Ожидает'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-sm">
                      {link.lastChecked
                        ? new Date(link.lastChecked).toLocaleString('ru-RU')
                        : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Модальное окно загрузки ссылок */}
        {showUploadModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl border border-gray-700">
              <h2 className="text-2xl font-bold mb-4">Загрузить ссылки</h2>
              <p className="text-gray-400 text-sm mb-4">
                Введите URL ссылок по одному на строку. Формат: URL страницы, где размещена ссылка
              </p>
              <textarea
                value={uploadText}
                onChange={(e) => setUploadText(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none font-mono text-sm"
                rows={10}
                placeholder="https://example.com/page1&#10;https://example.com/page2&#10;https://example.com/page3"
              />
              <div className="flex gap-2 mt-4">
                <button
                  onClick={handleUploadLinks}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
                >
                  Загрузить
                </button>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
