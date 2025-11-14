/**
 * Redis utility for caching conversation context
 * Uses Upstash Redis for serverless-friendly caching
 */

export interface CachedContext {
  messages: Array<{
    role: string;
    content: string;
    reasoning?: string;
  }>;
  summary?: string;
  timestamp: number;
}

export class RedisCache {
  private baseUrl: string;
  private token: string;

  constructor(url: string, token: string) {
    this.baseUrl = url;
    this.token = token;
  }

  private async execute(command: string[]): Promise<unknown> {
    const response = await fetch(`${this.baseUrl}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify(command),
    });

    if (!response.ok) {
      throw new Error(`Redis error: ${response.statusText}`);
    }

    return response.json();
  }

  async get(key: string): Promise<CachedContext | null> {
    try {
      const result = await this.execute(['GET', key]);
      return result.result ? JSON.parse(result.result) : null;
    } catch (error) {
      console.error('Redis GET error:', error);
      return null;
    }
  }

  async set(key: string, value: CachedContext, ttlSeconds: number = 3600): Promise<void> {
    try {
      await this.execute(['SET', key, JSON.stringify(value), 'EX', ttlSeconds.toString()]);
    } catch (error) {
      console.error('Redis SET error:', error);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.execute(['DEL', key]);
    } catch (error) {
      console.error('Redis DEL error:', error);
    }
  }
}
