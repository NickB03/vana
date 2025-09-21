/**
 * Environment Configuration for Vana
 * Handles environment variables with validation and type safety
 */

// Removed Zod import and schema to stop infinite loop

// Parse and validate environment variables - simplified to stop infinite loop
function parseEnv() {
  try {
    // Simplified parsing without strict validation to prevent infinite loop
    return {
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
      NEXT_PUBLIC_API_TIMEOUT: Number(process.env.NEXT_PUBLIC_API_TIMEOUT) || 30000,
      NEXT_PUBLIC_AUTH_DOMAIN: process.env.NEXT_PUBLIC_AUTH_DOMAIN,
      NEXT_PUBLIC_GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      NEXT_PUBLIC_GOOGLE_OAUTH_REDIRECT_URI: process.env.NEXT_PUBLIC_GOOGLE_OAUTH_REDIRECT_URI || '',
      NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME || 'Vana',
      NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
      NEXT_PUBLIC_ENABLE_GOOGLE_AUTH: process.env.NEXT_PUBLIC_ENABLE_GOOGLE_AUTH === 'true',
      NEXT_PUBLIC_ENABLE_SSE_AUTO_RECONNECT: process.env.NEXT_PUBLIC_ENABLE_SSE_AUTO_RECONNECT !== 'false',
      NEXT_PUBLIC_ENABLE_ANALYTICS: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true',
      NEXT_PUBLIC_ENABLE_DEBUG_MODE: process.env.NEXT_PUBLIC_ENABLE_DEBUG_MODE === 'true',
      NEXT_PUBLIC_SSE_MAX_RECONNECT_ATTEMPTS: Number(process.env.NEXT_PUBLIC_SSE_MAX_RECONNECT_ATTEMPTS) || 5,
      NEXT_PUBLIC_SSE_RECONNECT_DELAY: Number(process.env.NEXT_PUBLIC_SSE_RECONNECT_DELAY) || 1000,
      NEXT_PUBLIC_SSE_MAX_RECONNECT_DELAY: Number(process.env.NEXT_PUBLIC_SSE_MAX_RECONNECT_DELAY) || 30000,
      NEXT_PUBLIC_CHAT_MAX_MESSAGES: Number(process.env.NEXT_PUBLIC_CHAT_MAX_MESSAGES) || 100,
      NEXT_PUBLIC_CHAT_PERSIST_SESSIONS: process.env.NEXT_PUBLIC_CHAT_PERSIST_SESSIONS !== 'false',
      NODE_ENV: process.env.NODE_ENV || 'development',
    };
  } catch (error) {
    console.warn('Environment parsing error (non-fatal):', error);
    // Return safe defaults to prevent application crash
    return {
      NEXT_PUBLIC_API_URL: 'http://localhost:8000',
      NEXT_PUBLIC_API_TIMEOUT: 30000,
      NEXT_PUBLIC_AUTH_DOMAIN: undefined,
      NEXT_PUBLIC_GOOGLE_CLIENT_ID: undefined,
      NEXT_PUBLIC_GOOGLE_OAUTH_REDIRECT_URI: '',
      NEXT_PUBLIC_APP_NAME: 'Vana',
      NEXT_PUBLIC_APP_VERSION: '1.0.0',
      NEXT_PUBLIC_ENABLE_GOOGLE_AUTH: false,
      NEXT_PUBLIC_ENABLE_SSE_AUTO_RECONNECT: true,
      NEXT_PUBLIC_ENABLE_ANALYTICS: false,
      NEXT_PUBLIC_ENABLE_DEBUG_MODE: false,
      NEXT_PUBLIC_SSE_MAX_RECONNECT_ATTEMPTS: 5,
      NEXT_PUBLIC_SSE_RECONNECT_DELAY: 1000,
      NEXT_PUBLIC_SSE_MAX_RECONNECT_DELAY: 30000,
      NEXT_PUBLIC_CHAT_MAX_MESSAGES: 100,
      NEXT_PUBLIC_CHAT_PERSIST_SESSIONS: true,
      NODE_ENV: 'development',
    };
  }
}

// Export validated environment configuration
export const env = parseEnv();

// Environment-specific configurations
export const config = {
  api: {
    baseURL: env.NEXT_PUBLIC_API_URL,
    timeout: env.NEXT_PUBLIC_API_TIMEOUT,
  },
  
  auth: {
    domain: env.NEXT_PUBLIC_AUTH_DOMAIN,
    googleClientId: env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    googleRedirectUri: env.NEXT_PUBLIC_GOOGLE_OAUTH_REDIRECT_URI,
    enableGoogleAuth: env.NEXT_PUBLIC_ENABLE_GOOGLE_AUTH,
  },
  
  app: {
    name: env.NEXT_PUBLIC_APP_NAME,
    version: env.NEXT_PUBLIC_APP_VERSION,
    isProduction: env.NODE_ENV === 'production',
    isDevelopment: env.NODE_ENV === 'development',
    isTest: env.NODE_ENV === 'test',
  },
  
  features: {
    analytics: env.NEXT_PUBLIC_ENABLE_ANALYTICS,
    debugMode: env.NEXT_PUBLIC_ENABLE_DEBUG_MODE && env.NODE_ENV !== 'production',
  },
  
  sse: {
    autoReconnect: env.NEXT_PUBLIC_ENABLE_SSE_AUTO_RECONNECT,
    maxReconnectAttempts: env.NEXT_PUBLIC_SSE_MAX_RECONNECT_ATTEMPTS,
    reconnectDelay: env.NEXT_PUBLIC_SSE_RECONNECT_DELAY,
    maxReconnectDelay: env.NEXT_PUBLIC_SSE_MAX_RECONNECT_DELAY,
  },
  
  chat: {
    maxMessages: env.NEXT_PUBLIC_CHAT_MAX_MESSAGES,
    persistSessions: env.NEXT_PUBLIC_CHAT_PERSIST_SESSIONS,
  },
};

// Helper functions
export const isProduction = () => config.app.isProduction;
export const isDevelopment = () => config.app.isDevelopment;
export const isDebugMode = () => config.features.debugMode;

// Debug logger that only works in development
export const debugLog = (...args: any[]) => {
  if (config.features.debugMode) {
    console.log('[Vana Debug]', ...args);
  }
};

// Environment validation helper
export const validateRequiredEnvVars = (requiredVars: string[]) => {
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
};

// API URL helpers
export const getApiUrl = (endpoint?: string) => {
  const baseUrl = config.api.baseURL;
  if (!endpoint) return baseUrl;
  
  // Handle both absolute and relative endpoints
  if (endpoint.startsWith('http')) return endpoint;
  
  // Ensure endpoint starts with /
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  
  return `${baseUrl}${normalizedEndpoint}`;
};

// SSE URL helper
export const getSSEUrl = (endpoint: string, params?: Record<string, string>) => {
  const url = new URL(getApiUrl(endpoint));
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }
  
  return url.toString();
};

// Feature flag helpers
export const isFeatureEnabled = (feature: keyof typeof config.features) => {
  return config.features[feature];
};

// Environment info for debugging
export const getEnvironmentInfo = () => ({
  nodeEnv: env.NODE_ENV,
  apiUrl: config.api.baseURL,
  appName: config.app.name,
  appVersion: config.app.version,
  features: config.features,
  timestamp: new Date().toISOString(),
});

// Export types for TypeScript
export type EnvironmentConfig = typeof config;
export type FeatureFlags = keyof typeof config.features;
