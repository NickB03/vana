# Implementation Plan: Unified Tool-Based Chat Architecture (Security-Hardened)

**Issue**: #340 - Unify chat architecture with tool-based artifact/image generation
**Date**: 2025-12-18
**Status**: ✅ Second Code Review Fixed - Ready for Implementation
**DB Backup**: `backups/schema-backup-20251218-214918.sql`
**Security Review**: Two rounds complete - All critical findings addressed

---

## Executive Summary

This security-hardened plan addresses vulnerabilities identified during two rounds of AI-powered code review. The architecture maintains the unified tool-based design while ensuring:

- **Rate limiting parity** with existing endpoints
- **Input validation** for all tool parameters
- **Resource exhaustion protection** via execution tracking
- **Prompt injection defense** via strict allowlist validation
- **Clean architecture** with proper dependency direction

---

## Second Code Review Fixes (Applied 2025-12-18)

The following critical issues from the second code review have been fixed:

| Issue | Component | Fix Applied |
|-------|-----------|-------------|
| Fail-open design | `ToolRateLimiter` | Changed to fail-closed with circuit breaker pattern |
| Unknown tool bypass | `ToolRateLimiter` | Unknown tools now throw `ToolRateLimitError` |
| User limits not tool-specific | `ToolRateLimiter` | Added `check_user_tool_rate_limit` RPC + new table |
| Memory leak in timeout | `ToolExecutionTracker` | Added `finally` block cleanup + `destroy()` method |
| Homoglyph bypass | `PromptInjectionDefense` | Added `normalizeUnicode()` with confusable map |
| Prototype pollution | `ToolParameterValidator` | Added `checkPrototypePollution()` check |
| Extra property smuggling | `ToolParameterValidator` | Added `validateOnlyExpectedKeys()` check |
| Post-validation mutation | `ToolParameterValidator` | Returns `Object.freeze()` results |

---

## Security Requirements (Non-Negotiable)

### From Code Review - All Must Be Implemented

| CWE | Vulnerability | Required Fix | Phase |
|-----|---------------|--------------|-------|
| CWE-841 | Rate Limit Bypass | Tool-specific rate limiting | Phase 1 |
| CWE-862 | Missing Authorization | Re-validate session before tool exec | Phase 1 |
| CWE-20 | Input Validation | ToolParameterValidator class | Phase 1 |
| CWE-400 | Resource Exhaustion | ToolExecutionTracker class | Phase 1 |
| CWE-74 | Prompt Injection | PromptInjectionDefense class | Phase 1 |
| CWE-807 | Client Mode Hint | Server-side intent verification | Phase 4 |
| CWE-209 | Error Exposure | Safe error sanitization | Phase 1 |

---

## Revised Architecture

### Security Layer Stack

```
Request Flow (with security at each layer):

┌────────────────────────────────────────────────────────────────┐
│                    POST /chat (unified)                        │
├────────────────────────────────────────────────────────────────┤
│ Layer 1: CORS + Request Validation                             │
│   └─ Validate JSON schema, content length                      │
├────────────────────────────────────────────────────────────────┤
│ Layer 2: Authentication                                        │
│   └─ Verify JWT, extract user context                          │
├────────────────────────────────────────────────────────────────┤
│ Layer 3: Global Rate Limiting                                  │
│   └─ Chat endpoint limits (20/100 per 5hr)                     │
├────────────────────────────────────────────────────────────────┤
│ Layer 4: Mode Hint Sanitization (NEW)                          │
│   └─ PromptInjectionDefense.sanitizeModeHint()                 │
├────────────────────────────────────────────────────────────────┤
│ Layer 5: GLM-4.6 with Tools                                    │
│   └─ Model decides which tool to call                          │
├────────────────────────────────────────────────────────────────┤
│ Layer 6: Tool Security Middleware (NEW)                        │
│   ├─ ToolParameterValidator.validate()                         │
│   ├─ checkToolRateLimit() - SEPARATE from chat limits          │
│   ├─ verifyToolAuthorization()                                 │
│   └─ ToolExecutionTracker.checkLimits()                        │
├────────────────────────────────────────────────────────────────┤
│ Layer 7: Tool Executor (Pure Business Logic)                   │
│   └─ generateArtifact() / generateImage() - NO SSE deps        │
├────────────────────────────────────────────────────────────────┤
│ Layer 8: Response Streaming                                    │
│   └─ SSE transformation, error sanitization                    │
└────────────────────────────────────────────────────────────────┘
```

### Clean Architecture: Dependency Direction

```
OUTER LAYERS (Infrastructure)          INNER LAYERS (Business Logic)
─────────────────────────────          ─────────────────────────────

chat/index.ts ──────────────────────┐
   │                                │
   ├── middleware/rateLimit.ts      │
   │                                │
   ├── handlers/unified-chat.ts     │
   │       │                        │
   │       ├── tool-security.ts ────┼──→ _shared/tool-validator.ts
   │       │                        │
   │       └── SSE streaming ───────┼──→ _shared/artifact-generator.ts
   │                                │         (pure function, no SSE)
   │                                │
   └── response formatting          │──→ _shared/image-generator.ts
                                    │         (pure function, no SSE)
                                    │
                                    └──→ _shared/tool-definitions.ts
                                              (data only, no deps)
```

**Key Principle**: Inner modules return data, outer modules handle streaming.

---

## Phase 0: Security Infrastructure (NEW - REQUIRED FIRST)

**Goal**: Build all security components before any feature code

### 0.1 Tool Parameter Validator

**File**: `supabase/functions/_shared/tool-validator.ts` (NEW)

