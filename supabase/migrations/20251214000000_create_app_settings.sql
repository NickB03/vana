-- Create app_settings table for global admin-controlled settings
-- These settings affect ALL users, not just the admin who sets them
-- IDEMPOTENT: Safe to run multiple times

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}',
  description TEXT,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add comment for documentation
COMMENT ON TABLE app_settings IS 'Global application settings that affect all users. Controlled by admins only.';

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_app_settings_key ON app_settings(key);

-- Insert default settings
INSERT INTO app_settings (key, value, description) VALUES
  ('force_tour', '{"enabled": false}', 'When enabled, forces the onboarding tour to show for all users on every visit'),
  ('landing_page_enabled', '{"enabled": true}', 'When enabled, shows the landing page to users. When disabled, users go directly to the app')
ON CONFLICT (key) DO NOTHING;

-- RLS Policies (IDEMPOTENT)

-- Enable RLS
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read settings (needed for the app to function)
DO $$
BEGIN
  DROP POLICY IF EXISTS "Anyone can read app settings" ON app_settings;
  CREATE POLICY "Anyone can read app settings"
    ON app_settings FOR SELECT
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Only admins can update settings
DO $$
BEGIN
  DROP POLICY IF EXISTS "Only admins can update app settings" ON app_settings;
  CREATE POLICY "Only admins can update app settings"
    ON app_settings FOR UPDATE
    USING (
      auth.uid() IS NOT NULL AND (
        auth.jwt() ->> 'email' = 'nick@vana.bot' OR
        (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
      )
    )
    WITH CHECK (
      auth.uid() IS NOT NULL AND (
        auth.jwt() ->> 'email' = 'nick@vana.bot' OR
        (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Only admins can insert new settings (in case we need to add more)
DO $$
BEGIN
  DROP POLICY IF EXISTS "Only admins can insert app settings" ON app_settings;
  CREATE POLICY "Only admins can insert app settings"
    ON app_settings FOR INSERT
    WITH CHECK (
      auth.uid() IS NOT NULL AND (
        auth.jwt() ->> 'email' = 'nick@vana.bot' OR
        (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Create function to update settings with audit trail
CREATE OR REPLACE FUNCTION update_app_setting(
  setting_key TEXT,
  setting_value JSONB
)
RETURNS app_settings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  result app_settings;
BEGIN
  -- Check if user is authenticated and is admin (NULL-safe)
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required to update app settings';
  END IF;

  IF NOT (
    COALESCE(auth.jwt() ->> 'email', '') = 'nick@vana.bot' OR
    COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can update app settings';
  END IF;

  UPDATE app_settings
  SET
    value = setting_value,
    updated_by = auth.uid(),
    updated_at = now()
  WHERE key = setting_key
  RETURNING * INTO result;

  IF result IS NULL THEN
    RAISE EXCEPTION 'Setting not found: %', setting_key;
  END IF;

  RETURN result;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION update_app_setting(TEXT, JSONB) TO authenticated;
