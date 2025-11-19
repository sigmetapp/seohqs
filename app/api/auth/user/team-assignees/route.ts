import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-utils';
import { getTeamMembers } from '@/lib/db-users';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/auth/user/team-assignees
 * Получает список пользователей, которых можно назначить на задачи:
 * 1. Текущий пользователь (владелец)
 * 2. Участники команды владельца
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'User not authorized',
        },
        { status: 401 }
      );
    }

    // Получаем участников команды
    const teamMembers = await getTeamMembers(user.id);

    // Формируем список пользователей для назначения
    const assignees: Array<{ id: number; email: string; name?: string }> = [];

    // 1. Добавляем самого владельца
    assignees.push({
      id: user.id,
      email: user.email,
      name: user.name || undefined,
    });

    // 2. Добавляем участников команды (если у них есть user_id)
    for (const member of teamMembers) {
      if (member.userId) {
        // Если участник команды создал аккаунт (есть user_id), добавляем его
        assignees.push({
          id: member.userId,
          email: member.email,
          name: member.name || undefined,
        });
      }
    }

    return NextResponse.json({
      success: true,
      users: assignees,
    });
  } catch (error: any) {
    console.error('Error fetching team assignees:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error fetching team assignees',
      },
      { status: 500 }
    );
  }
}