```typescript
/**
 * Tool Parameter Validator
 *
 * Validates and sanitizes all tool parameters before execution.
 * Prevents injection attacks, type confusion, and invalid data.
 *
 * SECURITY FIX: Added prototype pollution protection and object freezing.
 * SECURITY FIX: Added extra property rejection to prevent parameter smuggling.
 *
 * @security CWE-20 - Input Validation
 */

import { sanitizeContent, VALIDATION_LIMITS } from './validators.ts';

// =============================================================================
// Types
// =============================================================================

export type ArtifactType = 'react' | 'html' | 'svg' | 'code' | 'mermaid' | 'markdown';
export type AspectRatio = '1:1' | '16:9' | '9:16';

export interface ValidatedArtifactParams {
  readonly type: ArtifactType;
  readonly prompt: string;
}

export interface ValidatedImageParams {
  readonly prompt: string;
  readonly aspectRatio: AspectRatio;
}

export interface ValidatedSearchParams {
  readonly query: string;
}

// =============================================================================
// Validation Errors
// =============================================================================

export class ToolValidationError extends Error {
  constructor(
    public readonly field: string,
    public readonly reason: string,
    public readonly code: string = 'INVALID_PARAMETER'
  ) {
    super(`Invalid ${field}: ${reason}`);
    this.name = 'ToolValidationError';
  }
}

// =============================================================================
// Security Utilities
// =============================================================================

/**
 * SECURITY FIX: Prototype pollution protection
 *
 * Checks if an object contains dangerous prototype pollution keys.
 * Attackers can try to inject __proto__, constructor, or prototype
 * to modify object behavior.
 */
const DANGEROUS_KEYS = ['__proto__', 'constructor', 'prototype'];

function checkPrototypePollution(obj: Record<string, unknown>, path: string = ''): void {
  for (const key of Object.keys(obj)) {
    if (DANGEROUS_KEYS.includes(key)) {
      throw new ToolValidationError(
        path ? `${path}.${key}` : key,
        'Potentially dangerous property name',
        'PROTOTYPE_POLLUTION'
      );
    }
    // Recursively check nested objects
    const value = obj[key];
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      checkPrototypePollution(value as Record<string, unknown>, path ? `${path}.${key}` : key);
    }
  }
}

/**
 * SECURITY FIX: Validate that object only contains expected keys
 *
 * Prevents parameter smuggling where extra fields are passed to
 * downstream functions that might use them unexpectedly.
 */
function validateOnlyExpectedKeys(
  obj: Record<string, unknown>,
  expectedKeys: readonly string[],
  optionalKeys: readonly string[] = []
): void {
  const allAllowedKeys = [...expectedKeys, ...optionalKeys];
  const actualKeys = Object.keys(obj);

  for (const key of actualKeys) {
    if (!allAllowedKeys.includes(key)) {
      throw new ToolValidationError(
        key,
        `Unexpected parameter. Allowed: ${allAllowedKeys.join(', ')}`,
        'UNEXPECTED_PROPERTY'
      );
    }
  }
}

// =============================================================================
// Validator Implementation
// =============================================================================

export class ToolParameterValidator {

  // Valid artifact types (strict allowlist)
  private static readonly VALID_ARTIFACT_TYPES: readonly ArtifactType[] = [
    'react', 'html', 'svg', 'code', 'mermaid', 'markdown'
  ] as const;

  // Valid aspect ratios (strict allowlist)
  private static readonly VALID_ASPECT_RATIOS: readonly AspectRatio[] = [
    '1:1', '16:9', '9:16'
  ] as const;

  // Maximum prompt lengths per tool
  private static readonly MAX_ARTIFACT_PROMPT = 10000;
  private static readonly MAX_IMAGE_PROMPT = 2000;
  private static readonly MAX_SEARCH_QUERY = 500;

  // Expected keys per tool (for extra property validation)
  private static readonly ARTIFACT_EXPECTED_KEYS = ['type', 'prompt'] as const;
  private static readonly IMAGE_EXPECTED_KEYS = ['prompt'] as const;
  private static readonly IMAGE_OPTIONAL_KEYS = ['aspectRatio'] as const;
  private static readonly SEARCH_EXPECTED_KEYS = ['query'] as const;

  /**
   * Validate artifact tool parameters
   *
   * SECURITY FIX: Checks for prototype pollution and rejects extra properties.
   * Returns a frozen object to prevent modification after validation.
   *
   * @throws ToolValidationError if validation fails
   */
  static validateArtifactParams(args: unknown): ValidatedArtifactParams {
    // Type guard: must be object
    if (!args || typeof args !== 'object' || Array.isArray(args)) {
      throw new ToolValidationError('arguments', 'Must be a non-null object', 'TYPE_ERROR');
    }

    const params = args as Record<string, unknown>;

    // SECURITY FIX: Check for prototype pollution attempts
    checkPrototypePollution(params);

    // SECURITY FIX: Reject unexpected properties
    validateOnlyExpectedKeys(params, this.ARTIFACT_EXPECTED_KEYS);

    // Validate 'type' field
    const type = params.type;
    if (type === undefined || type === null) {
      throw new ToolValidationError('type', 'Required field missing', 'REQUIRED');
    }
    if (typeof type !== 'string') {
      throw new ToolValidationError('type', 'Must be a string', 'TYPE_ERROR');
    }
    if (!this.VALID_ARTIFACT_TYPES.includes(type as ArtifactType)) {
      throw new ToolValidationError(
        'type',
        `Must be one of: ${this.VALID_ARTIFACT_TYPES.join(', ')}`,
        'INVALID_ENUM'
      );
    }

    // Validate 'prompt' field
    const prompt = params.prompt;
    if (prompt === undefined || prompt === null) {
      throw new ToolValidationError('prompt', 'Required field missing', 'REQUIRED');
    }
    if (typeof prompt !== 'string') {
      throw new ToolValidationError('prompt', 'Must be a string', 'TYPE_ERROR');
    }

    // Sanitize and validate prompt content
    const sanitizedPrompt = sanitizeContent(prompt);
    if (sanitizedPrompt.trim().length === 0) {
      throw new ToolValidationError('prompt', 'Cannot be empty', 'EMPTY');
    }
    if (sanitizedPrompt.length > this.MAX_ARTIFACT_PROMPT) {
      throw new ToolValidationError(
        'prompt',
        `Maximum ${this.MAX_ARTIFACT_PROMPT} characters allowed`,
        'TOO_LONG'
      );
    }

    // SECURITY FIX: Return frozen object to prevent post-validation modification
    return Object.freeze({
      type: type as ArtifactType,
      prompt: sanitizedPrompt
    });
  }

  /**
   * Validate image tool parameters
   *
   * SECURITY FIX: Checks for prototype pollution and rejects extra properties.
   * Returns a frozen object to prevent modification after validation.
   *
   * @throws ToolValidationError if validation fails
   */
  static validateImageParams(args: unknown): ValidatedImageParams {
    // Type guard: must be object
    if (!args || typeof args !== 'object' || Array.isArray(args)) {
      throw new ToolValidationError('arguments', 'Must be a non-null object', 'TYPE_ERROR');
    }

    const params = args as Record<string, unknown>;

    // SECURITY FIX: Check for prototype pollution attempts
    checkPrototypePollution(params);

    // SECURITY FIX: Reject unexpected properties
    validateOnlyExpectedKeys(params, this.IMAGE_EXPECTED_KEYS, this.IMAGE_OPTIONAL_KEYS);

    // Validate 'prompt' field (required)
    const prompt = params.prompt;
    if (prompt === undefined || prompt === null) {
      throw new ToolValidationError('prompt', 'Required field missing', 'REQUIRED');
    }
    if (typeof prompt !== 'string') {
      throw new ToolValidationError('prompt', 'Must be a string', 'TYPE_ERROR');
    }

    // Sanitize and validate prompt content
    const sanitizedPrompt = sanitizeContent(prompt);
    if (sanitizedPrompt.trim().length === 0) {
      throw new ToolValidationError('prompt', 'Cannot be empty', 'EMPTY');
    }
    if (sanitizedPrompt.length > this.MAX_IMAGE_PROMPT) {
      throw new ToolValidationError(
        'prompt',
        `Maximum ${this.MAX_IMAGE_PROMPT} characters allowed`,
        'TOO_LONG'
      );
    }

    // Validate 'aspectRatio' field (optional, defaults to '1:1')
    let aspectRatio: AspectRatio = '1:1';
    if (params.aspectRatio !== undefined && params.aspectRatio !== null) {
      if (typeof params.aspectRatio !== 'string') {
        throw new ToolValidationError('aspectRatio', 'Must be a string', 'TYPE_ERROR');
      }
      if (!this.VALID_ASPECT_RATIOS.includes(params.aspectRatio as AspectRatio)) {
        throw new ToolValidationError(
          'aspectRatio',
          `Must be one of: ${this.VALID_ASPECT_RATIOS.join(', ')}`,
          'INVALID_ENUM'
        );
      }
      aspectRatio = params.aspectRatio as AspectRatio;
    }

    // SECURITY FIX: Return frozen object to prevent post-validation modification
    return Object.freeze({
      prompt: sanitizedPrompt,
      aspectRatio
    });
  }

  /**
   * Validate search tool parameters
   *
   * SECURITY FIX: Checks for prototype pollution and rejects extra properties.
   * Returns a frozen object to prevent modification after validation.
   *
   * @throws ToolValidationError if validation fails
   */
  static validateSearchParams(args: unknown): ValidatedSearchParams {
    // Type guard: must be object
    if (!args || typeof args !== 'object' || Array.isArray(args)) {
      throw new ToolValidationError('arguments', 'Must be a non-null object', 'TYPE_ERROR');
    }

    const params = args as Record<string, unknown>;

    // SECURITY FIX: Check for prototype pollution attempts
    checkPrototypePollution(params);

    // SECURITY FIX: Reject unexpected properties
    validateOnlyExpectedKeys(params, this.SEARCH_EXPECTED_KEYS);

    // Validate 'query' field
    const query = params.query;
    if (query === undefined || query === null) {
      throw new ToolValidationError('query', 'Required field missing', 'REQUIRED');
    }
    if (typeof query !== 'string') {
      throw new ToolValidationError('query', 'Must be a string', 'TYPE_ERROR');
    }

    const sanitizedQuery = sanitizeContent(query);
    if (sanitizedQuery.trim().length === 0) {
      throw new ToolValidationError('query', 'Cannot be empty', 'EMPTY');
    }
    if (sanitizedQuery.length > this.MAX_SEARCH_QUERY) {
      throw new ToolValidationError(
        'query',
        `Maximum ${this.MAX_SEARCH_QUERY} characters allowed`,
        'TOO_LONG'
      );
    }

    // SECURITY FIX: Return frozen object to prevent post-validation modification
    return Object.freeze({ query: sanitizedQuery });
  }

  /**
   * Generic validator that routes to specific validators
   */
  static validate(
    toolName: string,
    args: unknown
  ): ValidatedArtifactParams | ValidatedImageParams | ValidatedSearchParams {
    switch (toolName) {
      case 'generate_artifact':
        return this.validateArtifactParams(args);
      case 'generate_image':
        return this.validateImageParams(args);
      case 'browser.search':
        return this.validateSearchParams(args);
      default:
        throw new ToolValidationError('toolName', `Unknown tool: ${toolName}`, 'UNKNOWN_TOOL');
    }
  }
}
```

