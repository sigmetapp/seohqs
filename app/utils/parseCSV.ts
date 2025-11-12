import Papa from 'papaparse';

export interface AffiliateOffer {
  name: string;
  topic: string;
  country: string;
  model: string;
  cr: number;
  ecpc: number;
  epc: number;
}

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

export const parseCSVFiles = async (): Promise<AffiliateOffer[]> => {
  const files = ['admitad.csv', 'cj.csv', 'advertise.csv', 'clickbank.csv'];
  const allOffers: AffiliateOffer[] = [];

  for (const file of files) {
    try {
      // В Next.js файлы из public доступны по корневому пути
      // Используем абсолютный URL для надежности
      const baseUrl = typeof window !== 'undefined' 
        ? window.location.origin 
        : '';
      const url = `${baseUrl}/data/${file}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'text/csv,text/plain,*/*',
        },
      });
      
      if (!response.ok) {
        console.warn(`File ${url} not found (${response.status} ${response.statusText}), skipping...`);
        continue;
      }
      
      const text = await response.text();
      
      if (!text || text.trim().length === 0) {
        console.warn(`File ${file} is empty, skipping...`);
        continue;
      }
      
      const parsed = Papa.parse(text, {
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
            allOffers.push(offer);
          }
        });
      }
    } catch (error) {
      console.error(`Error parsing ${file}:`, error);
      // Продолжаем обработку других файлов даже если один не найден
    }
  }

  return allOffers;
};
