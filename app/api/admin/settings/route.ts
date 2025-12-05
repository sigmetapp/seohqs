import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-utils';
import { getSetting, setSetting } from '@/lib/db-settings';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ADMIN_EMAIL = 'admin@buylink.pro';

async function isAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  return user?.email === ADMIN_EMAIL;
}

/**
 * GET /api/admin/settings
 * Получает настройки (только для администратора)
 */
export async function GET(request: Request) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json(
        { success: false, error: 'Доступ запрещен' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (key) {
      const setting = await getSetting(key);
      return NextResponse.json({
        success: true,
        setting: setting || null,
      });
    }

    // Если ключ не указан, возвращаем все настройки OpenAI
    const openaiApiKey = await getSetting('openai_api_key');
    const openaiAssistantId = await getSetting('openai_assistant_id');
    const outlineAssistantId = await getSetting('openai_outline_assistant_id');
    const sectionAssistantId = await getSetting('openai_section_assistant_id');

    return NextResponse.json({
      success: true,
      settings: {
        openaiApiKey: openaiApiKey?.value || null,
        openaiAssistantId: openaiAssistantId?.value || null,
        outlineAssistantId: outlineAssistantId?.value || null,
        sectionAssistantId: sectionAssistantId?.value || null,
      },
    });
  } catch (error: any) {
    console.error('Ошибка получения настроек:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Ошибка получения настроек',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/settings
 * Сохраняет настройки (только для администратора)
 */
export async function POST(request: Request) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json(
        { success: false, error: 'Доступ запрещен' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { openaiApiKey, openaiAssistantId, outlineAssistantId, sectionAssistantId } = body;

    const settings: any = {};

    if (openaiApiKey !== undefined) {
      await setSetting(
        'openai_api_key',
        openaiApiKey || '',
        'OpenAI API Key для работы с Assistants API'
      );
      settings.openaiApiKey = openaiApiKey;
    }

    if (openaiAssistantId !== undefined) {
      await setSetting(
        'openai_assistant_id',
        openaiAssistantId || '',
        'ID ассистента OpenAI для генерации контента (устаревшее)'
      );
      settings.openaiAssistantId = openaiAssistantId;
    }

    if (outlineAssistantId !== undefined) {
      await setSetting(
        'openai_outline_assistant_id',
        outlineAssistantId || '',
        'ID ассистента OpenAI для генерации структуры статей (Outline Assistant)'
      );
      settings.outlineAssistantId = outlineAssistantId;
    }

    if (sectionAssistantId !== undefined) {
      await setSetting(
        'openai_section_assistant_id',
        sectionAssistantId || '',
        'ID ассистента OpenAI для генерации секций статей (Content Section Writer)'
      );
      settings.sectionAssistantId = sectionAssistantId;
    }

    return NextResponse.json({
      success: true,
      message: 'Настройки сохранены',
      settings,
    });
  } catch (error: any) {
    console.error('Ошибка сохранения настроек:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Ошибка сохранения настроек',
      },
      { status: 500 }
    );
  }
}
