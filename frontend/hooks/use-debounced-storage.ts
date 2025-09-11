/**
 * Custom hook for debounced storage event handling
 * 
 * Prevents rapid-fire storage events from causing state oscillation
 * by debouncing storage change handlers and batching updates.
 */

'use client';

import { useEffect, useRef, useCallback } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface StorageChangeEvent {
  key: string;
  newValue: string | null;
  oldValue: string | null;
  storageArea: Storage | null;
}

export type StorageChangeHandler = (event: StorageChangeEvent) => void;

// ============================================================================
// Constants
// ============================================================================

const DEBOUNCE_DELAY = 100; // ms to debounce storage events
const MAX_PENDING_EVENTS = 50; // Maximum queued events before force flush

// ============================================================================
// Custom Hook
// ============================================================================

export function useDebouncedStorage(
  keys: string[],
  handler: StorageChangeHandler,
  delay: number = DEBOUNCE_DELAY
) {
  const handlerRef = useRef(handler);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingEventsRef = useRef<StorageChangeEvent[]>([]);
  
  // Update handler ref when it changes
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);
  
  // Process pending events
  const processPendingEvents = useCallback(() => {
    if (pendingEventsRef.current.length === 0) return;
    
    // Get unique events by key (latest event wins)
    const eventMap = new Map<string, StorageChangeEvent>();
    
    pendingEventsRef.current.forEach(event => {
      eventMap.set(event.key, event);
    });
    
    // Process unique events
    eventMap.forEach(event => {
      handlerRef.current(event);
    });
    
    // Clear pending events
    pendingEventsRef.current = [];
  }, []);
  
  // Clear debounce timer
  const clearDebounceTimer = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  }, []);
  
  // Schedule processing of events
  const scheduleProcessing = useCallback(() => {
    clearDebounceTimer();
    
    debounceTimerRef.current = setTimeout(() => {
      processPendingEvents();
    }, delay);
  }, [delay, processPendingEvents, clearDebounceTimer]);
  
  // Add event to queue
  const queueEvent = useCallback((event: StorageChangeEvent) => {
    pendingEventsRef.current.push(event);
    
    // Force process if queue is too large
    if (pendingEventsRef.current.length >= MAX_PENDING_EVENTS) {
      clearDebounceTimer();
      processPendingEvents();
      return;
    }
    
    scheduleProcessing();
  }, [scheduleProcessing, processPendingEvents, clearDebounceTimer]);
  
  // Storage event handler
  const handleStorageEvent = useCallback((e: StorageEvent) => {
    // Only handle events for our keys
    if (!e.key || !keys.includes(e.key)) return;
    
    const event: StorageChangeEvent = {
      key: e.key,
      newValue: e.newValue,
      oldValue: e.oldValue,
      storageArea: e.storageArea,
    };
    
    queueEvent(event);
  }, [keys, queueEvent]);
  
  // Set up storage event listener
  useEffect(() => {
    window.addEventListener('storage', handleStorageEvent);
    
    return () => {
      window.removeEventListener('storage', handleStorageEvent);
      clearDebounceTimer();
      // Process any remaining events on cleanup
      processPendingEvents();
    };
  }, [handleStorageEvent, clearDebounceTimer, processPendingEvents]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearDebounceTimer();
      pendingEventsRef.current = [];
    };
  }, [clearDebounceTimer]);
  
  // Return utilities
  return {
    // Force process any pending events
    flush: processPendingEvents,
    
    // Check if events are pending
    hasPendingEvents: () => pendingEventsRef.current.length > 0,
    
    // Get pending event count
    getPendingCount: () => pendingEventsRef.current.length,
    
    // Clear pending events without processing
    clearPending: () => {
      pendingEventsRef.current = [];
      clearDebounceTimer();
    },
  };
}

export default useDebouncedStorage;