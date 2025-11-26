/**
 * Authentication middleware
 * Handles user authentication and session ownership verification
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";
import type { SupabaseClient, User } from "https://esm.sh/@supabase/supabase-js@2.75.1";

export interface AuthResult {
  ok: boolean;
  supabase: SupabaseClient;
  user: User | null;
  error?: {
    error: string;
    requestId: string;
    debug?: Record<string, unknown>;
  };
}

/**
 * Authenticates the user and creates a Supabase client
 * Returns both authenticated and guest clients based on isGuest flag
 */
export async function authenticateUser(
  req: Request,
  isGuest: boolean,
  requestId: string
): Promise<AuthResult> {
  // Create supabase client for ALL users (guest and authenticated)
  // Guests get basic anon key access, auth users get enhanced client
  let supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  let user = null;

  // Authenticated users - verify auth and recreate client with auth header
  if (!isGuest) {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error(
        `[${requestId}] No authorization header for authenticated user`
      );
      return {
        ok: false,
        supabase,
        user: null,
        error: {
          error: "No authorization header",
          requestId,
          debug: { isGuest, type: typeof isGuest, notIsGuest: !isGuest },
        },
      };
    }

    // Recreate client with auth header for authenticated access
    supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    if (!authUser) {
      console.error(`[${requestId}] Invalid auth token`);
      return {
        ok: false,
        supabase,
        user: null,
        error: {
          error: "Unauthorized",
          requestId,
        },
      };
    }
    user = authUser;
  }

  return {
    ok: true,
    supabase,
    user,
  };
}

/**
 * Verifies that the user owns the session they're trying to access
 */
export async function verifySessionOwnership(
  supabase: SupabaseClient,
  sessionId: string | undefined,
  userId: string,
  requestId: string
): Promise<{ ok: boolean; error?: { error: string; requestId: string } }> {
  if (!sessionId) {
    return { ok: true }; // No session to verify
  }

  const { data: session, error: sessionError } = await supabase
    .from("chat_sessions")
    .select("user_id")
    .eq("id", sessionId)
    .single();

  if (sessionError || !session || session.user_id !== userId) {
    console.error(
      `[${requestId}] Unauthorized session access:`,
      { sessionId, userId, sessionError }
    );
    return {
      ok: false,
      error: {
        error: "Unauthorized access to session",
        requestId,
      },
    };
  }

  return { ok: true };
}
