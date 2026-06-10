import type {
  MicroliseAdapter,
  ProofOfDelivery,
  Stop,
} from "@/lib/integrations/types";

/**
 * Stub Microlise adapter. Reports itself disabled and returns no journey, so
 * the UI hides Microlise-driven features (today's manifest, ePOD submission)
 * until Waitrose grants real Journey/ePOD API credentials. Manual property and
 * pin creation always works regardless.
 */
export class StubMicroliseAdapter implements MicroliseAdapter {
  readonly name = "microlise-stub";

  isEnabled(): boolean {
    return false;
  }

  async getTodaysJourney(_driverId: string): Promise<Stop[]> {
    return [];
  }

  async submitProofOfDelivery(pod: ProofOfDelivery): Promise<void> {
    // No-op stub: log intent so the integration point is observable in dev.
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.info("[StubMicroliseAdapter] would submit ePOD", pod.stopId);
    }
  }
}