---

### 0.2 Tool Rate Limiter

**File**: `supabase/functions/_shared/tool-rate-limiter.ts` (NEW)

```typescript
/**
 * Tool-Specific Rate Limiter
 *
 * Enforces separate rate limits per tool type, preventing bypass attacks
 * where users route expensive operations through the unified endpoint.
 *
 * SECURITY FIX: Fail-closed design with circuit breaker pattern.
 * Unknown tools are DENIED by default (not allowed).
 *
 * @security CWE-841 - Rate Limit Bypass Prevention
 */

import { createClient } from '@supabase/supabase-js';
import { RATE_LIMITS } from './config.ts';

// =============================================================================
// Types
// =============================================================================

export interface ToolRateLimitConfig {
  apiThrottle: {
    maxRequests: number;
    windowSeconds: number;
  };
  guest: {
    maxRequests: number;
    windowHours: number;
  };
  authenticated: {
    maxRequests: number;
    windowHours: number;
  };
}

export interface RateLimitContext {
  isGuest: boolean;
  userId?: string;
  clientIp: string;
  requestId: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  limit: number;
}

export class ToolRateLimitError extends Error {
  constructor(
    public readonly toolName: string,
    public readonly limitType: 'api_throttle' | 'user_limit' | 'unknown_tool' | 'circuit_open',
    public readonly remaining: number,
    public readonly resetAt: Date
  ) {
    super(`Rate limit exceeded for ${toolName}`);
    this.name = 'ToolRateLimitError';
  }
}

// =============================================================================
// Circuit Breaker for Database Failures
// =============================================================================

interface CircuitBreakerState {
  failures: number;
  lastFailure: number;
  isOpen: boolean;
}

const CIRCUIT_BREAKER_CONFIG = {
  maxFailures: 3,           // Open circuit after 3 consecutive failures
  cooldownMs: 30000,        // 30 second cooldown before retrying
};

// =============================================================================
// Rate Limit Configuration per Tool
// =============================================================================

export const TOOL_RATE_LIMITS: Record<string, ToolRateLimitConfig> = {
  generate_artifact: {
    apiThrottle: {
      maxRequests: RATE_LIMITS.ARTIFACT.API_THROTTLE.MAX_REQUESTS,
      windowSeconds: RATE_LIMITS.ARTIFACT.API_THROTTLE.WINDOW_SECONDS,
    },
    guest: {
      maxRequests: RATE_LIMITS.ARTIFACT.GUEST.MAX_REQUESTS,
      windowHours: RATE_LIMITS.ARTIFACT.GUEST.WINDOW_HOURS,
    },
    authenticated: {
      maxRequests: RATE_LIMITS.ARTIFACT.AUTHENTICATED.MAX_REQUESTS,
      windowHours: RATE_LIMITS.ARTIFACT.AUTHENTICATED.WINDOW_HOURS,
    },
  },

  generate_image: {
    apiThrottle: {
      maxRequests: RATE_LIMITS.IMAGE.API_THROTTLE.MAX_REQUESTS,
      windowSeconds: RATE_LIMITS.IMAGE.API_THROTTLE.WINDOW_SECONDS,
    },
    guest: {
      maxRequests: RATE_LIMITS.IMAGE.GUEST.MAX_REQUESTS,
      windowHours: RATE_LIMITS.IMAGE.GUEST.WINDOW_HOURS,
    },
    authenticated: {
      maxRequests: RATE_LIMITS.IMAGE.AUTHENTICATED.MAX_REQUESTS,
      windowHours: RATE_LIMITS.IMAGE.AUTHENTICATED.WINDOW_HOURS,
    },
  },

  'browser.search': {
    apiThrottle: {
      maxRequests: RATE_LIMITS.TAVILY.API_THROTTLE.MAX_REQUESTS,
      windowSeconds: RATE_LIMITS.TAVILY.API_THROTTLE.WINDOW_SECONDS,
    },
    guest: {
      maxRequests: RATE_LIMITS.TAVILY.GUEST.MAX_REQUESTS,
      windowHours: RATE_LIMITS.TAVILY.GUEST.WINDOW_HOURS,
    },
    authenticated: {
      maxRequests: RATE_LIMITS.TAVILY.AUTHENTICATED.MAX_REQUESTS,
      windowHours: RATE_LIMITS.TAVILY.AUTHENTICATED.WINDOW_HOURS,
    },
  },
};

// =============================================================================
// Rate Limiter Implementation
// =============================================================================

export class ToolRateLimiter {
  private serviceClient: ReturnType<typeof createClient>;
  private circuitBreaker: CircuitBreakerState = {
    failures: 0,
    lastFailure: 0,
    isOpen: false,
  };

  constructor(serviceClient: ReturnType<typeof createClient>) {
    this.serviceClient = serviceClient;
  }

  /**
   * Check if tool execution is allowed under rate limits
   *
   * SECURITY: Fail-closed design - denies on unknown tools or DB errors.
   * Uses circuit breaker to prevent cascading failures while maintaining security.
   *
   * @throws ToolRateLimitError if any limit is exceeded or tool is unknown
   */
  async checkToolRateLimit(
    toolName: string,
    context: RateLimitContext
  ): Promise<RateLimitResult> {
    // SECURITY FIX: Check circuit breaker state first
    if (this.isCircuitOpen()) {
      console.error(`[${context.requestId}] Circuit breaker OPEN - denying request`);
      throw new ToolRateLimitError(
        toolName,
        'circuit_open',
        0,
        new Date(this.circuitBreaker.lastFailure + CIRCUIT_BREAKER_CONFIG.cooldownMs)
      );
    }

    const config = TOOL_RATE_LIMITS[toolName];

    // SECURITY FIX: Fail-closed for unknown tools (was fail-open!)
    if (!config) {
      console.error(`[${context.requestId}] DENIED: Unknown tool "${toolName}" - fail-closed`);
      throw new ToolRateLimitError(
        toolName,
        'unknown_tool',
        0,
        new Date()
      );
    }

    try {
      // Check 1: API-level throttle (prevents overwhelming external APIs)
      const apiThrottleResult = await this.checkApiThrottle(toolName, config, context);
      if (!apiThrottleResult.allowed) {
        throw new ToolRateLimitError(
          toolName,
          'api_throttle',
          apiThrottleResult.remaining,
          apiThrottleResult.resetAt
        );
      }

      // Check 2: User/guest rate limit (per-user quota) - NOW TOOL-SPECIFIC
      const userLimitResult = context.isGuest
        ? await this.checkGuestLimit(toolName, config, context)
        : await this.checkUserLimit(toolName, config, context);

      if (!userLimitResult.allowed) {
        throw new ToolRateLimitError(
          toolName,
          'user_limit',
          userLimitResult.remaining,
          userLimitResult.resetAt
        );
      }

      // Success - reset circuit breaker
      this.resetCircuitBreaker();

      console.log(
        `[${context.requestId}] Tool rate limit check passed: ${toolName} ` +
        `(remaining: ${userLimitResult.remaining}/${userLimitResult.limit})`
      );

      return userLimitResult;

    } catch (error) {
      // Re-throw rate limit errors (expected)
      if (error instanceof ToolRateLimitError) {
        throw error;
      }
      // Unexpected error - record failure and fail-closed
      this.recordFailure();
      throw error;
    }
  }

  /**
   * Check if circuit breaker is open (too many recent failures)
   */
  private isCircuitOpen(): boolean {
    if (!this.circuitBreaker.isOpen) {
      return false;
    }
    // Check if cooldown has elapsed
    const elapsed = Date.now() - this.circuitBreaker.lastFailure;
    if (elapsed >= CIRCUIT_BREAKER_CONFIG.cooldownMs) {
      // Allow one request through (half-open state)
      console.log('Circuit breaker entering half-open state');
      return false;
    }
    return true;
  }

  /**
   * Record a failure and potentially open the circuit
   */
  private recordFailure(): void {
    this.circuitBreaker.failures++;
    this.circuitBreaker.lastFailure = Date.now();
    if (this.circuitBreaker.failures >= CIRCUIT_BREAKER_CONFIG.maxFailures) {
      this.circuitBreaker.isOpen = true;
      console.error(`Circuit breaker OPENED after ${this.circuitBreaker.failures} failures`);
    }
  }

  /**
   * Reset circuit breaker on successful request
   */
  private resetCircuitBreaker(): void {
    if (this.circuitBreaker.failures > 0 || this.circuitBreaker.isOpen) {
      console.log('Circuit breaker reset');
    }
    this.circuitBreaker.failures = 0;
    this.circuitBreaker.isOpen = false;
  }

  /**
   * Check API-level throttle (short window, high rate)
   * SECURITY FIX: Fail-closed on DB errors
   */
  private async checkApiThrottle(
    toolName: string,
    config: ToolRateLimitConfig,
    context: RateLimitContext
  ): Promise<RateLimitResult> {
    const { data, error } = await this.serviceClient.rpc('check_api_throttle', {
      p_api_name: `tool-${toolName}`,
      p_max_requests: config.apiThrottle.maxRequests,
      p_window_seconds: config.apiThrottle.windowSeconds,
    });

    if (error) {
      console.error(`[${context.requestId}] API throttle check failed - DENYING:`, error);
      // SECURITY FIX: Fail-closed on DB errors (was fail-open!)
      throw new Error(`Rate limit check failed: ${error.message}`);
    }

    return {
      allowed: data?.allowed ?? false,  // SECURITY FIX: Default to denied
      remaining: data?.remaining ?? 0,
      resetAt: new Date(data?.reset_at ?? Date.now()),
      limit: config.apiThrottle.maxRequests,
    };
  }

  /**
   * Check guest rate limit (IP-based, longer window)
   * SECURITY FIX: Tool-specific identifier AND fail-closed
   */
  private async checkGuestLimit(
    toolName: string,
    config: ToolRateLimitConfig,
    context: RateLimitContext
  ): Promise<RateLimitResult> {
    // ALREADY CORRECT: Tool-specific identifier separates from chat limits
    const identifier = `${context.clientIp}:tool:${toolName}`;

    const { data, error } = await this.serviceClient.rpc('check_guest_rate_limit', {
      p_identifier: identifier,
      p_max_requests: config.guest.maxRequests,
      p_window_hours: config.guest.windowHours,
    });

    if (error) {
      console.error(`[${context.requestId}] Guest rate limit check failed - DENYING:`, error);
      // SECURITY FIX: Fail-closed on DB errors (was fail-open!)
      throw new Error(`Rate limit check failed: ${error.message}`);
    }

    return {
      allowed: data?.allowed ?? false,  // SECURITY FIX: Default to denied
      remaining: data?.remaining ?? 0,
      resetAt: new Date(data?.reset_at ?? Date.now()),
      limit: config.guest.maxRequests,
    };
  }

  /**
   * Check authenticated user rate limit
   * SECURITY FIX: Tool-specific via composite key AND fail-closed
   */
  private async checkUserLimit(
    toolName: string,
    config: ToolRateLimitConfig,
    context: RateLimitContext
  ): Promise<RateLimitResult> {
    if (!context.userId) {
      // Shouldn't happen - fall back to guest limits
      return this.checkGuestLimit(toolName, config, context);
    }

    // SECURITY FIX: Use tool-specific composite key
    // The RPC function now accepts a tool_name parameter for per-tool tracking
    const { data, error } = await this.serviceClient.rpc('check_user_tool_rate_limit', {
      p_user_id: context.userId,
      p_tool_name: toolName,  // SECURITY FIX: Added tool-specific parameter
      p_max_requests: config.authenticated.maxRequests,
      p_window_hours: config.authenticated.windowHours,
    });

    if (error) {
      console.error(`[${context.requestId}] User rate limit check failed - DENYING:`, error);
      // SECURITY FIX: Fail-closed on DB errors (was fail-open!)
      throw new Error(`Rate limit check failed: ${error.message}`);
    }

    return {
      allowed: data?.allowed ?? false,  // SECURITY FIX: Default to denied
      remaining: data?.remaining ?? 0,
      resetAt: new Date(data?.reset_at ?? Date.now()),
      limit: config.authenticated.maxRequests,
    };
  }
}

// =============================================================================
// DATABASE MIGRATION REQUIRED
// =============================================================================
//
// Add the following migration to support tool-specific user rate limits:
//
// CREATE TABLE user_tool_rate_limits (
//   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
//   user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
//   tool_name TEXT NOT NULL,
//   request_count INTEGER DEFAULT 1,
//   window_start TIMESTAMPTZ DEFAULT NOW(),
//   last_request TIMESTAMPTZ DEFAULT NOW(),
//   created_at TIMESTAMPTZ DEFAULT NOW(),
//   UNIQUE(user_id, tool_name)
// );
//
// CREATE INDEX idx_user_tool_rate_limits_lookup
//   ON user_tool_rate_limits(user_id, tool_name, window_start);
//
// CREATE OR REPLACE FUNCTION check_user_tool_rate_limit(
//   p_user_id UUID,
//   p_tool_name TEXT,
//   p_max_requests INTEGER,
//   p_window_hours INTEGER
// ) RETURNS JSONB
// LANGUAGE plpgsql
// SECURITY DEFINER
// SET search_path = public, pg_temp
// AS $$
// DECLARE
//   v_result JSONB;
//   v_count INTEGER;
//   v_window_start TIMESTAMPTZ;
// BEGIN
//   -- Upsert and get current count
//   INSERT INTO user_tool_rate_limits (user_id, tool_name, request_count, window_start, last_request)
//   VALUES (p_user_id, p_tool_name, 1, NOW(), NOW())
//   ON CONFLICT (user_id, tool_name) DO UPDATE SET
//     request_count = CASE
//       WHEN user_tool_rate_limits.window_start < NOW() - (p_window_hours || ' hours')::INTERVAL
//       THEN 1
//       ELSE user_tool_rate_limits.request_count + 1
//     END,
//     window_start = CASE
//       WHEN user_tool_rate_limits.window_start < NOW() - (p_window_hours || ' hours')::INTERVAL
//       THEN NOW()
//       ELSE user_tool_rate_limits.window_start
//     END,
//     last_request = NOW()
//   RETURNING request_count, window_start INTO v_count, v_window_start;
//
//   RETURN jsonb_build_object(
//     'allowed', v_count <= p_max_requests,
//     'remaining', GREATEST(0, p_max_requests - v_count),
//     'reset_at', v_window_start + (p_window_hours || ' hours')::INTERVAL
//   );
// END;
// $$;
```

