/**
 * Offline Mode Component
 * Displays when backend is unavailable and provides demo functionality
 */

import React from 'react';
import { Alert, AlertDescription } from './ui/alert';
import { Button } from './ui/button';
import { WifiOff, RefreshCw } from 'lucide-react';

interface OfflineModeProps {
  onRetry?: () => void;
  message?: string;
}

export function OfflineMode({ 
  onRetry, 
  message = "Backend is currently unavailable. You're viewing in demo mode." 
}: OfflineModeProps) {
  return (
    <Alert className="bg-amber-50 border-amber-200 text-amber-800 mb-4">
      <WifiOff className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <span>{message}</span>
        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="ml-2 h-8 px-3 text-xs"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Retry
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}

export default OfflineMode;