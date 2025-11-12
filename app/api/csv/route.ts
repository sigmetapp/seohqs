import { NextResponse } from 'next/server';
import { readFile, access } from 'fs/promises';
import { join } from 'path';
import { constants } from 'fs';
import Papa from 'papaparse';
import { AffiliateOffer } from '../../utils/parseCSV';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const parseNumber = (value: string | undefined): number => {
  if (!value || value.trim() === '' || value === 'N/A' || value === '-') {
    return 0;
  }
  const parsed = parseFloat(value.replace(/,/g, '').trim());
  return isNaN(parsed) ? 0 : parsed;
};

const normalizeField = (value: string | undefined): string => {
  if (!value || value.trim() === '') {
    return 'N/A';
  }
  return value.trim();
};

async function processFileContent(fileContent: string, offers: AffiliateOffer[]) {
  const parsed = Papa.parse(fileContent, {
    header: true,
    skipEmptyLines: true,
  });

  if (parsed.data && Array.isArray(parsed.data)) {
    parsed.data.forEach((row: any) => {
      // Нормализуем названия колонок (case-insensitive)
      const rowLower = Object.keys(row).reduce((acc, key) => {
        acc[key.toLowerCase()] = row[key];
        return acc;
      }, {} as Record<string, any>);

      const offer: AffiliateOffer = {
        name: normalizeField(
          rowLower['name'] || rowLower['название'] || rowLower['program'] || rowLower['program name']
        ),
        topic: normalizeField(
          rowLower['topic'] || rowLower['тематика'] || rowLower['category'] || rowLower['category name']
        ),
        country: normalizeField(
          rowLower['country'] || rowLower['страна'] || rowLower['geo'] || rowLower['geography']
        ),
        model: normalizeField(
          rowLower['model'] || rowLower['модель'] || rowLower['commission type'] || rowLower['commission_type']
        ),
        cr: parseNumber(
          rowLower['cr'] || rowLower['conversion rate'] || rowLower['conversion_rate']
        ),
        ecpc: parseNumber(
          rowLower['ecpc'] || rowLower['effective cpc'] || rowLower['effective_cpc']
        ),
        epc: parseNumber(
          rowLower['epc'] || rowLower['earnings per click'] || rowLower['earnings_per_click']
        ),
      };

      // Добавляем только если есть хотя бы название
      if (offer.name !== 'N/A') {
        offers.push(offer);
      }
    });
  }
}

export async function GET(request: Request) {
  try {
    const files = ['admitad.csv', 'cj.csv', 'advertise.csv', 'clickbank.csv'];
    const allOffers: AffiliateOffer[] = [];
    const cwd = process.cwd();

    for (const file of files) {
      try {
        const filePath = join(cwd, 'public', 'data', file);
        
        // Проверяем доступность файла
        try {
          await access(filePath, constants.F_OK);
        } catch (accessError) {
          console.warn(`File not found: ${filePath}, trying alternative path...`);
          // Пробуем альтернативный путь (для некоторых окружений)
          const altPath = join(cwd, 'data', file);
          try {
            await access(altPath, constants.F_OK);
            const fileContent = await readFile(altPath, 'utf-8');
            await processFileContent(fileContent, allOffers);
            continue;
          } catch {
            console.error(`File ${file} not found in both locations`);
            continue;
          }
        }
        
        const fileContent = await readFile(filePath, 'utf-8');
        await processFileContent(fileContent, allOffers);
      } catch (error) {
        console.error(`Error parsing ${file}:`, error);
        // Продолжаем обработку других файлов даже если один не найден
      }
    }

    return NextResponse.json(allOffers, { status: 200 });
  } catch (error) {
    console.error('Error in CSV API route:', error);
    return NextResponse.json(
      { error: 'Failed to load CSV data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
