/**
 * ADK Service Factory
 * Manages service creation, configuration, and dependency injection
 */

import type {
  ADKServices,
  ADKConfig,
  IADKClient,
  ISessionService,
  ISSEService,
  IMessageTransformer,
  IEventStore
} from '../types/adk-service';

import { ADKClient } from './adk-client';
import { SessionService } from './session-service';
import { SSEManager } from './sse-manager';
import { MessageTransformer } from './message-transformer';
import { EventStore } from './event-store';

interface ADKServiceFactoryOptions {
  debug?: boolean;
  environment?: 'development' | 'production' | 'test';
  overrides?: Partial<ADKServices>;
}

export class ADKServiceFactory {
  private static instance: ADKServiceFactory | null = null;
  private serviceCache = new Map<string, ADKServices>();
  private cleanupTimers = new Map<string, NodeJS.Timeout>();
  private serviceReferences = new WeakMap<ADKServices, number>();
  private defaultConfig: Partial<ADKConfig>;

  constructor(options: ADKServiceFactoryOptions = {}) {
    this.defaultConfig = {
      maxRetries: options.environment === 'test' ? 1 : 5,
      retryDelay: options.environment === 'test' ? 100 : 1000,
      timeout: options.environment === 'test' ? 5000 : 30000,
      enableLogging: options.debug || options.environment === 'development'
    };
  }

  /**
   * Get singleton factory instance
   */
  public static getInstance(options?: ADKServiceFactoryOptions): ADKServiceFactory {
    if (!ADKServiceFactory.instance) {
      ADKServiceFactory.instance = new ADKServiceFactory(options);
    }
    return ADKServiceFactory.instance;
  }

  /**
   * Create ADK services with configuration
   */
  public create(config: ADKConfig, options: ADKServiceFactoryOptions = {}): ADKServices {
    const finalConfig = this.mergeConfig(config);
    const cacheKey = this.generateCacheKey(finalConfig, options);

    // Return cached services if available
    if (this.serviceCache.has(cacheKey)) {
      const cached = this.serviceCache.get(cacheKey)!;
      // Increment reference count
      const currentRefs = this.serviceReferences.get(cached) || 0;
      this.serviceReferences.set(cached, currentRefs + 1);
      console.log('[ADKServiceFactory] Returning cached services (refs:', currentRefs + 1, ')');
      return cached;
    }

    console.log('[ADKServiceFactory] Creating new services with config:', finalConfig);

    // Create services
    const services = this.createServices(finalConfig, options);

    // Cache services and set initial reference count
    this.serviceCache.set(cacheKey, services);
    this.serviceReferences.set(services, 1);
    
    // Setup cleanup
    this.setupCleanup(cacheKey, services);

    return services;
  }

  /**
   * Create services for testing with mocks
   */
  public createForTesting(config: Partial<ADKConfig> = {}, mocks: Partial<ADKServices> = {}): ADKServices {
    const testConfig: ADKConfig = {
      apiUrl: 'http://localhost:8000',
      maxRetries: 1,
      retryDelay: 100,
      timeout: 5000,
      enableLogging: false,
      ...config
    };

    const services = this.createServices(testConfig, { environment: 'test' });

    // Replace with mocks if provided
    return {
      ...services,
      ...mocks
    };
  }

  /**
   * Release a reference to services (for manual memory management)
   */
  public release(services: ADKServices): void {
    const currentRefs = this.serviceReferences.get(services) || 0;
    if (currentRefs <= 1) {
      // No more references, clean up
      this.serviceReferences.delete(services);
      for (const [key, cached] of this.serviceCache.entries()) {
        if (cached === services) {
          this.cleanupServices(services);
          this.serviceCache.delete(key);
          const timer = this.cleanupTimers.get(key);
          if (timer) {
            clearTimeout(timer);
            this.cleanupTimers.delete(key);
          }
          console.log('[ADKServiceFactory] Released services:', key);
          break;
        }
      }
    } else {
      // Decrement reference count
      this.serviceReferences.set(services, currentRefs - 1);
      console.log('[ADKServiceFactory] Decremented reference count to:', currentRefs - 1);
    }
  }

  /**
   * Clear service cache
   */
  public clearCache(): void {
    // Clear all timers first
    for (const timer of this.cleanupTimers.values()) {
      clearTimeout(timer);
    }
    this.cleanupTimers.clear();

    // Clean up all services
    for (const [key, services] of this.serviceCache.entries()) {
      this.cleanupServices(services);
    }
    this.serviceCache.clear();
    console.log('[ADKServiceFactory] Cache cleared');
  }

  /**
   * Get cached services by config
   */
  public getCached(config: ADKConfig): ADKServices | null {
    const cacheKey = this.generateCacheKey(config, {});
    return this.serviceCache.get(cacheKey) || null;
  }

