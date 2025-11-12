import { NextResponse } from 'next/server';
import { storage } from '@/lib/storage';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const siteId = parseInt(params.id);
    const sitePostbacks = storage.postbacks.filter((p) => p.siteId === siteId);

    return NextResponse.json({
      success: true,
      postbacks: sitePostbacks.sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Ошибка получения постбеков',
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const siteId = parseInt(params.id);
    const body = await request.json();

    const newPostback = {
      id: storage.counters.postbackId++,
      siteId,
      network: body.network || 'unknown',
      event: body.event || 'conversion',
      amount: parseFloat(body.amount) || 0,
      currency: body.currency || 'USD',
      date: new Date().toISOString(),
      data: body.data || {},
    };

    storage.postbacks.push(newPostback);

    return NextResponse.json({
      success: true,
      postback: newPostback,
      message: 'Постбек принят',
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Ошибка обработки постбека',
      },
      { status: 500 }
    );
  }
}
