import { buildCoPilotUrl, type NavDestination } from "@/lib/geo/deeplinks";
import type { NavigationAdapter } from "@/lib/integrations/types";

/**
 * Stub for Trimble CoPilot navigation. The deep-link is a placeholder until
 * Trimble integration credentials/SDK are available (enterprise agreement via
 * Waitrose). Swap the URL builder for the real scheme when wired up.
 */
export class StubCoPilotNavigationAdapter implements NavigationAdapter {
  readonly name = "copilot";

  buildNavigationUrl(dest: NavDestination): string {
    return buildCoPilotUrl(dest);
  }

  launch(dest: NavDestination): void {
    if (typeof window !== "undefined") {
      window.location.href = this.buildNavigationUrl(dest);
    }
  }
}
