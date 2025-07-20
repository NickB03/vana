'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface MCPStatus {
  status: 'healthy' | 'starting' | 'offline';
  last_check: string | null;
}

export function MCPStatusIndicator() {
  const [status, setStatus] = useState<MCPStatus>({ status: 'offline', last_check: null });
  const [isChecking, setIsChecking] = useState(false);

  const checkMCPStatus = async () => {
    setIsChecking(true);
    try {
      const response = await fetch('/api/mcp-status', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      } else {
        setStatus({ status: 'offline', last_check: null });
      }
    } catch (error) {
      console.error('MCP health check failed:', error);
      setStatus({ status: 'offline', last_check: null });
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    // Initial check
    checkMCPStatus();

    // Set up periodic checks every 30 seconds
    const interval = setInterval(checkMCPStatus, 30000);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = () => {
    switch (status.status) {
      case 'healthy':
        return 'bg-green-500';
      case 'starting':
        return 'bg-yellow-500';
      case 'offline':
      default:
        return 'bg-red-500';
    }
  };

  const getStatusText = () => {
    switch (status.status) {
      case 'healthy':
        return 'MCP Server Online';
      case 'starting':
        return 'MCP Server Starting';
      case 'offline':
      default:
        return 'MCP Server Offline';
    }
  };

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800">
      <div className="relative flex items-center">
        <div
          className={cn(
            'w-2 h-2 rounded-full',
            getStatusColor(),
            isChecking && 'animate-pulse'
          )}
        />
        {status.status === 'healthy' && (
          <div
            className={cn(
              'absolute w-2 h-2 rounded-full animate-ping',
              getStatusColor()
            )}
          />
        )}
      </div>
      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
        {getStatusText()}
      </span>
      {status.status === 'offline' && (
        <button
          onClick={checkMCPStatus}
          className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline ml-1"
          disabled={isChecking}
        >
          Retry
        </button>
      )}
    </div>
  );
}