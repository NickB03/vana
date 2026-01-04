/**
 * Pattern Learning Cache
 *
 * Caches successful request → template mappings for faster future matching.
 * Checked BEFORE full confidence scoring analysis to optimize response time.
 *
 * @module pattern-cache
 */

export interface CachedPattern {
  readonly pattern: string;           // Normalized request pattern
  readonly templateIds: readonly string[];  // Matched template IDs (ordered by relevance)
  readonly confidence: number;        // Historical success rate (0-1)
  hitCount: number;          // Times this pattern was successfully used (mutable for cache updates)
  lastUsed: number;          // Timestamp of last use (mutable for LRU tracking)
}

/**
 * Cache statistics for monitoring and optimization (snapshot, immutable)
 */
export interface CacheStats {
  readonly size: number;              // Current number of cached patterns
  readonly hitRate: number;           // Percentage of cache hits vs misses
  readonly totalHits: number;         // Total cache hits since initialization
  readonly totalMisses: number;       // Total cache misses since initialization
  readonly maxSize: number;           // Maximum cache size before LRU eviction
}

// In-memory cache (resets on function restart, but extremely fast)
const patternCache = new Map<string, CachedPattern>();

// Cache performance metrics
let cacheHits = 0;
let cacheMisses = 0;

// Configuration
const MAX_CACHE_SIZE = 500;
const MIN_CONFIDENCE_THRESHOLD = 0.7;

/**
 * Predefined successful patterns from Z.ai research and production testing.
 * These patterns have proven high success rates and should be prioritized.
 */
const KNOWN_PATTERNS: Record<string, string[]> = {
  // Search & Discovery
  'search engine': ['landing-page', 'form-builder'],
  'search page': ['landing-page', 'form-builder'],
  'search interface': ['landing-page', 'form-builder'],

  // Data & Analytics
  'dashboard': ['dashboard', 'data-visualization'],
  'analytics dashboard': ['dashboard', 'data-visualization'],
  'admin dashboard': ['dashboard', 'settings-panel'],
  'data visualization': ['data-visualization', 'dashboard'],
  'chart': ['data-visualization'],
  'graph': ['data-visualization'],

  // Task Management
  'todo list': ['todo-list'],
  'todo app': ['todo-list'],
  'task list': ['todo-list'],
  'task manager': ['todo-list'],
  'to do list': ['todo-list'],

  // Forms & Input
  'contact form': ['form-builder'],
  'signup form': ['form-builder'],
  'registration form': ['form-builder'],
  'form': ['form-builder'],
  'input form': ['form-builder'],

  // Settings & Configuration
  'settings page': ['settings-panel'],
  'settings panel': ['settings-panel'],
  'preferences': ['settings-panel'],
  'configuration': ['settings-panel'],
  'user settings': ['settings-panel'],

  // Landing Pages
  'landing page': ['landing-page'],
  'home page': ['landing-page'],
  'homepage': ['landing-page'],
  'marketing page': ['landing-page'],

  // Games & Interactive
  'game': ['interactive-game'],
  'simple game': ['interactive-game'],
  'puzzle': ['interactive-game'],
  'quiz': ['interactive-game'],

  // E-commerce
  'product page': ['landing-page', 'form-builder'],
  'shopping cart': ['form-builder', 'dashboard'],
  'checkout': ['form-builder'],

  // Authentication
  'login': ['form-builder'],
  'login page': ['form-builder'],
  'signin': ['form-builder'],
  'authentication': ['form-builder'],

  // Profile & User
  'profile': ['settings-panel', 'dashboard'],
  'user profile': ['settings-panel', 'dashboard'],
  'account': ['settings-panel'],

  // Tables & Lists
  'table': ['dashboard', 'data-visualization'],
  'data table': ['dashboard', 'data-visualization'],
  'list view': ['dashboard'],

  // Calendar & Scheduling
  'calendar': ['dashboard', 'interactive-game'],
  'schedule': ['dashboard'],
  'planner': ['todo-list', 'dashboard'],
};

/**
 * Normalizes a request string for consistent pattern matching.
 * Converts to lowercase, removes punctuation, normalizes whitespace.
 *
 * @param request - Raw request string from user
 * @returns Normalized pattern string
 */
export function normalizeRequest(request: string): string {
  if (request === null || request === undefined) {
    console.warn('[pattern-cache] normalizeRequest called with null/undefined input');
    return '';
  }
  if (typeof request !== 'string') {
    console.warn(`[pattern-cache] normalizeRequest expected string, got ${typeof request}`);
    return String(request).toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ').trim();
  }
  return request
    .toLowerCase()
    .trim()
    // Remove punctuation except spaces and hyphens
    .replace(/[^\w\s-]/g, '')
    // Normalize multiple spaces to single space
    .replace(/\s+/g, ' ')
    // Remove leading/trailing whitespace
    .trim();
}

/**
 * Attempts to find a cached match for the given request.
 * Checks both in-memory runtime cache and predefined known patterns.
 *
 * @param request - User's artifact request
 * @returns Cached pattern if found, null otherwise
 */
