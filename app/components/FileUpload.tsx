'use client';

import { useState } from 'react';

interface FileUploadProps {
  onUploadSuccess: () => void;
}

export default function FileUpload({ onUploadSuccess }: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [fileNames, setFileNames] = useState({
    admitad: '',
    cj: '',
    advertise: '',
    clickbank: '',
  });

  const handleFileChange = (key: keyof typeof fileNames, file: File | null) => {
    if (file) {
      setFileNames((prev) => ({ ...prev, [key]: file.name }));
    }
  };

  const handleUpload = async (file: File, fileName: string): Promise<{ success: boolean; fileName: string }> => {
    if (!file) {
      throw new Error('No file provided');
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('fileName', fileName);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }

      return { success: true, fileName: result.fileName };
    } catch (error) {
      console.error(`Error uploading ${fileName}:`, error);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    setMessage(null);

    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const files = {
      admitad: formData.get('admitad') as File,
      cj: formData.get('cj') as File,
      advertise: formData.get('advertise') as File,
      clickbank: formData.get('clickbank') as File,
    };

    const uploads: Promise<{ success: boolean; fileName: string }>[] = [];
    let errorCount = 0;

    // Загружаем все файлы
    if (files.admitad && files.admitad.size > 0) {
      uploads.push(
        handleUpload(files.admitad, 'admitad.csv').catch((error) => {
          errorCount++;
          console.error('Failed to upload admitad.csv:', error);
          return { success: false, fileName: 'admitad.csv' };
        })
      );
    }
    if (files.cj && files.cj.size > 0) {
      uploads.push(
        handleUpload(files.cj, 'cj.csv').catch((error) => {
          errorCount++;
          console.error('Failed to upload cj.csv:', error);
          return { success: false, fileName: 'cj.csv' };
        })
      );
    }
    if (files.advertise && files.advertise.size > 0) {
      uploads.push(
        handleUpload(files.advertise, 'advertise.csv').catch((error) => {
          errorCount++;
          console.error('Failed to upload advertise.csv:', error);
          return { success: false, fileName: 'advertise.csv' };
        })
      );
    }
    if (files.clickbank && files.clickbank.size > 0) {
      uploads.push(
        handleUpload(files.clickbank, 'clickbank.csv').catch((error) => {
          errorCount++;
          console.error('Failed to upload clickbank.csv:', error);
          return { success: false, fileName: 'clickbank.csv' };
        })
      );
    }

    if (uploads.length === 0) {
      setMessage({ type: 'error', text: 'Пожалуйста, выберите хотя бы один файл' });
      setUploading(false);
      return;
    }

    try {
      await Promise.all(uploads);
      const successCount = uploads.length - errorCount;

      if (successCount > 0) {
        setMessage({
          type: 'success',
          text: `Успешно загружено файлов: ${successCount}${errorCount > 0 ? `. Ошибок: ${errorCount}` : ''}`,
        });
        // Обновляем данные после успешной загрузки
        setTimeout(() => {
          onUploadSuccess();
        }, 1000);
      } else {
        setMessage({ type: 'error', text: 'Не удалось загрузить файлы' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Ошибка при загрузке файлов' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 mb-6">
      <h2 className="text-2xl font-bold mb-4">Загрузка CSV файлов</h2>
      <p className="text-gray-400 mb-6">
        Загрузите CSV файлы для настройки каталога. Файлы будут сохранены и использованы для отображения данных.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Admitad CSV
            </label>
            <input
              type="file"
              name="admitad"
              accept=".csv"
              onChange={(e) => handleFileChange('admitad', e.target.files?.[0] || null)}
              className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {fileNames.admitad && (
              <p className="text-sm text-gray-400 mt-1">{fileNames.admitad}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              CJ CSV
            </label>
            <input
              type="file"
              name="cj"
              accept=".csv"
              onChange={(e) => handleFileChange('cj', e.target.files?.[0] || null)}
              className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {fileNames.cj && (
              <p className="text-sm text-gray-400 mt-1">{fileNames.cj}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Advertise CSV
            </label>
            <input
              type="file"
              name="advertise"
              accept=".csv"
              onChange={(e) => handleFileChange('advertise', e.target.files?.[0] || null)}
              className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {fileNames.advertise && (
              <p className="text-sm text-gray-400 mt-1">{fileNames.advertise}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              ClickBank CSV
            </label>
            <input
              type="file"
              name="clickbank"
              accept=".csv"
              onChange={(e) => handleFileChange('clickbank', e.target.files?.[0] || null)}
              className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {fileNames.clickbank && (
              <p className="text-sm text-gray-400 mt-1">{fileNames.clickbank}</p>
            )}
          </div>
        </div>

        {message && (
          <div
            className={`p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-900 text-green-200'
                : 'bg-red-900 text-red-200'
            }`}
          >
            {message.text}
          </div>
        )}

        <button
          type="submit"
          disabled={uploading}
          className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? 'Загрузка...' : 'Загрузить файлы'}
        </button>
      </form>
    </div>
  );
}
