/**
 * Login Page
 * Main authentication page with Google OAuth
 */

import { Suspense } from 'react';
import { AuthLoadingState } from '@/components/auth/AuthLoadingState';
import LoginContent from './LoginContent';

export default function LoginPage() {
  return (
    <Suspense fallback={<AuthLoadingState className="min-h-screen" size="lg" />}>
      <LoginContent />
    </Suspense>
  );
}