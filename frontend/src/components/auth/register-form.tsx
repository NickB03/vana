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
import { RegisterCredentials } from '@/types/auth';

const registerSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  username: z.string().min(3, 'Username must be at least 3 characters').max(50, 'Username too long'),
  first_name: z.string().min(2, 'First name must be at least 2 characters').max(50, 'First name too long'),
  last_name: z.string().min(2, 'Last name must be at least 2 characters').max(50, 'Last name too long'),
  password: z.string().min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/, 'Password must contain at least one special character'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type RegisterFormData = z.infer<typeof registerSchema>;

interface RegisterFormProps {
  onSuccess?: () => void;
  onSwitchToLogin?: () => void;
}

export function RegisterForm({ onSuccess, onSwitchToLogin }: RegisterFormProps) {
  const { register: registerUser, loginWithGoogle, isLoading, error } = useAuth();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      username: '',
      first_name: '',
      last_name: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    try {
      const credentials: RegisterCredentials = {
        email: data.email,
        username: data.username,
        first_name: data.first_name,
        last_name: data.last_name,
        password: data.password,
      };
      
      await registerUser(credentials);
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
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">
          Create an account
        </CardTitle>
        <CardDescription className="text-center">
          Get started with Vana
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md dark:bg-red-950 dark:text-red-400 dark:border-red-800">
            {error}
          </div>
        )}
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              type="text"
              placeholder="Your username"
              {...form.register('username')}
              disabled={isLoading}
            />
            {form.formState.errors.username && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {form.formState.errors.username.message}
              </p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="first_name">First Name</Label>
            <Input
              id="first_name"
              type="text"
              placeholder="Your first name"
              {...form.register('first_name')}
              disabled={isLoading}
            />
            {form.formState.errors.first_name && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {form.formState.errors.first_name.message}
              </p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="last_name">Last Name</Label>
            <Input
              id="last_name"
              type="text"
              placeholder="Your last name"
              {...form.register('last_name')}
              disabled={isLoading}
            />
            {form.formState.errors.last_name && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {form.formState.errors.last_name.message}
              </p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              {...form.register('email')}
              disabled={isLoading}
            />
            {form.formState.errors.email && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {form.formState.errors.email.message}
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
            />
            <p className="text-xs text-muted-foreground">
              Password must be at least 8 characters with uppercase, lowercase, number, and special character
            </p>
            {form.formState.errors.password && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {form.formState.errors.password.message}
              </p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              {...form.register('confirmPassword')}
              disabled={isLoading}
            />
            {form.formState.errors.confirmPassword && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {form.formState.errors.confirmPassword.message}
              </p>
            )}
          </div>
          
          <Button 
            type="submit" 
            className="w-full" 
            disabled={isLoading}
          >
            {isLoading ? 'Creating account...' : 'Create Account'}
          </Button>
        </form>
        
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
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
        >
          {isGoogleLoading ? 'Connecting...' : 'Google'}
        </Button>
        
        <div className="text-center text-sm">
          Already have an account?{' '}
          <button
            type="button"
            className="underline underline-offset-4 hover:text-primary"
            onClick={onSwitchToLogin}
          >
            Sign in
          </button>
        </div>
      </CardContent>
    </Card>
  );
}