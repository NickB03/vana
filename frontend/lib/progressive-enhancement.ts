/**
 * Progressive Enhancement Utilities for Chat Interface
 * 
 * Provides utilities for graceful degradation and enhancement based on:
 * - Network conditions
 * - Connection quality
 * - Device capabilities
 * - User preferences
 */

import type { NetworkNavigator } from '@/types/research'

// ============================================================================
// Network Quality Detection
// ============================================================================

export type NetworkQuality = 'fast' | 'moderate' | 'slow' | 'offline';
export type ConnectionType = 'wifi' | 'cellular' | 'ethernet' | 'unknown';

interface NetworkInformation {
  effectiveType?: '4g' | '3g' | '2g' | 'slow-2g';
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
  type?: 'wifi' | 'cellular' | 'ethernet' | 'bluetooth' | 'unknown';
  addEventListener?: (event: string, handler: () => void) => void;
  removeEventListener?: (event: string, handler: () => void) => void;
}

type NavigatorWithConnection = Navigator & {
  connection?: NetworkInformation;
  mozConnection?: NetworkInformation;
  webkitConnection?: NetworkInformation;
};

interface NetworkInfo {
  quality: NetworkQuality;
  type: ConnectionType;
  effectiveType: '4g' | '3g' | '2g' | 'slow-2g' | 'unknown';
  downlink: number; // Mbps
  rtt: number; // milliseconds
  saveData: boolean;
}

/**
 * Get current network information
 */
export function getNetworkInfo(): NetworkInfo {
  const defaultInfo: NetworkInfo = {
    quality: 'moderate',
    type: 'unknown',
    effectiveType: 'unknown',
    downlink: 10,
    rtt: 100,
    saveData: false
  };

  if (typeof window === 'undefined' || !navigator.onLine) {
    return { ...defaultInfo, quality: 'offline' };
  }

  // Check if Network Information API is available
  const connection = (navigator as NavigatorWithConnection).connection || 
    (navigator as NavigatorWithConnection).mozConnection || 
    (navigator as NavigatorWithConnection).webkitConnection;
  
  if (!connection) {
    return defaultInfo;
  }

  const effectiveType = connection.effectiveType || 'unknown';
  const downlink = connection.downlink || 10;
  const rtt = connection.rtt || 100;
  const saveData = connection.saveData || false;

  // Determine connection type
  let type: ConnectionType = 'unknown';
  if (connection.type) {
    switch (connection.type) {
      case 'wifi':
        type = 'wifi';
        break;
      case 'cellular':
        type = 'cellular';
        break;
      case 'ethernet':
        type = 'ethernet';
        break;
    }
  }

  // Determine quality based on effective type and metrics
  let quality: NetworkQuality = 'moderate';
  if (effectiveType === '4g' && downlink > 5 && rtt < 100) {
    quality = 'fast';
  } else if (effectiveType === '3g' || (downlink > 1.5 && rtt < 300)) {
    quality = 'moderate';
  } else if (effectiveType === '2g' || effectiveType === 'slow-2g' || downlink < 1.5) {
    quality = 'slow';
  }

  return {
    quality,
    type,
    effectiveType,
    downlink,
    rtt,
    saveData
  };
}

// ============================================================================
// Progressive Enhancement Strategies
// ============================================================================

export interface EnhancementSettings {
  // UI Features
  enableAnimations: boolean;
  enableRealTimeUpdates: boolean;
  enableAutoRetry: boolean;
  enablePreloading: boolean;
  
  // Connection Settings
  reconnectInterval: number; // milliseconds
  maxRetryAttempts: number;
  requestTimeout: number; // milliseconds
  
  // Performance Settings
  messageBufferSize: number;
  updateThrottleMs: number;
  enableCompression: boolean;
  
  // User Experience
  showDetailedStatus: boolean;
  enableOfflineMode: boolean;
  reducedMotion: boolean;
}

/**
 * Get enhancement settings based on network quality and user preferences
 */