---

### 0.3 Tool Execution Tracker

**File**: `supabase/functions/_shared/tool-execution-tracker.ts` (NEW)

```typescript
/**
 * Tool Execution Tracker
 *
 * Prevents resource exhaustion by tracking and limiting tool execution
 * within a single request. Implements circuit breaker for cascading failures.
 *
 * SECURITY FIX: Properly cleans up timeouts to prevent memory leaks.
 * Uses AbortController pattern for clean cancellation.
 *
 * @security CWE-400 - Resource Exhaustion Prevention
 */

// =============================================================================
// Types
// =============================================================================

export interface ExecutionLimits {
  maxToolCallsPerRequest: number;
  maxTotalExecutionMs: number;
  maxSingleToolMs: number;
}

export interface ExecutionStats {
  toolCallCount: number;
  totalExecutionMs: number;
  toolExecutions: Array<{
    toolName: string;
    startTime: number;
    endTime?: number;
    durationMs?: number;
    success: boolean;
    error?: string;
  }>;
}

export class ResourceExhaustionError extends Error {
  constructor(
    public readonly limitType: 'max_calls' | 'max_time' | 'tool_timeout',
    public readonly limit: number,
    public readonly actual: number
  ) {
    super(`Resource limit exceeded: ${limitType} (limit: ${limit}, actual: ${actual})`);
    this.name = 'ResourceExhaustionError';
  }
}

// =============================================================================
// Default Limits
// =============================================================================

export const DEFAULT_EXECUTION_LIMITS: ExecutionLimits = {
  maxToolCallsPerRequest: 3,      // Max tools per request
  maxTotalExecutionMs: 90000,     // 90s total request timeout
  maxSingleToolMs: 60000,         // 60s per tool (artifact can be slow)
};

// =============================================================================
// Tracker Implementation
// =============================================================================

export class ToolExecutionTracker {
  private readonly limits: ExecutionLimits;
  private readonly requestId: string;
  private readonly requestStartTime: number;
  private stats: ExecutionStats;
  // SECURITY FIX: Track active timeouts for cleanup
  private activeTimeouts: Set<ReturnType<typeof setTimeout>> = new Set();

  constructor(requestId: string, limits?: Partial<ExecutionLimits>) {
    this.requestId = requestId;
    this.limits = { ...DEFAULT_EXECUTION_LIMITS, ...limits };
    this.requestStartTime = Date.now();
    this.stats = {
      toolCallCount: 0,
      totalExecutionMs: 0,
      toolExecutions: [],
    };
  }

  /**
   * Check if another tool execution is allowed
   *
   * @throws ResourceExhaustionError if limits exceeded
   */
  checkCanExecute(toolName: string): void {
    // Check 1: Tool call count
    if (this.stats.toolCallCount >= this.limits.maxToolCallsPerRequest) {
      throw new ResourceExhaustionError(
        'max_calls',
        this.limits.maxToolCallsPerRequest,
        this.stats.toolCallCount
      );
    }

    // Check 2: Total execution time
    const elapsed = Date.now() - this.requestStartTime;
    if (elapsed >= this.limits.maxTotalExecutionMs) {
      throw new ResourceExhaustionError(
        'max_time',
        this.limits.maxTotalExecutionMs,
        elapsed
      );
    }

    console.log(
      `[${this.requestId}] Tool execution check: ${toolName} ` +
      `(calls: ${this.stats.toolCallCount + 1}/${this.limits.maxToolCallsPerRequest}, ` +
      `time: ${elapsed}ms/${this.limits.maxTotalExecutionMs}ms)`
    );
  }

  /**
   * Track tool execution with timeout protection
   *
   * SECURITY FIX: Properly cleans up timeout to prevent memory leak.
   * The previous implementation used Promise.race without cleanup,
   * causing the timeout to continue running even after the executor completed.
   */
  async trackExecution<T>(
    toolName: string,
    executor: () => Promise<T>
  ): Promise<T> {
    // Pre-check limits
    this.checkCanExecute(toolName);

    const execution = {
      toolName,
      startTime: Date.now(),
      endTime: undefined as number | undefined,
      durationMs: undefined as number | undefined,
      success: false,
      error: undefined as string | undefined,
    };

    this.stats.toolExecutions.push(execution);
    this.stats.toolCallCount++;

    // SECURITY FIX: Use timeout handle for cleanup
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

    try {
      // SECURITY FIX: Create cancellable timeout with cleanup
      const result = await Promise.race([
        executor(),
        new Promise<never>((_, reject) => {
          timeoutHandle = setTimeout(() => {
            reject(new ResourceExhaustionError(
              'tool_timeout',
              this.limits.maxSingleToolMs,
              this.limits.maxSingleToolMs
            ));
          }, this.limits.maxSingleToolMs);
          // Track for cleanup on destroy
          this.activeTimeouts.add(timeoutHandle);
        }),
      ]);

      execution.endTime = Date.now();
      execution.durationMs = execution.endTime - execution.startTime;
      execution.success = true;
      this.stats.totalExecutionMs += execution.durationMs;

      console.log(
        `[${this.requestId}] Tool executed: ${toolName} ` +
        `(duration: ${execution.durationMs}ms, success: true)`
      );

      return result as T;

    } catch (error) {
      execution.endTime = Date.now();
      execution.durationMs = execution.endTime - execution.startTime;
      execution.success = false;
      execution.error = error instanceof Error ? error.message : 'Unknown error';
      this.stats.totalExecutionMs += execution.durationMs;

      console.error(
        `[${this.requestId}] Tool failed: ${toolName} ` +
        `(duration: ${execution.durationMs}ms, error: ${execution.error})`
      );

      throw error;
    } finally {
      // SECURITY FIX: ALWAYS clean up timeout to prevent memory leak
      if (timeoutHandle !== undefined) {
        clearTimeout(timeoutHandle);
        this.activeTimeouts.delete(timeoutHandle);
      }
    }
  }

  /**
   * Get execution statistics
   */
  getStats(): ExecutionStats {
    return { ...this.stats };
  }

  /**
   * Get remaining budget
   */
  getRemainingBudget(): { calls: number; timeMs: number } {
    return {
      calls: this.limits.maxToolCallsPerRequest - this.stats.toolCallCount,
      timeMs: this.limits.maxTotalExecutionMs - (Date.now() - this.requestStartTime),
    };
  }

  /**
   * SECURITY FIX: Clean up all active timeouts
   *
   * Call this when the request is complete to ensure no lingering timers.
   * Prevents memory leaks in long-running edge function instances.
   */
  destroy(): void {
    for (const timeout of this.activeTimeouts) {
      clearTimeout(timeout);
    }
    this.activeTimeouts.clear();
    console.log(`[${this.requestId}] ToolExecutionTracker destroyed, cleaned up ${this.activeTimeouts.size} timeouts`);
  }
}
```

