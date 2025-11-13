// Google Accounts functions for PostgreSQL
// This file contains functions for managing Google accounts

import { getPostgresClient, isPostgresAvailable } from './postgres-client';
import { GoogleAccount } from './types';

export async function getAllGoogleAccounts(): Promise<GoogleAccount[]> {
  if (!isPostgresAvailable()) {
    return [];
  }

  try {
    const db = await getPostgresClient();
    const result = await db.query('SELECT * FROM google_accounts ORDER BY created_at DESC');
    return result.rows.map((row: any) => ({
      id: row.id,
      email: row.email,
      googleAccessToken: row.google_access_token || '',
      googleRefreshToken: row.google_refresh_token || '',
      googleTokenExpiry: row.google_token_expiry || '',
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } catch (error: any) {
    if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
      // Таблица не существует, возвращаем пустой массив
      return [];
    }
    console.error('Error fetching Google accounts:', error);
    return [];
  }
}

export async function getGoogleAccountById(id: number): Promise<GoogleAccount | null> {
  if (!isPostgresAvailable()) {
    return null;
  }

  try {
    const db = await getPostgresClient();
    const result = await db.query('SELECT * FROM google_accounts WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      email: row.email,
      googleAccessToken: row.google_access_token || '',
      googleRefreshToken: row.google_refresh_token || '',
      googleTokenExpiry: row.google_token_expiry || '',
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  } catch (error: any) {
    console.error('Error fetching Google account:', error);
    return null;
  }
}

export async function createGoogleAccount(account: Omit<GoogleAccount, 'id' | 'createdAt' | 'updatedAt'>): Promise<GoogleAccount> {
  if (!isPostgresAvailable()) {
    throw new Error('PostgreSQL database not configured');
  }

  try {
    const db = await getPostgresClient();
    const result = await db.query(
      `INSERT INTO google_accounts (email, google_access_token, google_refresh_token, google_token_expiry, created_at, updated_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [
        account.email,
        account.googleAccessToken || null,
        account.googleRefreshToken || null,
        account.googleTokenExpiry || null,
      ]
    );

    const row = result.rows[0];
    return {
      id: row.id,
      email: row.email,
      googleAccessToken: row.google_access_token || '',
      googleRefreshToken: row.google_refresh_token || '',
      googleTokenExpiry: row.google_token_expiry || '',
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  } catch (error: any) {
    throw error;
  }
}

export async function updateGoogleAccount(id: number, account: Partial<Omit<GoogleAccount, 'id' | 'createdAt' | 'updatedAt'>>): Promise<GoogleAccount> {
  if (!isPostgresAvailable()) {
    throw new Error('PostgreSQL database not configured');
  }

  try {
    const db = await getPostgresClient();
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (account.email !== undefined) {
      updates.push(`email = $${paramIndex++}`);
      values.push(account.email);
    }
    if (account.googleAccessToken !== undefined) {
      updates.push(`google_access_token = $${paramIndex++}`);
      values.push(account.googleAccessToken || null);
    }
    if (account.googleRefreshToken !== undefined) {
      updates.push(`google_refresh_token = $${paramIndex++}`);
      values.push(account.googleRefreshToken || null);
    }
    if (account.googleTokenExpiry !== undefined) {
      updates.push(`google_token_expiry = $${paramIndex++}`);
      values.push(account.googleTokenExpiry || null);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    values.push(id);
    const query = `UPDATE google_accounts SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await db.query(query, values);

    if (result.rows.length === 0) {
      throw new Error('Google account not found');
    }

    const row = result.rows[0];
    return {
      id: row.id,
      email: row.email,
      googleAccessToken: row.google_access_token || '',
      googleRefreshToken: row.google_refresh_token || '',
      googleTokenExpiry: row.google_token_expiry || '',
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  } catch (error: any) {
    throw error;
  }
}

export async function deleteGoogleAccount(id: number): Promise<void> {
  if (!isPostgresAvailable()) {
    throw new Error('PostgreSQL database not configured');
  }

  try {
    const db = await getPostgresClient();
    await db.query('DELETE FROM google_accounts WHERE id = $1', [id]);
  } catch (error: any) {
    throw error;
  }
}
