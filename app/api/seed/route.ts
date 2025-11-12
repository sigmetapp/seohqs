import { NextResponse } from 'next/server';
import { insertOffers, clearAllOffers } from '@/lib/db-adapter';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Тестовые данные
const testData = [
  { name: 'Test Offer 1', topic: 'Finance', country: 'US', model: 'CPA', cr: 5.5, ecpc: 0.25, epc: 0.30, source: 'test' },
  { name: 'Test Offer 2', topic: 'Health', country: 'UK', model: 'CPS', cr: 3.2, ecpc: 0.18, epc: 0.22, source: 'test' },
  { name: 'Test Offer 3', topic: 'Tech', country: 'DE', model: 'CPA', cr: 7.1, ecpc: 0.35, epc: 0.40, source: 'test' },
  { name: 'Test Offer 4', topic: 'Finance', country: 'FR', model: 'CPS', cr: 4.8, ecpc: 0.22, epc: 0.28, source: 'test' },
  { name: 'Test Offer 5', topic: 'Health', country: 'US', model: 'CPA', cr: 6.3, ecpc: 0.30, epc: 0.35, source: 'test' },
];

export async function POST() {
  try {
    // Очищаем старые данные
    await clearAllOffers();
    
    // Вставляем тестовые данные
    await insertOffers(testData);
    
    return NextResponse.json({
      success: true,
      message: `Загружено ${testData.length} тестовых записей`,
      count: testData.length,
    });
  } catch (error: any) {
    console.error('Error seeding data:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Ошибка загрузки тестовых данных',
    }, { status: 500 });
  }
}
