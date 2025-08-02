/**
 * ADK Service Layer - Main Export Index
 * Unified exports for the complete ADK integration service layer
 */

// Main client and factory
export { ADKClient } from './adk-client';
export { ADKServiceFactory, adkServiceFactory, createADKServices, createADKServicesForTest, getDefaultADKConfig } from './adk-service-factory';

// Individual services
export { SessionService } from './session-service';
export { SSEManager } from './sse-manager';
export { MessageTransformer } from './message-transformer';
export { EventStore } from './event-store';

// Legacy exports for backwards compatibility (deprecated)
export { sseClient } from './sse-client';
export { sessionManager } from './session-manager';

// Types
export type {
  // Service interfaces
  IADKClient,
  ISessionService,
  ISSEService,
  IMessageTransformer,
  IEventStore,
  ADKServices,
  
  // Configuration types
  ADKConfig,
  SSEConfig,
  
  // Session types
  Session,
  SessionStatus,
  SessionMetadata,
  
  // Message types
  UserMessage,
  MessageMetadata,
  ADKRequestMessage,
  FileAttachment,
  
  // Connection types
  ConnectionState,
  ConnectionInfo,
  
  // Event types
  ADKEvent,
  ADKEventType,
  EventFilter,
  
  // Error types
  ADKError,
  SessionError,
  ConnectionError,
  MessageError,
  
  // Utility types
  RetryConfig,
  EventEmitter,
  PerformanceMetrics,
  DebugInfo
} from '../types/adk-service';

// Re-export UI event types for convenience
export type {
  ADKSSEEvent,
  UIEvent,
  ADKAgentName,
  ADKContent,
  ADKContentPart,
  ADKStateDelta,
  ADKActions,
  ADKUsageMetadata,
  ADKFunctionCall,
  ADKFunctionResponse
} from '../types/adk-events';

/**
 * Quick setup function for the most common use case
 * Creates and initializes ADK services with default configuration
 */
export async function setupADK(
  userId: string = 'default_user',
  apiUrl?: string
): Promise<{ services: ADKServices; client: IADKClient }> {
  const config = getDefaultADKConfig();
  if (apiUrl) {
    config.apiUrl = apiUrl;
  }
  
  const services = createADKServices(config);
  await services.client.initialize(userId);
  
  return { services, client: services.client };
}

/**
 * Version information
 */
export const VERSION = '1.0.0';
export const API_VERSION = 'v1';

/**
 * Default configuration constants
 */
export const DEFAULT_CONFIG = {
  MAX_RETRIES: 5,
  RETRY_DELAY: 1000,
  TIMEOUT: 30000,
  MAX_EVENTS: 10000,
  BATCH_INTERVAL: 16,
  CACHE_TIMEOUT: 30 * 60 * 1000, // 30 minutes
  SESSION_TIMEOUT: 24 * 60 * 60 * 1000 // 24 hours
} as const;