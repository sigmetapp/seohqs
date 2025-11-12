import { NextRequest, NextResponse } from 'next/server';
import Papa from 'papaparse';
import { insertOffers, clearAllOffers } from '@/lib/db-adapter';
import { AffiliateOffer } from '@/lib/db';

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

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      );
    }

    const allOffers: Omit<AffiliateOffer, 'id' | 'createdAt'>[] = [];
    let processedFiles = 0;

    // Очищаем старые данные перед загрузкой новых
    await clearAllOffers();

    for (const file of files) {
      if (!file.name.toLowerCase().endsWith('.csv')) {
        continue;
      }

      try {
        const text = await file.text();
        const parsed = Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
        });

        // Определяем источник из имени файла
        const source = file.name.replace('.csv', '').toLowerCase();

        if (parsed.data && Array.isArray(parsed.data)) {
          parsed.data.forEach((row: any) => {
            // Нормализуем названия колонок (case-insensitive)
            const rowLower = Object.keys(row).reduce((acc, key) => {
              acc[key.toLowerCase()] = row[key];
              return acc;
            }, {} as Record<string, any>);

            const offer: Omit<AffiliateOffer, 'id' | 'createdAt'> = {
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
              source: source,
            };

            // Добавляем только если есть хотя бы название
            if (offer.name !== 'N/A') {
              allOffers.push(offer);
            }
          });
        }

        processedFiles++;
      } catch (error) {
        console.error(`Error parsing file ${file.name}:`, error);
      }
    }

    // Сохраняем все офферы в БД
    if (allOffers.length > 0) {
      await insertOffers(allOffers);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${processedFiles} file(s)`,
      offersCount: allOffers.length,
      filesProcessed: processedFiles,
    });
  } catch (error) {
    console.error('Error uploading files:', error);
    return NextResponse.json(
      {
        error: 'Failed to upload files',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
