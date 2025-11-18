import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-utils';
import { getTeamMembers, createTeamMember, deleteTeamMember } from '@/lib/db-users';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/auth/user/team
 * Получает список участников команды
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Пользователь не авторизован',
        },
        { status: 401 }
      );
    }

    const members = await getTeamMembers(user.id);

    return NextResponse.json({
      success: true,
      members: members.map(m => ({
        id: m.id,
        email: m.email,
        name: m.name,
        username: m.username,
        firstLogin: m.firstLogin,
        createdAt: m.createdAt,
      })),
    });
  } catch (error: any) {
    console.error('Ошибка получения участников команды:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Ошибка получения участников команды',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/auth/user/team
 * Добавляет нового участника команды
 */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Пользователь не авторизован',
        },
        { status: 401 }
      );
    }

    // Проверяем количество участников (максимум 3)
    const existingMembers = await getTeamMembers(user.id);
    if (existingMembers.length >= 3) {
      return NextResponse.json(
        {
          success: false,
          error: 'Максимальное количество участников команды - 3',
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { email, name } = body;

    if (!email) {
      return NextResponse.json(
        {
          success: false,
          error: 'Email обязателен',
        },
        { status: 400 }
      );
    }

    // Генерируем уникальный username
    const baseUsername = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
    let username = baseUsername;
    let attempts = 0;
    
    // Проверяем уникальность username (простая проверка через существующих участников)
    while (existingMembers.some(m => m.username === username) && attempts < 10) {
      username = `${baseUsername}${Math.floor(Math.random() * 1000)}`;
      attempts++;
    }

    // Генерируем случайный пароль
    const generatedPassword = randomBytes(12).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 12);
    const passwordHash = await bcrypt.hash(generatedPassword, 10);

    const newMember = await createTeamMember({
      ownerId: user.id,
      email,
      name: name || null,
      username,
      passwordHash,
      isActive: true,
      firstLogin: true,
    });

    return NextResponse.json({
      success: true,
      member: {
        id: newMember.id,
        email: newMember.email,
        name: newMember.name,
        username: newMember.username,
        firstLogin: newMember.firstLogin,
        createdAt: newMember.createdAt,
      },
      password: generatedPassword, // Возвращаем пароль только при создании
    });
  } catch (error: any) {
    console.error('Ошибка добавления участника команды:', error);
    
    // Проверяем на дубликат email
    if (error.message?.includes('unique') || error.message?.includes('duplicate')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Участник с таким email уже существует',
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Ошибка добавления участника команды',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/auth/user/team
 * Удаляет участника команды
 */
export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Пользователь не авторизован',
        },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { memberId } = body;

    if (!memberId) {
      return NextResponse.json(
        {
          success: false,
          error: 'ID участника не указан',
        },
        { status: 400 }
      );
    }

    await deleteTeamMember(memberId, user.id);

    return NextResponse.json({
      success: true,
      message: 'Участник команды удален',
    });
  } catch (error: any) {
    console.error('Ошибка удаления участника команды:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Ошибка удаления участника команды',
      },
      { status: 500 }
    );
  }
}
