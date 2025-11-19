import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/middleware-auth';
import { getSupabaseAuthUserId, getGSCIntegration, getGSCSites } from '@/lib/gsc-integrations';
import { getGoogleGSCAccounts } from '@/lib/google-gsc-accounts';
import { getAllGoogleAccounts } from '@/lib/db-adapter';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/gsc-integration/debug
 * Debug endpoint to check what's in the database for the current user
 * Shows all integration data from all tables
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const debugData: any = {
      timestamp: new Date().toISOString(),
      user: {
        jwtUserId: authResult.user.id,
        jwtUserEmail: authResult.user.email,
      },
      supabase: {
        configured: !!supabase,
        authUserId: null as string | null,
        found: false,
      },
      tables: {
        gsc_integrations: [],
        google_gsc_accounts: [],
        gsc_sites: [],
        google_accounts: [],
      },
      errors: [] as string[],
    };

    // Get Supabase Auth user ID
    try {
      const supabaseAuthUserId = await getSupabaseAuthUserId(request);
      debugData.supabase.authUserId = supabaseAuthUserId;
      debugData.supabase.found = !!supabaseAuthUserId;
    } catch (error: any) {
      debugData.errors.push(`Error getting Supabase Auth user ID: ${error.message}`);
    }

    // Check gsc_integrations table
    if (debugData.supabase.authUserId) {
      try {
        const integration = await getGSCIntegration(debugData.supabase.authUserId);
        if (integration) {
          debugData.tables.gsc_integrations.push({
            id: integration.id,
            user_id: integration.user_id,
            google_email: integration.google_email,
            google_user_id: integration.google_user_id,
            has_access_token: !!integration.access_token,
            has_refresh_token: !!integration.refresh_token,
            access_token_preview: integration.access_token ? `${integration.access_token.substring(0, 20)}...` : null,
            refresh_token_preview: integration.refresh_token ? `${integration.refresh_token.substring(0, 20)}...` : null,
            created_at: integration.created_at,
            updated_at: integration.updated_at,
          });

          // Get GSC sites for this integration
          try {
            const sites = await getGSCSites(integration.id);
            debugData.tables.gsc_sites = sites.map(site => ({
              id: site.id,
              integration_id: site.integration_id,
              site_url: site.site_url,
              permission: site.permission,
              fetched_at: site.fetched_at,
              created_at: site.created_at,
            }));
          } catch (sitesError: any) {
            debugData.errors.push(`Error fetching GSC sites: ${sitesError.message}`);
          }
        }
      } catch (gscError: any) {
        debugData.errors.push(`Error fetching gsc_integrations: ${gscError.message}`);
      }

      // Check google_gsc_accounts table
      try {
        const googleGSCAccounts = await getGoogleGSCAccounts(debugData.supabase.authUserId);
        debugData.tables.google_gsc_accounts = googleGSCAccounts.map(account => ({
          id: account.id,
          user_id: account.user_id,
          google_email: account.google_email,
          google_user_id: account.google_user_id,
          source: account.source,
          is_active: account.is_active,
          created_at: account.created_at,
          updated_at: account.updated_at,
        }));
      } catch (gscAccountsError: any) {
        debugData.errors.push(`Error fetching google_gsc_accounts: ${gscAccountsError.message}`);
      }
    }

    // Check google_accounts table (JWT auth)
    try {
      const googleAccounts = await getAllGoogleAccounts(authResult.user.id);
      debugData.tables.google_accounts = googleAccounts.map(account => ({
        id: account.id,
        email: account.email,
        has_access_token: !!account.googleAccessToken,
        has_refresh_token: !!account.googleRefreshToken,
        access_token_preview: account.googleAccessToken ? `${account.googleAccessToken.substring(0, 20)}...` : null,
        refresh_token_preview: account.googleRefreshToken ? `${account.googleRefreshToken.substring(0, 20)}...` : null,
        token_expiry: account.googleTokenExpiry,
        created_at: account.createdAt,
        updated_at: account.updatedAt,
      }));
    } catch (googleAccountsError: any) {
      debugData.errors.push(`Error fetching google_accounts: ${googleAccountsError.message}`);
    }

    // Try direct Supabase query if available
    if (supabase && debugData.supabase.authUserId) {
      try {
        // Direct query to gsc_integrations
        const { data: directGSCData, error: directGSCError } = await supabase
          .from('gsc_integrations')
          .select('*')
          .eq('user_id', debugData.supabase.authUserId);

        if (directGSCError) {
          // Only add error if it's not a "table doesn't exist" error
          if (!(directGSCError.code === '42P01' || directGSCError.message?.includes('does not exist') || directGSCError.message?.includes('schema cache'))) {
            debugData.errors.push(`Direct Supabase query error (gsc_integrations): ${directGSCError.message}`);
          } else {
            debugData.errors.push(`Direct Supabase query error (gsc_integrations): Could not find the table 'public.gsc_integrations' in the schema cache`);
          }
        } else {
          debugData.tables.direct_gsc_integrations_query = directGSCData || [];
        }

        // Direct query to google_gsc_accounts
        const { data: directGSCAccountsData, error: directGSCAccountsError } = await supabase
          .from('google_gsc_accounts')
          .select('*')
          .eq('user_id', debugData.supabase.authUserId);

        if (directGSCAccountsError) {
          // Only add error if it's not a "table doesn't exist" error
          if (!(directGSCAccountsError.code === '42P01' || directGSCAccountsError.message?.includes('does not exist') || directGSCAccountsError.message?.includes('schema cache'))) {
            debugData.errors.push(`Direct Supabase query error (google_gsc_accounts): ${directGSCAccountsError.message}`);
          }
        } else {
          debugData.tables.direct_google_gsc_accounts_query = directGSCAccountsData || [];
        }
      } catch (directQueryError: any) {
        // Handle table not found errors gracefully
        if (directQueryError?.code === '42P01' || directQueryError?.message?.includes('does not exist') || directQueryError?.message?.includes('schema cache')) {
          debugData.errors.push(`Direct Supabase query exception: Table not found - ${directQueryError.message}`);
        } else {
          debugData.errors.push(`Direct Supabase query exception: ${directQueryError.message}`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      debug: debugData,
    });
  } catch (error: any) {
    console.error('Error in debug endpoint:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error in debug endpoint',
        debug: {
          timestamp: new Date().toISOString(),
          error: error.message,
          stack: error.stack,
        },
      },
      { status: 500 }
    );
  }
}
