/**
 * Google Search Console Integrations Helper
 * 
 * This module provides functions to manage GSC integrations stored in Supabase.
 * It works with Supabase Auth (auth.users) for user identification.
 * 
 * Database Schema:
 * - gsc_integrations: Stores OAuth tokens per user (one per user)
 * - gsc_sites: Stores sites fetched from GSC API (many per integration)
 * 
 * Setup Requirements:
 * 1. Run migrations: 018_gsc_integrations_table_supabase.sql and 019_gsc_sites_table_supabase.sql
 * 2. Ensure Supabase Auth is configured and users are authenticated via Supabase Auth
 * 3. The OAuth callback will automatically save integrations when users connect their GSC account
 * 
 * Usage:
 * - GET /api/gsc-integration - Get current user's integration status
 * - DELETE /api/gsc-integration - Disconnect integration
 * - GET /api/gsc-integration/sites - Get sites for integration (with ?refresh=true to fetch from API)
 */

import { supabase } from './supabase';
import type { GSCIntegration, GSCSite } from './types';

/**
 * Check if gsc_integrations table exists
 * Returns true if table exists, false otherwise
 */
async function checkGSCIntegrationsTableExists(): Promise<boolean> {
  if (!supabase) {
    return false;
  }

  try {
    const { error } = await supabase
      .from('gsc_integrations')
      .select('id')
      .limit(1);

    // If no error, table exists
    return !error;
  } catch (error: any) {
    // Check if it's a "table doesn't exist" error
    if (error?.code === '42P01' || 
        error?.message?.includes('does not exist') || 
        error?.message?.includes('schema cache')) {
      return false;
    }
    // Other error - assume table doesn't exist or there's a problem
    return false;
  }
}

/**
 * Get the current Supabase Auth user ID from the request
 * This function extracts the user ID from the Supabase session or maps from JWT auth
 * 
 * IMPORTANT: This function tries multiple methods:
 * 1. First tries to get Supabase Auth session (if Supabase Auth is configured)
 * 2. Falls back to JWT auth system and tries to find matching Supabase Auth user by email
 * 3. Returns null if neither method works
 * 
 * @param request - Optional Request object to extract cookies/headers from
 * @returns The UUID of the authenticated user, or null if not authenticated
 */
export async function getSupabaseAuthUserId(request?: Request): Promise<string | null> {
  if (!supabase) {
    console.warn('Supabase client not initialized');
    // Try to get user from JWT auth system as fallback
    return await getSupabaseAuthUserIdFromJWT();
  }

  try {
    // If we have a request, try to get the session from cookies or headers
    if (request) {
      // Try Authorization header first (for API calls with Bearer token)
      const authHeader = request.headers.get('authorization');
      if (authHeader) {
        const userId = await getSupabaseAuthUserIdFromToken(authHeader);
        if (userId) return userId;
      }

      // Try to get Supabase session from cookies
      // Supabase stores session in cookies that need to be passed to a new client instance
      // For server-side usage, we need to create a client with the request cookies
      const { cookies } = await import('next/headers');
      const cookieStore = await cookies();
      
      // Get all cookies that might contain Supabase session
      // Supabase typically uses cookies like 'sb-<project-ref>-auth-token'
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (supabaseUrl && supabaseAnonKey) {
        // Try to get session using the Supabase client
        // Note: For proper server-side cookie handling, you should use @supabase/ssr's createServerClient
        // This is a simplified version that works if the session is available
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user?.id) {
            return session.user.id;
          }
        } catch (sessionError) {
          // If getSession fails, try alternative methods
          console.debug('Could not get session from Supabase client:', sessionError);
        }
      }
    }

    // Fallback: try to get session from Supabase client
    // Note: This only works if the client was initialized with a session
    // For server-side usage, this typically won't work without proper cookie handling
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        return session.user.id;
      }
    } catch (error) {
      // This is expected if Supabase Auth is not configured or session is not available
      console.debug('No Supabase Auth session available, trying JWT fallback:', error);
    }

    // Fallback: try to get user from JWT auth system and find matching Supabase Auth user
    return await getSupabaseAuthUserIdFromJWT();
  } catch (error) {
    console.error('Error getting Supabase Auth user ID:', error);
    // Try JWT fallback even on error
    return await getSupabaseAuthUserIdFromJWT();
  }
}

/**
 * Get Supabase Auth user ID from JWT auth system
 * This function gets the current user from JWT and tries to find matching Supabase Auth user by email
 * 
 * @returns The UUID of the Supabase Auth user, or null if not found
 */
