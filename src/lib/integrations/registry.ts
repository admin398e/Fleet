import { publicEnv } from "@/lib/env";
import type {
  ComplianceAdapter,
  MicroliseAdapter,
  NavigationAdapter,
} from "./types";
import type { ProviderCredentials } from "./credentials";
import { GoogleMapsNavigationAdapter } from "./trimble/GoogleMapsNavigationAdapter";
import { StubCoPilotNavigationAdapter } from "./trimble/StubCoPilotNavigationAdapter";
import { StubMicroliseAdapter } from "./microlise/StubMicroliseAdapter";
import { TruTacComplianceAdapter } from "./trutac/TruTacComplianceAdapter";
import { StubComplianceAdapter } from "./trutac/StubComplianceAdapter";

/**
 * Adapter selection by feature flag. Call sites depend only on the interfaces,
 * so real Microlise/CoPilot implementations drop in here without UI changes.
 */
export function getNavigationAdapter(): NavigationAdapter {
  switch (publicEnv.NEXT_PUBLIC_NAV_PROVIDER) {
    case "copilot":
      return new StubCoPilotNavigationAdapter();
    case "google":
    default:
      return new GoogleMapsNavigationAdapter();
  }
}

/** Server-only: chosen by MICROLISE_ENABLED. Always a stub until creds exist. */
export function getMicroliseAdapter(): MicroliseAdapter {
  // When a real adapter exists, branch on getServerEnv().MICROLISE_ENABLED here.
  return new StubMicroliseAdapter();
}

/**
 * Compliance adapter (TruTac/TruLinks). Returns the real adapter when the
 * operator has supplied their own API key (bring-your-own-key), otherwise a
 * stub. Credentials are resolved server-side (see integrations/server.ts).
 */
export function getComplianceAdapter(
  creds: ProviderCredentials | null,
): ComplianceAdapter {
  if (creds?.apiKey) {
    return new TruTacComplianceAdapter({
      apiKey: creds.apiKey,
      baseUrl: creds.baseUrl,
    });
  }
  return new StubComplianceAdapter();
}
