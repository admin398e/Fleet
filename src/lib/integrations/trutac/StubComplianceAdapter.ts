import type {
  ComplianceAdapter,
  DriverHours,
  Defect,
  WalkaroundStatus,
} from "@/lib/integrations/types";

/**
 * Stub compliance adapter. Reports itself disabled and returns no data, so
 * compliance-driven UI (driver-hours warnings, walkaround gate) stays hidden
 * until an operator adds their own TruTac/TruLinks API key in Settings. The
 * core address-book and navigation features work regardless.
 */
export class StubComplianceAdapter implements ComplianceAdapter {
  readonly name = "compliance-stub";

  isEnabled(): boolean {
    return false;
  }

  async getDriverHours(_driverId: string): Promise<DriverHours | null> {
    return null;
  }

  async getWalkaroundStatus(
    _vehicleId: string,
  ): Promise<WalkaroundStatus | null> {
    return null;
  }

  async getDefects(_vehicleId: string): Promise<Defect[]> {
    return [];
  }
}
