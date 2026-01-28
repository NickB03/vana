/**
 * Token Bucket Algorithm for Client-Side Request Throttling
 * Prevents burst requests to the Gemini API
 * 
 * Default: 1 request per second (prevents rapid-fire clicking)
 */

export interface ThrottleConfig {
  maxTokens: number; // Maximum tokens in bucket
  refillRate: number; // Tokens added per second
  refillInterval: number; // Milliseconds between refills
}

export class RequestThrottle {
  private tokens: number;
  private lastRefill: number;
  private config: ThrottleConfig;

  constructor(config: Partial<ThrottleConfig> = {}) {
    this.config = {
      maxTokens: config.maxTokens ?? 1,
      refillRate: config.refillRate ?? 1,
      refillInterval: config.refillInterval ?? 1000, // 1 second
    };
    
    this.tokens = this.config.maxTokens;
    this.lastRefill = Date.now();
  }

  /**
   * Refill tokens based on elapsed time
   */
  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const intervalsElapsed = Math.floor(elapsed / this.config.refillInterval);

    if (intervalsElapsed > 0) {
      this.tokens = Math.min(
        this.config.maxTokens,
        this.tokens + intervalsElapsed * this.config.refillRate
      );
      this.lastRefill = now;
    }
  }

  /**
   * Check if a request can be made (non-blocking)
   * @returns true if request is allowed, false if throttled
   */
  canMakeRequest(): boolean {
    this.refill();
    return this.tokens >= 1;
  }

  /**
   * Attempt to consume a token for a request
   * @returns true if token consumed (request allowed), false if throttled
   */
  tryConsume(): boolean {
    this.refill();
    
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }
    
    return false;
  }

  /**
   * Wait until a token is available (blocking)
   * @returns Promise that resolves when a token is available
   */
  async waitForToken(): Promise<void> {
    while (!this.tryConsume()) {
      // Wait for next refill interval
      await new Promise(resolve => setTimeout(resolve, this.config.refillInterval));
    }
  }

  /**
   * Get time until next token is available (in milliseconds)
   * @returns milliseconds until next token, or 0 if token available now
   */
  getTimeUntilNextToken(): number {
    this.refill();
    
    if (this.tokens >= 1) {
      return 0;
    }
    
    const timeSinceLastRefill = Date.now() - this.lastRefill;
    return this.config.refillInterval - timeSinceLastRefill;
  }

  /**
   * Reset the throttle (useful for testing or manual resets)
   */
  reset(): void {
    this.tokens = this.config.maxTokens;
    this.lastRefill = Date.now();
  }

  /**
   * Get current token count (for debugging)
   */
  getTokenCount(): number {
    this.refill();
    return this.tokens;
  }
}

/**
 * Global throttle instance for chat requests
 * 1 request per second to prevent burst requests
 */
export const chatRequestThrottle = new RequestThrottle({
  maxTokens: 1,
  refillRate: 1,
  refillInterval: 1000, // 1 second
});

