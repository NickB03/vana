import { supabase } from "@/integrations/supabase/client";

/**
 * Validates and refreshes the current session if needed.
 * Returns the valid session or null if authentication failed.
 */
export async function ensureValidSession() {
  try {
    // First try to get the current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error("Session error:", sessionError);
      return null;
    }

    // If we have a valid session, return it
    if (session) {
      return session;
    }

    // If no session, try to refresh
    console.log("No session found, attempting to refresh...");
    const { data: { session: refreshedSession }, error: refreshError } = 
      await supabase.auth.refreshSession();
    
    if (refreshError) {
      console.error("Session refresh failed:", refreshError);
      return null;
    }

    if (refreshedSession) {
      console.log("Session refreshed successfully");
      return refreshedSession;
    }

    console.warn("No session available after refresh attempt");
    return null;
  } catch (error) {
    console.error("Unexpected error in ensureValidSession:", error);
    return null;
  }
}

/**
 * Creates a user-friendly error message based on the error type
 */
export function getAuthErrorMessage(error: any): string {
  if (error?.message?.includes("Not authenticated")) {
    return "Your session has expired. Please refresh the page to continue.";
  }
  
  if (error?.message?.includes("JWT")) {
    return "Authentication token invalid. Please sign in again.";
  }
  
  return error?.message || "An authentication error occurred";
}
