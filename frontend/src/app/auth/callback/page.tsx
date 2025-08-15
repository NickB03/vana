'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';

function CallbackContent() {
  const { handleGoogleCallback, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      console.error('OAuth error:', error);
      router.push('/auth/login?error=' + encodeURIComponent(error));
      return;
    }

    if (code && state) {
      handleGoogleCallback(code, state)
        .then(() => {
          router.push('/');
        })
        .catch((error) => {
          console.error('Callback error:', error);
          router.push('/auth/login?error=' + encodeURIComponent('Authentication failed'));
        });
    } else {
      router.push('/auth/login?error=' + encodeURIComponent('Invalid callback parameters'));
    }
  }, [searchParams, handleGoogleCallback, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="h-32 w-32 animate-spin rounded-full border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-lg text-muted-foreground">
          {isLoading ? 'Completing authentication...' : 'Processing...'}
        </p>
      </div>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-32 w-32 animate-spin rounded-full border-b-2 border-primary"></div>
      </div>
    }>
      <CallbackContent />
    </Suspense>
  );
}