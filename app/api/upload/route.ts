import { NextResponse } from 'next/server';
import { insertOffers } from '@/lib/db-adapter';
import Papa from 'papaparse';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  const debug: any = {
    timestamp: new Date().toISOString(),
    steps: [],
    errors: [],
  };

  try {
    debug.steps.push('Начало загрузки CSV');
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const source = formData.get('source') as string || 'upload';

    if (!file) {
      return NextResponse.json({
        success: false,
        error: 'Файл не предоставлен',
        debug: debug,
      }, { status: 400 });
    }

    debug.steps.push(`Получен файл: ${file.name}, размер: ${file.size} байт`);

    // Читаем содержимое файла
    const text = await file.text();
    debug.steps.push(`Файл прочитан, длина: ${text.length} символов`);

    // Парсим CSV
    return new Promise<NextResponse>((resolve) => {
      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim().toLowerCase(),
        complete: async (results) => {
          try {
            debug.steps.push(`CSV распарсен, найдено ${results.data.length} строк`);

            if (results.errors.length > 0) {
              debug.errors.push(...results.errors.map((e: any) => `Строка ${e.row}: ${e.message}`));
            }

            // Преобразуем данные в нужный формат
            const offers = results.data
              .filter((row: any) => row.name && row.topic && row.country && row.model)
              .map((row: any) => ({
                name: String(row.name || '').trim(),
                topic: String(row.topic || '').trim(),
                country: String(row.country || '').trim(),
                model: String(row.model || '').trim(),
                cr: parseFloat(row.cr) || 0,
                ecpc: parseFloat(row.ecpc) || 0,
                epc: parseFloat(row.epc) || 0,
                source: source,
              }));

            debug.steps.push(`Валидных записей: ${offers.length}`);

            if (offers.length === 0) {
              resolve(NextResponse.json({
                success: false,
                error: 'Не найдено валидных записей в CSV файле',
                debug: debug,
              }, { status: 400 }));
              return;
            }

            // Вставляем данные в БД
            debug.steps.push(`Вставка ${offers.length} записей в БД`);
            await insertOffers(offers);
            debug.steps.push('Данные успешно вставлены');

            resolve(NextResponse.json({
              success: true,
              message: `Загружено ${offers.length} записей из файла ${file.name}`,
              count: offers.length,
              debug: debug,
            }));
          } catch (error: any) {
            debug.errors.push(error.message || 'Unknown error');
            debug.steps.push(`Ошибка: ${error.message}`);
            console.error('Error processing CSV:', error);
            
            resolve(NextResponse.json({
              success: false,
              error: error.message || 'Ошибка обработки CSV файла',
              debug: debug,
            }, { status: 500 }));
          }
        },
        error: (error: Error) => {
          debug.errors.push(error.message);
          resolve(NextResponse.json({
            success: false,
            error: `Ошибка парсинга CSV: ${error.message}`,
            debug: debug,
          }, { status: 400 }));
        },
      });
    });
  } catch (error: any) {
    debug.errors.push(error.message || 'Unknown error');
    debug.steps.push(`Ошибка: ${error.message}`);
    console.error('Error uploading file:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Ошибка загрузки файла',
      debug: debug,
    }, { status: 500 });
  }
}
