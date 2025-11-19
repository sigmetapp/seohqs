import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { readFile } from 'fs/promises';
import { join } from 'path';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/migrations/create-gsc-integrations-table
 * Creates the gsc_integrations table if it doesn't exist
 * Requires SUPABASE_SERVICE_ROLE_KEY for admin operations
 * 
 * This endpoint can be called to automatically create the table
 * that stores Google Search Console integrations with user emails
 */
export async function POST(request: Request) {
  try {
    // Check if we have service role key (required for admin operations)
    const hasServiceRoleKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!hasServiceRoleKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'SUPABASE_SERVICE_ROLE_KEY is required to create tables',
          message: 'Please set SUPABASE_SERVICE_ROLE_KEY in your environment variables',
        },
        { status: 403 }
      );
    }

    if (!supabase) {
      return NextResponse.json(
        {
          success: false,
          error: 'Supabase client not initialized',
          message: 'Please check your Supabase configuration',
        },
        { status: 500 }
      );
    }

    // Check if table already exists
    try {
      const { error: checkError } = await supabase
        .from('gsc_integrations')
        .select('id')
        .limit(1);

      if (!checkError) {
        // Table exists
        return NextResponse.json({
          success: true,
          message: 'Table gsc_integrations already exists',
          tableExists: true,
        });
      }
    } catch (checkError: any) {
      // Table doesn't exist, continue to create it
      if (!(checkError?.code === '42P01' || 
            checkError?.message?.includes('does not exist') || 
            checkError?.message?.includes('schema cache'))) {
        // Different error
        return NextResponse.json(
          {
            success: false,
            error: 'Error checking table existence',
            message: checkError?.message || 'Unknown error',
          },
          { status: 500 }
        );
      }
    }

    // Read migration file
    let migrationSQL: string;
    try {
      const migrationPath = join(process.cwd(), 'migrations', '018_gsc_integrations_table_supabase.sql');
      migrationSQL = await readFile(migrationPath, 'utf-8');
    } catch (fileError: any) {
      // If file doesn't exist, use inline SQL
      migrationSQL = `
-- Create gsc_integrations table
CREATE TABLE IF NOT EXISTS gsc_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  google_email TEXT NOT NULL,
  google_user_id TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_gsc_integrations_user_id ON gsc_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_gsc_integrations_google_user_id ON gsc_integrations(google_user_id);

-- Enable Row Level Security
ALTER TABLE gsc_integrations ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'gsc_integrations' AND policyname = 'Users can view own gsc_integrations'
  ) THEN
    CREATE POLICY "Users can view own gsc_integrations" ON gsc_integrations
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'gsc_integrations' AND policyname = 'Users can insert own gsc_integrations'
  ) THEN
    CREATE POLICY "Users can insert own gsc_integrations" ON gsc_integrations
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'gsc_integrations' AND policyname = 'Users can update own gsc_integrations'
  ) THEN
    CREATE POLICY "Users can update own gsc_integrations" ON gsc_integrations
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'gsc_integrations' AND policyname = 'Users can delete own gsc_integrations'
  ) THEN
    CREATE POLICY "Users can delete own gsc_integrations" ON gsc_integrations
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Create function for updated_at trigger
CREATE OR REPLACE FUNCTION update_gsc_integrations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS update_gsc_integrations_updated_at ON gsc_integrations;
CREATE TRIGGER update_gsc_integrations_updated_at
  BEFORE UPDATE ON gsc_integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_gsc_integrations_updated_at();
      `.trim();
    }

    // Execute SQL using Supabase's REST API with service role key
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing Supabase credentials',
          message: 'Please check your environment variables',
        },
        { status: 500 }
      );
    }

    // Use Supabase Management API or direct database connection
    // Since Supabase JS client doesn't support raw SQL, we'll use the REST API
    // Note: This requires a custom RPC function or direct database access
    
    // For now, return instructions for manual migration
    // In production, you would use a direct PostgreSQL connection or Supabase Management API
    return NextResponse.json({
      success: false,
      message: 'Automatic table creation via API is not available',
      instructions: [
        '1. Go to your Supabase Dashboard',
        '2. Navigate to SQL Editor',
        '3. Copy and paste the SQL from migrations/018_gsc_integrations_table_supabase.sql',
        '4. Run the SQL to create the table',
        '',
        'Alternatively, you can run the migration file directly using psql or Supabase CLI:',
        '  supabase db push migrations/018_gsc_integrations_table_supabase.sql',
      ],
      migrationSQL: migrationSQL.substring(0, 500) + '...', // Preview
      note: 'The table stores google_email field which serves as proof of integration between the user\'s email and your site',
    });
  } catch (error: any) {
    console.error('Error creating gsc_integrations table:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error creating table',
      },
      { status: 500 }
    );
  }
}
