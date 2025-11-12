import { NextResponse } from 'next/server';
import { getAllOffers } from '@/lib/db-adapter';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const debug: any = {
    timestamp: new Date().toISOString(),
    env: {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      hasSupabaseServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      hasPostgresUrl: !!process.env.POSTGRES_URL,
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      isVercel: !!process.env.VERCEL,
    },
    steps: [],
    errors: [],
  };

  try {
    debug.steps.push('Начало получения данных');
    
    const offers = await getAllOffers();
    debug.steps.push(`Получено ${offers.length} записей`);
    
    // Преобразуем данные для фронтенда (убираем created_at, добавляем createdAt если нужно)
    const formattedOffers = offers.map((offer: any) => ({
      id: offer.id,
      name: offer.name,
      topic: offer.topic,
      country: offer.country,
      model: offer.model,
      cr: typeof offer.cr === 'string' ? parseFloat(offer.cr) : offer.cr,
      ecpc: typeof offer.ecpc === 'string' ? parseFloat(offer.ecpc) : offer.ecpc,
      epc: typeof offer.epc === 'string' ? parseFloat(offer.epc) : offer.epc,
    }));

    return NextResponse.json({
      success: true,
      offers: formattedOffers,
      count: formattedOffers.length,
      debug: debug,
    });
  } catch (error: any) {
    debug.errors.push(error.message || 'Unknown error');
    debug.steps.push(`Ошибка: ${error.message}`);
    console.error('Error fetching data:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Ошибка получения данных',
      offers: [],
      count: 0,
      debug: debug,
    }, { status: 500 });
  }
}
