/**
 * Rate Limiting Configuration
 * Production-ready rate limiting with Redis backend support
 */

export interface RateLimitRule {
  window: number; // Time window in seconds
  max: number;    // Maximum requests in window
  message?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyPrefix?: string;
}

export interface RateLimitConfig {
  backend: 'redis' | 'memory';
  redis?: {
    host: string;
    port: number;
    password?: string;
    db?: number;
    family?: 4 | 6;
    maxRetriesPerRequest?: number;
  };
  limits: {
    [key: string]: RateLimitRule;
  };
}

// Helper function to get environment-driven rate limits
function getDefaultRateLimits(): Record<string, RateLimitRule> {
  return {
    api: {
function getDefaultRateLimits(): Record<string, RateLimitRule> {
  const parseIntWithDefault = (value: string | undefined, defaultValue: number): number => {
    const parsed = parseInt(value || '');
    return isNaN(parsed) || parsed <= 0 ? defaultValue : parsed;
  };

  return {
    api: {
      window: parseIntWithDefault(process.env['NEXT_PUBLIC_RATE_LIMIT_API_WINDOW'], 60),
      max:   parseIntWithDefault(process.env['NEXT_PUBLIC_RATE_LIMIT_API_MAX'],    100),
      message:   'Too many API requests, please slow down',
      keyPrefix: 'api'
    },
    auth: {
      window: parseInt(process.env['NEXT_PUBLIC_RATE_LIMIT_AUTH_WINDOW'] || '300'),
      max:    parseInt(process.env['NEXT_PUBLIC_RATE_LIMIT_AUTH_MAX']    || '5'),
      message:           'Too many authentication attempts, please wait',
      skipSuccessfulRequests: false,
      keyPrefix:         'auth'
    },
    sse: {
      window: parseInt(process.env['NEXT_PUBLIC_RATE_LIMIT_SSE_WINDOW'] || '60'),
      max:    parseInt(process.env['NEXT_PUBLIC_RATE_LIMIT_SSE_MAX']    || '20'),
      message:   'Too many SSE connection attempts',
      keyPrefix: 'sse'
    },
    upload: {
      window: parseInt(process.env['NEXT_PUBLIC_RATE_LIMIT_UPLOAD_WINDOW'] || '300'),
      max:    parseInt(process.env['NEXT_PUBLIC_RATE_LIMIT_UPLOAD_MAX']    || '10'),
      message:   'Too many upload attempts, please wait',
      keyPrefix: 'upload'
    },
    search: {
      window: parseInt(process.env['NEXT_PUBLIC_RATE_LIMIT_SEARCH_WINDOW'] || '10'),
      max:    parseInt(process.env['NEXT_PUBLIC_RATE_LIMIT_SEARCH_MAX']    || '30'),
      message:   'Too many search requests, please wait',
      keyPrefix: 'search'
    },
    chat: {
      window: parseInt(process.env['NEXT_PUBLIC_RATE_LIMIT_CHAT_WINDOW'] || '60'),
      max:    parseInt(process.env['NEXT_PUBLIC_RATE_LIMIT_CHAT_MAX']    || '60'),
      message:   'Too many chat messages, please slow down',
      keyPrefix: 'chat'
    },
    passwordReset: {
      window: 3600,
      max:    3,
      message:   'Too many password reset requests, please wait',
      keyPrefix: 'pwd_reset'
    },
    oauth: {
      window: 60,
      max:    10,
      message:   'Too many OAuth attempts, please wait',
      keyPrefix: 'oauth'
    },
    health: {
      window: 60,
      max:    300,
      message:   'Health check rate limit exceeded',
      keyPrefix: 'health'
    },
    websocket: {
      window: 60,
      max:    30,
      message:   'Too many WebSocket connection attempts',
      keyPrefix: 'ws'
    }
  };
}

// Helper function to safely parse rate limits config
function parseRateLimitsConfig(): Record<string, RateLimitRule> {
  const configStr = process.env['NEXT_PUBLIC_RATE_LIMITS_CONFIG'];
  if (!configStr) {
    return getDefaultRateLimits();
  }
  
  try {
    // Parse the JSON configuration
    const parsedConfig = JSON.parse(configStr);
    
    // Validate that parsed config is an object
    if (typeof parsedConfig !== 'object' || parsedConfig === null || Array.isArray(parsedConfig)) {
      console.error('NEXT_PUBLIC_RATE_LIMITS_CONFIG must be a valid object, got:', typeof parsedConfig);
      return getDefaultRateLimits();
    }
    
    // Validate that each rule has required properties
    for (const [key, rule] of Object.entries(parsedConfig)) {
      if (typeof rule !== 'object' || rule === null) {
        console.error(`Invalid rate limit rule for key '${key}': must be an object`);
        return getDefaultRateLimits();
      }
      
      const rateRule = rule as RateLimitRule;
      if (typeof rateRule.window !== 'number' || rateRule.window <= 0) {
        console.error(`Invalid window for rule '${key}': must be a positive number, got:`, rateRule.window);
        return getDefaultRateLimits();
      }
      
      if (typeof rateRule.max !== 'number' || rateRule.max <= 0) {
        console.error(`Invalid max for rule '${key}': must be a positive number, got:`, rateRule.max);
        return getDefaultRateLimits();
      }
    }
    
    return parsedConfig as Record<string, RateLimitRule>;
  } catch (error) {
    console.error('Failed to parse NEXT_PUBLIC_RATE_LIMITS_CONFIG:', error);
    return getDefaultRateLimits();
  }
}

export const RATE_LIMIT_CONFIG: RateLimitConfig = {
  // Use Redis in production for distributed rate limiting, memory in development
  backend: process.env['NODE_ENV'] === 'production' ? 'redis' : 'memory',
  
  redis: {
    host: process.env['REDIS_HOST'] || 'localhost',
    port: parseInt(process.env['REDIS_PORT'] || '6379'),
    password: process.env['REDIS_PASSWORD'],
    db: parseInt(process.env['REDIS_DB'] || '0'),
    family: 4, // IPv4
    maxRetriesPerRequest: 3,
  },
  
  limits: parseRateLimitsConfig()
};

/**
 * Get rate limit configuration for a specific endpoint type
 */
export function getRateLimitConfig(type: string): RateLimitRule | null {
  return RATE_LIMIT_CONFIG.limits[type] || null;
}

/**
 * Get Redis configuration if Redis backend is enabled
 */
export function getRedisConfig() {
  if (RATE_LIMIT_CONFIG.backend !== 'redis') {
    return null;
  }
  return RATE_LIMIT_CONFIG.redis;
}

/**
 * Check if rate limiting is using Redis backend
 */
export function isRedisBackend(): boolean {
  return RATE_LIMIT_CONFIG.backend === 'redis';
}

/**
 * Get rate limit key for a request
 */
export function getRateLimitKey(type: string, identifier: string): string {
  const config = getRateLimitConfig(type);
  const prefix = config?.keyPrefix || type;
  return `rate_limit:${prefix}:${identifier}`;
}

/**
 * Environment-specific configurations
 */
export const ENVIRONMENT_CONFIGS = {
  development: {
    ...RATE_LIMIT_CONFIG,
    backend: 'memory' as const,
    limits: {
      ...RATE_LIMIT_CONFIG.limits,
      // More lenient limits for development
      api: { ...RATE_LIMIT_CONFIG.limits['api']!, max: 1000 },
      auth: { ...RATE_LIMIT_CONFIG.limits['auth']!, max: 50 },
      sse: { ...RATE_LIMIT_CONFIG.limits['sse']!, max: 100 }
    }
  },
  
  test: {
    ...RATE_LIMIT_CONFIG,
    backend: 'memory' as const,
    limits: {
      ...RATE_LIMIT_CONFIG.limits,
      // Very high limits for testing
      api: { ...RATE_LIMIT_CONFIG.limits['api']!, max: 10000 },
      auth: { ...RATE_LIMIT_CONFIG.limits['auth']!, max: 1000 },
      sse: { ...RATE_LIMIT_CONFIG.limits['sse']!, max: 1000 }
    }
  },
  
  staging: {
    ...RATE_LIMIT_CONFIG,
    backend: 'redis' as const,
    limits: {
      ...RATE_LIMIT_CONFIG.limits,
      // Slightly more lenient than production
      api: { ...RATE_LIMIT_CONFIG.limits['api']!, max: 200 },
      auth: { ...RATE_LIMIT_CONFIG.limits['auth']!, max: 10 }
    }
  },
  
  production: RATE_LIMIT_CONFIG
};

/**
 * Get configuration for current environment
 */
export function getEnvironmentConfig(): RateLimitConfig {
  const env = process.env['NODE_ENV'] as keyof typeof ENVIRONMENT_CONFIGS;
  return ENVIRONMENT_CONFIGS[env] || ENVIRONMENT_CONFIGS.production;
}

/**
 * Validate rate limit configuration
 */
function validateRateLimitConfig(config: RateLimitConfig): boolean {
  try {
    // Check backend type
    if (!['redis', 'memory'].includes(config.backend)) {
      console.error('Invalid rate limit backend:', config.backend);
      return false;
    }
    
    // Check Redis config if Redis backend
    if (config.backend === 'redis') {
      if (!config.redis) {
        console.error('Redis backend requires redis configuration');
        return false;
      }
      if (!config.redis.host || !config.redis.port) {
        console.error('Redis backend requires host and port');
        return false;
      }
      
      if (isNaN(config.redis.port) || config.redis.port < 1 || config.redis.port > 65535) {
        console.error('Invalid Redis port:', config.redis.port);
        return false;
      }
    }
    
    // Check limits configuration
    for (const [type, rule] of Object.entries(config.limits)) {
      if (typeof rule.window !== 'number' || rule.window <= 0) {
        console.error(`Invalid window for ${type}:`, rule.window);
        return false;
      }
      
      if (typeof rule.max !== 'number' || rule.max <= 0) {
        console.error(`Invalid max for ${type}:`, rule.max);
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error validating rate limit config:', error);
    return false;
  }
}

// Validate configuration on import
if (!validateRateLimitConfig(RATE_LIMIT_CONFIG)) {
  console.warn('Rate limit configuration validation failed, using defaults');
}
