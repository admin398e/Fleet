import type { NavDestination } from "@/lib/geo/deeplinks";

/** A single delivery stop, however it was sourced (manual or Microlise). */
export interface Stop {
  id: string;
  addressLine: string;
  postcode: string;
  lat?: number;
  lng?: number;
}

export interface ProofOfDelivery {
  stopId: string;
  deliveredAt: string; // ISO timestamp
  signatureName?: string;
  photoStoragePath?: string;
  notes?: string;
}

/**
 * Microlise journey + electronic proof-of-delivery. Real implementation needs
 * Waitrose-granted credentials; until then a stub provides empty/sample data.
 */
export interface MicroliseAdapter {
  readonly name: string;
  isEnabled(): boolean;
  getTodaysJourney(driverId: string): Promise<Stop[]>;
  submitProofOfDelivery(pod: ProofOfDelivery): Promise<void>;
}

/** Turn-by-turn navigation launcher (Google Maps today; CoPilot later). */
export interface NavigationAdapter {
  readonly name: string;
  /** Build the deep-link URL without navigating (testable). */
  buildNavigationUrl(dest: NavDestination): string;
  /** Open the navigation target (client-side; uses window.location). */
  launch(dest: NavDestination): void;
}
