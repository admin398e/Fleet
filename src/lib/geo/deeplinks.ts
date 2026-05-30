import type { LatLng } from "@/lib/w3w/types";

export interface NavDestination extends LatLng {
  label?: string;
}

/**
 * Build a universal Google Maps directions URL. This opens the native Google
 * Maps app when installed (iOS and Android) and falls back to the web map.
 * Driving directions to a precise lat/lng — the front-door or parking pin.
 *
 * @see https://developers.google.com/maps/documentation/urls/get-started
 */
export function buildGoogleMapsUrl(dest: NavDestination): string {
  const url = new URL("https://www.google.com/maps/dir/");
  url.searchParams.set("api", "1");
  url.searchParams.set("destination", `${dest.lat},${dest.lng}`);
  url.searchParams.set("travelmode", "driving");
  return url.toString();
}

/**
 * Build an Apple Maps URL (offered as an alternative to drivers who prefer it).
 * @see https://developer.apple.com/library/archive/featuredarticles/iPhoneURLScheme_Reference/MapLinks/MapLinks.html
 */
export function buildAppleMapsUrl(dest: NavDestination): string {
  const url = new URL("https://maps.apple.com/");
  url.searchParams.set("daddr", `${dest.lat},${dest.lng}`);
  url.searchParams.set("dirflg", "d");
  return url.toString();
}

/**
 * Placeholder for the Trimble CoPilot URL-intent. The real scheme and
 * parameters require Trimble's CoPilot integration credentials/SDK; this
 * returns a documented stub so the call site (NavigateButton) is stable.
 *
 * Expected real shape (subject to Trimble docs):
 *   copilot://...?action=navigate&stops=<lat>,<lng>&name=<label>
 */
export function buildCoPilotUrl(dest: NavDestination): string {
  const stop = `${dest.lat},${dest.lng}`;
  const name = encodeURIComponent(dest.label ?? "Delivery stop");
  // NOTE: stub — not a functional CoPilot deep link until creds are wired up.
  return `copilot://navigate?stops=${stop}&name=${name}`;
}
