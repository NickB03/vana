-- ============================================================================
-- MIGRATION: Improve SECURITY DEFINER Error Handling (Part 4/4)
-- Created: 2026-01-19 (Split from 20260114192829)
-- ============================================================================
-- Function: update_app_setting
-- Purpose: Add comprehensive error handling and input validation

CREATE OR REPLACE FUNCTION public.update_app_setting(setting_key text, setting_value jsonb)
RETURNS public.app_settings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  result app_settings;
  caller_email TEXT;
BEGIN
  -- ============================================================================
  -- INPUT VALIDATION
  -- ============================================================================
  IF setting_key IS NULL OR LENGTH(setting_key) = 0 THEN
    RAISE EXCEPTION 'setting_key cannot be NULL or empty'
    USING ERRCODE = '22004';
  END IF;

  IF setting_value IS NULL THEN
    RAISE EXCEPTION 'setting_value cannot be NULL'
    USING ERRCODE = '22004',
          HINT = 'Provide a valid JSON value for the setting.';
  END IF;

  -- ============================================================================
  -- AUTHORIZATION CHECK
  -- ============================================================================
  SELECT email INTO caller_email
  FROM auth.users
  WHERE id = auth.uid();

  IF caller_email NOT IN ('nick@vana.bot', 'nick.brown.2003@gmail.com') THEN
    RAISE EXCEPTION 'Unauthorized: Only admin users can update app settings'
    USING ERRCODE = '42501',
          HINT = 'Contact an administrator to change application settings.';
  END IF;

  -- ============================================================================
  -- UPDATE SETTING WITH IMPROVED ERROR HANDLING
  -- ============================================================================
  UPDATE app_settings
  SET
    value = setting_value,
    updated_by = auth.uid(),
    updated_at = now()
  WHERE key = setting_key
  RETURNING * INTO result;

  IF result IS NULL THEN
    -- Provide helpful context about valid keys
    RAISE EXCEPTION 'Setting not found: %. Valid keys: %',
      setting_key,
      (SELECT string_agg(key, ', ') FROM app_settings)
    USING ERRCODE = 'P0002',
          HINT = 'Check spelling or verify setting exists in app_settings table.';
  END IF;

  -- Log the change for audit trail
  RAISE NOTICE 'Updated app setting: key=%, new_value=%, updated_by=%',
    setting_key, setting_value, caller_email;

  RETURN result;
END;
$function$;