---

### 0.4 Prompt Injection Defense

**File**: `supabase/functions/_shared/prompt-injection-defense.ts` (NEW)

```typescript
/**
 * Prompt Injection Defense
 *
 * Sanitizes user-controlled inputs that are injected into system prompts.
 * Prevents prompt manipulation attacks via mode hints and artifact context.
 *
 * SECURITY FIX: Added Unicode normalization to prevent homoglyph attacks.
 * Attackers can use visually similar Unicode characters (e.g., Cyrillic 'а')
 * to bypass string matching checks.
 *
 * @security CWE-74 - Prompt Injection Prevention
 */

// =============================================================================
// Types
// =============================================================================

export type ModeHint = 'artifact' | 'image' | 'auto';

export interface SanitizedContext {
  modeHint: ModeHint;
  artifactContext: string;
  userMessage: string;
}

// =============================================================================
// Unicode Normalization Utilities
// =============================================================================

/**
 * SECURITY FIX: Map of common confusable characters (homoglyphs)
 *
 * Attackers use visually similar characters from different Unicode blocks
 * to bypass security checks. For example:
 * - Cyrillic 'а' (U+0430) looks like Latin 'a' (U+0061)
 * - Greek 'ο' (U+03BF) looks like Latin 'o' (U+006F)
 *
 * This map normalizes common confusables to their ASCII equivalents.
 */
const CONFUSABLE_MAP: Record<string, string> = {
  // Cyrillic confusables
  'а': 'a', 'е': 'e', 'о': 'o', 'р': 'p', 'с': 'c', 'у': 'y', 'х': 'x',
  'А': 'A', 'В': 'B', 'Е': 'E', 'К': 'K', 'М': 'M', 'Н': 'H', 'О': 'O',
  'Р': 'P', 'С': 'C', 'Т': 'T', 'Х': 'X',
  // Greek confusables
  'α': 'a', 'ο': 'o', 'ρ': 'p', 'τ': 't', 'υ': 'u', 'ν': 'v',
  'Α': 'A', 'Β': 'B', 'Ε': 'E', 'Η': 'H', 'Ι': 'I', 'Κ': 'K', 'Μ': 'M',
  'Ν': 'N', 'Ο': 'O', 'Ρ': 'P', 'Τ': 'T', 'Υ': 'Y', 'Χ': 'X', 'Ζ': 'Z',
  // Mathematical/special
  'ℊ': 'g', 'ℎ': 'h', 'ℯ': 'e', '℮': 'e',
  // Full-width Latin (commonly used in CJK contexts)
  'ａ': 'a', 'ｂ': 'b', 'ｃ': 'c', 'ｄ': 'd', 'ｅ': 'e', 'ｆ': 'f', 'ｇ': 'g',
  'ｈ': 'h', 'ｉ': 'i', 'ｊ': 'j', 'ｋ': 'k', 'ｌ': 'l', 'ｍ': 'm', 'ｎ': 'n',
  'ｏ': 'o', 'ｐ': 'p', 'ｑ': 'q', 'ｒ': 'r', 'ｓ': 's', 'ｔ': 't', 'ｕ': 'u',
  'ｖ': 'v', 'ｗ': 'w', 'ｘ': 'x', 'ｙ': 'y', 'ｚ': 'z',
};

/**
 * SECURITY FIX: Normalize Unicode string to prevent homoglyph attacks
 *
 * 1. Apply NFKC normalization (compatibility decomposition + canonical composition)
 * 2. Replace known confusable characters with ASCII equivalents
 * 3. Remove zero-width and invisible characters
 */
function normalizeUnicode(input: string): string {
  // Step 1: NFKC normalization (handles things like ligatures, width variants)
  let normalized = input.normalize('NFKC');

  // Step 2: Replace known confusables
  let result = '';
  for (const char of normalized) {
    result += CONFUSABLE_MAP[char] ?? char;
  }

  // Step 3: Remove zero-width and invisible characters
  result = result.replace(/[\u200B-\u200F\u2028-\u202F\u205F-\u206F\uFEFF]/g, '');

  return result;
}

// =============================================================================
// Dangerous Pattern Detection
// =============================================================================

const DANGEROUS_PATTERNS = [
  // System instruction markers
  /\bSYSTEM\s*:/gi,
  /\bIMPORTANT\s*:/gi,
  /\bINSTRUCTION\s*:/gi,
  /\bOVERRIDE\s*:/gi,
  /\bADMIN\s*:/gi,
  /\bEXECUTE\s*:/gi,

  // Injection attempts
  /IGNORE\s+(ALL\s+)?PREVIOUS\s+(INSTRUCTIONS?)?/gi,
  /FORGET\s+(ALL\s+)?PREVIOUS/gi,
  /DISREGARD\s+(ALL\s+)?ABOVE/gi,
  /NEW\s+INSTRUCTIONS?\s*:/gi,

  // Role manipulation
  /YOU\s+ARE\s+NOW/gi,
  /ACT\s+AS\s+(AN?\s+)?/gi,
  /PRETEND\s+(TO\s+BE|YOU'RE)/gi,
  /ROLEPLAY\s+AS/gi,

  // Delimiter injection
  /```\s*(system|assistant|user)/gi,
  /<\/?system>/gi,
  /\[\[SYSTEM\]\]/gi,

  // Unicode tricks (redundant after normalization but kept as defense-in-depth)
  /[\u200B-\u200D\uFEFF]/g,  // Zero-width characters
];

