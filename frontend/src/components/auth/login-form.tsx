'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/use-auth';
import { LoginCredentials } from '@/types/auth';

const loginSchema = z.object({
  username: z.string().min(1, 'Please enter a username'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

interface LoginFormProps {
  onSuccess?: () => void;
  onSwitchToRegister?: () => void;
}

export function LoginForm({ onSuccess, onSwitchToRegister }: LoginFormProps) {
  const { login, loginWithGoogle, isLoading, error } = useAuth();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const form = useForm<LoginCredentials>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginCredentials) => {
    try {
      await login(data);
      onSuccess?.();
    } catch {
      // Error is handled by the store
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setIsGoogleLoading(true);
      await loginWithGoogle();
    } catch {
      // Error is handled by the store
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto" role="form" aria-labelledby="login-title">
      <CardHeader className="space-y-1 px-6 py-6">
        <CardTitle id="login-title" className="text-2xl font-bold text-center">
          Welcome back
        </CardTitle>
        <CardDescription className="text-center">
          Sign in to your Vana account
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4 px-6 pb-6">
        {error && (
          <div 
            className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md dark:bg-red-950 dark:text-red-400 dark:border-red-800"
            role="alert"
            aria-live="assertive"
            id="login-error"
          >
            {error}
          </div>
        )}
        
        <form 
          onSubmit={form.handleSubmit(onSubmit)} 
          className="space-y-4"
          noValidate
          aria-describedby={error ? 'login-error' : undefined}
        >
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              type="text"
              placeholder="Enter your username"
              {...form.register('username')}
              disabled={isLoading}
              aria-invalid={!!form.formState.errors.username}
              aria-describedby={form.formState.errors.username ? 'username-error' : undefined}
              required
            />
            {form.formState.errors.username && (
              <p 
                id="username-error"
                className="text-sm text-red-600 dark:text-red-400"
                role="alert"
                aria-live="polite"
              >
                {form.formState.errors.username.message}
              </p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              {...form.register('password')}
              disabled={isLoading}
              aria-invalid={!!form.formState.errors.password}
              aria-describedby={form.formState.errors.password ? 'password-error' : undefined}
              required
              minLength={6}
            />
            {form.formState.errors.password && (
              <p 
                id="password-error"
                className="text-sm text-red-600 dark:text-red-400"
                role="alert"
                aria-live="polite"
              >
                {form.formState.errors.password.message}
              </p>
            )}
          </div>
          
          <Button 
            type="submit" 
            className="w-full" 
            disabled={isLoading}
            aria-describedby="sign-in-status"
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </Button>
          <div id="sign-in-status" className="sr-only" aria-live="polite">
            {isLoading ? 'Signing in, please wait...' : ''}
          </div>
        </form>
        
        <div className="relative" role="separator" aria-label="Alternative sign in methods">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" aria-hidden="true" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Or continue with
            </span>
          </div>
        </div>
        
        <Button
          variant="outline"
          className="w-full"
          onClick={handleGoogleLogin}
          disabled={isGoogleLoading}
          aria-describedby="google-login-status"
          aria-label="Sign in with Google"
        >
          {isGoogleLoading ? 'Connecting...' : 'Google'}
        </Button>
        <div id="google-login-status" className="sr-only" aria-live="polite">
          {isGoogleLoading ? 'Connecting to Google, please wait...' : ''}
        </div>
        
        <div className="text-center text-sm">
          Don&apos;t have an account?{' '}
          <button
            type="button"
            className="underline underline-offset-4 hover:text-primary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded"
            onClick={onSwitchToRegister}
            aria-label="Switch to registration form"
          >
            Sign up
          </button>
        </div>
      </CardContent>
    </Card>
  );
}