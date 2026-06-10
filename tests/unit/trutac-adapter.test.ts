import { describe, it, expect, vi } from "vitest";
import { TruTacComplianceAdapter } from "@/lib/integrations/trutac/TruTacComplianceAdapter";
import { StubComplianceAdapter } from "@/lib/integrations/trutac/StubComplianceAdapter";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("TruTacComplianceAdapter", () => {
  const config = (fetchImpl: typeof fetch) => ({
    apiKey: "test-key",
    baseUrl: "https://api.example.test/",
    fetchImpl,
  });

  it("sends the API key header and hits the driver-hours endpoint", async () => {
    const fetchImpl = vi.fn(async (_url: string, _init?: RequestInit) =>
      jsonResponse({
        remainingDriveMinutes: 120,
        remainingDutyMinutes: 240,
        nextBreakDueAt: "2026-06-10T12:00:00Z",
        asOf: "2026-06-10T09:00:00Z",
      }),
    );
    const adapter = new TruTacComplianceAdapter(config(fetchImpl as never));
    const hours = await adapter.getDriverHours("driver-1");

    expect(hours).toEqual({
      driverId: "driver-1",
      remainingDriveMinutes: 120,
      remainingDutyMinutes: 240,
      nextBreakDueAt: "2026-06-10T12:00:00Z",
      asOf: "2026-06-10T09:00:00Z",
    });
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe("https://api.example.test/v1/drivers/driver-1/hours");
    expect((init as RequestInit).headers).toMatchObject({ "x-api-key": "test-key" });
  });

  it("maps a defect with a height restriction for the hazard model", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse([
        {
          id: "d1",
          category: "bodywork",
          description: "Low roof clearance flagged",
          severity: "major",
          reportedAt: "2026-06-10T08:00:00Z",
          restriction: { kind: "height", value: 4.0, unit: "m" },
        },
      ]),
    );
    const adapter = new TruTacComplianceAdapter(config(fetchImpl as never));
    const defects = await adapter.getDefects("veh-9");

    expect(defects).toHaveLength(1);
    expect(defects[0]!.restriction).toEqual({ kind: "height", value: 4.0, unit: "m" });
    expect(defects[0]!.severity).toBe("major");
  });

  it("returns null on 404 (degrade gracefully)", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({}, 404));
    const adapter = new TruTacComplianceAdapter(config(fetchImpl as never));
    expect(await adapter.getWalkaroundStatus("veh-1")).toBeNull();
  });

  it("throws on other non-2xx responses", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({}, 500));
    const adapter = new TruTacComplianceAdapter(config(fetchImpl as never));
    await expect(adapter.getDriverHours("x")).rejects.toThrow(/500/);
  });
});

describe("StubComplianceAdapter", () => {
  it("is disabled and returns empty data", async () => {
    const stub = new StubComplianceAdapter();
    expect(stub.isEnabled()).toBe(false);
    expect(await stub.getDriverHours("d")).toBeNull();
    expect(await stub.getWalkaroundStatus("v")).toBeNull();
    expect(await stub.getDefects("v")).toEqual([]);
  });
});