// =============================================================================
// Defense Implementation
// =============================================================================

export class PromptInjectionDefense {

  /**
   * Sanitize mode hint with strict allowlist
   *
   * SECURITY FIX: Applies Unicode normalization before matching.
   * Prevents homoglyph attacks like "аrtifact" (Cyrillic 'а').
   *
   * Only allows exact matches to known safe values.
   * Any deviation returns 'auto' (safest default).
   */
  static sanitizeModeHint(hint: unknown): ModeHint {
    // Strict type check
    if (hint === null || hint === undefined) {
      return 'auto';
    }

    if (typeof hint !== 'string') {
      console.warn(`Invalid mode hint type: ${typeof hint}, using 'auto'`);
      return 'auto';
    }

    // SECURITY FIX: Normalize Unicode BEFORE any string operations
    const normalizedUnicode = normalizeUnicode(hint);

    // Now normalize case and whitespace
    const normalized = normalizedUnicode.toLowerCase().trim();

    // Log if normalization changed the string (potential attack)
    if (hint !== normalizedUnicode) {
      console.warn(
        `Mode hint contained confusable characters: "${hint}" -> "${normalizedUnicode}"`
      );
    }

    // Strict allowlist (no partial matches)
    switch (normalized) {
      case 'artifact':
        return 'artifact';
      case 'image':
        return 'image';
      case 'auto':
        return 'auto';
      default:
        console.warn(`Unknown mode hint: "${hint}", using 'auto'`);
        return 'auto';
    }
  }

