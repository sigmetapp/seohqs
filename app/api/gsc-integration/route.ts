import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSupabaseAuthUserId, getGSCIntegration, deleteGSCIntegration, getGSCSites } from '@/lib/gsc-integrations';
import { requireAuth } from '@/lib/middleware-auth';
import { getAllGoogleAccounts, deleteGoogleAccount, getAllSites, clearGoogleSearchConsoleData } from '@/lib/db-adapter';
import { getGoogleGSCAccounts, deactivateGoogleGSCAccount } from '@/lib/google-gsc-accounts';

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
      source: 'supabase' | 'jwt' | 'google_gsc_accounts';
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
    console.log('[GSC Integration GET] Supabase Auth user ID:', supabaseAuthUserId);
    console.log('[GSC Integration GET] JWT user ID:', authResult.user.id);
    console.log('[GSC Integration GET] JWT user email:', authResult.user.email);
    
    // Track which emails we've already added to avoid duplicates
    const addedEmails = new Set<string>();
    
    // Try to get GSC integration from Supabase Auth table first (gsc_integrations)
    if (supabaseAuthUserId) {
      try {
        console.log('[GSC Integration GET] Looking for integration in gsc_integrations for user:', supabaseAuthUserId);
        const integration = await getGSCIntegration(supabaseAuthUserId);
        console.log('[GSC Integration GET] Found integration:', integration ? {
          id: integration.id,
          google_email: integration.google_email,
          has_tokens: !!(integration.access_token && integration.refresh_token),
        } : null);
        
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
          
          addedEmails.add(integration.google_email.toLowerCase());
        }
      } catch (gscIntegrationError: any) {
        // Log but don't fail - table might not exist or other error
        console.debug('[GSC Integration GET] Error fetching gsc_integrations:', gscIntegrationError?.message);
      }
      
      // Also get accounts from google_gsc_accounts table (supports multiple accounts)
      try {
        console.log('[GSC Integration GET] Looking for accounts in google_gsc_accounts for user:', supabaseAuthUserId);
        const googleGSCAccounts = await getGoogleGSCAccounts(supabaseAuthUserId);
        console.log('[GSC Integration GET] Found google_gsc_accounts:', googleGSCAccounts.length);
        
        for (const account of googleGSCAccounts) {
          // Skip if we already added this email from gsc_integrations
          if (addedEmails.has(account.google_email.toLowerCase())) {
            continue;
          }
          
          // For google_gsc_accounts, we need to check if there's a corresponding gsc_integration
          // to get GSC sites count. For now, we'll mark it as having sites if user has sites.
          // In the future, we could link google_gsc_accounts to gsc_integrations or gsc_sites.
          const hasSites = userSitesCount > 0;
          
          allAccounts.push({
            id: account.id,
            google_email: account.google_email,
            google_user_id: account.google_user_id,
            created_at: account.created_at,
            updated_at: account.updated_at,
            source: 'google_gsc_accounts',
            hasSites,
            sitesCount: userSitesCount,
            gscSitesCount: 0, // We don't have direct link to gsc_sites for these accounts
            gscSitesMatchedCount: 0,
          });
          
          addedEmails.add(account.google_email.toLowerCase());
        }
      } catch (googleGSCAccountsError: any) {
        // Log but don't fail - this table might not exist in all setups
        console.debug('[GSC Integration] Error fetching google_gsc_accounts:', googleGSCAccountsError?.message);
      }
    }

    // Check google_accounts table for JWT-authenticated users
    // This allows users authenticated via JWT/PostgreSQL auth to see their connected accounts
    // Also sync to gsc_integrations/google_gsc_accounts if Supabase Auth is available
    try {
      console.log('[GSC Integration GET] Looking for accounts in google_accounts for JWT user:', authResult.user.id);
      const googleAccounts = await getAllGoogleAccounts(authResult.user.id);
      console.log('[GSC Integration GET] Found google_accounts:', googleAccounts.length);
      
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
      
      // If we have Supabase Auth user ID and accounts in google_accounts but not in gsc_integrations/google_gsc_accounts,
      // try to sync them by fetching Google user info from the access token
      if (supabaseAuthUserId && connectedAccounts.length > 0) {
        for (const account of googleAccounts.filter(acc => acc.googleAccessToken && acc.googleRefreshToken)) {
          // Check if this email is already in gsc_integrations or google_gsc_accounts
          const emailLower = account.email.toLowerCase();
          const alreadySynced = addedEmails.has(emailLower);
          
          if (!alreadySynced) {
            try {
              // Try to get Google user info from access token
              const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: {
                  Authorization: `Bearer ${account.googleAccessToken}`,
                },
              });
              
              if (userInfoResponse.ok) {
                const userInfoData = await userInfoResponse.json();
                const googleEmail = userInfoData.email || account.email;
                const googleUserId = userInfoData.sub || `user-${authResult.user.id}`;
                
                // Try to save to gsc_integrations
                try {
                  const { upsertGSCIntegration } = await import('@/lib/gsc-integrations');
                  await upsertGSCIntegration(supabaseAuthUserId, {
                    google_email: googleEmail,
                    google_user_id: googleUserId,
                    access_token: account.googleAccessToken!,
                    refresh_token: account.googleRefreshToken!,
                  });
                  console.log('[GSC Integration GET] Synced account to gsc_integrations:', googleEmail);
                  
                  // Also save to google_gsc_accounts
                  try {
                    const { upsertGoogleGSCAccount } = await import('@/lib/google-gsc-accounts');
                    await upsertGoogleGSCAccount(supabaseAuthUserId, {
                      google_email: googleEmail,
                      google_user_id: googleUserId,
                      source: 'gsc',
                    });
                    console.log('[GSC Integration GET] Synced account to google_gsc_accounts:', googleEmail);
                    
                    // Reload integration to get the synced data
                    const syncedIntegration = await getGSCIntegration(supabaseAuthUserId);
                    if (syncedIntegration && syncedIntegration.google_email.toLowerCase() === emailLower) {
                      // Check GSC sites for this integration
                      let gscSitesCount = 0;
                      let gscSitesMatchedCount = 0;
                      try {
                        const gscSites = await getGSCSites(syncedIntegration.id);
                        gscSitesCount = gscSites.length;
                        gscSitesMatchedCount = gscSites.filter(site => matchesUserSite(site.site_url)).length;
                      } catch (gscSitesError: any) {
                        console.debug('[GSC Integration] Error fetching GSC sites:', gscSitesError?.message);
                      }
                      
                      const hasSites = userSitesCount > 0 || gscSitesMatchedCount > 0 || gscSitesCount > 0;
                      
                      // Replace JWT account with Supabase account
                      const existingIndex = allAccounts.findIndex(a => a.google_email.toLowerCase() === emailLower && a.source === 'jwt');
                      if (existingIndex >= 0) {
                        allAccounts[existingIndex] = {
                          id: syncedIntegration.id,
                          google_email: syncedIntegration.google_email,
                          google_user_id: syncedIntegration.google_user_id,
                          created_at: syncedIntegration.created_at,
                          updated_at: syncedIntegration.updated_at,
                          source: 'supabase',
                          hasSites,
                          sitesCount: userSitesCount,
                          gscSitesCount,
                          gscSitesMatchedCount,
                        };
                      } else {
                        allAccounts.push({
                          id: syncedIntegration.id,
                          google_email: syncedIntegration.google_email,
                          google_user_id: syncedIntegration.google_user_id,
                          created_at: syncedIntegration.created_at,
                          updated_at: syncedIntegration.updated_at,
                          source: 'supabase',
                          hasSites,
                          sitesCount: userSitesCount,
                          gscSitesCount,
                          gscSitesMatchedCount,
                        });
                      }
                      
                      addedEmails.add(emailLower);
                      continue; // Skip adding as JWT account
                    }
                  } catch (gscAccountError: any) {
                    console.debug('[GSC Integration GET] Error syncing to google_gsc_accounts:', gscAccountError?.message);
                  }
                } catch (gscIntegrationError: any) {
                  console.debug('[GSC Integration GET] Error syncing to gsc_integrations:', gscIntegrationError?.message);
                }
              }
            } catch (syncError: any) {
              console.debug('[GSC Integration GET] Error syncing account:', syncError?.message);
            }
          }
        }
      }
      
      // Add accounts that weren't synced to Supabase tables
      for (const acc of connectedAccounts) {
        const emailLower = acc.google_email.toLowerCase();
        if (!addedEmails.has(emailLower)) {
          console.log('[GSC Integration GET] Adding JWT account (not synced):', acc.google_email);
          allAccounts.push(acc);
          addedEmails.add(emailLower);
        } else {
          console.log('[GSC Integration GET] Skipping JWT account (already synced):', acc.google_email);
        }
      }
      
      console.log('[GSC Integration GET] Total accounts after google_accounts check:', allAccounts.length);
    } catch (fallbackError: any) {
      // Log but don't fail - this is a fallback mechanism
      console.debug('[GSC Integration] Fallback to google_accounts failed:', fallbackError?.message);
    }

    // Filter accounts that have sites (if user wants to see only accounts with sites)
    // For now, we'll return all accounts but mark which ones have sites
    // The frontend can filter if needed
    const accountsWithSites = allAccounts.filter(acc => acc.hasSites);

    console.log('[GSC Integration GET] Summary:', {
      totalAccounts: allAccounts.length,
      accountsWithSites: accountsWithSites.length,
      userSitesCount: userSitesCount,
      supabaseAuthUserId: supabaseAuthUserId,
    });

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
    const accountSource = searchParams.get('source'); // 'supabase', 'jwt', or 'google_gsc_accounts'
    const deleteSites = searchParams.get('deleteSites') === 'true'; // Whether to delete sites when disconnecting

    // Helper function to delete all user sites
    const deleteAllUserSites = async () => {
      try {
        const sites = await getAllSites(authResult.user.id);
        if (sites.length === 0) {
          return { deletedSites: 0, deletedGSCData: 0 };
        }

        // Delete Google Search Console data for each site
        let deletedDataCount = 0;
        for (const site of sites) {
          try {
            await clearGoogleSearchConsoleData(site.id);
            deletedDataCount++;
          } catch (error: any) {
            console.warn(`Failed to clear GSC data for site ${site.id}:`, error.message);
          }
        }

        // Delete sites from database
        const useSupabase = !!(process.env.NEXT_PUBLIC_SUPABASE_URL);
        const usePostgres = !useSupabase && !!(process.env.POSTGRES_URL || process.env.DATABASE_URL);
        
        if (useSupabase) {
          const { createClient } = await import('@supabase/supabase-js');
          const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
          );
          
          // Delete site_tags first (due to foreign keys)
          const siteIds = sites.map(s => s.id);
          if (siteIds.length > 0) {
            await supabase
              .from('site_tags')
              .delete()
              .in('site_id', siteIds);
          }
          
          // Delete sites
          await supabase
            .from('sites')
            .delete()
            .eq('user_id', authResult.user.id);
        } else if (usePostgres) {
          const { getPostgresClient } = await import('@/lib/postgres-client');
          const db = await getPostgresClient();
          
          // Delete site_tags first
          const siteIds = sites.map(s => s.id);
          if (siteIds.length > 0) {
            const placeholders = siteIds.map((_, i) => `$${i + 1}`).join(',');
            await db.query(
              `DELETE FROM site_tags WHERE site_id IN (${placeholders})`,
              siteIds
            );
          }
          
          // Delete sites
          await db.query('DELETE FROM sites WHERE user_id = $1', [authResult.user.id]);
        } else {
          // SQLite
          const Database = require('better-sqlite3');
          const { join } = require('path');
          const { existsSync, mkdirSync } = require('fs');
          
          const dbDir = join(process.cwd(), 'data');
          if (!existsSync(dbDir)) {
            mkdirSync(dbDir, { recursive: true });
          }
          
          const dbPath = join(dbDir, 'affiliate.db');
          const db = new Database(dbPath);
          
          // Delete site_tags first
          const siteIds = sites.map(s => s.id);
          if (siteIds.length > 0) {
            const placeholders = siteIds.map(() => '?').join(',');
            db.prepare(`DELETE FROM site_tags WHERE site_id IN (${placeholders})`).run(...siteIds);
          }
          
          // Delete sites
          db.prepare('DELETE FROM sites WHERE user_id = ?').run(authResult.user.id);
          db.close();
        }

        return { deletedSites: sites.length, deletedGSCData: deletedDataCount };
      } catch (error: any) {
        console.error('Error deleting user sites:', error);
        throw error;
      }
    };

    // If specific account ID is provided, delete only that one
    if (accountId) {
      const numericId = parseInt(accountId);
      if (!isNaN(numericId)) {
        // JWT account (numeric ID)
        try {
          // Check if account has sites before deleting
          const sites = await getAllSites(authResult.user.id);
          const hasSites = sites.length > 0;
          
          // Delete account
          await deleteGoogleAccount(numericId, authResult.user.id);
          
          // If account had sites and deleteSites flag is set, delete all sites
          let sitesDeleted = 0;
          if (hasSites && deleteSites) {
            const result = await deleteAllUserSites();
            sitesDeleted = result.deletedSites;
          }
          
          return NextResponse.json({
            success: true,
            message: sitesDeleted > 0 
              ? `Google account disconnected successfully. Deleted ${sitesDeleted} sites.`
              : 'Google account disconnected successfully',
            deletedSites: sitesDeleted,
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
        // Check if account has sites before deleting
        const sites = await getAllSites(authResult.user.id);
        const hasSites = sites.length > 0;
        
        // Check if it's from google_gsc_accounts table
        if (accountSource === 'google_gsc_accounts') {
          try {
            await deactivateGoogleGSCAccount(accountUuid, supabaseAuthUserId);
            
            // If account had sites and deleteSites flag is set, delete all sites
            let sitesDeleted = 0;
            if (hasSites && deleteSites) {
              const result = await deleteAllUserSites();
              sitesDeleted = result.deletedSites;
            }
            
            return NextResponse.json({
              success: true,
              message: sitesDeleted > 0 
                ? `Google GSC account disconnected successfully. Deleted ${sitesDeleted} sites.`
                : 'Google GSC account disconnected successfully',
              deletedSites: sitesDeleted,
            });
          } catch (deleteError: any) {
            console.error(`[GSC Integration DELETE] Failed to delete google_gsc_account:`, deleteError?.message);
            return NextResponse.json({
              success: false,
              error: deleteError.message || 'Failed to delete account',
            }, { status: 500 });
          }
        }
        
        // Otherwise, try gsc_integrations table
        try {
          // Verify that this integration belongs to the current user
          const integration = await getGSCIntegration(supabaseAuthUserId);
          if (integration && integration.id === accountUuid) {
            await deleteGSCIntegration(supabaseAuthUserId);
            
            // If account had sites and deleteSites flag is set, delete all sites
            let sitesDeleted = 0;
            if (hasSites && deleteSites) {
              const result = await deleteAllUserSites();
              sitesDeleted = result.deletedSites;
            }
            
            return NextResponse.json({
              success: true,
              message: sitesDeleted > 0 
                ? `GSC integration disconnected successfully. Deleted ${sitesDeleted} sites.`
                : 'GSC integration disconnected successfully',
              deletedSites: sitesDeleted,
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
    
    // Try to delete from Supabase Auth tables
    if (supabaseAuthUserId) {
      try {
        // Delete from gsc_integrations
        await deleteGSCIntegration(supabaseAuthUserId);
      } catch (supabaseError: any) {
        console.debug('[GSC Integration DELETE] Supabase deletion failed:', supabaseError?.message);
        // Continue to fallback
      }
      
      // Also deactivate all google_gsc_accounts
      try {
        const googleGSCAccounts = await getGoogleGSCAccounts(supabaseAuthUserId);
        for (const account of googleGSCAccounts) {
          try {
            await deactivateGoogleGSCAccount(account.id, supabaseAuthUserId);
          } catch (deactivateError: any) {
            console.warn(`[GSC Integration DELETE] Failed to deactivate account ${account.id}:`, deactivateError?.message);
          }
        }
      } catch (googleGSCAccountsError: any) {
        console.debug('[GSC Integration DELETE] Error deactivating google_gsc_accounts:', googleGSCAccountsError?.message);
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
