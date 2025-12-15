'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useRef } from 'react';
import JSZip from 'jszip';

interface BotVisit {
  botName: string;
  userAgent: string;
  count: number;
  sampleLines: string[];
  errors?: {
    statusCode: number;
    count: number;
    sampleLines: string[];
  }[];
}

interface GoogleError {
  statusCode: number;
  botName: string;
  userAgent: string;
  count: number;
  sampleLines: string[];
  url?: string;
}

interface UrlAnalysis {
  url: string;
  count: number;
  statusCodes: { [key: number]: number };
  hasParams: boolean;
  depth: number;
  sampleLines: string[];
}

interface StatusDistribution {
  status200: number;
  status301: number;
  status302: number;
  status308: number;
  status404: number;
  status410: number;
  status403: number;
  status401: number;
  status5xx: number;
  other: number;
}

interface CrawlBudgetDistribution {
  canonical: number;
  withParams: number;
  pagination: number;
  service: number;
  notFound: number;
}

interface DepthDistribution {
  root: number;
  level1: number;
  level2: number;
  deeper: number;
}

interface TimeAnalysis {
  byHour: { [hour: number]: number };
  byDay: { [day: string]: number };
}

interface DetailedAnalysis {
  step1: {
    googlebotRequests: number;
    totalRequests: number;
    googlebotPercentage: number;
    verifiedBots: number;
    unverifiedBots: number;
  };
  step2: {
    totalRequests: number;
    uniqueUrls: number;
    avgRequestsPerUrl: number;
    topUrls: UrlAnalysis[];
  };
  step3: {
    top20Urls: UrlAnalysis[];
  };
  step4: CrawlBudgetDistribution;
  step5: StatusDistribution;
  step6: {
    totalRedirects: number;
    redirectChains: number;
    redirectTypes: { [key: number]: number };
  };
  step7: DepthDistribution;
  step8: {
    avgResponseTime?: number;
    maxResponseTime?: number;
    timingDataAvailable: boolean;
  };
  step9: TimeAnalysis;
}

interface AnalysisResult {
  totalGoogleVisits: number;
  bots: BotVisit[];
  uniqueBots: number;
  errors: GoogleError[];
  detailedAnalysis?: DetailedAnalysis;
}

interface UploadedFile {
  name: string;
  size: number;
  content: string;
  status: 'pending' | 'loading' | 'loaded' | 'error';
  error?: string;
}

