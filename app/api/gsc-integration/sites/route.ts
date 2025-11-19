import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSupabaseAuthUserId, getGSCIntegration, getGSCSites, upsertGSCSites } from '@/lib/gsc-integrations';
import { requireAuth } from '@/lib/middleware-auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/gsc-integration/sites
 * Fetches GSC sites for the current user's integration
 * Optionally refreshes sites from Google Search Console API
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    // Get Supabase Auth user ID
    const supabaseAuthUserId = await getSupabaseAuthUserId(request);
    
    if (!supabaseAuthUserId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Supabase Auth user not found. Please ensure you are logged in with Supabase Auth.',
        },
        { status: 401 }
      );
    }

    // Get GSC integration
    const integration = await getGSCIntegration(supabaseAuthUserId);

    if (!integration) {
      return NextResponse.json(
        {
          success: false,
          error: 'GSC integration not found. Please connect your Google Search Console account first.',
        },
        { status: 404 }
      );
    }

    // Check if we should refresh from API
    const { searchParams } = new URL(request.url);
    const refresh = searchParams.get('refresh') === 'true';

    let sites = await getGSCSites(integration.id);

    // If refresh requested and we have access token, fetch from API
    if (refresh && integration.access_token) {
      try {
        const sitesResponse = await fetch('https://www.googleapis.com/webmasters/v3/sites', {
          headers: {
            Authorization: `Bearer ${integration.access_token}`,
          },
        });

        if (sitesResponse.ok) {
          const sitesData = await sitesResponse.json();
          const apiSites = sitesData.siteEntry || [];

          // Update sites in database
          if (apiSites.length > 0) {
            sites = await upsertGSCSites(
              integration.id,
              apiSites.map((site: any) => ({
                siteUrl: site.siteUrl,
                permissionLevel: site.permissionLevel,
              }))
            );
          }
        } else if (sitesResponse.status === 401) {
          // Token expired, would need to refresh
          return NextResponse.json(
            {
              success: false,
              error: 'Access token expired. Please reconnect your Google Search Console account.',
            },
            { status: 401 }
          );
        }
      } catch (apiError) {
        console.error('Error fetching sites from GSC API:', apiError);
        // Return cached sites even if API call fails
      }
    }

    return NextResponse.json({
      success: true,
      sites: sites,
      count: sites.length,
    });
  } catch (error: any) {
    console.error('Error fetching GSC sites:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error fetching GSC sites',
      },
      { status: 500 }
    );
  }
}