export function getCachedMatch(request: string): CachedPattern | null {
  const normalized = normalizeRequest(request);

  // Check runtime cache first (fastest)
  if (patternCache.has(normalized)) {
    const cached = patternCache.get(normalized)!;

    // Only return if confidence meets threshold
    if (cached.confidence >= MIN_CONFIDENCE_THRESHOLD) {
      // Update last used timestamp
      cached.lastUsed = Date.now();
      cached.hitCount++;
      cacheHits++;

      return cached;
    }
  }

  // Check known patterns (predefined from research)
  if (KNOWN_PATTERNS[normalized]) {
    const templateIds = KNOWN_PATTERNS[normalized];

    // Create cache entry for known pattern
    const pattern: CachedPattern = {
      pattern: normalized,
      templateIds,
      confidence: 0.95, // High confidence for known patterns
      hitCount: 1,
      lastUsed: Date.now(),
    };

    // Add to runtime cache for future lookups
    patternCache.set(normalized, pattern);
    cacheHits++;

    return pattern;
  }

  // Check for partial matches in known patterns (fuzzy matching)
  const partialMatch = findPartialMatch(normalized);
  if (partialMatch) {
    cacheHits++;
    return partialMatch;
  }

  cacheMisses++;
  return null;
}

/**
 * Finds partial matches in known patterns using substring matching.
 * Useful for queries like "create a todo" matching "todo list" pattern.
 *
 * @param normalized - Normalized request string
 * @returns Partial match with adjusted confidence, or null
 */
function findPartialMatch(normalized: string): CachedPattern | null {
  const words = normalized.split(' ').filter(w => w.length > 0);

  // Guard against empty word array (prevents NaN from division)
  if (words.length === 0) {
    return null;
  }

  // Try to find patterns that contain any of the key words
  for (const [patternKey, templateIds] of Object.entries(KNOWN_PATTERNS)) {
    const patternWords = patternKey.split(' ');

    // Calculate word overlap
    const overlap = words.filter(word =>
      patternWords.some(pw => pw.includes(word) || word.includes(pw))
    );

    // Require at least 50% word overlap
    if (overlap.length >= Math.ceil(words.length * 0.5)) {
      const confidence = overlap.length / words.length * 0.8; // Reduce confidence for partial match

      if (confidence >= MIN_CONFIDENCE_THRESHOLD) {
        return {
          pattern: normalized,
          templateIds,
          confidence,
          hitCount: 1,
          lastUsed: Date.now(),
        };
      }
    }
  }

  return null;
}

/**
 * Caches a successful template match for future lookups.
 * Uses LRU (Least Recently Used) eviction when cache reaches max size.
 *
 * @param request - User's request string
 * @param templateIds - Successfully matched template IDs
 * @param confidence - Confidence score for this match (0-1)
 */
export function cacheSuccessfulMatch(
  request: string,
  templateIds: string[],
  confidence: number
): void {
  const normalized = normalizeRequest(request);

  // Update existing entry or create new one
  if (patternCache.has(normalized)) {
    const existing = patternCache.get(normalized)!;

    // Update confidence using weighted average (favor recent success)
    const newConfidence = (existing.confidence * existing.hitCount + confidence) / (existing.hitCount + 1);

    existing.confidence = newConfidence;
    existing.hitCount++;
    existing.lastUsed = Date.now();
    existing.templateIds = templateIds; // Update with most recent match
  } else {
    // Create new cache entry
    patternCache.set(normalized, {
      pattern: normalized,
      templateIds,
      confidence,
      hitCount: 1,
      lastUsed: Date.now(),
    });
  }

  // Enforce LRU eviction if cache is too large
  if (patternCache.size > MAX_CACHE_SIZE) {
    evictLRU();
  }
}

/**
 * Evicts least recently used entries when cache exceeds max size.
 * Removes the oldest 10% of entries to avoid frequent evictions.
 */
function evictLRU(): void {
  const entries = Array.from(patternCache.entries());

  // Sort by last used (oldest first)
  entries.sort((a, b) => a[1].lastUsed - b[1].lastUsed);

  // Remove oldest 10% of entries
  const toRemove = Math.ceil(entries.length * 0.1);

  for (let i = 0; i < toRemove; i++) {
    patternCache.delete(entries[i][0]);
  }
}

/**
 * Returns cache statistics for monitoring and optimization.
 * Useful for understanding cache effectiveness and tuning parameters.
 *
 * @returns Cache statistics object
 */
export function getCacheStats(): CacheStats {
  const totalRequests = cacheHits + cacheMisses;
  const hitRate = totalRequests > 0 ? (cacheHits / totalRequests) * 100 : 0;

  return {
    size: patternCache.size,
    hitRate: Math.round(hitRate * 100) / 100, // Round to 2 decimal places
    totalHits: cacheHits,
    totalMisses: cacheMisses,
    maxSize: MAX_CACHE_SIZE,
  };
}

/**
 * Clears the runtime cache. Useful for testing or memory management.
 * Note: Known patterns are never cleared as they're predefined.
 */
export function clearCache(): void {
  patternCache.clear();
  cacheHits = 0;
  cacheMisses = 0;
}

/**
 * Preloads known patterns into the cache on initialization.
 * This ensures immediate availability of high-confidence patterns.
 */
export function preloadKnownPatterns(): void {
  for (const [pattern, templateIds] of Object.entries(KNOWN_PATTERNS)) {
    if (!patternCache.has(pattern)) {
      patternCache.set(pattern, {
        pattern,
        templateIds,
        confidence: 0.95, // High confidence for known patterns
        hitCount: 0,
        lastUsed: Date.now(),
      });
    }
  }
}

// Auto-preload known patterns on module initialization
preloadKnownPatterns();
