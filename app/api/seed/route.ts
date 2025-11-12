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
  const debug: any = {
    timestamp: new Date().toISOString(),
    env: {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      hasSupabaseServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    },
    steps: [],
    errors: [],
  };

  try {
    debug.steps.push('Начало загрузки тестовых данных');
    debug.steps.push(`Подготовлено ${testData.length} записей для вставки`);
    
    // Очищаем старые данные
    debug.steps.push('Очистка старых данных');
    try {
      await clearAllOffers();
      debug.steps.push('Старые данные очищены');
    } catch (clearError: any) {
      debug.steps.push(`Предупреждение при очистке: ${clearError.message}`);
      // Продолжаем даже если очистка не удалась
    }
    
    // Вставляем тестовые данные
    debug.steps.push(`Вставка ${testData.length} записей`);
    await insertOffers(testData);
    debug.steps.push('Данные успешно вставлены');
    
    // Проверяем, что данные действительно вставлены
    debug.steps.push('Проверка вставленных данных');
    const { getAllOffers } = await import('@/lib/db-adapter');
    const insertedOffers = await getAllOffers();
    debug.steps.push(`Проверка завершена: найдено ${insertedOffers.length} записей в БД`);
    
    return NextResponse.json({
      success: true,
      message: `Загружено ${testData.length} тестовых записей. В базе найдено: ${insertedOffers.length} записей`,
      count: insertedOffers.length,
      debug: debug,
    });
  } catch (error: any) {
    debug.errors.push(error.message || 'Unknown error');
    debug.steps.push(`Ошибка: ${error.message}`);
    console.error('Error seeding data:', error);
    
    // Проверяем, есть ли проблема с таблицей
    const isTableMissing = error.message?.includes('does not exist') || 
                          error.message?.includes('42P01') ||
                          error.code === '42P01';
    
    return NextResponse.json({
      success: false,
      error: isTableMissing 
        ? 'Таблица affiliate_offers не существует. Пожалуйста, создайте её в Supabase. См. SUPABASE_SETUP.md'
        : error.message || 'Ошибка загрузки тестовых данных',
      debug: debug,
      tableMissing: isTableMissing,
    }, { status: 500 });
  }
}
