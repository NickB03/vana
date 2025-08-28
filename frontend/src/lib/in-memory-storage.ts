/**
 * In-Memory Storage Implementation for Rate Limiting
 * Development fallback for distributed rate limiting
 */

import { StorageInterface } from './storage';

interface InMemoryItem {
  value: string;
  expiry?: number; // Unix timestamp in milliseconds
}

export class InMemoryStorage implements StorageInterface {
  private store: Map<string, InMemoryItem> = new Map();
  
  constructor() {
    // Clean up expired items periodically
    setInterval(() => {
      const now = Date.now();
      for (const [key, item] of this.store.entries()) {
        if (item.expiry && now > item.expiry) {
          this.store.delete(key);
        }
      }
    }, 60000); // Clean up every minute
  }
  
  async get(key: string): Promise<string | null> {
    const item = this.store.get(key);
    if (!item) {
      return null;
    }
    
    // Check if item has expired
    if (item.expiry && Date.now() > item.expiry) {
      this.store.delete(key);
      return null;
    }
    
    return item.value;
  }
  
  async set(key: string, value: string, ttl?: number): Promise<void> {
    const expiry = ttl ? Date.now() + (ttl * 1000) : undefined;
    this.store.set(key, { value, expiry });
  }
  
  async increment(key: string, amount: number = 1, ttl?: number): Promise<number> {
    const item = this.store.get(key);
    let currentValue = 0;
    
    // Check if item exists and hasn't expired
    if (item) {
      if (!item.expiry || Date.now() <= item.expiry) {
        const parsed = parseInt(item.value, 10);
        if (!isNaN(parsed)) {
          currentValue = parsed;
        }
      } else {
        // Item expired, remove it
        this.store.delete(key);
      }
    }
    
    const newValue = currentValue + amount;
    const expiry = ttl ? Date.now() + (ttl * 1000) : undefined;
    this.store.set(key, { value: newValue.toString(), expiry });
    
    return newValue;
  }
  
  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }
  
  async exists(key: string): Promise<boolean> {
    const item = this.store.get(key);
    if (!item) {
      return false;
    }
    
    // Check if item has expired
    if (item.expiry && Date.now() > item.expiry) {
      this.store.delete(key);
      return false;
    }
    
    return true;
  }
  
  async expire(key: string, ttl: number): Promise<boolean> {
    const item = this.store.get(key);
    if (!item) {
      return false;
    }
    
    item.expiry = Date.now() + (ttl * 1000);
    return true;
  }
  
  // Clear all items (useful for testing)
  async clear(): Promise<void> {
    this.store.clear();
  }
  
  // Get the size of the store (useful for monitoring)
  size(): number {
    // Clean up expired items first
    const now = Date.now();
    for (const [key, item] of this.store.entries()) {
      if (item.expiry && now > item.expiry) {
        this.store.delete(key);
      }
    }
    return this.store.size;
  }
}
