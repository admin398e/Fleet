"use client";

import { useMemo } from "react";
import { getNavigationAdapter } from "@/lib/integrations/registry";
import { buildAppleMapsUrl } from "@/lib/geo/deeplinks";

/**
 * Launches navigation to a pin. The primary button uses the configured
 * NavigationAdapter (Google Maps by default); Apple Maps is offered as a
 * secondary option for drivers who prefer it.
 */
export function NavigateButton({
  lat,
  lng,
  label,
}: {
  lat: number;
  lng: number;
  label?: string;
}) {
  const primaryHref = useMemo(
    () => getNavigationAdapter().buildNavigationUrl({ lat, lng, label }),
    [lat, lng, label],
  );
  const appleHref = useMemo(
    () => buildAppleMapsUrl({ lat, lng, label }),
    [lat, lng, label],
  );

  return (
    <div className="flex gap-2">
      <a href={primaryHref} className="btn-primary flex-1" rel="noopener">
        Navigate
      </a>
      <a
        href={appleHref}
        className="btn-secondary px-4 text-sm"
        rel="noopener"
        aria-label="Open in Apple Maps"
      >
        Apple
      </a>
    </div>
  );
}
