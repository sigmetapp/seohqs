import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// CORS headers для разрешения запросов с любых доменов
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

/**
 * OPTIONS /api/embed/log
 * Обработка CORS preflight запросов
 */
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * POST /api/embed/log
 * Логирование вызова embed скрипта
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { scriptName } = body;

    if (!scriptName || (scriptName !== 'tabsgen.js' && scriptName !== 'slot.js')) {
      return NextResponse.json(
        { success: false, error: 'Invalid script name' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Получаем информацию о запросе
    const referer = request.headers.get('referer') || request.headers.get('origin') || null;
    const userAgent = request.headers.get('user-agent') || null;
    const forwarded = request.headers.get('x-forwarded-for');
    const ipAddress = forwarded ? forwarded.split(',')[0].trim() : 
                      request.headers.get('x-real-ip') || 
                      null;

    if (!supabase) {
      console.error('Supabase client not initialized');
      return NextResponse.json(
        { success: false, error: 'Database not available' },
        { status: 500, headers: corsHeaders }
      );
    }

    // Вставляем лог в базу данных
    const logData = {
      script_name: scriptName,
      referer: referer,
      user_agent: userAgent,
      ip_address: ipAddress,
    };
    
    console.log('Inserting log:', logData);
    
    const { data, error } = await supabase
      .from('embed_script_logs')
      .insert(logData)
      .select();

    if (error) {
      console.error('Error inserting log:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to log request', details: error.message },
        { status: 500, headers: corsHeaders }
      );
    }
    
    console.log('Log inserted successfully:', data);

    return NextResponse.json({ success: true }, { headers: corsHeaders });
  } catch (error: any) {
    console.error('Error in embed log endpoint:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
