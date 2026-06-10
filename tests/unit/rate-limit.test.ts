import { describe, it, expect } from "vitest";
import { rateLimit } from "@/lib/rate-limit";

describe("rateLimit", () => {
  it("allows up to capacity then blocks", () => {
    const key = `test:${Math.random()}`;
    for (let i = 0; i < 5; i++) {
      expect(rateLimit(key, 5, 0).ok).toBe(true);
    }
    const blocked = rateLimit(key, 5, 0);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
  });

  it("keeps separate buckets per key", () => {
    const a = `a:${Math.random()}`;
    const b = `b:${Math.random()}`;
    expect(rateLimit(a, 1, 0).ok).toBe(true);
    expect(rateLimit(a, 1, 0).ok).toBe(false);
    expect(rateLimit(b, 1, 0).ok).toBe(true);
  });
});
