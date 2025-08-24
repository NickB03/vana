'use client';

import { PersistOptions, createJSONStorage } from 'zustand/middleware/persist';
import { safeLocalStorage, safeSessionStorage, getSSREnvironment } from '@/lib/ssr-utils';
import type { UnifiedStore } from './index';

// Persistence configuration for selective data storage
export interface PersistenceConfig {
  name: string;
  storage: 'localStorage' | 'sessionStorage';
  version: number;
  encrypt?: boolean;
  compress?: boolean;
  maxSize?: number; // in bytes
  ttl?: number; // in milliseconds
}

// Default persistence configurations for different data types
export const PERSISTENCE_CONFIGS = {
  // UI preferences - persist across sessions
  ui: {
    name: 'vana-ui-preferences',
    storage: 'localStorage' as const,
    version: 1,
    encrypt: false,
    compress: false,
    maxSize: 10240, // 10KB
    ttl: 365 * 24 * 60 * 60 * 1000, // 1 year
  },
  
  // Session data - persist temporarily
  session: {
    name: 'vana-session-data',
    storage: 'localStorage' as const,
    version: 1,
    encrypt: false,
    compress: true,
    maxSize: 1048576, // 1MB
    ttl: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
  
  // Auth data - minimal persistence (user info only, not tokens)
  auth: {
    name: 'vana-auth-user',
    storage: 'localStorage' as const,
    version: 1,
    encrypt: true,
    compress: false,
    maxSize: 5120, // 5KB
    ttl: 30 * 24 * 60 * 60 * 1000, // 30 days
  },
  
  // Canvas content - temporary persistence
  canvas: {
    name: 'vana-canvas-draft',
    storage: 'sessionStorage' as const,
    version: 1,
    encrypt: false,
    compress: true,
    maxSize: 512000, // 500KB
    ttl: 24 * 60 * 60 * 1000, // 24 hours
  },
  
  // Agent configuration - persist across sessions
  agentDeck: {
    name: 'vana-agent-config',
    storage: 'localStorage' as const,
    version: 1,
    encrypt: false,
    compress: false,
    maxSize: 51200, // 50KB
    ttl: 30 * 24 * 60 * 60 * 1000, // 30 days
  }
} as const;

// Enhanced storage with TTL and size limits
class EnhancedStorage {
  private storage: ReturnType<typeof safeLocalStorage | typeof safeSessionStorage>;
  private config: PersistenceConfig;

  constructor(config: PersistenceConfig) {
    this.config = config;
    this.storage = config.storage === 'localStorage' 
      ? safeLocalStorage() 
      : safeSessionStorage();
  }

  getItem(key: string): string | null {
    try {
      const item = this.storage.getItem(key);
      if (!item) return null;

      const parsed = JSON.parse(item);
      
      // Check TTL
      if (parsed.ttl && Date.now() > parsed.ttl) {
        this.removeItem(key);
        return null;
      }
      
      // Return the actual data
      let data = parsed.data;
      
      // Decrypt if needed
      if (this.config.encrypt && parsed.encrypted) {
        data = this.decrypt(data);
      }
      
      // Decompress if needed
      if (this.config.compress && parsed.compressed) {
        data = this.decompress(data);
      }
      
      return data;
    } catch (error) {
      console.warn(`Failed to get item ${key}:`, error);
      this.removeItem(key);
      return null;
    }
  }

  setItem(key: string, value: string): void {
    try {
      let data = value;
      const metadata = {
        version: this.config.version,
        timestamp: Date.now(),
        ttl: this.config.ttl ? Date.now() + this.config.ttl : null,
        compressed: false,
        encrypted: false
      };
      
      // Compress if configured
      if (this.config.compress) {
        data = this.compress(data);
        metadata.compressed = true;
      }
      
      // Encrypt if configured
      if (this.config.encrypt) {
        data = this.encrypt(data);
        metadata.encrypted = true;
      }
      
      const item = JSON.stringify({
        ...metadata,
        data
      });
      
      // Check size limits
      if (this.config.maxSize && item.length > this.config.maxSize) {
        console.warn(`Item ${key} exceeds size limit: ${item.length} > ${this.config.maxSize}`);
        // Try to clean up old data
        this.cleanup();
        
        // If still too large, truncate or reject
        if (item.length > this.config.maxSize) {
          throw new Error(`Item too large: ${item.length} bytes`);
        }
      }
      
      this.storage.setItem(key, item);
    } catch (error) {
      console.error(`Failed to set item ${key}:`, error);
      // Attempt cleanup and retry once
      this.cleanup();
      try {
        this.storage.setItem(key, JSON.stringify({
          version: this.config.version,
          timestamp: Date.now(),
          data: value
        }));
      } catch (retryError) {
        console.error(`Retry failed for ${key}:`, retryError);
      }
    }
  }

  removeItem(key: string): void {
    this.storage.removeItem(key);
  }

  clear(): void {
    this.storage.clear();
  }

  // Simple compression using built-in methods (for small data)
  private compress(data: string): string {
    try {
      // For now, just return the data as-is
      // In a real implementation, you might use pako or similar
      return btoa(data);
    } catch {
      return data;
    }
  }

  private decompress(data: string): string {
    try {
      return atob(data);
    } catch {
      return data;
    }
  }

  // Simple encryption (for demo - use proper crypto in production)
  private encrypt(data: string): string {
    if (typeof window === 'undefined') return data;
    
    try {
      // Simple XOR encryption with a fixed key (NOT SECURE - demo only)
      const key = 'vana-demo-key';
      let encrypted = '';
      for (let i = 0; i < data.length; i++) {
        encrypted += String.fromCharCode(
          data.charCodeAt(i) ^ key.charCodeAt(i % key.length)
        );
      }
      return btoa(encrypted);
    } catch {
      return data;
    }
  }

  private decrypt(data: string): string {
    if (typeof window === 'undefined') return data;
    
    try {
      const encrypted = atob(data);
      const key = 'vana-demo-key';
      let decrypted = '';
      for (let i = 0; i < encrypted.length; i++) {
        decrypted += String.fromCharCode(
          encrypted.charCodeAt(i) ^ key.charCodeAt(i % key.length)
        );
      }
      return decrypted;
    } catch {
      return data;
    }
  }

  private cleanup(): void {
    // Clean up expired items
    if (typeof window === 'undefined') return;
    
    try {
      const keys = [];
      // Use standard storage API methods
      const storage = this.storage as Storage;
      if (storage && typeof storage.length === 'number') {
        for (let i = 0; i < storage.length; i++) {
          const key = storage.key(i);
          if (key && key.startsWith(this.config.name)) {
            keys.push(key);
          }
        }
      }
      
      keys.forEach(key => {
        try {
          const item = this.storage.getItem(key);
          if (item) {
            const parsed = JSON.parse(item);
            if (parsed.ttl && Date.now() > parsed.ttl) {
              this.removeItem(key);
            }
          }
        } catch {
          this.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('Cleanup failed:', error);
    }
  }
}

// Create storage instances for each configuration
export const createEnhancedStorage = (config: PersistenceConfig) => {
  return new EnhancedStorage(config);
};

// Persistence options factory
export const createPersistOptions = <T extends Partial<UnifiedStore>>(
  config: PersistenceConfig,
  partialize?: (state: UnifiedStore) => T,
  onRehydrateStorage?: (state?: T) => void
): PersistOptions<UnifiedStore> => {
  const storage = createEnhancedStorage(config);
  
  return {
    name: config.name,
    storage: createJSONStorage(() => storage),
    version: config.version,
    partialize: partialize || ((state) => state as T),
    onRehydrateStorage: onRehydrateStorage ? () => onRehydrateStorage : undefined,
    
    // Migration function for version changes
    migrate: (persistedState: unknown, version: number) => {
      console.log(`Migrating ${config.name} from version ${version} to ${config.version}`);
      
      // Add migration logic here based on version differences
      if (version < config.version) {
        // Perform migration
        return persistedState;
      }
      
      return persistedState;
    },
    
    // Error handling
    onRehydrateStorage: () => (state, error) => {
      if (error) {
        console.error(`Failed to rehydrate ${config.name}:`, error);
        // Clear corrupted data
        storage.clear();
      } else if (state && onRehydrateStorage) {
        onRehydrateStorage(state);
      }
    }
  };
};

// Selective persistence configuration for the unified store
export const getUnifiedStorePersistOptions = (): PersistOptions<UnifiedStore> => {
  return createPersistOptions(
    PERSISTENCE_CONFIGS.session,
    
    // Partialize function - only persist specific slices
    (state: UnifiedStore) => ({
      // UI preferences
      ui: {
        theme: state.ui.theme,
        sidebarWidth: state.ui.sidebarWidth,
        preferences: state.ui.preferences,
        selectedTools: state.ui.selectedTools,
      },
      
      // Session data
      session: {
        sessions: state.session.sessions,
        currentSession: state.session.currentSession,
      },
      
      // Auth user info (not tokens)
      auth: {
        user: state.auth.user,
      },
      
      // Agent configuration
      agentDeck: {
        availableAgents: state.agentDeck.availableAgents,
        selectedAgents: state.agentDeck.selectedAgents,
      },
      
      // Canvas drafts (only if dirty)
      canvas: state.canvas.isDirty ? {
        content: state.canvas.content,
        currentMode: state.canvas.currentMode,
      } : undefined,
      
    } as Partial<UnifiedStore>),
    
    // Rehydration callback
    (state?: Partial<UnifiedStore>) => {
      if (state) {
        console.log('🔄 Store rehydrated successfully');
        
        // Initialize agent deck if needed
        if (state.agentDeck && (!state.agentDeck.availableAgents || state.agentDeck.availableAgents.length === 0)) {
          // This would be handled by the store's onRehydrateStorage
        }
        
        // Apply theme
        if (state.ui?.theme) {
          // This would be handled by the UI store's setTheme action
        }
      }
    }
  );
};

// Separate persistence configurations for individual stores (if needed)
export const getUIPersistOptions = () => {
  return createPersistOptions(
    PERSISTENCE_CONFIGS.ui,
    (state: UnifiedStore) => ({
      ui: {
        theme: state.ui.theme,
        sidebarWidth: state.ui.sidebarWidth,
        preferences: state.ui.preferences,
        selectedTools: state.ui.selectedTools,
      }
    })
  );
};

export const getSessionPersistOptions = () => {
  return createPersistOptions(
    PERSISTENCE_CONFIGS.session,
    (state: UnifiedStore) => ({
      session: {
        sessions: state.session.sessions,
        currentSession: state.session.currentSession,
      }
    })
  );
};

export const getAuthPersistOptions = () => {
  return createPersistOptions(
    PERSISTENCE_CONFIGS.auth,
    (state: UnifiedStore) => ({
      auth: {
        user: state.auth.user, // Only persist user, not tokens
      }
    })
  );
};

// Utility functions
export const clearAllPersistence = () => {
  console.log('🗑️ Clearing all persistence');
  
  Object.values(PERSISTENCE_CONFIGS).forEach(config => {
    const storage = createEnhancedStorage(config);
    storage.clear();
  });
};

export const clearExpiredData = () => {
  console.log('🧹 Cleaning expired data');
  
  Object.values(PERSISTENCE_CONFIGS).forEach(config => {
    const storage = createEnhancedStorage(config);
    // The cleanup is handled internally by EnhancedStorage
    storage.getItem('__cleanup_trigger__'); // Trigger cleanup
  });
};

export const getPersistenceStats = () => {
  const { isBrowser } = getSSREnvironment();
  if (!isBrowser) return null;
  
  const stats = {
    localStorage: {
      used: 0,
      available: 0,
      items: 0
    },
    sessionStorage: {
      used: 0,
      available: 0,
      items: 0
    }
  };
  
  // Calculate localStorage usage
  try {
    const localStorage = safeLocalStorage() as Storage;
    let localStorageSize = 0;
    let localStorageItems = 0;
    
    // Use standard storage API to iterate over keys
    if (localStorage && typeof localStorage.length === 'number') {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const value = localStorage.getItem(key);
          if (value) {
            localStorageSize += value.length + key.length;
            localStorageItems++;
          }
        }
      }
    }
    
    stats.localStorage.used = localStorageSize;
    stats.localStorage.items = localStorageItems;
    
    // Test available space (rough estimate)
    try {
      const testKey = '__test__';
      const testData = new Array(1024).join('x'); // 1KB test
      localStorage.setItem(testKey, testData);
      localStorage.removeItem(testKey);
      stats.localStorage.available = 5 * 1024 * 1024; // Assume 5MB available
    } catch {
      stats.localStorage.available = 0;
    }
  } catch (error) {
    console.warn('Could not calculate localStorage stats:', error);
  }
  
  // Calculate sessionStorage usage
  try {
    const sessionStorage = safeSessionStorage() as Storage;
    let sessionStorageSize = 0;
    let sessionStorageItems = 0;
    
    // Use standard storage API to iterate over keys
    if (sessionStorage && typeof sessionStorage.length === 'number') {
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key) {
          const value = sessionStorage.getItem(key);
          if (value) {
            sessionStorageSize += value.length + key.length;
            sessionStorageItems++;
          }
        }
      }
    }
    
    stats.sessionStorage.used = sessionStorageSize;
    stats.sessionStorage.items = sessionStorageItems;
    stats.sessionStorage.available = 5 * 1024 * 1024; // Assume 5MB available
  } catch (error) {
    console.warn('Could not calculate sessionStorage stats:', error);
  }
  
  return stats;
};

// Development helpers
export const debugPersistence = () => {
  if (process.env.NODE_ENV !== 'development') return;
  
  console.group('💾 Persistence Debug');
  console.log('Configurations:', PERSISTENCE_CONFIGS);
  console.log('Storage Stats:', getPersistenceStats());
  console.groupEnd();
};

// Export for global access in development
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  (window as Record<string, unknown>).__VANA_PERSISTENCE = {
    configs: PERSISTENCE_CONFIGS,
    clearAll: clearAllPersistence,
    clearExpired: clearExpiredData,
    getStats: getPersistenceStats,
    debug: debugPersistence
  };
}