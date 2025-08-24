/**
 * Login Page
 * Main authentication page with Google OAuth
 */

'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { GoogleLoginButton } from '@/components/auth/GoogleLoginButton';
import { AuthLoadingState } from '@/components/auth/AuthLoadingState';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Icons } from '@/components/ui/icons';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, loading, error, clearError } = useAuth();
  
  const redirect = searchParams.get('redirect') || '/chat';
  const errorParam = searchParams.get('error');
  
  useEffect(() => {
    if (isAuthenticated) {
      // Get the intended destination from session storage or URL param
      const intendedDestination = sessionStorage.getItem('auth_redirect') || redirect;
      sessionStorage.removeItem('auth_redirect');
      router.push(intendedDestination);
    }
  }, [isAuthenticated, redirect, router]);
  
  const handleLoginSuccess = () => {
    // The redirect will be handled by the useEffect above
  };
  
  const handleLoginError = (errorMessage: string) => {
    console.error('Login error:', errorMessage);
  };
  
  if (loading) {
    return <AuthLoadingState className="min-h-screen" size="lg" />;
  }
  
  return (
    <div className="container flex h-screen w-screen flex-col items-center justify-center">
      <Link
        href="/"
        className="absolute left-4 top-4 md:left-8 md:top-8 flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
      >
        <Icons.chevronLeft className="mr-2 h-4 w-4" />
        Back
      </Link>
      
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold tracking-tight">
              Welcome to Vana
            </CardTitle>
            <CardDescription>
              Sign in to your account to continue
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {/* Error Display */}
            {(error || errorParam) && (
              <Alert variant="destructive">
                <Icons.alertCircle className="h-4 w-4" />
                <AlertTitle>Authentication Error</AlertTitle>
                <AlertDescription>
                  {error || errorParam || 'An error occurred during authentication'}
                </AlertDescription>
              </Alert>
            )}
            
            {/* OAuth Error Messages */}
            {errorParam === 'access_denied' && (
              <Alert>
                <Icons.info className="h-4 w-4" />
                <AlertTitle>Access Denied</AlertTitle>
                <AlertDescription>
                  You denied access to your Google account. Please try again if you want to continue.
                </AlertDescription>
              </Alert>
            )}
            
            {/* Google Login Button */}
            <GoogleLoginButton
              className="w-full"
              size="lg"
              text="Sign in with Google"
              loadingText="Redirecting to Google..."
              onSuccess={handleLoginSuccess}
              onError={handleLoginError}
            />
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Secure authentication
                </span>
              </div>
            </div>
            
            {/* Security Features */}
            <div className="space-y-2 text-center text-sm text-muted-foreground">
              <div className="flex items-center justify-center space-x-2">
                <Icons.shield className="h-4 w-4" />
                <span>OAuth 2.0 with PKCE</span>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <Icons.lock className="h-4 w-4" />
                <span>End-to-end encryption</span>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <Icons.check className="h-4 w-4" />
                <span>No passwords stored</span>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-2">
            <p className="text-center text-xs text-muted-foreground">
              By signing in, you agree to our{' '}
              <Link href="/terms" className="underline underline-offset-4 hover:text-primary">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="underline underline-offset-4 hover:text-primary">
                Privacy Policy
              </Link>
            </p>
          </CardFooter>
        </Card>
        
        {/* Additional Info */}
        <div className="text-center text-sm text-muted-foreground">
          <p>
            Need help?{' '}
            <Link href="/support" className="underline underline-offset-4 hover:text-primary">
              Contact support
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}