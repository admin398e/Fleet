import { describe, it, expect } from "vitest";
import {
  buildGoogleMapsUrl,
  buildAppleMapsUrl,
  buildCoPilotUrl,
} from "@/lib/geo/deeplinks";

describe("deeplinks", () => {
  const dest = { lat: 51.5207, lng: -0.1086, label: "Front door" };

  it("builds a universal Google Maps directions URL to the exact coords", () => {
    const url = buildGoogleMapsUrl(dest);
    expect(url).toContain("https://www.google.com/maps/dir/");
    expect(url).toContain("api=1");
    expect(url).toContain("destination=51.5207%2C-0.1086");
    expect(url).toContain("travelmode=driving");
  });

  it("builds an Apple Maps driving URL", () => {
    const url = buildAppleMapsUrl(dest);
    expect(url).toContain("https://maps.apple.com/");
    expect(url).toContain("daddr=51.5207%2C-0.1086");
    expect(url).toContain("dirflg=d");
  });

  it("builds a CoPilot stub URL with stops and name", () => {
    const url = buildCoPilotUrl(dest);
    expect(url).toContain("copilot://navigate");
    expect(url).toContain("stops=51.5207,-0.1086");
    expect(url).toContain("name=Front%20door");
  });
});
