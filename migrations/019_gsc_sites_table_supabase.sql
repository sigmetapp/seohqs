-- Migration for gsc_sites table
-- Stores Google Search Console sites fetched for each integration
-- Supabase version (PostgreSQL with RLS)

-- Create gsc_sites table
-- This table stores sites fetched from Google Search Console API
-- Each site belongs to a GSC integration
CREATE TABLE IF NOT EXISTS gsc_sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES gsc_integrations(id) ON DELETE CASCADE,
  site_url TEXT NOT NULL,
  permission TEXT,
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Ensure one record per integration-site_url combination
  UNIQUE(integration_id, site_url)
);

-- Create index on integration_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_gsc_sites_integration_id ON gsc_sites(integration_id);

-- Create index on site_url for lookups by site URL
CREATE INDEX IF NOT EXISTS idx_gsc_sites_site_url ON gsc_sites(site_url);

-- Enable Row Level Security
ALTER TABLE gsc_sites ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view sites for their own integrations
-- This uses a subquery to check if the integration belongs to the user
CREATE POLICY "Users can view own gsc_sites" ON gsc_sites
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM gsc_integrations
      WHERE gsc_integrations.id = gsc_sites.integration_id
      AND gsc_integrations.user_id = auth.uid()
    )
  );

-- Policy: Users can insert sites for their own integrations
CREATE POLICY "Users can insert own gsc_sites" ON gsc_sites
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM gsc_integrations
      WHERE gsc_integrations.id = gsc_sites.integration_id
      AND gsc_integrations.user_id = auth.uid()
    )
  );

-- Policy: Users can update sites for their own integrations
CREATE POLICY "Users can update own gsc_sites" ON gsc_sites
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM gsc_integrations
      WHERE gsc_integrations.id = gsc_sites.integration_id
      AND gsc_integrations.user_id = auth.uid()
    )
  );

-- Policy: Users can delete sites for their own integrations
CREATE POLICY "Users can delete own gsc_sites" ON gsc_sites
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM gsc_integrations
      WHERE gsc_integrations.id = gsc_sites.integration_id
      AND gsc_integrations.user_id = auth.uid()
    )
  );

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_gsc_sites_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update updated_at on row update
CREATE TRIGGER update_gsc_sites_updated_at
  BEFORE UPDATE ON gsc_sites
  FOR EACH ROW
  EXECUTE FUNCTION update_gsc_sites_updated_at();
