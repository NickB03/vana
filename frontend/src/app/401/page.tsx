/**
 * 401 Unauthorized Page
 * Shown when authentication is required
 */

'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/ui/icons';
import Link from 'next/link';

export default function UnauthorizedPage() {
  const router = useRouter();

  return (
    <div className="container flex h-screen w-screen flex-col items-center justify-center">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
            <Icons.lock className="h-10 w-10 text-destructive" />
          </div>
          <CardTitle className="text-2xl">401 - Authentication Required</CardTitle>
          <CardDescription>
            You need to be signed in to access this page
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-sm text-muted-foreground mb-4">
            Please sign in with your account to continue. If you don't have an account,
            contact your administrator for access.
          </p>
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex items-center justify-center space-x-2 text-sm">
              <Icons.info className="h-4 w-4" />
              <span>Your session may have expired</span>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button 
            className="flex-1"
            onClick={() => router.push('/auth/login')}
          >
            <Icons.login className="mr-2 h-4 w-4" />
            Sign In
          </Button>
          <Button 
            variant="outline"
            className="flex-1"
            onClick={() => router.push('/')}
          >
            <Icons.home className="mr-2 h-4 w-4" />
            Go Home
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}