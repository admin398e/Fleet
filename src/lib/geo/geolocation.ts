"use client";

import type { LatLng } from "@/lib/w3w/types";

export interface FixResult extends LatLng {
  /** Accuracy radius in metres (lower is better; matters for door precision). */
  accuracy: number;
}

/**
 * Promise wrapper around navigator.geolocation. Must be triggered from a user
 * gesture (iOS requirement) and only over HTTPS.
 */
export function getCurrentPosition(
  options: PositionOptions = {
    enableHighAccuracy: true,
    timeout: 15_000,
    maximumAge: 0,
  },
): Promise<FixResult> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Geolocation is not available on this device."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
      (err) => reject(new Error(geolocationErrorMessage(err))),
      options,
    );
  });
}

function geolocationErrorMessage(err: GeolocationPositionError): string {
  switch (err.code) {
    case err.PERMISSION_DENIED:
      return "Location permission denied. Enable it in Settings to drop a pin here.";
    case err.POSITION_UNAVAILABLE:
      return "Couldn't determine your location. Try again outdoors.";
    case err.TIMEOUT:
      return "Timed out getting your location. Try again.";
    default:
      return "Failed to get your location.";
  }
}
