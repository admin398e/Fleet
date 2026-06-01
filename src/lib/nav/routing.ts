"use client";

import type { LatLng } from "@/lib/w3w/types";

/**
 * Client-side routing + geocoding helpers built on free OpenStreetMap services:
 *  - OSRM demo server for road routes (with alternatives), and
 *  - Nominatim for forward search (postcode/place) and reverse lookup (road name).
 *
 * These run from the browser, so they are unaffected by the server's network
 * policy. They are public/best-effort endpoints (rate-limited) — fine for an
 * MVP, not for production-scale traffic.
 */

export interface RouteStep {
  instruction: string;
  /** Distance of this step in metres. */
  distanceM: number;
  name: string;
}

export interface Route {
  /** Decoded geometry as [lat, lng] pairs (ready for Leaflet). */
  coords: [number, number][];
  distanceM: number;
  durationS: number;
  steps: RouteStep[];
}

const OSRM = "https://router.project-osrm.org";
const NOMINATIM = "https://nominatim.openstreetmap.org";

export async function fetchRoutes(from: LatLng, to: LatLng): Promise<Route[]> {
  const url =
    `${OSRM}/route/v1/driving/` +
    `${from.lng},${from.lat};${to.lng},${to.lat}` +
    `?alternatives=true&overview=full&geometries=geojson&steps=true`;

  const res = await fetch(url);
  if (!res.ok) throw new Error("Could not calculate a route.");
  const data = (await res.json()) as OsrmResponse;
  if (data.code !== "Ok" || !data.routes?.length) {
    throw new Error("No route found to that destination.");
  }

  return data.routes.map((r) => ({
    coords: r.geometry.coordinates.map(([lng, lat]) => [lat, lng] as [number, number]),
    distanceM: r.distance,
    durationS: r.duration,
    steps: (r.legs ?? [])
      .flatMap((leg) => leg.steps ?? [])
      .map((s) => ({
        instruction: describeManeuver(s),
        distanceM: s.distance,
        name: s.name || "",
      }))
      .filter((s) => s.instruction),
  }));
}

export interface PlaceResult {
  label: string;
  lat: number;
  lng: number;
}

export async function searchPlaces(query: string): Promise<PlaceResult[]> {
  const url =
    `${NOMINATIM}/search?format=jsonv2&addressdetails=0&limit=5` +
    `&countrycodes=gb&q=${encodeURIComponent(query)}`;
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return [];
    const data = (await res.json()) as NominatimPlace[];
    return data.map((p) => ({
      label: p.display_name,
      lat: Number(p.lat),
      lng: Number(p.lon),
    }));
  } catch {
    return [];
  }
}

/** Reverse-geocode a point to its current road / nearest named feature. */
export async function reverseRoad(point: LatLng): Promise<string | null> {
  const url =
    `${NOMINATIM}/reverse?format=jsonv2&zoom=16&addressdetails=1` +
    `&lat=${point.lat}&lon=${point.lng}`;
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const data = (await res.json()) as NominatimReverse;
    const a = data.address ?? {};
    return a.road || a.pedestrian || a.suburb || a.village || a.town || a.city || null;
  } catch {
    return null;
  }
}

// ── formatting helpers ──────────────────────────────────────────────────────

export function formatDistance(metres: number): string {
  const miles = metres / 1609.34;
  if (miles < 0.1) return `${Math.round(metres)} m`;
  return `${miles.toFixed(1)} mi`;
}

export function formatDuration(seconds: number): string {
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h} hr${m ? ` ${m} min` : ""}`;
}

export function compassHeading(deg: number | null | undefined): string {
  if (deg == null || Number.isNaN(deg)) return "—";
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(deg / 45) % 8]!;
}

export function formatSpeedMph(metresPerSecond: number | null | undefined): string {
  if (metresPerSecond == null || Number.isNaN(metresPerSecond)) return "—";
  const mph = metresPerSecond * 2.23694;
  if (mph < 5) return "<5";
  return String(Math.round(mph));
}

// ── maneuver wording ────────────────────────────────────────────────────────

function describeManeuver(step: OsrmStep): string {
  const m = step.maneuver;
  const road = step.name ? ` onto ${step.name}` : "";
  const mod = m.modifier ? ` ${m.modifier}` : "";
  switch (m.type) {
    case "depart":
      return step.name ? `Head out on ${step.name}` : "Start driving";
    case "arrive":
      return "Arrive at destination";
    case "roundabout":
    case "rotary":
      return `At the roundabout, take exit${m.exit ? ` ${m.exit}` : ""}${road}`;
    case "merge":
      return `Merge${mod}${road}`;
    case "on ramp":
      return `Take the ramp${mod}${road}`;
    case "off ramp":
      return `Take the exit${mod}${road}`;
    case "fork":
      return `Keep${mod}${road}`;
    case "end of road":
      return `At the end of the road, turn${mod}${road}`;
    case "continue":
      return `Continue${mod}${road}`;
    case "new name":
      return step.name ? `Continue onto ${step.name}` : "Continue";
    default:
      return `Turn${mod}${road}`;
  }
}

// ── upstream response shapes (only the fields we read) ───────────────────────

interface OsrmResponse {
  code: string;
  routes?: {
    distance: number;
    duration: number;
    geometry: { coordinates: [number, number][] };
    legs?: { steps?: OsrmStep[] }[];
  }[];
}

interface OsrmStep {
  distance: number;
  name: string;
  maneuver: { type: string; modifier?: string; exit?: number };
}

interface NominatimPlace {
  display_name: string;
  lat: string;
  lon: string;
}

interface NominatimReverse {
  address?: {
    road?: string;
    pedestrian?: string;
    suburb?: string;
    village?: string;
    town?: string;
    city?: string;
  };
}
