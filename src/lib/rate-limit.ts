import "server-only";

/**
 * Lightweight in-memory token-bucket rate limiter, keyed per identity
 * (user id or IP). Good enough for a single-region serverless deployment and
 * the POC. For multi-region production, swap the store for Upstash Redis
 * (UPSTASH_REDIS_REST_URL/TOKEN are documented in .env.example).
 */
interface Bucket {
  tokens: number;
  updatedAt: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterMs: number;
}

/**
 * @param key      unique identity (e.g. `w3w:autosuggest:<userId>`)
 * @param capacity max burst size
 * @param refillPerSec tokens added per second
 */
export function rateLimit(
  key: string,
  capacity: number,
  refillPerSec: number,
): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key) ?? { tokens: capacity, updatedAt: now };

  // Refill based on elapsed time.
  const elapsedSec = (now - bucket.updatedAt) / 1000;
  bucket.tokens = Math.min(capacity, bucket.tokens + elapsedSec * refillPerSec);
  bucket.updatedAt = now;

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    buckets.set(key, bucket);
    return { ok: true, remaining: Math.floor(bucket.tokens), retryAfterMs: 0 };
  }

  buckets.set(key, bucket);
  const retryAfterMs = Math.ceil(((1 - bucket.tokens) / refillPerSec) * 1000);
  return { ok: false, remaining: 0, retryAfterMs };
}

// Periodically evict idle buckets to bound memory (no-op in edge cold starts).
if (typeof setInterval !== "undefined") {
  const TEN_MIN = 10 * 60 * 1000;
  setInterval(() => {
    const cutoff = Date.now() - TEN_MIN;
    for (const [k, b] of buckets) if (b.updatedAt < cutoff) buckets.delete(k);
  }, TEN_MIN).unref?.();
}
