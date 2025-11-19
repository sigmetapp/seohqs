-- Migration for gsc_integrations table
-- Stores Google Search Console OAuth integrations per user
-- Supabase version (PostgreSQL with RLS)

-- Create gsc_integrations table
-- This table stores OAuth tokens for Google Search Console integrations
-- Each user can have one integration (enforced by unique constraint on user_id)
CREATE TABLE IF NOT EXISTS gsc_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  google_email TEXT NOT NULL,
  google_user_id TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Ensure one integration per user
  UNIQUE(user_id)
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_gsc_integrations_user_id ON gsc_integrations(user_id);

-- Create index on google_user_id for lookups by Google user ID
CREATE INDEX IF NOT EXISTS idx_gsc_integrations_google_user_id ON gsc_integrations(google_user_id);

-- Enable Row Level Security
ALTER TABLE gsc_integrations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view only their own integrations
CREATE POLICY "Users can view own gsc_integrations" ON gsc_integrations
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own integrations
CREATE POLICY "Users can insert own gsc_integrations" ON gsc_integrations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own integrations
CREATE POLICY "Users can update own gsc_integrations" ON gsc_integrations
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can delete their own integrations
CREATE POLICY "Users can delete own gsc_integrations" ON gsc_integrations
  FOR DELETE USING (auth.uid() = user_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_gsc_integrations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update updated_at on row update
CREATE TRIGGER update_gsc_integrations_updated_at
  BEFORE UPDATE ON gsc_integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_gsc_integrations_updated_at();
