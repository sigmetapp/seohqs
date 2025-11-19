import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSupabaseAuthUserId, getGSCIntegration, deleteGSCIntegration } from '@/lib/gsc-integrations';
import { requireAuth } from '@/lib/middleware-auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/gsc-integration
 * Gets the current user's GSC integration status
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
    
    if (!supabaseAuthUserId) {
      // Log more details for debugging
      console.warn('[GSC Integration] Supabase Auth user ID not found. User:', authResult.user?.email);
      console.warn('[GSC Integration] Supabase configured:', !!process.env.NEXT_PUBLIC_SUPABASE_URL);
      
      return NextResponse.json(
        {
          success: false,
          error: 'Supabase Auth user not found. GSC integrations require Supabase Auth. Please ensure you are logged in with Supabase Auth or configure Supabase Auth for your account.',
          connected: false,
        },
        { status: 401 }
      );
    }

    // Get GSC integration
    const integration = await getGSCIntegration(supabaseAuthUserId);

    if (!integration) {
      return NextResponse.json({
        success: true,
        connected: false,
        integration: null,
      });
    }

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
    
    if (!supabaseAuthUserId) {
      console.warn('[GSC Integration DELETE] Supabase Auth user ID not found. User:', authResult.user?.email);
      
      return NextResponse.json(
        {
          success: false,
          error: 'Supabase Auth user not found. GSC integrations require Supabase Auth. Please ensure you are logged in with Supabase Auth or configure Supabase Auth for your account.',
        },
        { status: 401 }
      );
    }

    // Delete GSC integration (this will cascade delete gsc_sites)
    await deleteGSCIntegration(supabaseAuthUserId);

    return NextResponse.json({
      success: true,
      message: 'GSC integration disconnected successfully',
    });
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
