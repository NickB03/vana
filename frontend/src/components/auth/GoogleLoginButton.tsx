/**
 * Google Login Button Component
 * Provides OAuth login with Google
 */

'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/ui/icons';
import { cn } from '@/lib/utils';

interface GoogleLoginButtonProps {
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  text?: string;
  loadingText?: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function GoogleLoginButton({
  className,
  variant = 'outline',
  size = 'default',
  text = 'Continue with Google',
  loadingText = 'Signing in...',
  onSuccess,
  onError
}: GoogleLoginButtonProps) {
  const { login, isLoading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    try {
      setIsLoading(true);
      // This should be replaced with proper Google OAuth flow
      await login({ username: '', password: '' });
      onSuccess?.();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const loading = isLoading || authLoading;

  return (
    <Button
      variant={variant}
      size={size}
      className={cn('relative', className)}
      onClick={handleLogin}
      disabled={loading}
    >
      {loading ? (
        <>
          <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
          {loadingText}
        </>
      ) : (
        <>
          <Icons.google className="mr-2 h-4 w-4" />
          {text}
        </>
      )}
    </Button>
  );
}