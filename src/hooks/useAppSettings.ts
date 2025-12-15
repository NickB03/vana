import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * App Settings Keys
 * These correspond to the keys in the app_settings database table
 */
export const APP_SETTING_KEYS = {
  FORCE_TOUR: 'force_tour',
  LANDING_PAGE_ENABLED: 'landing_page_enabled',
} as const;

export type AppSettingKey = typeof APP_SETTING_KEYS[keyof typeof APP_SETTING_KEYS];

/**
 * Typed settings values
 */
export interface AppSettings {
  force_tour: { enabled: boolean };
  landing_page_enabled: { enabled: boolean };
}

interface UseAppSettingsReturn {
  settings: AppSettings | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  updateSetting: <K extends AppSettingKey>(
    key: K,
    value: AppSettings[K]
  ) => Promise<boolean>;
}

/**
 * Default settings used when database is unavailable or during initial load
 */
const DEFAULT_SETTINGS: AppSettings = {
  force_tour: { enabled: false },
  landing_page_enabled: { enabled: true },
};

/**
 * Cache for app settings to avoid repeated fetches
 * Shared across all hook instances for consistency
 */
let settingsCache: AppSettings | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL_MS = 30000; // 30 seconds cache

/**
 * Hook for managing global app settings stored in Supabase
 *
 * Features:
 * - Fetches settings from app_settings table
 * - Caches results to avoid repeated database calls
 * - Provides updateSetting function for admin modifications
 * - Falls back to defaults on error
 *
 * Usage:
 * ```tsx
 * const { settings, updateSetting } = useAppSettings();
 *
 * // Read a setting
 * const forceTour = settings?.force_tour.enabled;
 *
 * // Update a setting (admin only)
 * await updateSetting('force_tour', { enabled: true });
 * ```
 */
export function useAppSettings(): UseAppSettingsReturn {
  const [settings, setSettings] = useState<AppSettings | null>(settingsCache);
  const [isLoading, setIsLoading] = useState(!settingsCache);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Fetch all settings from the database
   */
  const fetchSettings = useCallback(async () => {
    // Check cache first
    const now = Date.now();
    if (settingsCache && now - cacheTimestamp < CACHE_TTL_MS) {
      setSettings(settingsCache);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('app_settings')
        .select('key, value');

      if (fetchError) {
        throw new Error(`Failed to fetch app settings: ${fetchError.message}`);
      }

      // Convert array of key-value pairs to typed object
      const newSettings: AppSettings = { ...DEFAULT_SETTINGS };

      if (data) {
        for (const row of data) {
          const key = row.key as AppSettingKey;
          if (key in newSettings) {
            // Type-safe assignment
            (newSettings as Record<string, unknown>)[key] = row.value;
          }
        }
      }

      // Update cache
      settingsCache = newSettings;
      cacheTimestamp = Date.now();

      setSettings(newSettings);
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      setError(errorObj);
      console.error('Error fetching app settings:', errorObj);

      // Fall back to defaults on error
      setSettings(DEFAULT_SETTINGS);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Update a single setting in the database using RPC
   * Uses update_app_setting() function for proper audit trail (updated_by, updated_at)
   * Only works for authenticated admins
   */
  const updateSetting = useCallback(async <K extends AppSettingKey>(
    key: K,
    value: AppSettings[K]
  ): Promise<boolean> => {
    try {
      // Use RPC function for proper audit trail (sets updated_by server-side)
      const { error: updateError } = await supabase
        .rpc('update_app_setting', {
          setting_key: key,
          setting_value: value as unknown as Record<string, unknown>
        });

      if (updateError) {
        throw new Error(`Failed to update setting: ${updateError.message}`);
      }

      // Invalidate cache and refetch
      settingsCache = null;
      cacheTimestamp = 0;
      await fetchSettings();

      return true;
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      console.error('Error updating app setting:', errorObj);
      setError(errorObj);
      return false;
    }
  }, [fetchSettings]);

  // Initial fetch on mount
  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return {
    settings,
    isLoading,
    error,
    refetch: fetchSettings,
    updateSetting,
  };
}

/**
 * Lightweight hook for reading a single app setting
 * Useful for components that only need to check one setting
 *
 * @param key - The setting key to read
 * @returns The setting value, or default if loading/error
 */
export function useAppSetting<K extends AppSettingKey>(key: K): {
  value: AppSettings[K];
  isLoading: boolean;
} {
  const { settings, isLoading } = useAppSettings();

  return {
    value: settings?.[key] ?? DEFAULT_SETTINGS[key],
    isLoading,
  };
}

/**
 * Invalidate the settings cache
 * Call this after making changes outside of useAppSettings
 */
export function invalidateAppSettingsCache(): void {
  settingsCache = null;
  cacheTimestamp = 0;
}