async function getSupabaseAuthUserIdFromJWT(): Promise<string | null> {
  try {
    // Get current user from JWT auth system
    const { getCurrentUser } = await import('./auth-utils');
    const user = await getCurrentUser();
    
    if (!user || !user.email) {
      console.debug('[GSC] No JWT user found');
      return null;
    }

    // If Supabase is not configured, return null
    if (!supabase) {
      console.debug('[GSC] Supabase not configured');
      return null;
    }

    // Check if we have service role key (required for admin API)
    const hasServiceRoleKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!hasServiceRoleKey) {
      console.debug('[GSC] No service role key available, cannot use admin API');
      return null;
    }

    // Try to find Supabase Auth user by email using admin API
    // Note: This requires service role key
    try {
      const { data: authUsers, error } = await supabase.auth.admin.listUsers();
      if (error) {
        console.debug('[GSC] Admin API error:', error.message);
        return null;
      }

      // Find user by email (case-insensitive)
      const authUser = authUsers?.users?.find(u => 
        u.email?.toLowerCase() === user.email.toLowerCase()
      );
      
      if (authUser?.id) {
        console.debug('[GSC] Found Supabase Auth user:', authUser.id, 'for email:', user.email);
        return authUser.id;
      } else {
        console.debug('[GSC] No Supabase Auth user found for email:', user.email);
      }
    } catch (adminError: any) {
      // Admin API might not be available, this is OK
      console.debug('[GSC] Admin API exception:', adminError?.message || adminError);
    }

    return null;
  } catch (error: any) {
    console.debug('[GSC] Error getting Supabase Auth user ID from JWT:', error?.message || error);
    return null;
  }
}

/**
 * Get the current Supabase Auth user ID from a request with authorization header
 * This is an alternative method that works with API routes
 * 
 * @param authHeader - The Authorization header value (Bearer token)
 * @returns The UUID of the authenticated user, or null if not authenticated
 */
export async function getSupabaseAuthUserIdFromToken(authHeader: string | null): Promise<string | null> {
  if (!supabase || !authHeader) {
    return null;
  }

  try {
    // Extract the token from "Bearer <token>" format
    const token = authHeader.replace(/^Bearer\s+/i, '');
    
    if (!token) {
      return null;
    }

    // Verify the token and get the user
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user?.id) {
      return null;
    }

    return user.id;
  } catch (error) {
    console.error('Error getting Supabase Auth user ID from token:', error);
    return null;
  }
}

/**
 * Get GSC integration for the current user
 * 
 * @param userId - The UUID of the authenticated user from Supabase Auth
 * @returns The GSC integration if found, or null
 */
export async function getGSCIntegration(userId: string): Promise<GSCIntegration | null> {
  if (!supabase) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('gsc_integrations')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found - this is OK
        return null;
      }
      // Check if table doesn't exist (42P01 is PostgreSQL error code for undefined table)
      if (error.code === '42P01' || error.message?.includes('does not exist') || error.message?.includes('schema cache')) {
        console.debug('[GSC] Table gsc_integrations does not exist yet');
        return null;
      }
      console.error('Error fetching GSC integration:', error);
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
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  } catch (error: any) {
    // Handle table not found errors gracefully
    if (error?.code === '42P01' || error?.message?.includes('does not exist') || error?.message?.includes('schema cache')) {
      console.debug('[GSC] Table gsc_integrations does not exist yet');
      return null;
    }
    console.error('Error fetching GSC integration:', error);
    return null;
  }
}

/**
 * Upsert GSC integration for a user
 * Creates a new integration or updates existing one if it already exists
 * 
 * IMPORTANT: This function saves the user's Google email (google_email) to the table
 * This serves as proof that the user's email is integrated with the site
 * 
 * @param userId - The UUID of the authenticated user from Supabase Auth
 * @param integrationData - The integration data to save (includes google_email)
 * @returns The saved GSC integration
 */
