/**
 * Google GSC Accounts Helper
 * 
 * This module provides functions to manage multiple Google Search Console accounts per user.
 * It works with Supabase Auth (auth.users) for user identification.
 * 
 * Database Schema:
 * - google_gsc_accounts: Stores multiple Google accounts per user (unlike gsc_integrations)
 * 
 * Setup Requirements:
 * 1. Run migration: 020_google_gsc_accounts_table_supabase.sql
 * 2. Ensure Supabase Auth is configured
 * 
 * Usage:
 * - GET /api/integrations/google/accounts - Get all connected accounts for current user
 * - POST /api/integrations/google/disconnect - Disconnect an account
 */

import { supabase } from './supabase';
import { getSupabaseAuthUserId } from './gsc-integrations';

export interface GoogleGSCAccount {
  id: string; // UUID
  user_id: string; // UUID from auth.users
  google_email: string;
  google_user_id: string;
  created_at: string;
  updated_at: string;
  source: string;
  is_active: boolean;
}

/**
 * Get all active Google GSC accounts for a user
 * 
 * @param userId - The UUID of the authenticated user from Supabase Auth
 * @returns Array of active Google GSC accounts
 */
export async function getGoogleGSCAccounts(userId: string): Promise<GoogleGSCAccount[]> {
  if (!supabase) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('google_gsc_accounts')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      if (error.code === '42P01' || error.message.includes('does not exist')) {
        // Table doesn't exist yet, return empty array
        console.debug('Table google_gsc_accounts does not exist yet');
        return [];
      }
      console.error('Error fetching Google GSC accounts:', error);
      return [];
    }

    return (data || []).map((account: any) => ({
      id: account.id,
      user_id: account.user_id,
      google_email: account.google_email,
      google_user_id: account.google_user_id,
      created_at: account.created_at,
      updated_at: account.updated_at,
      source: account.source || 'gsc',
      is_active: account.is_active !== false,
    }));
  } catch (error) {
    console.error('Error fetching Google GSC accounts:', error);
    return [];
  }
}

/**
 * Upsert Google GSC account for a user
 * Creates a new account or updates existing one if it already exists
 * 
 * @param userId - The UUID of the authenticated user from Supabase Auth
 * @param accountData - The account data to save
 * @returns The saved Google GSC account
 */
export async function upsertGoogleGSCAccount(
  userId: string,
  accountData: {
    google_email: string;
    google_user_id: string;
    source?: string;
  }
): Promise<GoogleGSCAccount> {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  try {
    const { data, error } = await supabase
      .from('google_gsc_accounts')
      .upsert(
        {
          user_id: userId,
          google_email: accountData.google_email,
          google_user_id: accountData.google_user_id,
          source: accountData.source || 'gsc',
          is_active: true,
        },
        {
          onConflict: 'user_id,google_user_id',
          ignoreDuplicates: false,
        }
      )
      .select()
      .single();

    if (error) {
      console.error('Error upserting Google GSC account:', error);
      throw new Error(`Failed to save Google GSC account: ${error.message}`);
    }

    if (!data) {
      throw new Error('Failed to save Google GSC account: no data returned');
    }

    return {
      id: data.id,
      user_id: data.user_id,
      google_email: data.google_email,
      google_user_id: data.google_user_id,
      created_at: data.created_at,
      updated_at: data.updated_at,
      source: data.source || 'gsc',
      is_active: data.is_active !== false,
    };
  } catch (error: any) {
    throw error;
  }
}

/**
 * Update Google GSC account (e.g., update email or deactivate)
 * 
 * @param accountId - The UUID of the account
 * @param userId - The UUID of the authenticated user from Supabase Auth
 * @param updates - The fields to update
 * @returns The updated Google GSC account
 */
export async function updateGoogleGSCAccount(
  accountId: string,
  userId: string,
  updates: {
    google_email?: string;
    is_active?: boolean;
  }
): Promise<GoogleGSCAccount | null> {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  try {
    const { data, error } = await supabase
      .from('google_gsc_accounts')
      .update(updates)
      .eq('id', accountId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found - this is OK
        return null;
      }
      console.error('Error updating Google GSC account:', error);
      throw new Error(`Failed to update Google GSC account: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    return {
      id: data.id,
      user_id: data.user_id,
      google_email: data.google_email,
      google_user_id: data.google_user_id,
      created_at: data.created_at,
      updated_at: data.updated_at,
      source: data.source || 'gsc',
      is_active: data.is_active !== false,
    };
  } catch (error: any) {
    throw error;
  }
}

/**
 * Deactivate (soft delete) Google GSC account
 * 
 * @param accountId - The UUID of the account
 * @param userId - The UUID of the authenticated user from Supabase Auth
 * @returns True if deactivated, false otherwise
 */
export async function deactivateGoogleGSCAccount(
  accountId: string,
  userId: string
): Promise<boolean> {
  try {
    const updated = await updateGoogleGSCAccount(accountId, userId, { is_active: false });
    return updated !== null;
  } catch (error: any) {
    console.error('Error deactivating Google GSC account:', error);
    throw error;
  }
}

/**
 * Get Google GSC account by ID (for verification)
 * 
 * @param accountId - The UUID of the account
 * @param userId - The UUID of the authenticated user from Supabase Auth
 * @returns The Google GSC account if found and belongs to user, null otherwise
 */
export async function getGoogleGSCAccountById(
  accountId: string,
  userId: string
): Promise<GoogleGSCAccount | null> {
  if (!supabase) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('google_gsc_accounts')
      .select('*')
      .eq('id', accountId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found - this is OK
        return null;
      }
      console.error('Error fetching Google GSC account:', error);
      return null;
    }

    if (!data) {
      return null;
    }

    return {
      id: data.id,
      user_id: data.user_id,
      google_email: data.google_email,
      google_user_id: data.google_user_id,
      created_at: data.created_at,
      updated_at: data.updated_at,
      source: data.source || 'gsc',
      is_active: data.is_active !== false,
    };
  } catch (error) {
    console.error('Error fetching Google GSC account:', error);
    return null;
  }
}
