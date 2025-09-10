/**
 * Login Form Component
 * Handles user authentication with Google ADK backend
 */

'use client';

import React, { useState } from 'react';
import { useAuth } from '../../lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingSpinner } from '../ui/loading-spinner';

export function LoginForm() {
  const { login, register, isLoading, error, isDevMode } = useAuth();
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    displayName: '',
    confirmPassword: ''
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear field-specific errors when user starts typing
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.email) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters long';
    }

    if (isRegisterMode) {
      if (!formData.displayName) {
        errors.displayName = 'Display name is required';
      }

      if (!formData.confirmPassword) {
        errors.confirmPassword = 'Please confirm your password';
      } else if (formData.password !== formData.confirmPassword) {
        errors.confirmPassword = 'Passwords do not match';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      if (isRegisterMode) {
        await register({
          email: formData.email,
          password: formData.password,
          displayName: formData.displayName
        });
      } else {
        await login({
          email: formData.email,
          password: formData.password
        });
      }
    } catch (err) {
      console.error('Authentication error:', err);
      // Error handling is managed by the auth service
    }
  };

  if (isDevMode()) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Development Mode</CardTitle>
          <CardDescription>
            Authentication is disabled in development mode. You are automatically logged in.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              To enable authentication, set NEXT_PUBLIC_AUTH_REQUIRE_SSE_AUTH=true in your environment variables.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>{isRegisterMode ? 'Create Account' : 'Sign In'}</CardTitle>
        <CardDescription>
          {isRegisterMode 
            ? 'Enter your information to create an account'
            : 'Enter your email and password to sign in'
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="your@email.com"
              disabled={isLoading}
              className={formErrors.email ? 'border-red-500' : ''}
            />
            {formErrors.email && (
              <p className="text-sm text-red-500">{formErrors.email}</p>
            )}
          </div>

          {isRegisterMode && (
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                name="displayName"
                type="text"
                value={formData.displayName}
                onChange={handleInputChange}
                placeholder="Your Name"
                disabled={isLoading}
                className={formErrors.displayName ? 'border-red-500' : ''}
              />
              {formErrors.displayName && (
                <p className="text-sm text-red-500">{formErrors.displayName}</p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="••••••••"
              disabled={isLoading}
              className={formErrors.password ? 'border-red-500' : ''}
            />
            {formErrors.password && (
              <p className="text-sm text-red-500">{formErrors.password}</p>
            )}
          </div>

          {isRegisterMode && (
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                placeholder="••••••••"
                disabled={isLoading}
                className={formErrors.confirmPassword ? 'border-red-500' : ''}
              />
              {formErrors.confirmPassword && (
                <p className="text-sm text-red-500">{formErrors.confirmPassword}</p>
              )}
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                {isRegisterMode ? 'Creating Account...' : 'Signing In...'}
              </>
            ) : (
              isRegisterMode ? 'Create Account' : 'Sign In'
            )}
          </Button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setIsRegisterMode(!isRegisterMode);
                setFormErrors({});
                setFormData({
                  email: formData.email,
                  password: '',
                  displayName: '',
                  confirmPassword: ''
                });
              }}
              className="text-sm text-blue-600 hover:text-blue-500 disabled:opacity-50"
              disabled={isLoading}
            >
              {isRegisterMode 
                ? 'Already have an account? Sign in'
                : 'Need an account? Sign up'
              }
            </button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}