import { NextResponse } from 'next/server';
import { insertOffers } from '@/lib/db-adapter';
import Papa from 'papaparse';
import { readFile } from 'fs/promises';
import { join } from 'path';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const CSV_FILES = [
  { name: 'admitad.csv', source: 'admitad' },
  { name: 'advertise.csv', source: 'advertise' },
  { name: 'advertise1.csv', source: 'advertise' },
  { name: 'cj.csv', source: 'cj' },
  { name: 'clickbank.csv', source: 'clickbank' },
];

export async function POST(request: Request) {
  const debug: any = {
    timestamp: new Date().toISOString(),
    steps: [],
    errors: [],
    loaded: [],
  };

  try {
    const { filename } = await request.json().catch(() => ({}));
    
    // Если указан конкретный файл, загружаем только его
    const filesToLoad = filename 
      ? CSV_FILES.filter(f => f.name === filename)
      : CSV_FILES;

    if (filesToLoad.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Файл не найден',
        debug: debug,
      }, { status: 400 });
    }

    debug.steps.push(`Найдено файлов для загрузки: ${filesToLoad.length}`);

    let totalLoaded = 0;

    for (const fileInfo of filesToLoad) {
      try {
        debug.steps.push(`Обработка файла: ${fileInfo.name}`);
        
        const filePath = join(process.cwd(), 'public', 'data', fileInfo.name);
        
        // Проверяем существование файла
        try {
          await readFile(filePath, 'utf-8');
        } catch (fileError: any) {
          if (fileError.code === 'ENOENT') {
            debug.steps.push(`Файл ${fileInfo.name} не найден, пропускаем`);
            continue;
          }
          throw fileError;
        }
        
        const fileContent = await readFile(filePath, 'utf-8');
        
        debug.steps.push(`Файл ${fileInfo.name} прочитан, длина: ${fileContent.length} символов`);

        // Парсим CSV
        const parseResult = Papa.parse(fileContent, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (header) => header.trim().toLowerCase(),
        });

        if (parseResult.errors.length > 0) {
          debug.errors.push(...parseResult.errors.map((e: any) => `${fileInfo.name}, строка ${e.row}: ${e.message}`));
        }

        debug.steps.push(`CSV ${fileInfo.name} распарсен, найдено ${parseResult.data.length} строк`);

        // Преобразуем данные
        const offers = parseResult.data
          .map((row: any) => ({
            name: String(row.name || '').trim(),
            topic: String(row.topic || '').trim(),
            country: String(row.country || '').trim(),
            model: String(row.model || '').trim(),
            cr: parseFloat(row.cr) || 0,
            ecpc: parseFloat(row.ecpc) || 0,
            epc: parseFloat(row.epc) || 0,
            source: fileInfo.source,
          }))
          .filter((row: any) => row.name && row.topic && row.country && row.model);

        debug.steps.push(`Валидных записей в ${fileInfo.name}: ${offers.length}`);

        if (offers.length > 0) {
          await insertOffers(offers);
          totalLoaded += offers.length;
          debug.loaded.push({
            file: fileInfo.name,
            count: offers.length,
          });
          debug.steps.push(`Файл ${fileInfo.name} успешно загружен: ${offers.length} записей`);
        } else {
          debug.steps.push(`В файле ${fileInfo.name} не найдено валидных записей`);
        }
      } catch (fileError: any) {
        debug.errors.push(`Ошибка при обработке ${fileInfo.name}: ${fileError.message}`);
        debug.steps.push(`Ошибка при обработке ${fileInfo.name}: ${fileError.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Загружено ${totalLoaded} записей из ${filesToLoad.length} файл(ов)`,
      count: totalLoaded,
      files: debug.loaded,
      debug: debug,
    });
  } catch (error: any) {
    debug.errors.push(error.message || 'Unknown error');
    debug.steps.push(`Ошибка: ${error.message}`);
    console.error('Error loading CSV files:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Ошибка загрузки CSV файлов',
      debug: debug,
    }, { status: 500 });
  }
}
