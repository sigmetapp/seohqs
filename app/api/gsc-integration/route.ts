import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSupabaseAuthUserId, getGSCIntegration, deleteGSCIntegration } from '@/lib/gsc-integrations';
import { requireAuth } from '@/lib/middleware-auth';
import { getAllGoogleAccounts, deleteGoogleAccount } from '@/lib/db-adapter';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/gsc-integration
 * Gets the current user's GSC integration status
 * Checks both gsc_integrations (Supabase Auth) and google_accounts (JWT Auth) tables
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication (using existing auth system for compatibility)
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    // Get Supabase Auth user ID
    const supabaseAuthUserId = await getSupabaseAuthUserId(request);
    
    // Try to get GSC integration from Supabase Auth table first
    if (supabaseAuthUserId) {
      const integration = await getGSCIntegration(supabaseAuthUserId);
      
      if (integration) {
        return NextResponse.json({
          success: true,
          connected: true,
          integration: {
            id: integration.id,
            google_email: integration.google_email,
            google_user_id: integration.google_user_id,
            created_at: integration.created_at,
            updated_at: integration.updated_at,
            // Don't return tokens for security
          },
        });
      }
    }

    // Fallback: Check google_accounts table for JWT-authenticated users
    // This allows users authenticated via JWT/PostgreSQL auth to see their connected accounts
    try {
      const googleAccounts = await getAllGoogleAccounts(authResult.user.id);
      
      // Find the first account with valid tokens (prefer the most recent one)
      const connectedAccount = googleAccounts
        .filter(acc => acc.googleAccessToken && acc.googleRefreshToken)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
      
      if (connectedAccount) {
        // Convert GoogleAccount to GSCIntegration format for compatibility
        // Use account ID as a string ID and user ID as google_user_id (since we don't have Google user ID from google_accounts)
        return NextResponse.json({
          success: true,
          connected: true,
          integration: {
            id: `jwt-${connectedAccount.id}`, // Prefix to distinguish from Supabase Auth integrations
            google_email: connectedAccount.email,
            google_user_id: `user-${authResult.user.id}`, // Fallback ID since we don't have Google user ID
            created_at: connectedAccount.createdAt,
            updated_at: connectedAccount.updatedAt,
            // Don't return tokens for security
          },
        });
      }
    } catch (fallbackError: any) {
      // Log but don't fail - this is a fallback mechanism
      console.debug('[GSC Integration] Fallback to google_accounts failed:', fallbackError?.message);
    }

    // No integration found in either table
    return NextResponse.json({
      success: true,
      connected: false,
      integration: null,
    });
  } catch (error: any) {
    console.error('Error fetching GSC integration:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error fetching GSC integration',
        connected: false,
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/gsc-integration
 * Disconnects the current user's GSC integration
 * Handles both Supabase Auth (gsc_integrations) and JWT Auth (google_accounts) integrations
 */
export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    // Get Supabase Auth user ID
    const supabaseAuthUserId = await getSupabaseAuthUserId(request);
    
    // Try to delete from Supabase Auth table first
    if (supabaseAuthUserId) {
      try {
        await deleteGSCIntegration(supabaseAuthUserId);
        return NextResponse.json({
          success: true,
          message: 'GSC integration disconnected successfully',
        });
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
      
      if (googleAccounts.length > 0) {
        return NextResponse.json({
          success: true,
          message: 'GSC integration disconnected successfully',
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
