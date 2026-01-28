import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { supabase } from "@/integrations/supabase/client";
import { LoginForm } from "@/components/LoginForm";
import { useToast } from "@/hooks/use-toast";
import { PageLayout } from "@/components/layout/PageLayout";
import { fadeInUp } from "@/utils/animationConstants";

export default function Auth() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isProcessingOAuth, setIsProcessingOAuth] = useState(false);
  // Track first load to prevent Safari race condition with password manager
  // Safari aggressively restores localStorage, causing stale sessions to redirect immediately
  const isFirstLoad = useRef(true);

  useEffect(() => {
    // Check if this is an OAuth callback (has hash or code in URL)
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const queryParams = new URLSearchParams(window.location.search);

    // Check for OAuth errors first
    const hasError = queryParams.has('error') || hashParams.has('error');
    const hasOAuthParams = hashParams.has('access_token') || queryParams.has('code');

    if (hasError) {
      const error = queryParams.get('error') || hashParams.get('error');
      const errorDescription = queryParams.get('error_description') || hashParams.get('error_description');
      const errorCode = queryParams.get('error_code') || hashParams.get('error_code');

      console.error('OAuth error:', { error, errorCode, errorDescription });

      // Display user-friendly error message
      let userMessage = "Failed to sign in with Google. Please try again.";

      if (errorDescription?.includes('Unable to exchange external code')) {
        userMessage = "Google sign-in configuration error. Please ensure:\n" +
                     "1. The redirect URI in Google Cloud Console matches your current domain\n" +
                     "2. The OAuth credentials are correctly configured in Supabase\n\n" +
                     "Contact support if the issue persists.";
      } else if (errorDescription) {
        userMessage = decodeURIComponent(errorDescription.replace(/\+/g, ' '));
      }

      toast({
        title: "OAuth Error",
        description: userMessage,
        variant: "destructive",
        duration: 10000, // Show for 10 seconds
      });

      // Clean up the URL to remove error parameters
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);

      setIsProcessingOAuth(false);
      return;
    }

    if (hasOAuthParams) {
      console.log('OAuth callback detected, processing...');
      setIsProcessingOAuth(true);
    }

    // Check if user is already logged in with VALID session
    // Only redirect if we have OAuth params (callback) - otherwise let user stay on auth page
    // This prevents Safari's aggressive localStorage restoration from causing unwanted redirects
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      console.log('Initial session check:', session ? 'Session exists' : 'No session');

      if (error) {
        console.error('Session check error:', error);
        return;
      }

      // Only auto-redirect if this is an OAuth callback with valid session
      // Regular navigation to /auth should show the login form, not auto-redirect
      if (session && hasOAuthParams) {
        // Verify session is actually valid by making a test auth call
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
          // Session exists but is invalid/expired - clear it
          console.log('Session invalid/expired, clearing and staying on auth page');
          await supabase.auth.signOut();
          return;
        }

        // Session is valid and we have OAuth params - redirect to home
        console.log('Valid session found with OAuth callback, redirecting to /');
        navigate("/");
      }
    });

    // Listen for auth changes (critical for OAuth)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session ? 'Session exists' : 'No session');

      // Skip INITIAL_SESSION on first load to prevent Safari password manager race condition
      // Safari restores localStorage so fast that stale sessions trigger immediate redirects
      if (event === 'INITIAL_SESSION' && isFirstLoad.current) {
        console.log('Skipping INITIAL_SESSION redirect on first load (Safari fix)');
        isFirstLoad.current = false;
        return;
      }

      if (event === 'SIGNED_OUT') {
        console.log('User signed out, staying on auth page');
        return;
      }

      if (event === 'SIGNED_IN' && session) {
        console.log('User signed in via OAuth, redirecting to /');
        navigate("/");
      } else if (session && event !== 'INITIAL_SESSION') {
        // Only redirect for non-initial session events (e.g., TOKEN_REFRESHED)
        // Validate session before redirecting
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
          console.log('Invalid session in auth state change, staying on auth page');
          await supabase.auth.signOut();
          return;
        }

        console.log('Valid session detected, redirecting to /');
        navigate("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, toast]);

  return (
    <PageLayout className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        {isProcessingOAuth ? (
          <motion.div
            {...fadeInUp}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center gap-4"
          >
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="text-sm text-muted-foreground">Completing sign in...</p>
          </motion.div>
        ) : (
          <LoginForm />
        )}
      </div>
    </PageLayout>
  );
}
