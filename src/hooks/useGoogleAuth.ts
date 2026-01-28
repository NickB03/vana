import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { AuthError } from '@supabase/supabase-js';

export function useGoogleAuth() {
  const { toast } = useToast();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const signInWithGoogle = async () => {
    setIsGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth`,
        },
      });

      if (error) {
        throw error;
      }
      // Note: On success, Supabase will redirect, so loading state persists
    } catch (error) {
      // Handle different types of OAuth errors
      let errorMessage = "Unable to sign in with Google. Please try again.";

      if (error && typeof error === 'object' && 'message' in error) {
        const authError = error as AuthError;

        if (authError.message?.includes('popup')) {
          errorMessage = "Please allow popups for this site to use Google sign-in.";
        } else if (authError.message?.includes('network')) {
          errorMessage = "Network error. Please check your connection.";
        } else if (authError.message) {
          errorMessage = authError.message;
        }
      }

      toast({
        title: "Google Sign-In Failed",
        description: errorMessage,
        variant: "destructive",
      });
      setIsGoogleLoading(false);
    }
  };

  return { signInWithGoogle, isGoogleLoading };
}
