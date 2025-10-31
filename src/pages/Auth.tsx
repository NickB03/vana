import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { LoginForm } from "@/components/LoginForm";
import { useToast } from "@/hooks/use-toast";

export default function Auth() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isProcessingOAuth, setIsProcessingOAuth] = useState(false);

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

    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session check:', session ? 'Session exists' : 'No session');
      if (session) {
        console.log('Redirecting to / with existing session');
        navigate("/");
      }
    });

    // Listen for auth changes (critical for OAuth)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session ? 'Session exists' : 'No session');

      if (event === 'SIGNED_IN' && session) {
        console.log('User signed in via OAuth, redirecting to /');
        navigate("/");
      } else if (session) {
        console.log('Session detected, redirecting to /');
        navigate("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, toast]);

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        {isProcessingOAuth ? (
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="text-sm text-muted-foreground">Completing sign in...</p>
          </div>
        ) : (
          <LoginForm />
        )}
      </div>
    </div>
  );
}
