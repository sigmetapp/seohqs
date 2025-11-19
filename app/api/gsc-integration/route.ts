import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSupabaseAuthUserId, getGSCIntegration, deleteGSCIntegration, getGSCSites } from '@/lib/gsc-integrations';
import { requireAuth } from '@/lib/middleware-auth';
import { getAllGoogleAccounts, deleteGoogleAccount, getAllSites } from '@/lib/db-adapter';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/gsc-integration
 * Gets the current user's GSC integration status
 * Checks both gsc_integrations (Supabase Auth) and google_accounts (JWT Auth) tables
 * Returns ALL connected accounts, not just one
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication (using existing auth system for compatibility)
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const allAccounts: Array<{
      id: string;
      google_email: string;
      google_user_id: string;
      created_at: string;
      updated_at: string;
      source: 'supabase' | 'jwt';
      accountId?: number; // For JWT accounts, the numeric ID
      hasSites?: boolean; // Whether this account has sites in the database
      sitesCount?: number; // Number of sites associated with this account
      gscSitesCount?: number; // Number of sites in GSC for this integration
      gscSitesMatchedCount?: number; // Number of GSC sites that match user's sites
    }> = [];

    // Get user's sites (sites in the database)
    let userSites: any[] = [];
    try {
      userSites = await getAllSites(authResult.user.id);
    } catch (sitesError: any) {
      console.debug('[GSC Integration] Error fetching user sites:', sitesError?.message);
    }
    const userSitesCount = userSites.length;

    // Helper function to normalize domain
    const normalizeDomain = (domain: string): string => {
      return domain.toLowerCase().trim().replace(/^www\./, '').replace(/^https?:\/\//, '').split('/')[0];
    };

    // Helper function to check if GSC site URL matches user site domain
    const matchesUserSite = (gscSiteUrl: string): boolean => {
      const gscDomain = normalizeDomain(gscSiteUrl.replace(/^sc-domain:/, ''));
      return userSites.some(site => {
        const siteDomain = normalizeDomain(site.domain);
        return siteDomain === gscDomain || 
               siteDomain === `www.${gscDomain}` || 
               `www.${siteDomain}` === gscDomain;
      });
    };

    // Get Supabase Auth user ID
    const supabaseAuthUserId = await getSupabaseAuthUserId(request);
    
    // Try to get GSC integration from Supabase Auth table first
    if (supabaseAuthUserId) {
      const integration = await getGSCIntegration(supabaseAuthUserId);
      
      if (integration) {
        // Check GSC sites for this integration
        let gscSitesCount = 0;
        let gscSitesMatchedCount = 0;
        try {
          const gscSites = await getGSCSites(integration.id);
          gscSitesCount = gscSites.length;
          // Count how many GSC sites match user's sites
          gscSitesMatchedCount = gscSites.filter(site => matchesUserSite(site.site_url)).length;
        } catch (gscSitesError: any) {
          console.debug('[GSC Integration] Error fetching GSC sites:', gscSitesError?.message);
        }

        // Account has sites if:
        // 1. User has sites in database (sites were submitted to the database)
        // 2. OR has GSC sites that match user's sites (connection exists)
        // 3. OR has any GSC sites (at least some connection)
        const hasSites = userSitesCount > 0 || gscSitesMatchedCount > 0 || gscSitesCount > 0;

        allAccounts.push({
          id: integration.id,
          google_email: integration.google_email,
          google_user_id: integration.google_user_id,
          created_at: integration.created_at,
          updated_at: integration.updated_at,
          source: 'supabase',
          hasSites,
          sitesCount: userSitesCount,
          gscSitesCount,
          // Also include matched count for better info
          gscSitesMatchedCount: gscSitesMatchedCount,
        });
      }
    }

    // Check google_accounts table for JWT-authenticated users
    // This allows users authenticated via JWT/PostgreSQL auth to see their connected accounts
    try {
      const googleAccounts = await getAllGoogleAccounts(authResult.user.id);
      
      // Add all accounts with valid tokens
      const connectedAccounts = googleAccounts
        .filter(acc => acc.googleAccessToken && acc.googleRefreshToken)
        .map(acc => ({
          id: `jwt-${acc.id}`, // Prefix to distinguish from Supabase Auth integrations
          google_email: acc.email,
          google_user_id: `user-${authResult.user.id}`, // Fallback ID since we don't have Google user ID
          created_at: acc.createdAt,
          updated_at: acc.updatedAt,
          source: 'jwt' as const,
          accountId: acc.id, // Store the numeric ID for deletion
          hasSites: userSitesCount > 0, // JWT accounts have sites if user has sites
          sitesCount: userSitesCount,
          gscSitesCount: 0, // JWT accounts don't have gsc_sites table
        }));
      
      allAccounts.push(...connectedAccounts);
    } catch (fallbackError: any) {
      // Log but don't fail - this is a fallback mechanism
      console.debug('[GSC Integration] Fallback to google_accounts failed:', fallbackError?.message);
    }

    // Filter accounts that have sites (if user wants to see only accounts with sites)
    // For now, we'll return all accounts but mark which ones have sites
    // The frontend can filter if needed
    const accountsWithSites = allAccounts.filter(acc => acc.hasSites);

    // Return all accounts
    return NextResponse.json({
      success: true,
      connected: allAccounts.length > 0,
      accounts: allAccounts,
      accountsWithSites: accountsWithSites, // Accounts that have sites
      // For backward compatibility, also return the first account as "integration"
      integration: allAccounts.length > 0 ? allAccounts[0] : null,
    });
  } catch (error: any) {
    console.error('Error fetching GSC integration:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error fetching GSC integration',
        connected: false,
        accounts: [],
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/gsc-integration
 * Disconnects the current user's GSC integration
 * Handles both Supabase Auth (gsc_integrations) and JWT Auth (google_accounts) integrations
 * 
 * Query params:
 * - accountId: Optional. If provided, deletes only that specific account (for JWT accounts, use numeric ID)
 * - accountUuid: Optional. If provided, deletes only that specific Supabase Auth integration (UUID)
 */
export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    // Check if we're deleting a specific account
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');
    const accountUuid = searchParams.get('accountUuid');

    // If specific account ID is provided, delete only that one
    if (accountId) {
      const numericId = parseInt(accountId);
      if (!isNaN(numericId)) {
        try {
          await deleteGoogleAccount(numericId, authResult.user.id);
          return NextResponse.json({
            success: true,
            message: 'Google account disconnected successfully',
          });
        } catch (deleteError: any) {
          console.error(`[GSC Integration DELETE] Failed to delete account ${accountId}:`, deleteError?.message);
          return NextResponse.json({
            success: false,
            error: deleteError.message || 'Failed to delete account',
          }, { status: 500 });
        }
      }
    }

    // If specific UUID is provided, delete only that Supabase Auth integration
    if (accountUuid) {
      const supabaseAuthUserId = await getSupabaseAuthUserId(request);
      if (supabaseAuthUserId) {
        try {
          // Verify that this integration belongs to the current user
          const integration = await getGSCIntegration(supabaseAuthUserId);
          if (integration && integration.id === accountUuid) {
            await deleteGSCIntegration(supabaseAuthUserId);
            return NextResponse.json({
              success: true,
              message: 'GSC integration disconnected successfully',
            });
          } else {
            return NextResponse.json({
              success: false,
              error: 'Integration not found or does not belong to current user',
            }, { status: 404 });
          }
        } catch (supabaseError: any) {
          console.error(`[GSC Integration DELETE] Failed to delete Supabase integration:`, supabaseError?.message);
          return NextResponse.json({
            success: false,
            error: supabaseError.message || 'Failed to delete integration',
          }, { status: 500 });
        }
      } else {
        return NextResponse.json({
          success: false,
          error: 'Supabase Auth user not found',
        }, { status: 404 });
      }
    }

    // No specific account specified - delete all (backward compatibility)
    const supabaseAuthUserId = await getSupabaseAuthUserId(request);
    
    // Try to delete from Supabase Auth table first
    if (supabaseAuthUserId) {
      try {
        await deleteGSCIntegration(supabaseAuthUserId);
      } catch (supabaseError: any) {
        console.debug('[GSC Integration DELETE] Supabase deletion failed:', supabaseError?.message);
        // Continue to fallback
      }
    }

    // Fallback: Delete from google_accounts table for JWT-authenticated users
    try {
      const googleAccounts = await getAllGoogleAccounts(authResult.user.id);
      
      // Delete all Google accounts for this user
      for (const account of googleAccounts) {
        try {
          await deleteGoogleAccount(account.id, authResult.user.id);
        } catch (deleteError: any) {
          console.warn(`[GSC Integration DELETE] Failed to delete account ${account.id}:`, deleteError?.message);
          // Continue deleting other accounts
        }
      }
      
      if (googleAccounts.length > 0 || supabaseAuthUserId) {
        return NextResponse.json({
          success: true,
          message: 'All GSC integrations disconnected successfully',
        });
      }
    } catch (fallbackError: any) {
      console.debug('[GSC Integration DELETE] Fallback deletion failed:', fallbackError?.message);
    }

    // No integration found to delete
    return NextResponse.json({
      success: false,
      error: 'No GSC integration found to disconnect',
    }, { status: 404 });
  } catch (error: any) {
    console.error('Error disconnecting GSC integration:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error disconnecting GSC integration',
      },
      { status: 500 }
    );
  }
}