export function getEnhancementSettings(networkInfo: NetworkInfo, userPreferences?: Partial<EnhancementSettings>): EnhancementSettings {
  // Base settings for different network qualities
  const baseSettings: Record<NetworkQuality, EnhancementSettings> = {
    fast: {
      enableAnimations: true,
      enableRealTimeUpdates: true,
      enableAutoRetry: true,
      enablePreloading: true,
      reconnectInterval: 1000,
      maxRetryAttempts: 5,
      requestTimeout: 30000,
      messageBufferSize: 100,
      updateThrottleMs: 100,
      enableCompression: false,
      showDetailedStatus: true,
      enableOfflineMode: false,
      reducedMotion: false
    },
    moderate: {
      enableAnimations: true,
      enableRealTimeUpdates: true,
      enableAutoRetry: true,
      enablePreloading: false,
      reconnectInterval: 2000,
      maxRetryAttempts: 3,
      requestTimeout: 20000,
      messageBufferSize: 50,
      updateThrottleMs: 300,
      enableCompression: true,
      showDetailedStatus: true,
      enableOfflineMode: false,
      reducedMotion: false
    },
    slow: {
      enableAnimations: false,
      enableRealTimeUpdates: false,
      enableAutoRetry: true,
      enablePreloading: false,
      reconnectInterval: 5000,
      maxRetryAttempts: 2,
      requestTimeout: 15000,
      messageBufferSize: 20,
      updateThrottleMs: 1000,
      enableCompression: true,
      showDetailedStatus: false,
      enableOfflineMode: true,
      reducedMotion: true
    },
    offline: {
      enableAnimations: false,
      enableRealTimeUpdates: false,
      enableAutoRetry: false,
      enablePreloading: false,
      reconnectInterval: 10000,
      maxRetryAttempts: 0,
      requestTimeout: 5000,
      messageBufferSize: 10,
      updateThrottleMs: 2000,
      enableCompression: true,
      showDetailedStatus: false,
      enableOfflineMode: true,
      reducedMotion: true
    }
  };

  // Get base settings for current network quality
  let settings = { ...baseSettings[networkInfo.quality] };

  // Apply user preferences for data saving
  if (networkInfo.saveData) {
    settings = {
      ...settings,
      enableAnimations: false,
      enablePreloading: false,
      enableCompression: true,
      messageBufferSize: Math.min(settings.messageBufferSize, 20),
      updateThrottleMs: Math.max(settings.updateThrottleMs, 500)
    };
  }

  // Check for reduced motion preference
  const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) {
    settings.enableAnimations = false;
    settings.reducedMotion = true;
  }

  // Apply user overrides
  if (userPreferences) {
    settings = { ...settings, ...userPreferences };
  }

  return settings;
}

// ============================================================================
// Connection Quality Monitor
// ============================================================================

export class ConnectionQualityMonitor {
  private callbacks: ((info: NetworkInfo) => void)[] = [];
  private currentInfo: NetworkInfo;
  private monitoring = false;
  private pollInterval?: NodeJS.Timeout;

  constructor() {
    this.currentInfo = getNetworkInfo();
  }

  /**
   * Start monitoring network quality
   */
  start(pollIntervalMs: number = 5000): void {
    if (this.monitoring) return;

    this.monitoring = true;
    
    // Listen for online/offline events
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleNetworkChange);
      window.addEventListener('offline', this.handleNetworkChange);
      
