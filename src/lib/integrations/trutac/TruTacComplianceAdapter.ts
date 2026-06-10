import type {
  ComplianceAdapter,
  DriverHours,
  Defect,
  WalkaroundStatus,
} from "@/lib/integrations/types";

/**
 * Real TruTac / TruLinks compliance adapter (bring-your-own-key).
 *
 * TruLinks is TruTac's self-service API suite: an operator registers at
 * trulinks.co.uk, generates an API key, and exposes verified driver-hours,
 * walkaround (TruChecks) and defect data. The key belongs to the operator, so
 * we authenticate with it directly — no global partner credential required.
 *
 * NOTE: the exact endpoint paths and response field names below are PROVISIONAL
 * and must be reconciled against the TruLinks developer docs once a real key is
 * available. They are isolated to this file by design; the rest of the app only
 * sees the ComplianceAdapter interface, so correcting them is a local change.
 */
export interface TruTacConfig {
  apiKey: string;
  /** Defaults to the public TruLinks API host. */
  baseUrl?: string;
  /** Injectable for tests; defaults to global fetch. */
  fetchImpl?: typeof fetch;
}

const DEFAULT_BASE_URL = "https://api.trulinks.co.uk";

export class TruTacComplianceAdapter implements ComplianceAdapter {
  readonly name = "trutac-trulinks";
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(config: TruTacConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.fetchImpl = config.fetchImpl ?? fetch;
  }

  isEnabled(): boolean {
    return this.apiKey.length > 0;
  }

  async getDriverHours(driverId: string): Promise<DriverHours | null> {
    const body = await this.request(
      `/v1/drivers/${encodeURIComponent(driverId)}/hours`,
    );
    if (!body) return null;
    return {
      driverId,
      remainingDriveMinutes: Number(body.remainingDriveMinutes ?? 0),
      remainingDutyMinutes: Number(body.remainingDutyMinutes ?? 0),
      nextBreakDueAt: body.nextBreakDueAt ?? undefined,
      asOf: body.asOf ?? new Date().toISOString(),
    };
  }

  async getWalkaroundStatus(
    vehicleId: string,
  ): Promise<WalkaroundStatus | null> {
    const body = await this.request(
      `/v1/vehicles/${encodeURIComponent(vehicleId)}/walkaround`,
    );
    if (!body) return null;
    const result =
      body.result === "pass" || body.result === "fail"
        ? body.result
        : "not_done";
    return {
      vehicleId,
      result,
      completedAt: body.completedAt ?? undefined,
      openDefectCount: Number(body.openDefectCount ?? 0),
    };
  }

  async getDefects(vehicleId: string): Promise<Defect[]> {
    const body = await this.request(
      `/v1/vehicles/${encodeURIComponent(vehicleId)}/defects`,
    );
    const items: unknown[] = Array.isArray(body)
      ? body
      : Array.isArray(body?.items)
        ? body.items
        : [];
    return items.map((raw) => mapDefect(raw, vehicleId));
  }

  /**
   * GET helper. Returns parsed JSON, or null on 404 (so the UI degrades to
   * "not available" instead of erroring). Other non-2xx statuses throw.
   */
  private async request(path: string): Promise<any | null> {
    const res = await this.fetchImpl(`${this.baseUrl}${path}`, {
      headers: {
        // TruLinks issues per-operator keys; header name is provisional.
        "x-api-key": this.apiKey,
        accept: "application/json",
      },
    });
    if (res.status === 404) return null;
    if (!res.ok) {
      throw new Error(`TruLinks request failed: ${res.status} ${path}`);
    }
    return res.json();
  }
}

/** Map a raw defect record, surfacing any dimensional restriction it implies. */
function mapDefect(raw: any, vehicleId: string): Defect {
  const severity =
    raw?.severity === "major" || raw?.severity === "dangerous"
      ? raw.severity
      : "minor";
  const restriction =
    raw?.restriction?.kind && raw?.restriction?.value
      ? {
          kind: raw.restriction.kind,
          value: Number(raw.restriction.value),
          unit: raw.restriction.unit ?? (raw.restriction.kind === "weight" ? "t" : "m"),
        }
      : undefined;
  return {
    id: String(raw?.id ?? crypto.randomUUID()),
    vehicleId,
    category: String(raw?.category ?? "unknown"),
    description: String(raw?.description ?? ""),
    severity,
    reportedAt: raw?.reportedAt ?? new Date().toISOString(),
    restriction,
  };
}
