'use client';

import { useState } from 'react';

export type SectionStatus = 
  | 'success' 
  | 'success_light' 
  | 'timeout' 
  | 'backend_error' 
  | 'openai_error' 
  | 'skipped';

export interface SectionStatusData {
  index: number;
  title: string;
  status: SectionStatus;
  sectionHtml?: string;
  generationTime?: number; // в секундах
  wordCount?: number;
  complexityLevel?: 'medium' | 'low' | 'high';
  retryCount?: number;
  error?: string;
  technicalLogs?: string[];
}

interface SectionStatusCardProps {
  section: SectionStatusData;
  onRegenerate?: (index: number, complexity: 'medium' | 'low' | 'high') => Promise<void>;
}

const statusConfig: Record<SectionStatus, { color: string; label: string }> = {
  success: { color: 'bg-green-500', label: 'Успешно (Medium)' },
  success_light: { color: 'bg-blue-500', label: 'Успешно (Light Mode)' },
  timeout: { color: 'bg-orange-500', label: 'Превышен лимит времени' },
  backend_error: { color: 'bg-red-500', label: 'Ошибка backend: sectionHtml undefined' },
  openai_error: { color: 'bg-red-500', label: 'Ошибка OpenAI' },
  skipped: { color: 'bg-gray-500', label: 'Пропущено' },
};

export default function SectionStatusCard({ section, onRegenerate }: SectionStatusCardProps) {
  const [showHtml, setShowHtml] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const config = statusConfig[section.status];
  const statusColor = config.color;

  const handleCopy = async () => {
    if (!section.sectionHtml || typeof section.sectionHtml !== 'string' || section.sectionHtml.trim().length === 0) {
      alert('Нет HTML для копирования');
      return;
    }
    try {
      await navigator.clipboard.writeText(section.sectionHtml);
      alert('HTML скопирован в буфер обмена');
    } catch (error) {
      console.error('Ошибка копирования:', error);
      alert('Не удалось скопировать HTML');
    }
  };

  const handleRegenerate = async (complexity: 'medium' | 'low' | 'high') => {
    if (!onRegenerate || isRegenerating) return;
    setIsRegenerating(true);
    try {
      await onRegenerate(section.index, complexity);
    } catch (error) {
      console.error('Ошибка перегенерации:', error);
      alert('Не удалось перегенерировать секцию');
    } finally {
      setIsRegenerating(false);
    }
  };

  // Подсчет слов из HTML (приблизительно)
  const getWordCount = (html?: string): number => {
    if (!html) return 0;
    const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    return text.split(' ').filter(word => word.length > 0).length;
  };

  const wordCount = section.wordCount || (section.sectionHtml ? getWordCount(section.sectionHtml) : 0);

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm">
      {/* Заголовок с индикатором статуса */}
      <div className="flex items-start gap-3 mb-3">
        <div className={`w-3 h-3 rounded-full ${statusColor} mt-1.5 flex-shrink-0`} />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
            Секция {section.index}: {section.title}
          </h3>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            {config.label}
          </p>
        </div>
      </div>

      {/* Подстрочные данные */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3 text-xs text-gray-600 dark:text-gray-400">
        {section.generationTime !== undefined && (
          <div>
            <span className="font-medium">Время:</span> {section.generationTime}с
          </div>
        )}
        {section.status === 'success' || section.status === 'success_light' ? (
          <div>
            <span className="font-medium">Длина:</span> {wordCount} слов
          </div>
        ) : null}
        {section.complexityLevel && (
          <div>
            <span className="font-medium">Уровень:</span> {section.complexityLevel}
          </div>
        )}
        {section.retryCount !== undefined && (
          <div>
            <span className="font-medium">Повторов:</span> {section.retryCount}
          </div>
        )}
      </div>

      {/* Сообщение об ошибке */}
      {section.error && (
        <div className="mb-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs text-red-800 dark:text-red-200">
          {section.error}
        </div>
      )}

      {/* Блок действий */}
      <div className="flex flex-wrap gap-2 mb-3">
        {section.sectionHtml && (
          <>
            <button
              onClick={() => setShowHtml(!showHtml)}
              className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded transition-colors"
            >
              {showHtml ? 'Скрыть HTML' : 'Показать HTML'}
            </button>
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 text-xs bg-blue-100 dark:bg-blue-900 hover:bg-blue-200 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-300 rounded transition-colors"
            >
              Скопировать
            </button>
          </>
        )}
        {onRegenerate && (
          <>
            <button
              onClick={() => handleRegenerate('medium')}
              disabled={isRegenerating}
              className="px-3 py-1.5 text-xs bg-green-100 dark:bg-green-900 hover:bg-green-200 dark:hover:bg-green-800 text-green-700 dark:text-green-300 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRegenerating ? 'Генерация...' : 'Перегенерировать (Medium)'}
            </button>
            <button
              onClick={() => handleRegenerate('low')}
              disabled={isRegenerating}
              className="px-3 py-1.5 text-xs bg-blue-100 dark:bg-blue-900 hover:bg-blue-200 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-300 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRegenerating ? 'Генерация...' : 'Перегенерировать (Low)'}
            </button>
            <button
              onClick={() => handleRegenerate('high')}
              disabled={isRegenerating}
              className="px-3 py-1.5 text-xs bg-purple-100 dark:bg-purple-900 hover:bg-purple-200 dark:hover:bg-purple-800 text-purple-700 dark:text-purple-300 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRegenerating ? 'Генерация...' : 'Перегенерировать (High)'}
            </button>
          </>
        )}
        {section.technicalLogs && section.technicalLogs.length > 0 && (
          <button
            onClick={() => setShowLogs(!showLogs)}
            className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded transition-colors"
          >
            {showLogs ? 'Скрыть лог' : 'Открыть подробный лог'}
          </button>
        )}
      </div>

      {/* Показ HTML */}
      {showHtml && section.sectionHtml && typeof section.sectionHtml === 'string' && section.sectionHtml.trim().length > 0 && (
        <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700">
          <div
            className="prose dark:prose-invert max-w-none text-sm"
            dangerouslySetInnerHTML={{ __html: section.sectionHtml }}
          />
        </div>
      )}

      {/* Технические логи */}
      {showLogs && section.technicalLogs && section.technicalLogs.length > 0 && (
        <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700">
          <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Технические логи:
          </h4>
          <div className="space-y-1">
            {section.technicalLogs.map((log, idx) => (
              <div
                key={idx}
                className="text-xs font-mono text-gray-600 dark:text-gray-400 whitespace-pre-wrap break-words"
              >
                {log}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
