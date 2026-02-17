/**
 * Client-side rate limiter for CMP API calls.
 * Uses a simple token bucket algorithm to ensure requests
 * do not exceed the configured rate limit.
 */

export class CmpRateLimiter {
  private maxTokens: number;
  private tokens: number;
  private lastRefillTime: number;
  private refillIntervalMs: number;

  /**
   * Creates a new rate limiter.
   * @param maxRequestsPerSecond The maximum number of requests allowed per second. Defaults to 5.
   */
  constructor(maxRequestsPerSecond: number = 5) {
    this.maxTokens = maxRequestsPerSecond;
    this.tokens = maxRequestsPerSecond;
    this.lastRefillTime = Date.now();
    this.refillIntervalMs = 1000; // Refill every second.
  }

  /**
   * Acquires a token from the bucket. If no tokens are available,
   * the method waits until a token becomes available before resolving.
   * Call this before each API request to respect rate limits.
   */
  async acquire(): Promise<void> {
    this.refillTokens();

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return;
    }

    // Calculate how long to wait for the next token refill.
    const timeSinceLastRefill = Date.now() - this.lastRefillTime;
    const waitTime = this.refillIntervalMs - timeSinceLastRefill;

    await this.sleep(Math.max(waitTime, 0));

    // Refill and consume after waiting.
    this.refillTokens();
    this.tokens -= 1;
  }

  /**
   * Refills tokens based on elapsed time since the last refill.
   */
  private refillTokens(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefillTime;

    if (elapsed >= this.refillIntervalMs) {
      const refillCycles = Math.floor(elapsed / this.refillIntervalMs);
      this.tokens = Math.min(
        this.maxTokens,
        this.tokens + refillCycles * this.maxTokens
      );
      this.lastRefillTime += refillCycles * this.refillIntervalMs;
    }
  }

  /**
   * Returns a promise that resolves after the specified number of milliseconds.
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
