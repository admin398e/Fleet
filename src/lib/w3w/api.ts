"use client";

import type { LatLng, W3WResult, W3WSuggestion } from "./types";

/** Client-side helpers that call our server-side w3w proxy (never w3w directly). */

export async function fetchWordsForCoords(coords: LatLng): Promise<W3WResult> {
  const res = await fetch("/api/w3w/convert-to-3wa", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(coords),
  });
  if (!res.ok) throw new Error((await safeError(res)) ?? "Lookup failed");
  return res.json();
}

export async function fetchCoordsForWords(words: string): Promise<W3WResult> {
  const res = await fetch("/api/w3w/convert-to-coordinates", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ words }),
  });
  if (!res.ok) throw new Error((await safeError(res)) ?? "Lookup failed");
  return res.json();
}

export async function fetchSuggestions(
  input: string,
  focus?: LatLng,
): Promise<W3WSuggestion[]> {
  const params = new URLSearchParams({ input });
  if (focus) {
    params.set("focusLat", String(focus.lat));
    params.set("focusLng", String(focus.lng));
  }
  const res = await fetch(`/api/w3w/autosuggest?${params.toString()}`);
  if (!res.ok) return [];
  const data = (await res.json()) as { suggestions: W3WSuggestion[] };
  return data.suggestions ?? [];
}

async function safeError(res: Response): Promise<string | null> {
  try {
    const body = (await res.json()) as { error?: string };
    return body.error ?? null;
  } catch {
    return null;
  }
}