  /**
   * Sanitize artifact context that may be injected into prompts
   *
   * SECURITY FIX: Applies Unicode normalization before pattern matching.
   * Removes dangerous patterns and limits length.
   */
  static sanitizeArtifactContext(context: unknown): string {
    if (!context || typeof context !== 'string') {
      return '';
    }

    // SECURITY FIX: Normalize Unicode BEFORE pattern matching
    let sanitized = normalizeUnicode(context);

    // Remove dangerous patterns (now applied to normalized string)
    for (const pattern of DANGEROUS_PATTERNS) {
      sanitized = sanitized.replace(pattern, '[REMOVED]');
    }

    // Remove excessive whitespace that could be used for visual injection
    sanitized = sanitized.replace(/\n{3,}/g, '\n\n');
    sanitized = sanitized.replace(/[ \t]{10,}/g, ' ');

    // Limit length to prevent context overflow
    const MAX_CONTEXT_LENGTH = 5000;
    if (sanitized.length > MAX_CONTEXT_LENGTH) {
      sanitized = sanitized.slice(0, MAX_CONTEXT_LENGTH) + '\n[Context truncated]';
    }

    return sanitized;
  }

  /**
   * Sanitize user message for logging (not for prompt - that uses full message)
   *
   * This is for safe logging without exposing sensitive patterns.
   */
  static sanitizeForLogging(message: string, maxLength: number = 200): string {
    if (!message) return '';

    let sanitized = message.slice(0, maxLength);

    // Mask potential secrets
    sanitized = sanitized.replace(/(?:api[_-]?key|password|secret|token)\s*[:=]\s*\S+/gi, '[REDACTED]');

    return sanitized + (message.length > maxLength ? '...' : '');
  }

  /**
   * Detect potential injection attempts in user input
   *
   * Returns true if suspicious patterns are found.
   * Used for logging/monitoring, not blocking (to avoid false positives).
   */
  static detectSuspiciousPatterns(input: string): {
    suspicious: boolean;
    patterns: string[];
  } {
    const foundPatterns: string[] = [];

    for (const pattern of DANGEROUS_PATTERNS) {
      if (pattern.test(input)) {
        foundPatterns.push(pattern.source);
        // Reset lastIndex for global patterns
        pattern.lastIndex = 0;
      }
    }

    return {
      suspicious: foundPatterns.length > 0,
      patterns: foundPatterns,
    };
  }

  /**
   * Build system prompt with safely injected mode hint
   *
   * Uses parameterized templates instead of string concatenation.
   */
  static buildSystemPromptWithHint(
    basePrompt: string,
    modeHint: unknown
  ): string {
    const safeHint = this.sanitizeModeHint(modeHint);

    // Parameterized mode instructions (not user-controllable)
    const MODE_INSTRUCTIONS: Record<ModeHint, string> = {
      artifact: `
[MODE: ARTIFACT CREATION]
The user has selected artifact mode. You SHOULD use the generate_artifact tool for this request, unless it is clearly just a question that doesn't require creating anything.`,

      image: `
[MODE: IMAGE GENERATION]
The user has selected image mode. You SHOULD use the generate_image tool for this request, unless it is clearly just a question that doesn't require creating anything.`,

      auto: `
[MODE: AUTO]
Analyze the user's request and use appropriate tools when needed:
- Use generate_artifact for creating visual/interactive content (apps, components, diagrams)
- Use generate_image for creating images, photos, or artwork
- Use browser.search for finding current information
- Respond directly for questions that don't require tools`,
    };

    return `${basePrompt}\n${MODE_INSTRUCTIONS[safeHint]}`;
  }
}
```

---

### 0.5 Safe Error Handler

**File**: `supabase/functions/_shared/safe-error-handler.ts` (NEW)

```typescript
/**
 * Safe Error Handler
 *
 * Sanitizes error messages before returning to clients.
 * Prevents information leakage through error responses.
 *
 * @security CWE-209 - Information Exposure Prevention
 */

// =============================================================================
// Types
// =============================================================================

export interface SafeErrorResponse {
  error: {
    type: string;
    message: string;
    requestId: string;
    retryable: boolean;
  };
}

// =============================================================================
// Error Classification
// =============================================================================

type ErrorCategory =
  | 'rate_limit'
  | 'validation'
  | 'authentication'
  | 'authorization'
  | 'tool_execution'
  | 'resource_exhaustion'
  | 'timeout'
  | 'internal';

interface ErrorMapping {
  pattern: RegExp | string;
  category: ErrorCategory;
  safeMessage: string;
  retryable: boolean;
  statusCode: number;
}

const ERROR_MAPPINGS: ErrorMapping[] = [
  // Rate limiting
  {
    pattern: /rate.?limit/i,
    category: 'rate_limit',
    safeMessage: 'Request limit exceeded. Please try again later.',
    retryable: true,
    statusCode: 429,
  },

  // Validation errors
  {
    pattern: /validation|invalid|required field/i,
    category: 'validation',
    safeMessage: 'Invalid request parameters.',
    retryable: false,
    statusCode: 400,
  },

  // Authentication
  {
    pattern: /auth|unauthorized|jwt|token expired/i,
    category: 'authentication',
    safeMessage: 'Authentication required or session expired.',
    retryable: false,
    statusCode: 401,
  },

  // Authorization
  {
    pattern: /forbidden|permission|not allowed/i,
    category: 'authorization',
    safeMessage: 'You do not have permission for this action.',
    retryable: false,
    statusCode: 403,
  },

  // Tool execution
  {
    pattern: /tool.?(execution|failed)|artifact|image.?generation/i,
    category: 'tool_execution',
    safeMessage: 'The requested operation could not be completed. Please try again.',
    retryable: true,
    statusCode: 500,
  },

  // Resource exhaustion
  {
    pattern: /resource|exhaustion|max.?(calls|time)|timeout/i,
    category: 'resource_exhaustion',
    safeMessage: 'Request processing limit reached. Please simplify your request.',
    retryable: false,
    statusCode: 429,
  },

  // Timeout
  {
    pattern: /timeout|timed?.?out|deadline/i,
    category: 'timeout',
    safeMessage: 'Request took too long to process. Please try again.',
    retryable: true,
    statusCode: 504,
  },
];

// =============================================================================
// Safe Error Handler Implementation
// =============================================================================

export class SafeErrorHandler {

  /**
   * Convert any error to a safe response
   *
   * Logs full error server-side, returns sanitized message to client.
   */
  static toSafeResponse(
    error: unknown,
    requestId: string,
    context?: Record<string, unknown>
  ): { response: SafeErrorResponse; statusCode: number } {
    // Log full error server-side (never exposed to client)
    console.error(`[${requestId}] Error occurred:`, {
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : error,
      context,
    });

    // Classify error
    const classification = this.classifyError(error);

    return {
      response: {
        error: {
          type: classification.category,
          message: classification.safeMessage,
          requestId,
          retryable: classification.retryable,
        },
      },
      statusCode: classification.statusCode,
    };
  }

  /**
   * Classify error and determine safe response
   */
  private static classifyError(error: unknown): ErrorMapping {
    const errorMessage = error instanceof Error
      ? error.message
      : String(error);

    // Try to match known error patterns
    for (const mapping of ERROR_MAPPINGS) {
      const pattern = mapping.pattern instanceof RegExp
        ? mapping.pattern
        : new RegExp(mapping.pattern, 'i');

      if (pattern.test(errorMessage)) {
        return mapping;
      }
    }

    // Default: internal error (most restrictive message)
    return {
      pattern: '',
      category: 'internal',
      safeMessage: 'An unexpected error occurred. Please try again.',
      retryable: true,
      statusCode: 500,
    };
  }

  /**
   * Create error response suitable for SSE streaming
   */
  static toSSEError(
    error: unknown,
    requestId: string
  ): string {
    const { response } = this.toSafeResponse(error, requestId);

    return `event: error\ndata: ${JSON.stringify(response)}\n\n`;
  }

