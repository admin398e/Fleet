import { buildGoogleMapsUrl, type NavDestination } from "@/lib/geo/deeplinks";
import type { NavigationAdapter } from "@/lib/integrations/types";

/** Default, fully-working navigation adapter: launches the Google Maps app. */
export class GoogleMapsNavigationAdapter implements NavigationAdapter {
  readonly name = "google";

  buildNavigationUrl(dest: NavDestination): string {
    return buildGoogleMapsUrl(dest);
  }

  launch(dest: NavDestination): void {
    if (typeof window !== "undefined") {
      window.location.href = this.buildNavigationUrl(dest);
    }
  }
}
