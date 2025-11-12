'use client';

import { useState } from 'react';

interface FileUploadProps {
  onUploadSuccess: () => void;
}

export default function FileUpload({ onUploadSuccess }: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [files, setFiles] = useState<File[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      setFiles(selectedFiles);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (files.length === 0) {
      setMessage({ type: 'error', text: 'Пожалуйста, выберите хотя бы один CSV файл' });
      return;
    }

    setUploading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append('files', file);
      });

      // Используем переменную окружения или относительный путь
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
      const uploadUrl = `${baseUrl}/api/upload`;
      
      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }

      setMessage({
        type: 'success',
        text: `Успешно загружено! Обработано файлов: ${result.filesProcessed}, записей: ${result.offersCount}`,
      });

      // Очищаем выбранные файлы
      setFiles([]);
      
      // Обновляем данные после успешной загрузки
      setTimeout(() => {
        onUploadSuccess();
      }, 1000);
    } catch (error) {
      console.error('Error uploading files:', error);
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Ошибка при загрузке файлов',
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 mb-6">
      <h2 className="text-2xl font-bold mb-4">Загрузка CSV файлов</h2>
      <p className="text-gray-400 mb-6">
        Выберите CSV файлы для загрузки в базу данных. Все файлы будут обработаны и сохранены.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Выберите CSV файлы (можно несколько)
          </label>
          <input
            type="file"
            multiple
            accept=".csv"
            onChange={handleFileChange}
            className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {files.length > 0 && (
            <div className="mt-2">
              <p className="text-sm text-gray-400">Выбрано файлов: {files.length}</p>
              <ul className="mt-1 text-sm text-gray-300">
                {files.map((file, index) => (
                  <li key={index}>• {file.name}</li>
                ))}
              </ul>
            </div>
          )}
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
          disabled={uploading || files.length === 0}
          className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? 'Загрузка и обработка...' : 'Загрузить файлы в базу данных'}
        </button>
      </form>
    </div>
  );
}