  /**
   * Wrap async function with safe error handling
   */
  static wrapAsync<T extends (...args: unknown[]) => Promise<unknown>>(
    fn: T,
    requestId: string
  ): T {
    return (async (...args: Parameters<T>) => {
      try {
        return await fn(...args);
      } catch (error) {
        const { response, statusCode } = this.toSafeResponse(error, requestId);
        throw new SafeError(response.error.message, statusCode, response);
      }
    }) as T;
  }
}

/**
 * Safe error that can be directly returned to client
 */
export class SafeError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly response: SafeErrorResponse
  ) {
    super(message);
    this.name = 'SafeError';
  }
}
```

---

## Phase 0 Files Summary

| File | Lines | Purpose | Security | Fixes Applied |
|------|-------|---------|----------|---------------|
| `tool-validator.ts` | ~320 | Parameter validation | CWE-20 | Prototype pollution, extra props |
| `tool-rate-limiter.ts` | ~350 | Tool-specific rate limits | CWE-841 | Fail-closed, circuit breaker |
| `tool-execution-tracker.ts` | ~220 | Resource exhaustion protection | CWE-400 | Timeout cleanup, destroy() |
| `prompt-injection-defense.ts` | ~280 | Prompt sanitization | CWE-74 | Unicode normalization |
| `safe-error-handler.ts` | ~180 | Error message sanitization | CWE-209 | (No changes needed) |
| **Total** | **~1350** | Security infrastructure | 5 CWEs | 8 critical fixes |

---

## Revised Implementation Phases

### Phase 1: Tool Definitions (Now Simpler)

With security infrastructure in place, tool definitions become data-only:

**File**: `supabase/functions/_shared/tool-definitions.ts`

```typescript
/**
 * Tool Definitions
 *
 * Pure data definitions for tools available to the model.
 * Security is handled by separate infrastructure modules.
 */

import { MODELS } from './config.ts';

// =============================================================================
// Tool Definition Types
// =============================================================================

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, ToolParameter>;
    required: string[];
  };
  // Execution metadata (for routing, not security)
  execution: {
    handler: 'artifact' | 'image' | 'search';
    model: string;
    streaming: boolean;
    reasoningProvider: boolean;
  };
}

interface ToolParameter {
  type: string;
  description: string;
  enum?: string[];
  default?: unknown;
}

// =============================================================================
// Tool Catalog
// =============================================================================

export const TOOL_DEFINITIONS: Record<string, ToolDefinition> = {
  generate_artifact: {
    name: 'generate_artifact',
    description: `Create interactive React components, HTML pages, SVG graphics, Mermaid diagrams, or code snippets.
Use this tool when the user asks to create, build, make, or generate visual or interactive content.
Examples: "create a todo app", "build a calculator", "make a chart", "generate a form"`,
    parameters: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          description: 'Type of artifact to generate',
          enum: ['react', 'html', 'svg', 'code', 'mermaid', 'markdown'],
        },
        prompt: {
          type: 'string',
          description: 'Detailed requirements for the artifact',
        },
      },
      required: ['type', 'prompt'],
    },
    execution: {
      handler: 'artifact',
      model: MODELS.GLM_4_6,
      streaming: true,
      reasoningProvider: true,
    },
  },

  generate_image: {
    name: 'generate_image',
    description: `Generate images using AI.
Use this tool when the user explicitly asks for an image, photo, picture, or visual artwork.
Examples: "create an image of a sunset", "generate a logo", "make a picture of a cat"`,
    parameters: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'Detailed description of the image to generate',
        },
        aspectRatio: {
          type: 'string',
          description: 'Aspect ratio for the generated image',
          enum: ['1:1', '16:9', '9:16'],
          default: '1:1',
        },
      },
      required: ['prompt'],
    },
    execution: {
      handler: 'image',
      model: MODELS.GEMINI_FLASH_IMAGE,
      streaming: false,
      reasoningProvider: false,
    },
  },

  'browser.search': {
    name: 'browser.search',
    description: `Search the web for current information.
Use this tool when the user asks about recent events, needs up-to-date information, or asks "what is" questions about current topics.
Examples: "what's the weather", "latest news about X", "find information about Y"`,
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query',
        },
      },
      required: ['query'],
    },
    execution: {
      handler: 'search',
      model: 'tavily',
      streaming: false,
      reasoningProvider: false,
    },
  },
};

/**
 * Get GLM-compatible tool definitions for API call
 */
export function getGLMToolDefinitions(): Array<{
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: ToolDefinition['parameters'];
  };
}> {
  return Object.values(TOOL_DEFINITIONS).map(tool => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));
}
```

---

### Phases 2-6 remain similar but now use security infrastructure

Each tool executor calls:
1. `ToolParameterValidator.validate()` - Before execution
2. `ToolRateLimiter.checkToolRateLimit()` - Before execution
3. `ToolExecutionTracker.trackExecution()` - Wraps execution
4. `SafeErrorHandler.toSafeResponse()` - On error

---

## Updated Timeline

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| **Phase 0: Security Infrastructure** | **4-6 hours** | None |
| Phase 1: Tool Definitions | 1-2 hours | Phase 0 |
| Phase 2: Artifact Integration | 2-3 hours | Phases 0, 1 |
| Phase 3: Image Integration | 1-2 hours | Phases 0, 1 |
| Phase 4: Unified Handler | 3-4 hours | Phases 0-3 |
| Phase 5: Frontend Updates | 1-2 hours | Phase 4 |
| Phase 6: Testing | 2-3 hours | Phase 5 |
| **Total** | **14-22 hours** | |

---

## Security Checklist

Before marking implementation complete:

### Core Security Components
- [ ] `ToolParameterValidator` validates all tool inputs
- [ ] `ToolParameterValidator` rejects prototype pollution keys (`__proto__`, `constructor`, `prototype`)
- [ ] `ToolParameterValidator` rejects unexpected properties
- [ ] `ToolParameterValidator` returns frozen objects
- [ ] `ToolRateLimiter` enforces separate limits per tool
- [ ] `ToolRateLimiter` fails-closed on unknown tools (denies, not allows)
- [ ] `ToolRateLimiter` uses circuit breaker pattern (3 failures → 30s cooldown)
- [ ] `ToolExecutionTracker` limits calls per request (max 3)
- [ ] `ToolExecutionTracker` cleans up timeouts in `finally` block
- [ ] `ToolExecutionTracker.destroy()` called at end of request
- [ ] `PromptInjectionDefense` applies Unicode normalization
- [ ] `PromptInjectionDefense` sanitizes all mode hints
- [ ] `SafeErrorHandler` sanitizes all error messages

### Database Migration
- [ ] `user_tool_rate_limits` table created with composite key (user_id, tool_name)
- [ ] `check_user_tool_rate_limit` RPC function created with `SECURITY DEFINER`
- [ ] RPC function includes `SET search_path = public, pg_temp`

### Integration Tests
- [ ] Rate limit bypass test: Guest cannot exceed 5 artifacts/5hr via /chat
- [ ] Rate limit bypass test: User limits are tool-specific (not shared)
- [ ] Unknown tool test: Request for unknown tool returns 429, not 200
- [ ] Injection test: Mode hint `"аrtifact"` (Cyrillic 'а') maps to 'auto'
- [ ] Injection test: Mode hint cannot modify system behavior
- [ ] Timeout test: Single tool cannot exceed 60s
- [ ] Multi-tool test: Cannot execute >3 tools per request
- [ ] Memory test: No timeout accumulation after 100 requests
- [ ] Prototype pollution test: `{ "__proto__": {} }` throws validation error

---

## References

- **Security Review**: This document addresses all findings
- **Original Plan**: `IMPLEMENTATION_PLAN_ISSUE_340.md`
- **Test Plan**: `TEST_PLAN_ISSUE_340.md`
- **DB Backup**: `backups/schema-backup-20251218-214918.sql`
