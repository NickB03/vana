/// <reference types="node" />

// Global Window interface extensions for VANA custom properties
declare global {
  interface Window {
    __VANA_PERSISTENCE?: {
      configs: any;
      clearAll: () => void;
      clearExpired: () => void;
      getStats: () => any;
      debug: () => void;
    };
    __VANA_SSE_HANDLER?: (event: any) => void;
    __VANA_STORE_METRICS?: {
      lastUpdate: {
        timestamp: number;
        duration: number;
        args: any;
      };
      totalUpdates: number;
      averageDuration: number;
    };
    __VANA_MEMORY_USAGE?: any;
    __VANA_MEMORY_CHECK_INTERVAL?: NodeJS.Timeout;
    __VANA_STORE_SUBSCRIPTIONS?: any;
    __VANA_STORE_VALIDATION?: {
      validate: () => boolean;
      validatePersistence: () => boolean;
      [key: string]: any;
    };
  }
}

export {};