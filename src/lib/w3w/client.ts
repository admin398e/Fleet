import "server-only";

import { getServerEnv } from "@/lib/env";
import type { LatLng, W3WResult, W3WSuggestion } from "./types";

const BASE = "https://api.what3words.com/v3";

export class W3WError extends Error {
  constructor(
    message: string,
    readonly status = 502,
  ) {
    super(message);
    this.name = "W3WError";
  }
}

async function call(path: string, params: Record<string, string>) {
  const { W3W_API_KEY } = getServerEnv();
  const url = new URL(`${BASE}/${path}`);
  url.searchParams.set("key", W3W_API_KEY);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url, {
    // Conversions are deterministic — let the platform cache them to save quota.
    next: { revalidate: path === "autosuggest" ? 0 : 60 * 60 * 24 },
  });

  const body = (await res.json()) as Record<string, unknown> & {
    error?: { code?: string; message?: string };
  };

  if (!res.ok || body.error) {
    throw new W3WError(body.error?.message ?? "what3words request failed", 502);
  }
  return body;
}

/** Convert a 3-word address into coordinates. */
export async function convertToCoordinates(words: string): Promise<W3WResult> {
  const b = await call("convert-to-coordinates", { words });
  return normalise(b);
}

/** Convert coordinates into the 3-word address for that 3m square. */
export async function convertTo3wa(
  coords: LatLng,
  language = "en",
): Promise<W3WResult> {
  const b = await call("convert-to-3wa", {
    coordinates: `${coords.lat},${coords.lng}`,
    language,
  });
  return normalise(b);
}

/** Typo-tolerant suggestions, biased to GB and (optionally) the user's focus. */
export async function autosuggest(
  input: string,
  focus?: LatLng,
): Promise<W3WSuggestion[]> {
  const params: Record<string, string> = {
    input,
    "clip-to-country": "GB",
    "n-results": "3",
  };
  if (focus) params.focus = `${focus.lat},${focus.lng}`;

  const b = await call("autosuggest", params);
  const suggestions = (b.suggestions as Array<Record<string, unknown>>) ?? [];
  return suggestions.map((s) => ({
    words: String(s.words),
    nearestPlace: s.nearestPlace ? String(s.nearestPlace) : undefined,
    country: s.country ? String(s.country) : undefined,
    distanceToFocusKm:
      typeof s.distanceToFocusKm === "number" ? s.distanceToFocusKm : undefined,
  }));
}

function normalise(b: Record<string, unknown>): W3WResult {
  const c = b.coordinates as { lat: number; lng: number } | undefined;
  if (!c) throw new W3WError("Malformed what3words response", 502);
  return {
    words: String(b.words),
    coordinates: { lat: c.lat, lng: c.lng },
    nearestPlace: b.nearestPlace ? String(b.nearestPlace) : undefined,
    country: b.country ? String(b.country) : undefined,
  };
}
