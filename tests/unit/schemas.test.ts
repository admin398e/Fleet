import { describe, it, expect } from "vitest";
import {
  wordsSchema,
  coordsSchema,
  createPinSchema,
} from "@/lib/validation/schemas";

describe("wordsSchema", () => {
  it("accepts a valid three-word address", () => {
    expect(wordsSchema.parse("filled.count.soap")).toBe("filled.count.soap");
  });

  it("strips a leading /// prefix", () => {
    expect(wordsSchema.parse("///filled.count.soap")).toBe("filled.count.soap");
  });

  it("rejects two-word input", () => {
    expect(wordsSchema.safeParse("filled.count").success).toBe(false);
  });

  it("rejects input with spaces/garbage", () => {
    expect(wordsSchema.safeParse("filled count soap").success).toBe(false);
  });
});

describe("coordsSchema", () => {
  it("rejects out-of-range latitude", () => {
    expect(coordsSchema.safeParse({ lat: 200, lng: 0 }).success).toBe(false);
  });
  it("accepts valid coordinates", () => {
    expect(coordsSchema.safeParse({ lat: 51.5, lng: -0.1 }).success).toBe(true);
  });
});

describe("createPinSchema", () => {
  it("requires a uuid addressId and valid pin type", () => {
    const ok = createPinSchema.safeParse({
      addressId: "00000000-0000-0000-0000-000000000000",
      pinType: "door",
      lat: 51.5,
      lng: -0.1,
    });
    expect(ok.success).toBe(true);
  });
  it("rejects an unknown pin type", () => {
    const bad = createPinSchema.safeParse({
      addressId: "00000000-0000-0000-0000-000000000000",
      pinType: "rooftop",
      lat: 51.5,
      lng: -0.1,
    });
    expect(bad.success).toBe(false);
  });
});
