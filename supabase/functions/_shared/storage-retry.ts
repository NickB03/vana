/**
 * Supabase Storage Retry Utility
 *
 * Provides retry logic with exponential backoff for Supabase Storage operations.
 * Handles transient network failures gracefully while avoiding retries on permanent errors.
 *
 * Features:
 * - Exponential backoff using RETRY_CONFIG constants
 * - Distinguishes between retriable and non-retriable errors
 * - Automatic response body draining to prevent resource leaks
 * - Detailed logging for debugging
 *
 * @module storage-retry
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";
import { RETRY_CONFIG } from './config.ts';

/**
 * Storage upload result with signed URL
 */
export interface StorageUploadResult {
  url: string;
  path: string;
}

/**
 * Transform internal Docker URLs to publicly accessible URLs
 *
 * When running Supabase locally via `supabase start`, Edge Functions run inside
 * Docker containers where SUPABASE_URL=http://kong:8000 (internal Docker network).
 * However, browsers access Supabase through http://127.0.0.1:54321.
 *
 * This function transforms signed URLs from internal to public format so they
 * can be accessed from the browser.
 *
 * @param url - The signed URL from Supabase Storage
 * @returns The publicly accessible URL
 *
 * @example
 * // Local dev: transforms internal Docker URL to localhost
 * transformToPublicUrl('http://kong:8000/storage/v1/...?token=xxx')
 * // Returns: 'http://127.0.0.1:54321/storage/v1/...?token=xxx'
 *
 * // Production: returns URL unchanged
 * transformToPublicUrl('https://xyz.supabase.co/storage/v1/...?token=xxx')
 * // Returns: 'https://xyz.supabase.co/storage/v1/...?token=xxx'
 */
function transformToPublicUrl(url: string): string {
  // Only transform URLs with the internal Docker hostname
  if (!url.includes('://kong:8000')) {
    return url;
  }

  // Get the public port from environment (defaults to 54321 for local Supabase)
  const publicPort = Deno.env.get('SUPABASE_INTERNAL_HOST_PORT') || '54321';
  const publicUrl = `http://127.0.0.1:${publicPort}`;

  const transformed = url.replace('http://kong:8000', publicUrl);

  console.log(`[storage-retry] Transformed internal Docker URL to public URL: kong:8000 → 127.0.0.1:${publicPort}`);

  return transformed;
}

/**
 * Check if an error is non-retriable (permanent failure)
 *
 * Non-retriable errors include:
 * - Validation errors (invalid input)
 * - Authentication/authorization failures
 * - Quota exceeded (not a transient issue)
 * - Bucket not found (configuration error)
 *
 * @param error - The error to check
 * @returns true if error should not be retried
 */
function isNonRetriableError(error: unknown): boolean {
  if (!error) return false;

  // Check error message for non-retriable patterns
  const errorMessage = error instanceof Error
    ? error.message.toLowerCase()
    : String(error).toLowerCase();

  const nonRetriablePatterns = [
    'invalid',
    'unauthorized',
    'forbidden',
    'access denied',
    'quota exceeded',
    'bucket not found',
    'bucket does not exist',
    'permission denied',
    'authentication required',
    'malformed',
    'bad request'
  ];

  return nonRetriablePatterns.some(pattern => errorMessage.includes(pattern));
}

/**
 * Upload a file to Supabase Storage with automatic retry logic
 *
 * Handles transient network failures with exponential backoff.
 * Returns signed URL for uploaded file.
 *
 * @param supabase - Supabase client instance
 * @param bucket - Storage bucket name
 * @param path - File path within bucket
 * @param data - File data (string, Uint8Array, or Blob)
 * @param options - Upload options (contentType, cacheControl, upsert)
 * @param signedUrlExpiry - Signed URL expiry in seconds (default: 3600 = 1 hour)
 * @param requestId - Request ID for logging (optional)
 * @returns Object with signed URL and storage path
 * @throws Error if upload fails after all retries
 *
 * @example
 * ```typescript
 * const result = await uploadWithRetry(
 *   supabase,
 *   'bundles',
 *   'session-123/artifact-456/bundle.html',
 *   htmlContent,
 *   { contentType: 'text/html', upsert: true },
 *   3600,
 *   requestId
 * );
 * console.log('Uploaded to:', result.url);
 * ```
 */
