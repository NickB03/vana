import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { LoginForm } from "@/components/LoginForm";

export default function Auth() {
  const navigate = useNavigate();
  const [isProcessingOAuth, setIsProcessingOAuth] = useState(false);

  useEffect(() => {
    // Check if this is an OAuth callback (has hash or code in URL)
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const queryParams = new URLSearchParams(window.location.search);
    const hasOAuthParams = hashParams.has('access_token') || queryParams.has('code');

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
  }, [navigate]);

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
