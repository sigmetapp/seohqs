import { NextResponse } from 'next/server';
import { updateIntegrations } from '@/lib/db-adapter';
import { storage } from '@/lib/storage';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * DELETE /api/integrations/oauth
 * Сбрасывает OAuth токены Google (удаляет авторизацию)
 */
export async function DELETE() {
  try {
    // Удаляем токены из БД
    await updateIntegrations({
      googleAccessToken: '',
      googleRefreshToken: '',
      googleTokenExpiry: '',
    });

    // Также очищаем storage для обратной совместимости
    storage.integrations = {
      ...storage.integrations,
      googleAccessToken: '',
      googleRefreshToken: '',
      googleTokenExpiry: '',
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      message: 'OAuth токены успешно удалены',
    });
  } catch (error: any) {
    console.error('Ошибка сброса OAuth токенов:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Ошибка сброса авторизации',
      },
      { status: 500 }
    );
  }
}