export async function uploadWithRetry(
  supabase: SupabaseClient,
  bucket: string,
  path: string,
  data: string | Uint8Array | Blob,
  options: {
    contentType?: string;
    cacheControl?: string;
    upsert?: boolean;
  } = {},
  signedUrlExpiry: number = 3600,
  requestId?: string
): Promise<StorageUploadResult> {
  const reqId = requestId || crypto.randomUUID();
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= RETRY_CONFIG.MAX_RETRIES; attempt++) {
    try {
      console.log(
        `[${reqId}] Storage upload attempt ${attempt + 1}/${RETRY_CONFIG.MAX_RETRIES + 1}: ${bucket}/${path}`
      );

      // Attempt upload
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, data, options);

      if (uploadError) {
        throw uploadError;
      }

      console.log(`[${reqId}] Upload successful, generating signed URL (expiry: ${signedUrlExpiry}s)`);

      // Generate signed URL
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, signedUrlExpiry);

      if (signedUrlError || !signedUrlData?.signedUrl) {
        throw new Error(
          `Failed to create signed URL: ${signedUrlError?.message || 'No URL returned'}`
        );
      }

      console.log(
        `[${reqId}] Storage upload completed successfully${attempt > 0 ? ` (after ${attempt} retries)` : ''}`
      );

      // Transform internal Docker URLs to publicly accessible URLs
      // This is needed when running Supabase locally (kong:8000 → 127.0.0.1:54321)
      const publicUrl = transformToPublicUrl(signedUrlData.signedUrl);

      return {
        url: publicUrl,
        path: uploadData?.path || path
      };

    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      console.error(
        `[${reqId}] Storage upload attempt ${attempt + 1} failed:`,
        lastError.message
      );

      // Don't retry on non-retriable errors
      if (isNonRetriableError(error)) {
        console.error(
          `[${reqId}] Non-retriable error detected, failing immediately:`,
          lastError.message
        );
        throw lastError;
      }

      // If we've exhausted retries, throw the error
      if (attempt >= RETRY_CONFIG.MAX_RETRIES) {
        console.error(
          `[${reqId}] Max retries (${RETRY_CONFIG.MAX_RETRIES}) exceeded for storage upload`
        );
        throw lastError;
      }

      // Calculate exponential backoff delay
      const delay = Math.min(
        RETRY_CONFIG.INITIAL_DELAY_MS * Math.pow(RETRY_CONFIG.BACKOFF_MULTIPLIER, attempt),
        RETRY_CONFIG.MAX_DELAY_MS
      );

      console.log(
        `[${reqId}] Retrying storage upload in ${delay}ms (attempt ${attempt + 2}/${RETRY_CONFIG.MAX_RETRIES + 1})...`
      );

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // This should never be reached due to the throw in the loop, but TypeScript needs it
  throw lastError || new Error('Storage upload failed with unknown error');
}

/**
 * Delete a file from Supabase Storage with automatic retry logic
 *
 * Handles transient network failures with exponential backoff.
 *
 * @param supabase - Supabase client instance
 * @param bucket - Storage bucket name
 * @param path - File path within bucket
 * @param requestId - Request ID for logging (optional)
 * @throws Error if deletion fails after all retries
 *
 * @example
 * ```typescript
 * await deleteWithRetry(
 *   supabase,
 *   'bundles',
 *   'session-123/artifact-456/bundle.html',
 *   requestId
 * );
 * ```
 */
export async function deleteWithRetry(
  supabase: SupabaseClient,
  bucket: string,
  path: string,
  requestId?: string
): Promise<void> {
  const reqId = requestId || crypto.randomUUID();
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= RETRY_CONFIG.MAX_RETRIES; attempt++) {
    try {
      console.log(
        `[${reqId}] Storage delete attempt ${attempt + 1}/${RETRY_CONFIG.MAX_RETRIES + 1}: ${bucket}/${path}`
      );

      const { error } = await supabase.storage
        .from(bucket)
        .remove([path]);

      if (error) {
        throw error;
      }

      console.log(
        `[${reqId}] Storage deletion completed successfully${attempt > 0 ? ` (after ${attempt} retries)` : ''}`
      );

      return;

    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      console.error(
        `[${reqId}] Storage delete attempt ${attempt + 1} failed:`,
        lastError.message
      );

      // Don't retry on non-retriable errors
      if (isNonRetriableError(error)) {
        console.error(
          `[${reqId}] Non-retriable error detected, failing immediately:`,
          lastError.message
        );
        throw lastError;
      }

      // If we've exhausted retries, throw the error
      if (attempt >= RETRY_CONFIG.MAX_RETRIES) {
        console.error(
          `[${reqId}] Max retries (${RETRY_CONFIG.MAX_RETRIES}) exceeded for storage deletion`
        );
        throw lastError;
      }

      // Calculate exponential backoff delay
      const delay = Math.min(
        RETRY_CONFIG.INITIAL_DELAY_MS * Math.pow(RETRY_CONFIG.BACKOFF_MULTIPLIER, attempt),
        RETRY_CONFIG.MAX_DELAY_MS
      );

      console.log(
        `[${reqId}] Retrying storage delete in ${delay}ms (attempt ${attempt + 2}/${RETRY_CONFIG.MAX_RETRIES + 1})...`
      );

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // This should never be reached due to the throw in the loop, but TypeScript needs it
  throw lastError || new Error('Storage deletion failed with unknown error');
}