      // Listen for connection changes if supported
      const connection = (navigator as NavigatorWithConnection).connection;
      if (connection) {
        connection.addEventListener('change', this.handleNetworkChange);
      }
    }

    // Poll for network quality changes
    this.pollInterval = setInterval(() => {
      this.checkNetworkQuality();
    }, pollIntervalMs);

    // Initial check
    this.checkNetworkQuality();
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (!this.monitoring) return;

    this.monitoring = false;

    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleNetworkChange);
      window.removeEventListener('offline', this.handleNetworkChange);
      
      const connection = (navigator as NavigatorWithConnection).connection;
      if (connection) {
        connection.removeEventListener('change', this.handleNetworkChange);
      }
    }

    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = undefined;
    }
  }

  /**
   * Add callback for network quality changes
   */
  onQualityChange(callback: (info: NetworkInfo) => void): () => void {
    this.callbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      this.callbacks = this.callbacks.filter(cb => cb !== callback);
    };
  }

  /**
   * Get current network info
   */
  getCurrentInfo(): NetworkInfo {
    return this.currentInfo;
  }

  private handleNetworkChange = (): void => {
    this.checkNetworkQuality();
  };

  private checkNetworkQuality(): void {
    const newInfo = getNetworkInfo();
    
    // Check if quality has significantly changed
    if (this.hasSignificantChange(this.currentInfo, newInfo)) {
      this.currentInfo = newInfo;
      this.notifyCallbacks(newInfo);
    }
  }

  private hasSignificantChange(oldInfo: NetworkInfo, newInfo: NetworkInfo): boolean {
    return (
      oldInfo.quality !== newInfo.quality ||
      oldInfo.type !== newInfo.type ||
      oldInfo.saveData !== newInfo.saveData ||
      Math.abs(oldInfo.downlink - newInfo.downlink) > 1 || // 1 Mbps difference
      Math.abs(oldInfo.rtt - newInfo.rtt) > 50 // 50ms difference
    );
  }

  private notifyCallbacks(info: NetworkInfo): void {
    this.callbacks.forEach(callback => {
      try {
        callback(info);
      } catch (error) {
        console.error('[Connection Monitor] Callback error:', error);
      }
    });
  }
}

// ============================================================================
// React Hook for Progressive Enhancement
// ============================================================================

import { useState, useEffect } from 'react';

export function useProgressiveEnhancement(userPreferences?: Partial<EnhancementSettings>) {
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo>(() => getNetworkInfo());
  const [settings, setSettings] = useState<EnhancementSettings>(() => 
    getEnhancementSettings(networkInfo, userPreferences)
  );

  useEffect(() => {
    const monitor = new ConnectionQualityMonitor();
    
    const unsubscribe = monitor.onQualityChange((newInfo) => {
      console.log('[Progressive Enhancement] Network quality changed:', newInfo);
      setNetworkInfo(newInfo);
      setSettings(getEnhancementSettings(newInfo, userPreferences));
    });

    monitor.start();

    return () => {
      unsubscribe();
      monitor.stop();
    };
  }, [userPreferences]);

  return {
    networkInfo,
    settings,
    isOnline: networkInfo.quality !== 'offline',
    isHighQuality: networkInfo.quality === 'fast',
    isLowBandwidth: networkInfo.quality === 'slow' || networkInfo.saveData
  };
}

// ============================================================================
// Adaptive UI Components Helpers
// ============================================================================

/**
 * Get CSS classes for adaptive UI based on network quality
 */
export function getAdaptiveClasses(settings: EnhancementSettings): {
  animations: string;
  transitions: string;
  layout: string;
} {
  return {
    animations: settings.enableAnimations && !settings.reducedMotion 
      ? 'animate-pulse animate-spin animate-bounce' 
      : '',
    transitions: settings.enableAnimations && !settings.reducedMotion
      ? 'transition-all duration-300 ease-in-out'
      : 'transition-none',
    layout: settings.enableOfflineMode
      ? 'offline-mode reduced-features'
      : 'online-mode full-features'
  };
}

/**
 * Debounce function for throttling updates based on network quality
 */
export function createNetworkAwareDebounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  settings: EnhancementSettings
): T {
  let timeout: NodeJS.Timeout;
  const delay = settings.updateThrottleMs;

  return ((...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), delay);
  }) as T;
}

// ============================================================================
// Default Export
// ============================================================================

export default {
  getNetworkInfo,
  getEnhancementSettings,
  ConnectionQualityMonitor,
  useProgressiveEnhancement,
  getAdaptiveClasses,
  createNetworkAwareDebounce
};