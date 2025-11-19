-- Migration for google_gsc_accounts table
-- Stores multiple Google Search Console accounts per user
-- Supabase version (PostgreSQL with RLS)

-- Create google_gsc_accounts table
-- This table stores multiple Google accounts per user (unlike gsc_integrations which allows only one)
CREATE TABLE IF NOT EXISTS google_gsc_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  google_email TEXT NOT NULL,
  google_user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  source TEXT DEFAULT 'gsc',
  is_active BOOLEAN DEFAULT TRUE,
  -- Ensure one account per user per google_user_id
  UNIQUE(user_id, google_user_id)
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_google_gsc_accounts_user_id ON google_gsc_accounts(user_id);

-- Create index on google_user_id for lookups by Google user ID
CREATE INDEX IF NOT EXISTS idx_google_gsc_accounts_google_user_id ON google_gsc_accounts(google_user_id);

-- Create index on is_active for filtering active accounts
CREATE INDEX IF NOT EXISTS idx_google_gsc_accounts_is_active ON google_gsc_accounts(user_id, is_active) WHERE is_active = TRUE;

-- Enable Row Level Security
ALTER TABLE google_gsc_accounts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view only their own accounts
CREATE POLICY "Users can view own google_gsc_accounts" ON google_gsc_accounts
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own accounts
CREATE POLICY "Users can insert own google_gsc_accounts" ON google_gsc_accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own accounts
CREATE POLICY "Users can update own google_gsc_accounts" ON google_gsc_accounts
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can delete their own accounts
CREATE POLICY "Users can delete own google_gsc_accounts" ON google_gsc_accounts
  FOR DELETE USING (auth.uid() = user_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_google_gsc_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update updated_at on row update
CREATE TRIGGER update_google_gsc_accounts_updated_at
  BEFORE UPDATE ON google_gsc_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_google_gsc_accounts_updated_at();