  /**
   * Create service instances
   */
  private createServices(config: ADKConfig, options: ADKServiceFactoryOptions): ADKServices {
    // Create individual services
    const eventStore = options.overrides?.eventStore || new EventStore({
      debugMode: config.enableLogging,
      maxEvents: 10000
    });

    const messageTransformer = options.overrides?.transformer || new MessageTransformer();

    const sessionService = options.overrides?.session || new SessionService(config);

    const sseService = options.overrides?.sse || new SSEManager(config);

    const client = options.overrides?.client || new ADKClient(config);

    // Wire up dependencies if needed
    this.wireDependencies(client, sessionService, sseService, messageTransformer, eventStore);

    return {
      client,
      session: sessionService,
      sse: sseService,
      transformer: messageTransformer,
      eventStore
    };
  }

  /**
   * Wire up service dependencies
   */
  private wireDependencies(
    client: IADKClient,
    session: ISessionService,
    sse: ISSEService,
    transformer: IMessageTransformer,
    eventStore: IEventStore
  ): void {
    // Services are already properly injected via constructors
    // This method exists for future dependency wiring if needed
  }

  /**
   * Merge configuration with defaults
   */
  private mergeConfig(config: ADKConfig): ADKConfig {
    return {
      ...this.defaultConfig,
      ...config
    };
  }

  /**
   * Generate cache key for service configuration
   */
  private generateCacheKey(config: ADKConfig, options: ADKServiceFactoryOptions): string {
    const configHash = this.hashConfig(config);
    const optionsHash = this.hashOptions(options);
    return `${configHash}_${optionsHash}`;
  }

  /**
   * Hash configuration for caching
   */
  private hashConfig(config: ADKConfig): string {
    const key = `${config.apiUrl}_${config.maxRetries}_${config.retryDelay}_${config.timeout}_${config.enableLogging}`;
    return btoa(key).replace(/[+/=]/g, '');
  }

  /**
   * Hash options for caching
   */
  private hashOptions(options: ADKServiceFactoryOptions): string {
    const key = `${options.debug}_${options.environment}_${!!options.overrides}`;
    return btoa(key).replace(/[+/=]/g, '');
  }

  /**
   * Setup cleanup for cached services
   */
  private setupCleanup(cacheKey: string, services: ADKServices): void {
    // Clear any existing timer for this cache key
    const existingTimer = this.cleanupTimers.get(cacheKey);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Setup new cleanup timer
    const timer = setTimeout(() => {
      if (this.serviceCache.has(cacheKey)) {
        // Check if there are still active references
        const refs = this.serviceReferences.get(services) || 0;
        if (refs <= 1) {
          this.cleanupServices(services);
          this.serviceCache.delete(cacheKey);
          this.cleanupTimers.delete(cacheKey);
          this.serviceReferences.delete(services);
          console.log('[ADKServiceFactory] Auto-cleaned up cached services:', cacheKey);
        } else {
          // Reschedule cleanup if still in use
          this.setupCleanup(cacheKey, services);
          console.log('[ADKServiceFactory] Rescheduled cleanup for active services:', cacheKey, 'refs:', refs);
        }
      }
    }, 30 * 60 * 1000);

    this.cleanupTimers.set(cacheKey, timer);
  }

  /**
   * Cleanup service instances
   */
  private cleanupServices(services: ADKServices): void {
    try {
      // Disconnect client
      if (services.client && typeof services.client.disconnect === 'function') {
        services.client.disconnect();
      }

      // Clear session
      if (services.session && typeof services.session.clearSession === 'function') {
        services.session.clearSession();
      }

      // Disconnect SSE
      if (services.sse && typeof services.sse.disconnect === 'function') {
        services.sse.disconnect();
      }

      // Clear events
      if (services.eventStore && typeof services.eventStore.clearEvents === 'function') {
        services.eventStore.clearEvents();
      }

    } catch (error) {
      console.warn('[ADKServiceFactory] Error during cleanup:', error);
    }
  }
}

/**
 * Default service factory instance
 */
export const adkServiceFactory = ADKServiceFactory.getInstance({
  debug: import.meta.env.DEV,
  environment: import.meta.env.PROD ? 'production' : 'development'
});

/**
 * Convenience function to create ADK services
 */
export function createADKServices(config: ADKConfig, options?: ADKServiceFactoryOptions): ADKServices {
  return adkServiceFactory.create(config, options);
}

/**
 * Convenience function for testing
 */
export function createADKServicesForTest(
  config?: Partial<ADKConfig>,
  mocks?: Partial<ADKServices>
): ADKServices {
  return adkServiceFactory.createForTesting(config, mocks);
}

/**
 * Get default ADK configuration
 */
export function getDefaultADKConfig(): ADKConfig {
  return {
    apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:8000',
    maxRetries: parseInt(import.meta.env.VITE_MAX_RETRIES || '5'),
    retryDelay: parseInt(import.meta.env.VITE_RETRY_DELAY || '1000'),
    timeout: parseInt(import.meta.env.VITE_TIMEOUT || '30000'),
    enableLogging: import.meta.env.VITE_ENABLE_LOGGING === 'true' || import.meta.env.DEV
  };
}