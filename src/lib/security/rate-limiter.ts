interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface RateLimitResult {
  allowed: boolean;
  retryAfter?: number;
}

/**
 * In-memory rate limiter that tracks requests per IP address
 * using a sliding window approach. Expired entries are cleaned
 * up automatically on each check call.
 */
export class RateLimiter {
  private requests: Map<string, RateLimitEntry> = new Map();
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  /**
   * Checks whether a request from the given IP address is allowed
   * under the current rate limit. Returns an object with an allowed
   * flag and, if denied, a retryAfter value in seconds.
   */
  check(ip: string): RateLimitResult {
    this.cleanup();

    const now = Date.now();
    const entry = this.requests.get(ip);

    // No existing entry means this is the first request in the window.
    if (!entry) {
      this.requests.set(ip, {
        count: 1,
        resetTime: now + this.windowMs,
      });
      return { allowed: true };
    }

    // If the window has expired, reset the entry.
    if (now >= entry.resetTime) {
      this.requests.set(ip, {
        count: 1,
        resetTime: now + this.windowMs,
      });
      return { allowed: true };
    }

    // Window is still active. Check against the limit.
    if (entry.count >= this.maxRequests) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      return { allowed: false, retryAfter };
    }

    entry.count += 1;
    return { allowed: true };
  }

  /**
   * Removes entries whose windows have expired to prevent
   * unbounded memory growth.
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [ip, entry] of this.requests) {
      if (now >= entry.resetTime) {
        this.requests.delete(ip);
      }
    }
  }
}