export default function LogcheckerPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/user/me');
      
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      
      const data = await res.json();
      
      if (!data.success || !data.user) {
        router.push('/login');
        return;
      }

      setUser(data.user);
    } catch (error) {
      console.error('Ошибка проверки авторизации:', error);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  // Функция для декомпрессии gzip файла
  const decompressGzip = async (arrayBuffer: ArrayBuffer): Promise<string> => {
    try {
      // Используем CompressionStream/DecompressionStream API если доступно
      if ('DecompressionStream' in window) {
        const stream = new DecompressionStream('gzip');
        const writer = stream.writable.getWriter();
        const reader = stream.readable.getReader();
        
        writer.write(new Uint8Array(arrayBuffer));
        writer.close();
        
        const chunks: Uint8Array[] = [];
        let done = false;
        
        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;
          if (value) {
            chunks.push(value);
          }
        }
        
        const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
        const result = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of chunks) {
          result.set(chunk, offset);
          offset += chunk.length;
        }
        
        return new TextDecoder().decode(result);
      } else {
        // Fallback: используем pako если доступно, иначе ошибка
        throw new Error('DecompressionStream не поддерживается. Используйте современный браузер или загрузите .log файлы.');
      }
    } catch (err: any) {
      throw new Error(`Ошибка декомпрессии: ${err.message}`);
    }
  };

  // Функция для чтения файла
  const readFile = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          
          if (file.name.endsWith('.gz')) {
            // Декомпрессируем gzip файл
            const decompressed = await decompressGzip(arrayBuffer);
            resolve(decompressed);
          } else {
            // Обычный текстовый файл
            const text = new TextDecoder().decode(arrayBuffer);
            resolve(text);
          }
        } catch (err: any) {
          reject(err);
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Ошибка чтения файла'));
      };
      
      if (file.name.endsWith('.gz')) {
        reader.readAsArrayBuffer(file);
      } else {
        reader.readAsText(file, 'utf-8');
      }
    });
  };

  // Функция для распаковки ZIP архива и извлечения файлов
  const extractZipFiles = async (file: File): Promise<File[]> => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuffer);
      const extractedFiles: File[] = [];

      // Проходим по всем файлам в архиве
      for (const [fileName, zipEntry] of Object.entries(zip.files)) {
        // Пропускаем папки
        if (zipEntry.dir) continue;

        // Проверяем, что это поддерживаемый формат
        const isValidFormat = fileName.endsWith('.log') || 
                             fileName.endsWith('.log.1.gz') || 
                             fileName.endsWith('.gz');
        
        if (!isValidFormat) {
          console.warn(`Пропущен файл "${fileName}" - неподдерживаемый формат`);
          continue;
        }

        try {
          // Получаем содержимое файла
          let blob: Blob;
          
          if (fileName.endsWith('.gz')) {
            // Для gz файлов получаем как ArrayBuffer
            const arrayBuffer = await zipEntry.async('arraybuffer');
            blob = new Blob([arrayBuffer], { type: 'application/gzip' });
          } else {
            // Для обычных текстовых файлов получаем как text
            const text = await zipEntry.async('string');
            blob = new Blob([text], { type: 'text/plain' });
          }

          // Создаем File объект из Blob
          const extractedFile = new File([blob], fileName, {
            type: blob.type,
            lastModified: zipEntry.date?.getTime() || Date.now(),
          });

          extractedFiles.push(extractedFile);
        } catch (err: any) {
          console.error(`Ошибка извлечения файла "${fileName}":`, err);
        }
      }

      if (extractedFiles.length === 0) {
        throw new Error('В архиве не найдено поддерживаемых файлов (.log, .log.1.gz)');
      }

      return extractedFiles;
    } catch (err: any) {
      throw new Error(`Ошибка распаковки ZIP архива: ${err.message}`);
    }
  };

  // Обработка файлов (общая функция)
  const processFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    setLoadingFiles(true);
    setError(null);

    // Сначала обрабатываем ZIP архивы и извлекаем файлы
    const allFilesToProcess: File[] = [];
    const zipProcessingPromises: Promise<void>[] = [];

    for (const file of files) {
      if (file.name.toLowerCase().endsWith('.zip')) {
        // Добавляем ZIP файл в список с статусом загрузки
        setUploadedFiles(prev => [...prev, {
          name: file.name,
          size: file.size,
          content: '',
          status: 'loading' as const,
        }]);

        // Обрабатываем ZIP архив асинхронно
        const zipPromise = extractZipFiles(file)
          .then(extractedFiles => {
            // Обновляем статус ZIP файла на загруженный
            setUploadedFiles(prev => {
              const updated = [...prev];
              const zipIndex = updated.findIndex(f => f.name === file.name && f.status === 'loading');
              if (zipIndex !== -1) {
                updated[zipIndex] = {
                  name: file.name,
                  size: file.size,
                  content: '',
                  status: 'loaded' as const,
                };
              }
              return updated;
            });
            
            allFilesToProcess.push(...extractedFiles);
          })
          .catch(err => {
            // Обновляем статус ZIP файла на ошибку
            setUploadedFiles(prev => {
              const updated = [...prev];
              const zipIndex = updated.findIndex(f => f.name === file.name && f.status === 'loading');
              if (zipIndex !== -1) {
                updated[zipIndex] = {
                  name: file.name,
                  size: file.size,
                  content: '',
                  status: 'error' as const,
                  error: err.message || 'Ошибка распаковки архива',
                };
              }
              return updated;
            });
          });
        zipProcessingPromises.push(zipPromise);
      } else {
        // Обычные файлы добавляем сразу
        allFilesToProcess.push(file);
      }
    }

    // Ждем завершения обработки всех ZIP архивов
    await Promise.all(zipProcessingPromises);

    // Проверяем общее количество файлов после распаковки
    if (allFilesToProcess.length > 50) {
      setError(`Слишком много файлов после распаковки: ${allFilesToProcess.length}. Максимум 50 файлов.`);
      setLoadingFiles(false);
      return;
    }

    if (allFilesToProcess.length === 0) {
      setError('Не найдено файлов для обработки');
      setLoadingFiles(false);
      return;
    }

    const newFiles: UploadedFile[] = [];
    
    // Проверяем формат файлов
    for (let i = 0; i < allFilesToProcess.length; i++) {
      const file = allFilesToProcess[i];
      const isValidFormat = file.name.endsWith('.log') || 
                           file.name.endsWith('.log.1.gz') || 
                           file.name.endsWith('.gz');
      
      if (!isValidFormat) {
        console.warn(`Файл "${file.name}" имеет неподдерживаемый формат. Поддерживаются только .log и .log.1.gz файлы.`);
        continue;
      }

      newFiles.push({
        name: file.name,
        size: file.size,
        content: '',
        status: 'loading',
      });
    }

    if (newFiles.length === 0) {
      setError('Не найдено поддерживаемых файлов (.log, .log.1.gz)');
      setLoadingFiles(false);
      return;
    }

    // Добавляем новые файлы к существующим (если есть)
    setUploadedFiles(prev => [...prev, ...newFiles]);

    // Создаем маппинг имен файлов для быстрого поиска
    const fileMap = new Map<string, File>();
    allFilesToProcess.forEach(f => {
      fileMap.set(f.name, f);
    });

    // Читаем все файлы параллельно
    const readPromises = newFiles.map(async (fileInfo) => {
      const file = fileMap.get(fileInfo.name);
      
      if (!file) {
        return {
          ...fileInfo,
          status: 'error' as const,
          error: 'Файл не найден',
        };
      }

      try {
        const content = await readFile(file);
        return {
          ...fileInfo,
          content,
          status: 'loaded' as const,
        };
      } catch (err: any) {
        return {
          ...fileInfo,
          status: 'error' as const,
          error: err.message || 'Ошибка чтения файла',
        };
      }
    });

    const results = await Promise.all(readPromises);
    
    // Обновляем только новые файлы в списке
    setUploadedFiles(prev => {
      const updated = [...prev];
      const startIndex = updated.length - newFiles.length;
      results.forEach((result, index) => {
        updated[startIndex + index] = result;
      });
      
      // Объединяем содержимое всех успешно загруженных файлов
      const allContent = updated
        .filter(f => f.status === 'loaded')
        .map(f => f.content)
        .join('\n');
      
      setLogs(allContent);
      
      return updated;
    });
    
    setLoadingFiles(false);
  };

  // Обработка выбора файлов через input
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    await processFiles(files);
  };

  // Обработка drag and drop
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await processFiles(files);
    }
  };

  // Удаление файла из списка
  const removeFile = (index: number) => {
    const newFiles = uploadedFiles.filter((_, i) => i !== index);
    setUploadedFiles(newFiles);
    
    // Обновляем объединенное содержимое
    const allContent = newFiles
      .filter(f => f.status === 'loaded')
      .map(f => f.content)
      .join('\n');
    
    setLogs(allContent);
  };

  // Очистка всех файлов
  const clearAllFiles = () => {
    setUploadedFiles([]);
    setLogs('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const analyzeLogs = async () => {
    // Проверяем, есть ли загруженные файлы или текст в textarea
    const hasFiles = uploadedFiles.some(f => f.status === 'loaded');
    const hasText = logs.trim();
    
    if (!hasFiles && !hasText) {
      setError('Загрузите файлы или вставьте логи для анализа');
      return;
    }

    // Если есть загруженные файлы, используем их содержимое
    let logsToAnalyze = logs;
    if (hasFiles) {
      logsToAnalyze = uploadedFiles
        .filter(f => f.status === 'loaded')
        .map(f => f.content)
        .join('\n');
    }

    if (!logsToAnalyze.trim()) {
      setError('Нет данных для анализа');
      return;
    }

    setAnalyzing(true);
    setError(null);
    setResult(null);
    setShowSuccessNotification(false);
    setAnalysisProgress(0);

    try {
      // Список паттернов для поиска Google ботов в User-Agent
      const googleBotPatterns = [
        /Googlebot/i,
        /Google-InspectionTool/i,
        /Google-Extended/i,
        /Googlebot-Image/i,
        /Googlebot-Video/i,
        /Googlebot-News/i,
        /Googlebot-Mobile/i,
        /Mediapartners-Google/i,
        /AdsBot-Google/i,
        /FeedFetcher-Google/i,
        /Google Web Preview/i,
        /Google-Site-Verification/i,
        /Google Favicon/i,
        /Googlebot-Desktop/i,
        /Googlebot-Smartphone/i,
      ];

      // Паттерны для поиска рефереров от Google (не используются - фильтруем только по User-Agent)
      // Удалено: рефереры могут быть от обычных пользователей или других ботов

      // Разбиваем логи на строки
      const lines = logsToAnalyze.split('\n').filter(line => line.trim());
      const totalLines = lines.length;
      
      // Словарь для хранения информации о ботах
      const botsMap = new Map<string, BotVisit>();
      
      // Массив для хранения ошибок Google ботов
      const errorsMap = new Map<string, GoogleError>();

      // Данные для детального анализа
      const urlMap = new Map<string, UrlAnalysis>();
      const statusDistribution: StatusDistribution = {
        status200: 0,
        status301: 0,
        status302: 0,
        status308: 0,
        status404: 0,
        status410: 0,
        status403: 0,
        status401: 0,
        status5xx: 0,
        other: 0,
      };
      const crawlBudget: CrawlBudgetDistribution = {
        canonical: 0,
        withParams: 0,
        pagination: 0,
        service: 0,
        notFound: 0,
      };
      const depthDistribution: DepthDistribution = {
        root: 0,
        level1: 0,
        level2: 0,
        deeper: 0,
      };
      const timeAnalysis: TimeAnalysis = {
        byHour: {},
        byDay: {},
      };
      const redirectTypes: { [key: number]: number } = {};
      let verifiedBots = 0;
      let unverifiedBots = 0;
      const responseTimes: number[] = [];
      let googlebotRequests = 0;

      // Вспомогательная функция для извлечения URL из строки
      const extractUrl = (line: string): string | null => {
        const patterns = [
          /(?:GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\s+([^\s"']+)/i,
          /"([^"]+)"\s+\d{3}/,
          /'([^']+)'\s+\d{3}/,
          /(https?:\/\/[^\s"']+)/i,
        ];
        
        for (const pattern of patterns) {
          const match = line.match(pattern);
          if (match && match[1]) {
            let url = match[1];
            // Убираем протокол и домен, оставляем только путь
            url = url.replace(/^https?:\/\/[^\/]+/, '');
            // Убираем query string для анализа
            const pathOnly = url.split('?')[0];
            return pathOnly || '/';
          }
        }
        return null;
      };

      // Вспомогательная функция для определения глубины URL
      const getUrlDepth = (url: string): number => {
        if (!url || url === '/') return 0;
        const parts = url.split('/').filter(p => p.length > 0);
        return parts.length;
      };

      // Вспомогательная функция для классификации URL
      const classifyUrl = (url: string, statusCode: number | null): keyof CrawlBudgetDistribution => {
        if (!url) return 'canonical';
        if (statusCode === 404) return 'notFound';
        
        const lowerUrl = url.toLowerCase();
        if (lowerUrl.includes('?') || lowerUrl.includes('&')) return 'withParams';
        if (lowerUrl.includes('/page/') || lowerUrl.includes('/p/') || lowerUrl.match(/\/\d+$/)) return 'pagination';
        if (lowerUrl.includes('/admin') || lowerUrl.includes('/api') || lowerUrl.includes('/_next') || lowerUrl.includes('/static')) return 'service';
        return 'canonical';
      };

      // Вспомогательная функция для извлечения времени из строки
      const extractTime = (line: string): { hour?: number; day?: string } => {
        // Паттерны для даты/времени в различных форматах логов
        const datePatterns = [
          /\[(\d{2})\/(\w{3})\/(\d{4}):(\d{2}):(\d{2}):(\d{2})/,
          /(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/,
          /\[(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/,
        ];
        
        for (const pattern of datePatterns) {
          const match = line.match(pattern);
          if (match) {
            const hour = parseInt(match[4] || match[match.length - 3], 10);
            const day = match[2] || `${match[1]}-${match[2]}-${match[3]}`;
            return { hour, day };
          }
        }
        return {};
      };

      // Вспомогательная функция для извлечения времени ответа
      const extractResponseTime = (line: string): number | null => {
        const patterns = [
          /\s(\d+\.?\d*)\s*$/,
          /"rt=(\d+\.?\d*)/,
          /time=(\d+\.?\d*)/,
          /duration[:\s]+(\d+\.?\d*)/i,
        ];
        
        for (const pattern of patterns) {
          const match = line.match(pattern);
          if (match && match[1]) {
            const time = parseFloat(match[1]);
            if (time > 0 && time < 100000) return time; // Разумные пределы
          }
        }
        return null;
      };

      // Анализируем каждую строку
      lines.forEach((line, index) => {
        // Обновляем прогресс каждые 100 строк или в конце
        if (index % 100 === 0 || index === lines.length - 1) {
          const progress = Math.min(95, Math.round((index / lines.length) * 90));
          // Используем setTimeout для асинхронного обновления UI
          setTimeout(() => {
            setAnalysisProgress(progress);
          }, 0);
        }
        let foundBot = false;
        let botName = '';
        let userAgent = '';

        // Извлекаем HTTP статус код из строки (обычно это число 3-5 цифр)
        // Паттерны: " 400 ", " 400\n", "400 ", "HTTP/1.1 400", " 400 " и т.д.
        const statusMatch = line.match(/\s(\d{3})\s/) || 
                           line.match(/HTTP\/[\d.]+\s+(\d{3})/) ||
                           line.match(/"\s+(\d{3})\s+/) ||
                           line.match(/\s+(\d{3})["\s]/);
        const statusCode = statusMatch ? parseInt(statusMatch[1], 10) : null;
        
        // Проверяем, является ли это ошибкой (4xx или 5xx)
        const isError = statusCode !== null && (statusCode >= 400 && statusCode < 600);

        // Сначала проверяем User-Agent паттерны
        for (const pattern of googleBotPatterns) {
          if (pattern.test(line)) {
            foundBot = true;
            
            // Извлекаем User-Agent из строки
            const uaMatch = line.match(/["']([^"']*Google[^"']*)["']/i) || 
                           line.match(/User-Agent[:\s]+([^\s]+)/i) ||
                           line.match(/(Google[^\s]+)/i);
            
            if (uaMatch) {
              userAgent = uaMatch[1];
            } else {
              // Если не нашли явный User-Agent, берем часть строки с Google
              const googleMatch = line.match(/(Google[^\s]+)/i);
              userAgent = googleMatch ? googleMatch[1] : 'Googlebot';
            }

            // Определяем имя бота
            if (/Google-InspectionTool/i.test(userAgent)) {
              botName = 'Google Inspection Tool';
            } else if (/Google-Extended/i.test(userAgent)) {
              botName = 'Google Extended';
            } else if (/Googlebot-Image/i.test(userAgent)) {
              botName = 'Googlebot Image';
            } else if (/Googlebot-Video/i.test(userAgent)) {
              botName = 'Googlebot Video';
            } else if (/Googlebot-News/i.test(userAgent)) {
              botName = 'Googlebot News';
            } else if (/Googlebot-Mobile/i.test(userAgent)) {
              botName = 'Googlebot Mobile';
            } else if (/Mediapartners-Google/i.test(userAgent)) {
              botName = 'Mediapartners Google';
            } else if (/AdsBot-Google/i.test(userAgent)) {
              botName = 'AdsBot Google';
            } else if (/FeedFetcher-Google/i.test(userAgent)) {
              botName = 'FeedFetcher Google';
            } else if (/Google Web Preview/i.test(userAgent)) {
              botName = 'Google Web Preview';
            } else if (/Google-Site-Verification/i.test(userAgent)) {
              botName = 'Google Site Verification';
            } else if (/Googlebot-Desktop/i.test(userAgent)) {
              botName = 'Googlebot Desktop';
            } else if (/Googlebot-Smartphone/i.test(userAgent)) {
              botName = 'Googlebot Smartphone';
            } else if (/Googlebot/i.test(userAgent)) {
              botName = 'Googlebot';
            } else {
              botName = 'Googlebot';
            }
            break;
          }
        }

        // ВАЖНО: Показываем ТОЛЬКО Google ботов по User-Agent
        // Рефереры от Google не учитываем, так как они могут быть от обычных пользователей
        // или других ботов, которые перешли с Google поиска

        // Если нашли бота, сохраняем информацию
        if (foundBot) {
          googlebotRequests++;
          
          // Проверка подлинности бота (по IP или rDNS - упрощенная проверка)
          const hasGoogleIp = /66\.249\.|64\.233\.|72\.14\.|74\.125\.|209\.85\.|216\.239\./i.test(line);
          const hasGoogleRdns = /\.googlebot\.com|\.google\.com/i.test(line);
          if (hasGoogleIp || hasGoogleRdns) {
            verifiedBots++;
          } else {
            unverifiedBots++;
          }

          const key = botName.toLowerCase();
          if (!botsMap.has(key)) {
            botsMap.set(key, {
              botName,
              userAgent: userAgent.substring(0, 100), // Ограничиваем длину
              count: 0,
              sampleLines: [],
              errors: [],
            });
          }

          const bot = botsMap.get(key)!;
          bot.count++;
          
          // Сохраняем примеры строк (максимум 3)
          if (bot.sampleLines.length < 3) {
            bot.sampleLines.push(line.substring(0, 200)); // Ограничиваем длину
          }
          
          // Извлекаем URL для детального анализа
          const url = extractUrl(line);
          if (url) {
            const urlKey = url.split('?')[0]; // Без query параметров для группировки
            if (!urlMap.has(urlKey)) {
              urlMap.set(urlKey, {
                url: urlKey,
                count: 0,
                statusCodes: {},
                hasParams: url.includes('?'),
                depth: getUrlDepth(urlKey),
                sampleLines: [],
              });
            }
            
            const urlAnalysis = urlMap.get(urlKey)!;
            urlAnalysis.count++;
            
            if (statusCode !== null) {
              urlAnalysis.statusCodes[statusCode] = (urlAnalysis.statusCodes[statusCode] || 0) + 1;
            }
            
            if (urlAnalysis.sampleLines.length < 2) {
              urlAnalysis.sampleLines.push(line.substring(0, 200));
            }
            
            // Распределение по глубине
            const depth = getUrlDepth(urlKey);
            if (depth === 0) depthDistribution.root++;
            else if (depth === 1) depthDistribution.level1++;
            else if (depth === 2) depthDistribution.level2++;
            else depthDistribution.deeper++;
            
            // Распределение crawl budget
            const urlClass = classifyUrl(url, statusCode);
            crawlBudget[urlClass]++;
          }
          
          // Распределение статусов
          if (statusCode !== null) {
            if (statusCode === 200) statusDistribution.status200++;
            else if (statusCode === 301) statusDistribution.status301++;
            else if (statusCode === 302) statusDistribution.status302++;
            else if (statusCode === 308) statusDistribution.status308++;
            else if (statusCode === 404) statusDistribution.status404++;
            else if (statusCode === 410) statusDistribution.status410++;
            else if (statusCode === 403) statusDistribution.status403++;
            else if (statusCode === 401) statusDistribution.status401++;
            else if (statusCode >= 500 && statusCode < 600) statusDistribution.status5xx++;
            else statusDistribution.other++;
            
            // Редиректы
            if (statusCode === 301 || statusCode === 302 || statusCode === 308) {
              redirectTypes[statusCode] = (redirectTypes[statusCode] || 0) + 1;
            }
          }
          
          // Анализ времени
          const timeData = extractTime(line);
          if (timeData.hour !== undefined) {
            timeAnalysis.byHour[timeData.hour] = (timeAnalysis.byHour[timeData.hour] || 0) + 1;
          }
          if (timeData.day) {
            timeAnalysis.byDay[timeData.day] = (timeAnalysis.byDay[timeData.day] || 0) + 1;
          }
          
          // Время ответа
          const responseTime = extractResponseTime(line);
          if (responseTime !== null) {
            responseTimes.push(responseTime);
          }
          
          // Если это ошибка, сохраняем информацию об ошибке
          if (isError && statusCode !== null) {
            // Сохраняем в общий список ошибок
            const errorKey = `${botName}-${statusCode}`;
            if (!errorsMap.has(errorKey)) {
              const urlMatch = line.match(/(?:GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\s+([^\s"']+)/i) ||
                              line.match(/["']([^"']+)["']/) ||
                              line.match(/(https?:\/\/[^\s"']+)/i);
              const errorUrl = urlMatch ? urlMatch[1].substring(0, 150) : undefined;
              
              errorsMap.set(errorKey, {
                statusCode,
                botName,
                userAgent: userAgent.substring(0, 100),
                count: 0,
                sampleLines: [],
                url: errorUrl,
              });
            }
            
            const error = errorsMap.get(errorKey)!;
            error.count++;
            
            // Сохраняем примеры строк с ошибками (максимум 3)
            if (error.sampleLines.length < 3) {
              error.sampleLines.push(line.substring(0, 200));
            }
            
            // Также сохраняем ошибку в информацию о боте
            if (!bot.errors) {
              bot.errors = [];
            }
            
            const botError = bot.errors.find(e => e.statusCode === statusCode);
            if (!botError) {
              bot.errors.push({
                statusCode,
                count: 0,
                sampleLines: [],
              });
            }
            
            const botErrorEntry = bot.errors.find(e => e.statusCode === statusCode)!;
            botErrorEntry.count++;
            if (botErrorEntry.sampleLines.length < 3) {
              botErrorEntry.sampleLines.push(line.substring(0, 200));
            }
          }
        }
      });

      // Преобразуем Map в массив и сортируем по количеству заходов
      const botsArray = Array.from(botsMap.values()).sort((a, b) => b.count - a.count);
      
      // Преобразуем ошибки в массив и сортируем по статус коду и количеству
      const errorsArray = Array.from(errorsMap.values())
        .sort((a, b) => {
          // Сначала по статус коду (400, 401, 404, 500 и т.д.)
          if (a.statusCode !== b.statusCode) {
            return a.statusCode - b.statusCode;
          }
          // Затем по количеству ошибок
          return b.count - a.count;
        });
      
      const totalVisits = botsArray.reduce((sum, bot) => sum + bot.count, 0);
      
      // Формируем TOP-20 URL
      const top20Urls = Array.from(urlMap.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 20);
      
      // Вычисляем среднее время ответа
      const avgResponseTime = responseTimes.length > 0
        ? responseTimes.reduce((sum, t) => sum + t, 0) / responseTimes.length
        : undefined;
      const maxResponseTime = responseTimes.length > 0
        ? Math.max(...responseTimes)
        : undefined;
      
      // Подсчитываем редиректы
      const totalRedirects = statusDistribution.status301 + statusDistribution.status302 + statusDistribution.status308;
      
      // Формируем детальный анализ
      const detailedAnalysis: DetailedAnalysis = {
        step1: {
          googlebotRequests,
          totalRequests: totalLines,
          googlebotPercentage: totalLines > 0 ? (googlebotRequests / totalLines) * 100 : 0,
          verifiedBots,
          unverifiedBots,
        },
        step2: {
          totalRequests: googlebotRequests,
          uniqueUrls: urlMap.size,
          avgRequestsPerUrl: urlMap.size > 0 ? googlebotRequests / urlMap.size : 0,
          topUrls: top20Urls,
        },
        step3: {
          top20Urls: top20Urls,
        },
        step4: crawlBudget,
        step5: statusDistribution,
        step6: {
          totalRedirects,
          redirectChains: 0, // Требует дополнительного анализа последовательных редиректов
          redirectTypes,
        },
        step7: depthDistribution,
        step8: {
          avgResponseTime,
          maxResponseTime,
          timingDataAvailable: responseTimes.length > 0,
        },
        step9: timeAnalysis,
      };

      setAnalysisProgress(100);
      
      // Небольшая задержка для плавности
      await new Promise(resolve => setTimeout(resolve, 300));
      
      setResult({
        totalGoogleVisits: totalVisits,
        bots: botsArray,
        uniqueBots: botsArray.length,
        errors: errorsArray,
        detailedAnalysis,
      });
      
      // Показываем уведомление об успешном завершении
      setShowSuccessNotification(true);
      
      // Автоматически скрываем уведомление через 5 секунд
      setTimeout(() => {
        setShowSuccessNotification(false);
      }, 5000);
    } catch (err: any) {
      setError(err.message || 'Ошибка при анализе логов');
      console.error('Ошибка анализа:', err);
    } finally {
      setAnalyzing(false);
      setAnalysisProgress(0);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-400">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
          Logchecker
        </h1>

        {/* Уведомление об успешном завершении анализа */}
        {showSuccessNotification && (
          <div className="fixed top-4 right-4 z-50 animate-slide-in-right">
            <div className="bg-green-500 text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 min-w-[300px]">
              <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <div className="font-semibold">Анализ завершен!</div>
                <div className="text-sm text-green-100">
                  Обработано {result?.totalGoogleVisits || 0} запросов от Google ботов
                </div>
              </div>
              <button
                onClick={() => setShowSuccessNotification(false)}
                className="text-white hover:text-green-100 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Индикатор процесса анализа */}
        {analyzing && (
          <div className="mb-8 bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="relative">
                <div className="w-12 h-12 border-4 border-blue-200 dark:border-blue-800 border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin"></div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                  Анализ логов в процессе...
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Обрабатываются строки логов и анализируются запросы Google ботов
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {analysisProgress}%
                </div>
              </div>
            </div>
            {/* Прогресс-бар */}
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
              <div
                className="bg-blue-600 dark:bg-blue-400 h-full rounded-full transition-all duration-300 ease-out"
                style={{ width: `${analysisProgress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Форма */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-8">
          <div className="space-y-6">
            {/* Блок для загрузки файлов */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Загрузите файлы логов (.log, .log.1.gz) или ZIP архив *
              </label>
              <div
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-6 transition-colors ${
                  isDragging
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".log,.gz,.log.1.gz,.zip"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer flex flex-col items-center justify-center gap-2"
                >
                  <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {isDragging ? 'Отпустите файлы здесь' : 'Нажмите для выбора файлов или перетащите файлы сюда'}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Поддерживаются форматы: .log, .log.1.gz, .zip (до 10 файлов или 1 архив)
                  </span>
                </label>
              </div>

              {/* Список загруженных файлов */}
              {uploadedFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Загруженные файлы ({uploadedFiles.filter(f => f.status === 'loaded').length}/{uploadedFiles.length})
                    </span>
                    <button
                      onClick={clearAllFiles}
                      className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                    >
                      Очистить все
                    </button>
                  </div>
                  {uploadedFiles.map((file, index) => (
                    <div
                      key={index}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        file.status === 'loaded'
                          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                          : file.status === 'loading'
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                          : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {file.status === 'loaded' && (
                          <svg className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                        {file.status === 'loading' && (
                          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin flex-shrink-0"></div>
                        )}
                        {file.status === 'error' && (
                          <svg className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {file.name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {(file.size / 1024).toFixed(2)} KB
                            {file.status === 'loaded' && file.content && (
                              <span className="ml-2">
                                • {file.content.split('\n').filter(l => l.trim()).length} строк
                              </span>
                            )}
                          </div>
                          {file.status === 'error' && file.error && (
                            <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                              {file.error}
                            </div>
                          )}
                        </div>
                      </div>
                      {file.status !== 'loading' && (
                        <button
                          onClick={() => removeFile(index)}
                          className="ml-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors flex-shrink-0"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {loadingFiles && (
                <div className="mt-4 text-sm text-blue-600 dark:text-blue-400">
                  Загрузка файлов...
                </div>
              )}
            </div>

            {/* Разделитель */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">или</span>
              </div>
            </div>

            {/* Блок для ввода логов */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Вставьте логи для анализа
              </label>
              <textarea
                value={logs}
                onChange={(e) => setLogs(e.target.value)}
                rows={15}
                className="w-full px-4 py-3 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y font-mono"
                placeholder="Вставьте логи сервера (access.log, error.log и т.д.)..."
              />
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Анализируются ТОЛЬКО заходы Google ботов по User-Agent (Googlebot, Google-InspectionTool, Googlebot-Image и др.). Другие боты не показываются.
              </p>
            </div>

            {error && (
              <div className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <button
              onClick={analyzeLogs}
              disabled={analyzing || loadingFiles || (!logs.trim() && uploadedFiles.filter(f => f.status === 'loaded').length === 0)}
              className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {analyzing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Анализ в процессе...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <span>
                    Анализировать логи
                    {uploadedFiles.filter(f => f.status === 'loaded').length > 0 && (
                      <span className="ml-1">
                        ({uploadedFiles.filter(f => f.status === 'loaded').length} файл{uploadedFiles.filter(f => f.status === 'loaded').length > 1 ? 'ов' : ''})
                      </span>
                    )}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Результаты анализа */}
        {result && (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
              Результаты анализа
            </h2>

            {/* Оповещения об ошибках */}
            {result.errors.length > 0 && (
              <div className="mb-6">
                <div className="bg-red-50 dark:bg-red-900/30 border-2 border-red-300 dark:border-red-700 rounded-lg p-6">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <div className="ml-3 flex-1">
                      <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">
                        ⚠️ Требуется исправление: Google боты получают ошибки
                      </h3>
                      <div className="space-y-3">
                        {result.errors.map((error, index) => (
                          <div 
                            key={index}
                            className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-red-200 dark:border-red-800"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <span className="font-semibold text-red-700 dark:text-red-300">
                                  Ошибка {error.statusCode}
                                </span>
                                <span className="text-sm text-gray-600 dark:text-gray-400 ml-2">
                                  от {error.botName}
                                </span>
                              </div>
                              <span className="text-lg font-bold text-red-600 dark:text-red-400">
                                {error.count} {error.count === 1 ? 'раз' : 'раз'}
                              </span>
                            </div>
                            {error.url && (
                              <div className="text-sm text-gray-700 dark:text-gray-300 mb-2 font-mono break-all">
                                URL: {error.url}
                              </div>
                            )}
                            <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                              User-Agent: {error.userAgent}
                            </div>
                            <div className="mt-2">
                              <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                Примеры запросов с ошибкой:
                              </div>
                              <div className="space-y-1">
                                {error.sampleLines.map((line, lineIndex) => (
                                  <div 
                                    key={lineIndex}
                                    className="text-xs font-mono text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 p-2 rounded border border-gray-200 dark:border-gray-700 overflow-x-auto"
                                  >
                                    {line}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Краткая статистика */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Всего заходов Google
                </div>
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {result.totalGoogleVisits}
                </div>
              </div>
              <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-4">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Уникальных ботов
                </div>
                <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {result.uniqueBots}
                </div>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/30 rounded-lg p-4">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Среднее заходов на бота
                </div>
                <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                  {result.uniqueBots > 0 
                    ? Math.round(result.totalGoogleVisits / result.uniqueBots)
                    : 0}
                </div>
              </div>
            </div>

            {/* Сводка ботов */}
            {result.bots.length > 0 && (
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Сводка ботов
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {result.bots.map((bot, index) => {
                    const percentage = result.totalGoogleVisits > 0
                      ? ((bot.count / result.totalGoogleVisits) * 100).toFixed(1)
                      : '0';
                    const hasErrors = bot.errors && bot.errors.length > 0;
                    const totalErrors = hasErrors 
                      ? bot.errors!.reduce((sum, e) => sum + e.count, 0)
                      : 0;
                    
                    return (
                      <div
                        key={index}
                        className={`bg-gradient-to-br ${
                          hasErrors 
                            ? 'from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-900/30 border-2 border-red-300 dark:border-red-700' 
                            : 'from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/30 border border-blue-200 dark:border-blue-800'
                        } rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 dark:text-white text-sm mb-1">
                              {bot.botName}
                            </h4>
                            {hasErrors && (
                              <div className="flex items-center gap-1 mt-1">
                                <svg className="h-4 w-4 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                <span className="text-xs font-medium text-red-700 dark:text-red-300">
                                  {totalErrors} {totalErrors === 1 ? 'ошибка' : 'ошибок'}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                          <div className="flex items-baseline justify-between">
                            <span className="text-xs text-gray-600 dark:text-gray-400">
                              Заходов:
                            </span>
                            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                              {bot.count.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex items-baseline justify-between mt-2">
                            <span className="text-xs text-gray-600 dark:text-gray-400">
                              Процент:
                            </span>
                            <span className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                              {percentage}%
                            </span>
                          </div>
                          {hasErrors && (
                            <div className="mt-2 pt-2 border-t border-red-200 dark:border-red-800">
                              <div className="text-xs text-red-700 dark:text-red-300">
                                Ошибки:
                                {bot.errors!.map((error, errIndex) => (
                                  <span key={errIndex} className="ml-1 font-semibold">
                                    {error.statusCode} ({error.count})
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Таблица ботов */}
            {result.bots.length > 0 ? (
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Детальная таблица ботов
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-100 dark:bg-gray-700">
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-600">
                          Бот
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-600">
                          User-Agent
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-600">
                          Количество заходов
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-600">
                          Процент
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {result.bots.map((bot, index) => {
                        const percentage = result.totalGoogleVisits > 0
                          ? ((bot.count / result.totalGoogleVisits) * 100).toFixed(1)
                          : '0';
                        
                        return (
                          <tr 
                            key={index}
                            className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                          >
                            <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                              <div className="flex items-center gap-2">
                                {bot.botName}
                                {bot.errors && bot.errors.length > 0 && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                                    {bot.errors.length} {bot.errors.length === 1 ? 'ошибка' : 'ошибок'}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 font-mono text-xs">
                              {bot.userAgent || 'N/A'}
                            </td>
                            <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-white font-semibold">
                              {bot.count.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-sm text-right text-gray-600 dark:text-gray-400">
                              {percentage}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-600 dark:text-gray-400">
                Google боты не найдены в логах
              </div>
            )}

            {/* Примеры строк для каждого бота */}
            {result.bots.length > 0 && (
              <div className="mt-8">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Примеры запросов
                </h3>
                <div className="space-y-4">
                  {result.bots.map((bot, index) => (
                    <div 
                      key={index}
                      className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
                    >
                      <div className="font-semibold text-gray-900 dark:text-white mb-2">
                        {bot.botName} ({bot.count} {bot.count === 1 ? 'заход' : 'заходов'})
                        {bot.errors && bot.errors.length > 0 && (
                          <span className="ml-2 text-red-600 dark:text-red-400 text-sm">
                            - {bot.errors.reduce((sum, e) => sum + e.count, 0)} ошибок
                          </span>
                        )}
                      </div>
                      {bot.errors && bot.errors.length > 0 && (
                        <div className="mb-3 p-3 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
                          <div className="text-sm font-semibold text-red-700 dark:text-red-300 mb-2">
                            Ошибки:
                          </div>
                          <div className="space-y-2">
                            {bot.errors.map((error, errorIndex) => (
                              <div key={errorIndex} className="text-xs">
                                <span className="font-semibold text-red-600 dark:text-red-400">
                                  {error.statusCode}:
                                </span>
                                <span className="text-gray-700 dark:text-gray-300 ml-1">
                                  {error.count} {error.count === 1 ? 'раз' : 'раз'}
                                </span>
                                {error.sampleLines.length > 0 && (
                                  <div className="mt-1 space-y-1">
                                    {error.sampleLines.map((line, lineIndex) => (
                                      <div 
                                        key={lineIndex}
                                        className="text-xs font-mono text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 p-2 rounded border border-red-200 dark:border-red-800 overflow-x-auto"
                                      >
                                        {line}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="space-y-2">
                        <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                          Примеры запросов:
                        </div>
                        {bot.sampleLines.map((line, lineIndex) => (
                          <div 
                            key={lineIndex}
                            className="text-xs font-mono text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-600 overflow-x-auto"
                          >
                            {line}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Детальный анализ по 9 шагам */}
            {result.detailedAnalysis && (
              <div className="mt-8 bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
                  Детальный анализ Googlebot
                </h2>

                {/* Шаг 1: Идентификация Googlebot */}
                <div className="mb-8">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                    Шаг 1. Идентификация Googlebot
                  </h3>
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-2">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Запросов Googlebot</div>
                        <div className="text-lg font-bold text-gray-900 dark:text-white">
                          {result.detailedAnalysis.step1.googlebotRequests.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Всего запросов</div>
                        <div className="text-lg font-bold text-gray-900 dark:text-white">
                          {result.detailedAnalysis.step1.totalRequests.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Процент Googlebot</div>
                        <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                          {result.detailedAnalysis.step1.googlebotPercentage.toFixed(2)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Подтвержденных ботов</div>
                        <div className="text-lg font-bold text-green-600 dark:text-green-400">
                          {result.detailedAnalysis.step1.verifiedBots}
                        </div>
                      </div>
                    </div>
                    {result.detailedAnalysis.step1.unverifiedBots > 0 && (
                      <div className="mt-2 text-sm text-yellow-600 dark:text-yellow-400">
                        ⚠️ Неподтвержденных ботов: {result.detailedAnalysis.step1.unverifiedBots}
                      </div>
                    )}
                  </div>
                </div>

                {/* Шаг 2: Объем и частота обхода */}
                <div className="mb-8">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                    Шаг 2. Объем и частота обхода
                  </h3>
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-2">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Всего запросов Googlebot</div>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                          {result.detailedAnalysis.step2.totalRequests.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Уникальных URL</div>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                          {result.detailedAnalysis.step2.uniqueUrls.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Среднее запросов на URL</div>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                          {result.detailedAnalysis.step2.avgRequestsPerUrl.toFixed(2)}
                        </div>
                      </div>
                    </div>
                    {result.detailedAnalysis.step2.avgRequestsPerUrl > 10 && (
                      <div className="mt-2 text-sm text-yellow-600 dark:text-yellow-400">
                        Высокая концентрация запросов на малом числе URL
                      </div>
                    )}
                  </div>
                </div>

                {/* Шаг 3: TOP-20 URL */}
                <div className="mb-8">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                    Шаг 3. TOP-20 URL по количеству запросов
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-100 dark:bg-gray-700">
                          <th className="px-4 py-2 text-left text-sm font-semibold text-gray-900 dark:text-white border-b">URL</th>
                          <th className="px-4 py-2 text-right text-sm font-semibold text-gray-900 dark:text-white border-b">Запросов</th>
                          <th className="px-4 py-2 text-right text-sm font-semibold text-gray-900 dark:text-white border-b">Глубина</th>
                          <th className="px-4 py-2 text-left text-sm font-semibold text-gray-900 dark:text-white border-b">Статусы</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {result.detailedAnalysis.step3.top20Urls.map((url, index) => (
                          <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                            <td className="px-4 py-2 text-sm font-mono text-gray-900 dark:text-white">
                              {url.url || '/'}
                              {url.hasParams && <span className="ml-2 text-xs text-yellow-600">параметры</span>}
                            </td>
                            <td className="px-4 py-2 text-sm text-right text-gray-900 dark:text-white font-semibold">
                              {url.count.toLocaleString()}
                            </td>
                            <td className="px-4 py-2 text-sm text-right text-gray-600 dark:text-gray-400">
                              {url.depth}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
                              {Object.entries(url.statusCodes).map(([code, count]) => (
                                <span key={code} className="mr-2">
                                  {code}: {count}
                                </span>
                              ))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Шаг 4: Распределение crawl budget */}
                <div className="mb-8">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                    Шаг 4. Распределение crawl budget
                  </h3>
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                    <div className="space-y-3">
                      {Object.entries(result.detailedAnalysis.step4).map(([key, value]) => {
                        const total = Object.values(result.detailedAnalysis.step4).reduce((a, b) => a + b, 0);
                        const percentage = total > 0 ? (value / total) * 100 : 0;
                        const labels: { [key: string]: string } = {
                          canonical: 'Каноничные страницы',
                          withParams: 'URL с параметрами',
                          pagination: 'Pagination',
                          service: 'Служебные разделы',
                          notFound: 'Несуществующие URL',
                        };
                        return (
                          <div key={key}>
                            <div className="flex justify-between mb-1">
                              <span className="text-sm text-gray-700 dark:text-gray-300">{labels[key]}</span>
                              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                {value.toLocaleString()} ({percentage.toFixed(1)}%)
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${
                                  key === 'canonical' ? 'bg-green-500' :
                                  key === 'notFound' || key === 'service' ? 'bg-red-500' :
                                  'bg-yellow-500'
                                }`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {result.detailedAnalysis.step4.notFound + result.detailedAnalysis.step4.service > 
                     Object.values(result.detailedAnalysis.step4).reduce((a, b) => a + b, 0) * 0.1 && (
                      <div className="mt-4 text-sm text-red-600 dark:text-red-400">
                        ⚠️ Более 10% бюджета тратится на несуществующие или служебные URL
                      </div>
                    )}
                  </div>
                </div>

                {/* Шаг 5: HTTP статусы */}
                <div className="mb-8">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                    Шаг 5. Распределение HTTP статусов для Googlebot
                  </h3>
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">200 OK</div>
                        <div className="text-xl font-bold text-green-600 dark:text-green-400">
                          {result.detailedAnalysis.step5.status200.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">301 Moved</div>
                        <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                          {result.detailedAnalysis.step5.status301.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">302 Found</div>
                        <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                          {result.detailedAnalysis.step5.status302.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">404 Not Found</div>
                        <div className="text-xl font-bold text-red-600 dark:text-red-400">
                          {result.detailedAnalysis.step5.status404.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">410 Gone</div>
                        <div className="text-xl font-bold text-red-600 dark:text-red-400">
                          {result.detailedAnalysis.step5.status410.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">403/401</div>
                        <div className="text-xl font-bold text-red-600 dark:text-red-400">
                          {(result.detailedAnalysis.step5.status403 + result.detailedAnalysis.step5.status401).toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">5xx ошибки</div>
                        <div className="text-xl font-bold text-red-600 dark:text-red-400">
                          {result.detailedAnalysis.step5.status5xx.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Другие</div>
                        <div className="text-xl font-bold text-gray-600 dark:text-gray-400">
                          {result.detailedAnalysis.step5.other.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Шаг 6: Редиректы */}
                <div className="mb-8">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                    Шаг 6. Анализ редиректов
                  </h3>
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Всего редиректов</div>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                          {result.detailedAnalysis.step6.totalRedirects.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">301 редиректы</div>
                        <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                          {(result.detailedAnalysis.step6.redirectTypes[301] || 0).toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">302 редиректы</div>
                        <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                          {(result.detailedAnalysis.step6.redirectTypes[302] || 0).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    {result.detailedAnalysis.step6.totalRedirects > result.detailedAnalysis.step1.googlebotRequests * 0.3 && (
                      <div className="mt-4 text-sm text-yellow-600 dark:text-yellow-400">
                        ⚠️ Более 30% запросов - редиректы
                      </div>
                    )}
                  </div>
                </div>

                {/* Шаг 7: Глубина обхода */}
                <div className="mb-8">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                    Шаг 7. Глубина обхода
                  </h3>
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Корень (/)</div>
                        <div className="text-xl font-bold text-gray-900 dark:text-white">
                          {result.detailedAnalysis.step7.root.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Уровень 1</div>
                        <div className="text-xl font-bold text-gray-900 dark:text-white">
                          {result.detailedAnalysis.step7.level1.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Уровень 2</div>
                        <div className="text-xl font-bold text-gray-900 dark:text-white">
                          {result.detailedAnalysis.step7.level2.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Глубже</div>
                        <div className="text-xl font-bold text-gray-900 dark:text-white">
                          {result.detailedAnalysis.step7.deeper.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Шаг 8: Скорость ответа */}
                {result.detailedAnalysis.step8.timingDataAvailable && (
                  <div className="mb-8">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                      Шаг 8. Скорость ответа
                    </h3>
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">Среднее время ответа</div>
                          <div className="text-2xl font-bold text-gray-900 dark:text-white">
                            {result.detailedAnalysis.step8.avgResponseTime?.toFixed(2)} мс
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">Максимальное время</div>
                          <div className="text-2xl font-bold text-gray-900 dark:text-white">
                            {result.detailedAnalysis.step8.maxResponseTime?.toFixed(2)} мс
                          </div>
                        </div>
                      </div>
                      {result.detailedAnalysis.step8.avgResponseTime && result.detailedAnalysis.step8.avgResponseTime > 1000 && (
                        <div className="mt-4 text-sm text-red-600 dark:text-red-400">
                          ⚠️ Среднее время ответа превышает 1 секунду
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Шаг 9: Поведение во времени */}
                {Object.keys(result.detailedAnalysis.step9.byHour).length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                      Шаг 9. Активность по часам
                    </h3>
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                      <div className="grid grid-cols-6 md:grid-cols-12 gap-2">
                        {Array.from({ length: 24 }, (_, i) => i).map((hour) => {
                          const count = result.detailedAnalysis.step9.byHour[hour] || 0;
                          const maxCount = Math.max(...Object.values(result.detailedAnalysis.step9.byHour));
                          return (
                            <div key={hour} className="text-center">
                              <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">{hour}:00</div>
                              <div className="bg-blue-200 dark:bg-blue-800 rounded h-24 flex items-end justify-center p-1">
                                <div
                                  className="bg-blue-600 dark:bg-blue-400 w-full rounded"
                                  style={{ height: maxCount > 0 ? `${(count / maxCount) * 100}%` : '0%' }}
                                  title={`${count} запросов`}
                                />
                              </div>
                              <div className="text-xs text-gray-700 dark:text-gray-300 mt-1">{count}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Краткое резюме */}
                <div className="mt-8 bg-blue-50 dark:bg-blue-900/30 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                    Краткое резюме
                  </h3>
                  <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                    <li>• Googlebot выполнил {result.detailedAnalysis.step1.googlebotRequests.toLocaleString()} запросов из {result.detailedAnalysis.step1.totalRequests.toLocaleString()} ({result.detailedAnalysis.step1.googlebotPercentage.toFixed(2)}%)</li>
                    <li>• Обнаружено {result.detailedAnalysis.step2.uniqueUrls.toLocaleString()} уникальных URL</li>
                    <li>• Среднее {result.detailedAnalysis.step2.avgRequestsPerUrl.toFixed(2)} запросов на URL</li>
                    <li>• {result.detailedAnalysis.step5.status200.toLocaleString()} успешных ответов (200), {result.detailedAnalysis.step5.status404.toLocaleString()} ошибок 404</li>
                    <li>• {result.detailedAnalysis.step6.totalRedirects.toLocaleString()} редиректов ({result.detailedAnalysis.step1.googlebotRequests > 0 ? ((result.detailedAnalysis.step6.totalRedirects / result.detailedAnalysis.step1.googlebotRequests) * 100).toFixed(1) : 0}%)</li>
                    {result.detailedAnalysis.step8.timingDataAvailable && result.detailedAnalysis.step8.avgResponseTime && (
                      <li>• Среднее время ответа: {result.detailedAnalysis.step8.avgResponseTime.toFixed(2)} мс</li>
                    )}
                    {result.detailedAnalysis.step4.notFound + result.detailedAnalysis.step4.service > 0 && (
                      <li>• {(result.detailedAnalysis.step4.notFound + result.detailedAnalysis.step4.service).toLocaleString()} запросов к несуществующим или служебным URL</li>
                    )}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
