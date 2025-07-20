'use client';

import { useEffect, useCallback, useRef } from 'react';
import { KanbanData } from '@/lib/types';

interface UsFileSyncProps {
  onDataChange: (data: KanbanData) => void;
  enabled?: boolean;
}

export const useFileSync = ({ onDataChange, enabled = true }: UsFileSyncProps) => {
  const lastUpdateRef = useRef<Date | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Poll the sync API for changes
  const checkForUpdates = useCallback(async () => {
    try {
      const response = await fetch('/api/sync', {
        method: 'GET',
        cache: 'no-cache',
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          const serverUpdate = new Date(result.data.lastUpdated);
          
          // Only update if the server data is newer than our last known update
          if (!lastUpdateRef.current || serverUpdate > lastUpdateRef.current) {
            lastUpdateRef.current = serverUpdate;
            onDataChange(result.data);
          }
        }
      }
    } catch (error) {
      console.error('Failed to check for file updates:', error);
    }
  }, [onDataChange]);

  // Start/stop polling based on enabled state
  useEffect(() => {
    if (enabled) {
      // Initial check
      checkForUpdates();
      
      // Set up polling every 5 seconds
      intervalRef.current = setInterval(checkForUpdates, 5000);
      
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    }
  }, [enabled, checkForUpdates]);

  // Export data to file
  const exportToFile = useCallback(async (data: KanbanData) => {
    try {
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          lastUpdateRef.current = new Date(result.data.lastUpdated);
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Failed to export data to file:', error);
      return false;
    }
  }, []);

  return {
    exportToFile,
    isWatching: !!intervalRef.current,
  };
};