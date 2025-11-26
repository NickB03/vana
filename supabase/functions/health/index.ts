/**
 * Health Check Endpoint
 *
 * Provides system-wide health status for monitoring and observability.
 * Checks connectivity to critical dependencies: database, OpenRouter API, and storage.
 *
 * Endpoint: /functions/v1/health
 * Method: GET
 * Authentication: None (public endpoint for monitoring)
 *
 * Response Format:
 * {
 *   status: 'healthy' | 'degraded' | 'unhealthy',
 *   timestamp: ISO 8601 timestamp,
 *   latency: number (ms),
 *   services: {
 *     database: 'connected' | 'error' | 'timeout',
 *     openrouter: 'available' | 'error' | 'timeout',
 *     storage: 'available' | 'error' | 'timeout'
 *   },
 *   version: string
 * }
 *
 * HTTP Status Codes:
 * - 200: All services healthy
 * - 503: One or more services degraded/unhealthy
 *
 * @module health
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors-config.ts";
import { API_ENDPOINTS } from "../_shared/config.ts";

/**
 * Service health status type
 */
type ServiceStatus = 'connected' | 'available' | 'error' | 'timeout';

/**
 * Overall system health status
 */
type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

/**
 * Health check response structure
 */
interface HealthCheckResponse {
  status: HealthStatus;
  timestamp: string;
  latency: number;
  services: {
    database: ServiceStatus;
    openrouter: ServiceStatus;
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
 * Check OpenRouter API availability
 * Performs a lightweight HEAD request to verify API connectivity
 */
async function checkOpenRouter(): Promise<ServiceStatus> {
  try {
    const apiKey = Deno.env.get('OPENROUTER_GEMINI_FLASH_KEY');

    if (!apiKey) {
      console.error('Missing OpenRouter API key');
      return 'error';
    }

    // Use HEAD request for minimal overhead
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS);

    const response = await fetch(`${API_ENDPOINTS.OPENROUTER.BASE_URL}/models`, {
      method: 'HEAD',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': Deno.env.get('SUPABASE_URL') || 'https://localhost',
        'X-Title': 'Health Check'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      return 'available';
    } else if (response.status === 429) {
      // Rate limited but API is responsive
      return 'available';
    } else {
      console.error('OpenRouter check failed:', response.status);
      return 'error';
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('OpenRouter check timeout');
      return 'timeout';
    }
    console.error('OpenRouter check failed:', error);
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
 * Determine overall health status based on service statuses
 */
function determineHealthStatus(services: Record<string, ServiceStatus>): HealthStatus {
  const statuses = Object.values(services);

  // All services healthy
  if (statuses.every(s => s === 'connected' || s === 'available')) {
    return 'healthy';
  }

  // Any service completely down
  if (statuses.some(s => s === 'error' || s === 'timeout')) {
    // Critical services (database) down = unhealthy
    if (services.database === 'error' || services.database === 'timeout') {
      return 'unhealthy';
    }
    // Non-critical services down = degraded
    return 'degraded';
  }

  return 'healthy';
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

  console.log(`[${requestId}] Health check started`);

  try {
    // Run all health checks in parallel for minimal latency
    const [database, openrouter, storage] = await Promise.all([
      checkDatabase(),
      checkOpenRouter(),
      checkStorage()
    ]);

    const services = {
      database,
      openrouter,
      storage
    };

    const status = determineHealthStatus(services);
    const latency = Date.now() - startTime;

    const response: HealthCheckResponse = {
      status,
      timestamp: new Date().toISOString(),
      latency,
      services,
      version: APP_VERSION
    };

    console.log(`[${requestId}] Health check completed: ${status} (${latency}ms)`);

    // Return appropriate HTTP status code
    const httpStatus = status === 'healthy' ? 200 : 503;

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
    console.error(`[${requestId}] Health check failed:`, error);

    const latency = Date.now() - startTime;

    const errorResponse: HealthCheckResponse = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      latency,
      services: {
        database: 'error',
        openrouter: 'error',
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
