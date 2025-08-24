/**
 * 403 Forbidden Page
 * Shown when user lacks required permissions
 */

'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/ui/icons';

export default function ForbiddenPage() {
  const router = useRouter();

  return (
    <div className="container flex h-screen w-screen flex-col items-center justify-center">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
            <Icons.shield className="h-10 w-10 text-destructive" />
          </div>
          <CardTitle className="text-2xl">403 - Access Forbidden</CardTitle>
          <CardDescription>
            You don't have permission to access this resource
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-sm text-muted-foreground mb-4">
            This area requires special permissions. If you believe you should have access,
            please contact your administrator.
          </p>
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex items-center justify-center space-x-2 text-sm">
              <Icons.alertCircle className="h-4 w-4" />
              <span>Insufficient privileges</span>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button 
            className="flex-1"
            onClick={() => router.back()}
          >
            <Icons.arrowLeft className="mr-2 h-4 w-4" />
            Go Back
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