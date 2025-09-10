/**
 * Frontend Configuration
 * Centralizes all environment variables and configuration settings
 */

// ===== API CONFIGURATION =====

export const API_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  timeout: parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || '30000'),
  maxRetries: 3,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
} as const;

// ===== AUTHENTICATION CONFIGURATION =====

export const AUTH_CONFIG = {
  requireAuth: process.env.NEXT_PUBLIC_AUTH_REQUIRE_SSE_AUTH !== 'false',
  tokenStorageKey: 'vana_auth_token',
  userStorageKey: 'vana_auth_user',
  refreshTokenKey: 'vana_refresh_token',
  tokenExpiryBuffer: 5 * 60 * 1000, // 5 minutes before expiry
} as const;

// ===== GOOGLE ADK CONFIGURATION =====

export const ADK_CONFIG = {
  enabled: process.env.NEXT_PUBLIC_ADK_ENABLED === 'true',
  appId: process.env.NEXT_PUBLIC_ADK_APP_ID || 'vana',
  sessionTimeout: parseInt(process.env.NEXT_PUBLIC_ADK_SESSION_TIMEOUT || '3600'),
  defaultUserId: 'current',
} as const;

// ===== SSE CONFIGURATION =====

export const SSE_CONFIG = {
  enabled: process.env.NEXT_PUBLIC_SSE_ENABLED !== 'false',
  autoReconnect: process.env.NEXT_PUBLIC_SSE_AUTO_RECONNECT !== 'false',
  maxRetries: parseInt(process.env.NEXT_PUBLIC_SSE_MAX_RETRIES || '5'),
  retryDelay: parseInt(process.env.NEXT_PUBLIC_SSE_RETRY_DELAY || '1000'),
  heartbeatTimeout: parseInt(process.env.NEXT_PUBLIC_SSE_HEARTBEAT_TIMEOUT || '35000'),
  withCredentials: true,
} as const;

// ===== FEATURE FLAGS =====

export const FEATURE_FLAGS = {
  realTimeUpdates: process.env.NEXT_PUBLIC_ENABLE_REAL_TIME_UPDATES !== 'false',
  agentNetworkView: process.env.NEXT_PUBLIC_ENABLE_AGENT_NETWORK_VIEW !== 'false',
  advancedAnalytics: process.env.NEXT_PUBLIC_ENABLE_ADVANCED_ANALYTICS === 'true',
  offlineMode: process.env.NEXT_PUBLIC_ENABLE_OFFLINE_MODE === 'true',
} as const;

// ===== DEBUG CONFIGURATION =====

export const DEBUG_CONFIG = {
  apiCalls: process.env.NEXT_PUBLIC_DEBUG_API_CALLS === 'true',
  sseEvents: process.env.NEXT_PUBLIC_DEBUG_SSE_EVENTS === 'true',
  authState: process.env.NEXT_PUBLIC_DEBUG_AUTH_STATE === 'true',
  enabled: process.env.NODE_ENV === 'development',
} as const;

// ===== PERFORMANCE CONFIGURATION =====

export const PERFORMANCE_CONFIG = {
  eventHistoryLimit: parseInt(process.env.NEXT_PUBLIC_EVENT_HISTORY_LIMIT || '50'),
  sessionCacheSize: parseInt(process.env.NEXT_PUBLIC_SESSION_CACHE_SIZE || '20'),
  maxConcurrentRequests: parseInt(process.env.NEXT_PUBLIC_MAX_CONCURRENT_REQUESTS || '3'),
  debounceDelay: 300,
  throttleDelay: 1000,
} as const;

// ===== ENVIRONMENT DETECTION =====

export const ENVIRONMENT = {
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
  isBrowser: typeof window !== 'undefined',
  isServer: typeof window === 'undefined',
} as const;

// ===== CONFIGURATION UTILITIES =====

/**
 * Get the complete API base URL
 */
export function getApiBaseUrl(): string {
  return API_CONFIG.baseUrl;
}

/**
 * Get SSE endpoint URL for a session
 */
export function getSSEUrl(sessionId: string): string {
  return `${API_CONFIG.baseUrl}/agent_network_sse/${sessionId}`;
}

/**
 * Check if authentication is required
 */
export function isAuthRequired(): boolean {
  return AUTH_CONFIG.requireAuth;
}

/**
 * Check if development mode is enabled
 */
export function isDevelopmentMode(): boolean {
  return ENVIRONMENT.isDevelopment || !AUTH_CONFIG.requireAuth;
}

/**
 * Check if a feature flag is enabled
 */
export function isFeatureEnabled(feature: keyof typeof FEATURE_FLAGS): boolean {
  return FEATURE_FLAGS[feature];
}

/**
 * Check if debug mode is enabled for a category
 */
export function isDebugEnabled(category: keyof typeof DEBUG_CONFIG): boolean {
  return DEBUG_CONFIG.enabled && DEBUG_CONFIG[category];
}

/**
 * Get configuration for external services
 */
export function getServiceConfig(service: 'api' | 'sse' | 'adk' | 'auth') {
  switch (service) {
    case 'api':
      return API_CONFIG;
    case 'sse':
      return SSE_CONFIG;
    case 'adk':
      return ADK_CONFIG;
    case 'auth':
      return AUTH_CONFIG;
    default:
      throw new Error(`Unknown service: ${service}`);
  }
}

/**
 * Validate configuration on startup
 */
export function validateConfig(): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate API URL
  try {
    new URL(API_CONFIG.baseUrl);
  } catch {
    errors.push('Invalid API base URL');
  }

  // Validate timeouts
  if (API_CONFIG.timeout < 1000) {
    errors.push('API timeout too low (minimum 1000ms)');
  }

  if (SSE_CONFIG.heartbeatTimeout < 5000) {
    errors.push('SSE heartbeat timeout too low (minimum 5000ms)');
  }

  // Validate retry settings
  if (SSE_CONFIG.maxRetries < 0 || SSE_CONFIG.maxRetries > 10) {
    errors.push('SSE max retries should be between 0 and 10');
  }

  // Validate performance settings
  if (PERFORMANCE_CONFIG.eventHistoryLimit < 10 || PERFORMANCE_CONFIG.eventHistoryLimit > 1000) {
    errors.push('Event history limit should be between 10 and 1000');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Get runtime configuration summary
 */
export function getConfigSummary() {
  return {
    environment: process.env.NODE_ENV,
    apiUrl: API_CONFIG.baseUrl,
    authRequired: AUTH_CONFIG.requireAuth,
    adkEnabled: ADK_CONFIG.enabled,
    sseEnabled: SSE_CONFIG.enabled,
    features: Object.entries(FEATURE_FLAGS)
      .filter(([, enabled]) => enabled)
      .map(([name]) => name),
    debug: Object.entries(DEBUG_CONFIG)
      .filter(([key, enabled]) => key !== 'enabled' && enabled)
      .map(([name]) => name),
  };
}

// ===== CONFIGURATION VALIDATION ON LOAD =====

if (ENVIRONMENT.isDevelopment) {
  const validation = validateConfig();
  if (!validation.isValid) {
    console.warn('Configuration validation failed:', validation.errors);
  }
  
  if (isDebugEnabled('apiCalls') || isDebugEnabled('sseEvents')) {
    console.log('Configuration Summary:', getConfigSummary());
  }
}

export default {
  API_CONFIG,
  AUTH_CONFIG,
  ADK_CONFIG,
  SSE_CONFIG,
  FEATURE_FLAGS,
  DEBUG_CONFIG,
  PERFORMANCE_CONFIG,
  ENVIRONMENT,
};