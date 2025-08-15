'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthGuard } from '@/components/auth/auth-guard';
import { LoginForm } from '@/components/auth/login-form';
import { RegisterForm } from '@/components/auth/register-form';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const router = useRouter();

  const handleSuccess = () => {
    router.push('/');
  };

  return (
    <AuthGuard requireAuth={false} redirectTo="/chat">
      <div className="min-h-screen min-h-[100vh] flex items-center justify-center bg-background p-4 sm:p-6 md:p-8">
        <div className="w-full max-w-md mx-auto">
          {isLogin ? (
            <LoginForm
              onSuccess={handleSuccess}
              onSwitchToRegister={() => setIsLogin(false)}
            />
          ) : (
            <RegisterForm
              onSuccess={handleSuccess}
              onSwitchToLogin={() => setIsLogin(true)}
            />
          )}
        </div>
      </div>
    </AuthGuard>
  );
}