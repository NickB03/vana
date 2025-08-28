/**
 * Storage Interface for Rate Limiting
 * Pluggable storage backend for distributed rate limiting
 */

export interface StorageInterface {
  /**
   * Get a value by key
   * @param key The key to retrieve
   * @returns The value or null if not found
   */
  get(key: string): Promise<string | null>;
  
  /**
   * Set a value with optional expiration
   * @param key The key to set
   * @param value The value to store
   * @param ttl Time to live in seconds (optional)
   */
  set(key: string, value: string, ttl?: number): Promise<void>;
  
  /**
   * Increment a numeric value
   * @param key The key to increment
   * @param amount The amount to increment by (default: 1)
   * @param ttl Time to live in seconds (optional)
   * @returns The new value after increment
   */
  increment(key: string, amount?: number, ttl?: number): Promise<number>;
  
  /**
   * Delete a key
   * @param key The key to delete
   */
  delete(key: string): Promise<void>;
  
  /**
   * Check if a key exists
   * @param key The key to check
   * @returns True if the key exists, false otherwise
   */
  exists(key: string): Promise<boolean>;
  
  /**
   * Set expiration time for a key
   * @param key The key to set expiration for
   * @param ttl Time to live in seconds
   */
  expire(key: string, ttl: number): Promise<boolean>;
}
