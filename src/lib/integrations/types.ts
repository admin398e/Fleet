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

// ── Compliance (TruTac / TruLinks) ──────────────────────────────────────────

/** Remaining legal driving/duty time for a driver (drivers' hours / WTD). */
export interface DriverHours {
  driverId: string;
  remainingDriveMinutes: number;
  remainingDutyMinutes: number;
  nextBreakDueAt?: string; // ISO timestamp
  asOf: string; // ISO timestamp
}

export type WalkaroundResult = "pass" | "fail" | "not_done";

/** Daily walkaround (TruChecks) status, gating a journey start. */
export interface WalkaroundStatus {
  vehicleId: string;
  result: WalkaroundResult;
  completedAt?: string; // ISO timestamp
  openDefectCount: number;
}

export type DefectSeverity = "minor" | "major" | "dangerous";

/** A dimensional limit a defect implies — feeds the hazard/profile model. */
export interface VehicleRestriction {
  kind: "height" | "weight" | "width";
  value: number;
  unit: "m" | "t";
}

export interface Defect {
  id: string;
  vehicleId: string;
  category: string;
  description: string;
  severity: DefectSeverity;
  reportedAt: string; // ISO timestamp
  restriction?: VehicleRestriction;
}

/**
 * Compliance data source (TruTac/TruLinks). Authenticated with the operator's
 * own API key (bring-your-own-key); a stub is used until a key is supplied.
 */
export interface ComplianceAdapter {
  readonly name: string;
  isEnabled(): boolean;
  getDriverHours(driverId: string): Promise<DriverHours | null>;
  getWalkaroundStatus(vehicleId: string): Promise<WalkaroundStatus | null>;
  getDefects(vehicleId: string): Promise<Defect[]>;
}
