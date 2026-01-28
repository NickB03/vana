/**
 * Safe Storage Wrapper
 *
 * Provides a localStorage wrapper that gracefully handles corrupted data.
 * This prevents white screen crashes in Safari when localStorage contains
 * malformed JSON or invalid auth tokens.
 *
 * Key features:
 * - Catches JSON parse errors and returns null instead of throwing
 * - Automatically clears corrupted entries on read failure
 * - Logs corruption events for debugging
 * - Compatible with Supabase auth storage interface
 */

import { logError } from './errorLogging';
import { ERROR_IDS } from '@/constants/errorIds';

// Keys that are known to store JSON data
const JSON_STORAGE_KEYS = [
  'sb-', // Supabase auth tokens
  'supabase.auth.token',
  'vana-',
];

/**
 * Check if a key is expected to contain JSON data
 */
function isJsonKey(key: string): boolean {
  return JSON_STORAGE_KEYS.some(prefix => key.startsWith(prefix));
}

/**
 * Validate that a value is valid JSON
 */
function isValidJson(value: string): boolean {
  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Clear a corrupted storage entry and log the event
 */
function clearCorruptedEntry(key: string, error: unknown): void {
  console.warn(`🧹 Clearing corrupted localStorage entry: ${key}`);

  logError(error instanceof Error ? error : new Error(String(error)), {
    errorId: ERROR_IDS.STORAGE_CORRUPTION,
    context: { key, action: 'auto-cleared' },
  });

  try {
    localStorage.removeItem(key);
  } catch (removeError) {
    console.error('Failed to remove corrupted entry:', removeError);
  }
}

/**
 * Safe localStorage wrapper that handles corrupted data
 * Implements the same interface as localStorage for Supabase compatibility
 */
export const safeStorage: Storage = {
  get length(): number {
    return localStorage.length;
  },

  key(index: number): string | null {
    return localStorage.key(index);
  },

  getItem(key: string): string | null {
    try {
      const value = localStorage.getItem(key);

      // If the key should contain JSON, validate it
      if (value !== null && isJsonKey(key)) {
        if (!isValidJson(value)) {
          console.warn(`⚠️ Corrupted JSON detected in localStorage key: ${key}`);
          clearCorruptedEntry(key, new Error(`Invalid JSON in localStorage key: ${key}`));
          return null;
        }
      }

      return value;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      clearCorruptedEntry(key, error);
      return null;
    }
  },

  setItem(key: string, value: string): void {
    try {
      // Validate JSON before storing if it's a JSON key
      if (isJsonKey(key) && !isValidJson(value)) {
        console.error(`Attempted to store invalid JSON in key: ${key}`);
        return;
      }

      localStorage.setItem(key, value);
    } catch (error) {
      // Handle quota exceeded or other storage errors
      console.error(`Error writing to localStorage key "${key}":`, error);

      // If quota exceeded, try to clear old data
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.warn('Storage quota exceeded, attempting cleanup...');
        cleanupOldStorageEntries();

        // Retry once after cleanup
        try {
          localStorage.setItem(key, value);
        } catch (retryError) {
          console.error('Storage write failed even after cleanup:', retryError);
        }
      }
    }
  },

  removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
    }
  },

  clear(): void {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
  },
};

/**
 * Clean up old or unnecessary storage entries to free space
 */
function cleanupOldStorageEntries(): void {
  try {
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      // Remove old performance metrics and temporary data
      if (key.startsWith('performance-') || key.startsWith('temp-')) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach(key => localStorage.removeItem(key));
    console.log(`🧹 Cleaned up ${keysToRemove.length} old storage entries`);
  } catch (error) {
    console.error('Error during storage cleanup:', error);
  }
}

/**
 * Validate all localStorage entries on app startup
 * Call this early in the app initialization to detect and fix corruption
 *
 * @returns Object with validation results
 */
export function validateLocalStorage(): {
  isValid: boolean;
  corruptedKeys: string[];
  fixedKeys: string[];
} {
  const result = {
    isValid: true,
    corruptedKeys: [] as string[],
    fixedKeys: [] as string[],
  };

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      // Only validate keys expected to contain JSON
      if (!isJsonKey(key)) continue;

      try {
        const value = localStorage.getItem(key);
        if (value !== null && !isValidJson(value)) {
          result.corruptedKeys.push(key);
          result.isValid = false;

          // Auto-fix by removing corrupted entry
          localStorage.removeItem(key);
          result.fixedKeys.push(key);

          console.warn(`🔧 Fixed corrupted localStorage entry: ${key}`);
        }
      } catch (readError) {
        result.corruptedKeys.push(key);
        result.isValid = false;

        try {
          localStorage.removeItem(key);
          result.fixedKeys.push(key);
        } catch {
          // Ignore removal errors
        }
      }
    }
  } catch (error) {
    console.error('Error validating localStorage:', error);
    result.isValid = false;
  }

  if (result.corruptedKeys.length > 0) {
    console.log('📋 localStorage validation complete:', result);
  }

  return result;
}

/**
 * Check if Supabase auth token is valid
 * Returns true if valid or no token exists, false if corrupted
 */
export function validateSupabaseAuthToken(): boolean {
  try {
    // Find Supabase auth token key (format: sb-{project-ref}-auth-token)
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith('sb-') || !key.endsWith('-auth-token')) continue;

      const value = localStorage.getItem(key);
      if (value === null) continue;

      // Try to parse and validate the token structure
      try {
        const parsed = JSON.parse(value);

        // Check for expected Supabase token structure
        if (typeof parsed !== 'object' || parsed === null) {
          console.warn('⚠️ Invalid Supabase token structure (not an object)');
          return false;
        }

        // If there's an access_token, it should be a string
        if (parsed.access_token !== undefined && typeof parsed.access_token !== 'string') {
          console.warn('⚠️ Invalid Supabase access_token type');
          return false;
        }

        return true;
      } catch (parseError) {
        console.warn('⚠️ Failed to parse Supabase auth token:', parseError);
        return false;
      }
    }

    // No token found - that's fine
    return true;
  } catch (error) {
    console.error('Error validating Supabase auth token:', error);
    return false;
  }
}

/**
 * Clear all Supabase auth data
 * Use this when auth token is corrupted and needs to be reset
 */
export function clearSupabaseAuthData(): void {
  try {
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      // Remove all Supabase-related keys
      if (key.startsWith('sb-') || key.startsWith('supabase')) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch {
        // Ignore individual removal errors
      }
    });

    console.log(`🧹 Cleared ${keysToRemove.length} Supabase auth entries`);
  } catch (error) {
    console.error('Error clearing Supabase auth data:', error);
  }
}