export async function upsertGSCIntegration(
  userId: string,
  integrationData: {
    google_email: string;
    google_user_id: string;
    access_token: string;
    refresh_token: string;
  }
): Promise<GSCIntegration> {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  // Check if table exists first
  const tableExists = await checkGSCIntegrationsTableExists();
  if (!tableExists) {
    const errorMsg = `Table gsc_integrations does not exist. Please run migration: migrations/018_gsc_integrations_table_supabase.sql\n\n` +
      `You can create the table manually in Supabase SQL Editor or use the migration endpoint: /api/migrations/create-gsc-integrations-table`;
    console.error('[GSC]', errorMsg);
    throw new Error(errorMsg);
  }

  try {
    // Save integration with user's email
    // The google_email field stores the user's Google account email as proof of integration
    const { data, error } = await supabase
      .from('gsc_integrations')
      .upsert(
        {
          user_id: userId,
          google_email: integrationData.google_email, // User's email is saved here
          google_user_id: integrationData.google_user_id,
          access_token: integrationData.access_token,
          refresh_token: integrationData.refresh_token,
        },
        {
          onConflict: 'user_id',
          ignoreDuplicates: false,
        }
      )
      .select()
      .single();

    if (error) {
      console.error('Error upserting GSC integration:', error);
      throw new Error(`Failed to save GSC integration: ${error.message}`);
    }

    if (!data) {
      throw new Error('Failed to save GSC integration: no data returned');
    }

    console.log(`[GSC] Integration saved successfully for user ${userId} with email: ${data.google_email}`);

    return {
      id: data.id,
      user_id: data.user_id,
      google_email: data.google_email,
      google_user_id: data.google_user_id,
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  } catch (error: any) {
    // Re-throw with more context if it's a table not found error
    if (error?.code === '42P01' || 
        error?.message?.includes('does not exist') || 
        error?.message?.includes('schema cache')) {
      const errorMsg = `Table gsc_integrations does not exist. Please run migration: migrations/018_gsc_integrations_table_supabase.sql`;
      console.error('[GSC]', errorMsg);
      throw new Error(errorMsg);
    }
    throw error;
  }
}

/**
 * Delete GSC integration for a user
 * 
 * @param userId - The UUID of the authenticated user from Supabase Auth
 * @returns True if deleted, false otherwise
 */
export async function deleteGSCIntegration(userId: string): Promise<boolean> {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  try {
    const { error } = await supabase
      .from('gsc_integrations')
      .delete()
      .eq('user_id', userId);

    if (error) {
      // Check if table doesn't exist - this is OK, nothing to delete
      if (error.code === '42P01' || error.message?.includes('does not exist') || error.message?.includes('schema cache')) {
        console.debug('[GSC] Table gsc_integrations does not exist, nothing to delete');
        return true; // Return true since there's nothing to delete
      }
      console.error('Error deleting GSC integration:', error);
      throw new Error(`Failed to delete GSC integration: ${error.message}`);
    }

    return true;
  } catch (error: any) {
    // Handle table not found errors gracefully
    if (error?.code === '42P01' || error?.message?.includes('does not exist') || error?.message?.includes('schema cache')) {
      console.debug('[GSC] Table gsc_integrations does not exist, nothing to delete');
      return true; // Return true since there's nothing to delete
    }
    throw error;
  }
}

/**
 * Upsert GSC sites for an integration
 * Fetches sites from Google Search Console API and saves them to the database
 * 
 * @param integrationId - The UUID of the GSC integration
 * @param sites - Array of sites from Google Search Console API
 * @returns Array of saved GSC sites
 */
export async function upsertGSCSites(
  integrationId: string,
  sites: Array<{ siteUrl: string; permissionLevel?: string }>
): Promise<GSCSite[]> {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  try {
    // Prepare data for upsert
    const sitesToUpsert = sites.map(site => ({
      integration_id: integrationId,
      site_url: site.siteUrl,
      permission: site.permissionLevel || null,
      fetched_at: new Date().toISOString(),
    }));

    // Upsert sites (update if exists, insert if not)
    const { data, error } = await supabase
      .from('gsc_sites')
      .upsert(sitesToUpsert, {
        onConflict: 'integration_id,site_url',
        ignoreDuplicates: false,
      })
      .select();

    if (error) {
      console.error('Error upserting GSC sites:', error);
      throw new Error(`Failed to save GSC sites: ${error.message}`);
    }

    return (data || []).map((site: any) => ({
      id: site.id,
      integration_id: site.integration_id,
      site_url: site.site_url,
      permission: site.permission,
      fetched_at: site.fetched_at,
      created_at: site.created_at,
      updated_at: site.updated_at,
    }));
  } catch (error: any) {
    throw error;
  }
}

/**
 * Get GSC sites for an integration
 * 
 * @param integrationId - The UUID of the GSC integration
 * @returns Array of GSC sites
 */
export async function getGSCSites(integrationId: string): Promise<GSCSite[]> {
  if (!supabase) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('gsc_sites')
      .select('*')
      .eq('integration_id', integrationId)
      .order('site_url', { ascending: true });

    if (error) {
      // Check if table doesn't exist - return empty array
      if (error.code === '42P01' || error.message?.includes('does not exist') || error.message?.includes('schema cache')) {
        console.debug('[GSC] Table gsc_sites does not exist yet');
        return [];
      }
      console.error('Error fetching GSC sites:', error);
      return [];
    }

    return (data || []).map((site: any) => ({
      id: site.id,
      integration_id: site.integration_id,
      site_url: site.site_url,
      permission: site.permission,
      fetched_at: site.fetched_at,
      created_at: site.created_at,
      updated_at: site.updated_at,
    }));
  } catch (error: any) {
    // Handle table not found errors gracefully
    if (error?.code === '42P01' || error?.message?.includes('does not exist') || error?.message?.includes('schema cache')) {
      console.debug('[GSC] Table gsc_sites does not exist yet');
      return [];
    }
    console.error('Error fetching GSC sites:', error);
    return [];
  }
}
