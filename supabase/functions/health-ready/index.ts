/**
 * Readiness Check Endpoint
 *
 * Provides system readiness status for CI/CD and startup verification.
 * Only checks critical internal dependencies: database and storage.
 * Does NOT check external APIs (OpenRouter, etc.) as they may not be configured in CI.
 *
 * Endpoint: /functions/v1/health-ready
 * Method: GET
 * Authentication: None (public endpoint for monitoring)
 *
 * Use Cases:
 * - CI/CD: Wait for Supabase to be ready before running tests
 * - Kubernetes: Readiness probe to determine if pod can accept traffic
 * - Local dev: Verify Supabase started successfully
 *
 * Response Format:
 * {
 *   status: 'ready' | 'not_ready',
 *   timestamp: ISO 8601 timestamp,
 *   latency: number (ms),
 *   services: {
 *     database: 'connected' | 'error' | 'timeout',
 *     storage: 'available' | 'error' | 'timeout'
 *   },
 *   version: string
 * }
 *
 * HTTP Status Codes:
 * - 200: All critical services ready
 * - 503: One or more critical services not ready
 *
 * @module health-ready
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors-config.ts";

/**
 * Service status type
 */
type ServiceStatus = 'connected' | 'available' | 'error' | 'timeout';

/**
 * Readiness status
 */
type ReadinessStatus = 'ready' | 'not_ready';

/**
 * Readiness check response structure
 */
interface ReadinessCheckResponse {
  status: ReadinessStatus;
  timestamp: string;
  latency: number;
  services: {
    database: ServiceStatus;
    storage: ServiceStatus;
  };
  version: string;
}

/**
 * Check timeout duration (ms)
 */
const CHECK_TIMEOUT_MS = 5000;

/**
 * Application version (update when deploying major changes)
 */
const APP_VERSION = '2025-11-24';

/**
 * Check database connectivity
 * Performs a lightweight query to verify PostgreSQL connection
 */
async function checkDatabase(): Promise<ServiceStatus> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase credentials');
      return 'error';
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Execute lightweight query with timeout
    const checkPromise = supabase
      .from('chat_sessions')
      .select('id')
      .limit(1);

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Database check timeout')), CHECK_TIMEOUT_MS)
    );

    await Promise.race([checkPromise, timeoutPromise]);

    return 'connected';
  } catch (error) {
    if (error instanceof Error && error.message.includes('timeout')) {
      console.error('Database check timeout:', error);
      return 'timeout';
    }
    console.error('Database check failed:', error);
    return 'error';
  }
}

/**
 * Check Supabase Storage availability
 * Verifies storage bucket exists and is accessible
 */
async function checkStorage(): Promise<ServiceStatus> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase credentials');
      return 'error';
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if generated-images bucket exists
    const checkPromise = supabase
      .storage
      .from('generated-images')
      .list('', { limit: 1 });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Storage check timeout')), CHECK_TIMEOUT_MS)
    );

    const { error } = await Promise.race([checkPromise, timeoutPromise]);

    if (error) {
      console.error('Storage check failed:', error);
      return 'error';
    }

    return 'available';
  } catch (error) {
    if (error instanceof Error && error.message.includes('timeout')) {
      console.error('Storage check timeout:', error);
      return 'timeout';
    }
    console.error('Storage check failed:', error);
    return 'error';
  }
}

/**
 * Determine readiness status based on service statuses
 */
function determineReadinessStatus(services: Record<string, ServiceStatus>): ReadinessStatus {
  const statuses = Object.values(services);

  // All services must be healthy for readiness
  if (statuses.every(s => s === 'connected' || s === 'available')) {
    return 'ready';
  }

  return 'not_ready';
}

serve(async (req) => {
  const origin = req.headers.get("Origin");
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(req);
  }

  const startTime = Date.now();
  const requestId = crypto.randomUUID();

  console.log(`[${requestId}] Readiness check started`);

  try {
    // Run critical health checks in parallel
    const [database, storage] = await Promise.all([
      checkDatabase(),
      checkStorage()
    ]);

    const services = {
      database,
      storage
    };

    const status = determineReadinessStatus(services);
    const latency = Date.now() - startTime;

    const response: ReadinessCheckResponse = {
      status,
      timestamp: new Date().toISOString(),
      latency,
      services,
      version: APP_VERSION
    };

    console.log(`[${requestId}] Readiness check completed: ${status} (${latency}ms)`);

    // Return appropriate HTTP status code
    const httpStatus = status === 'ready' ? 200 : 503;

    return new Response(
      JSON.stringify(response, null, 2),
      {
        status: httpStatus,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'X-Request-ID': requestId,
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      }
    );

  } catch (error) {
    console.error(`[${requestId}] Readiness check failed:`, error);

    const latency = Date.now() - startTime;

    const errorResponse: ReadinessCheckResponse = {
      status: 'not_ready',
      timestamp: new Date().toISOString(),
      latency,
      services: {
        database: 'error',
        storage: 'error'
      },
      version: APP_VERSION
    };

    return new Response(
      JSON.stringify(errorResponse, null, 2),
      {
        status: 503,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'X-Request-ID': requestId,
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      }
    );
  }
});
