import { LRUCache } from 'lru-cache';

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: Date;
}

export interface RateLimiterOptions {
  windowMs: number;
  maxRequests: number;
}

export class RateLimiter {
  private cache: LRUCache<string, { count: number; resetTime: number }>;
  private windowMs: number;
  private maxRequests: number;

  constructor(options: RateLimiterOptions) {
    this.windowMs = options.windowMs;
    this.maxRequests = options.maxRequests;
    
    // Configure LRU cache with TTL
    this.cache = new LRUCache({
      max: 10000, // Maximum number of items in cache
      ttl: this.windowMs, // Time to live in milliseconds
    });
  }

  /**
   * Check if a request should be rate limited
   * Returns rate limit info
   */
  async checkLimit(identifier: string): Promise<RateLimitInfo> {
    const now = Date.now();
    const resetTime = now + this.windowMs;
    
    // Get current state for identifier
    const current = this.cache.get(identifier);
    
    if (!current || current.resetTime <= now) {
      // New window or expired window
      this.cache.set(identifier, { count: 1, resetTime });
      
      return {
        limit: this.maxRequests,
        remaining: this.maxRequests - 1,
        reset: new Date(resetTime),
      };
    }
    
    // Within current window
    const newCount = current.count + 1;
    const remaining = Math.max(0, this.maxRequests - newCount);
    
    if (newCount <= this.maxRequests) {
      // Update count
      this.cache.set(identifier, { count: newCount, resetTime: current.resetTime });
    }
    
    return {
      limit: this.maxRequests,
      remaining,
      reset: new Date(current.resetTime),
    };
  }

  /**
   * Check if identifier is currently rate limited
   */
  isRateLimited(identifier: string): boolean {
    const current = this.cache.get(identifier);
    if (!current) return false;
    
    const now = Date.now();
    if (current.resetTime <= now) return false;
    
    return current.count > this.maxRequests;
  }

  /**
   * Reset rate limit for an identifier
   */
  reset(identifier: string): void {
    this.cache.delete(identifier);
  }
}

// Create rate limiters with different configurations
export const defaultRateLimiter = new RateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 1000,
});

export const batchRateLimiter = new RateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 100,
});