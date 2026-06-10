/**
 * Vehicle routing profiles, mirroring the Microlise / CoPilot "Vehicle Routing
 * Profiles" screen. Dimensions are display strings (imperial, as shown in-cab);
 * `weightT` is the gross weight in tonnes.
 *
 * NOTE: the public OSRM "driving" engine used for routing does not actually
 * enforce HGV dimension/weight restrictions — that needs a licensed truck
 * routing engine. The selected profile is carried through the UI (marker,
 * labels) so the app behaves like CoPilot; true HGV-accurate routing is a
 * documented limitation of this MVP.
 */

export interface VehicleProfile {
  id: string;
  name: string;
  /** Emoji used as the list/marker glyph. */
  icon: string;
  length: string;
  height: string;
  width: string;
  /** Gross weight in tonnes. */
  weightT: number;
}

export const VEHICLE_PROFILES: VehicleProfile[] = [
  {
    id: "microlise-light-duty",
    name: "Microlise Light Duty",
    icon: "🛻",
    length: "21 ft 4 in",
    height: "9 ft 10 in",
    width: "7 ft 3 in",
    weightT: 3.5,
  },
  {
    id: "heavy-articulated",
    name: "Heavy Articulated",
    icon: "🚛",
    length: "54 ft 2 in",
    height: "13 ft 1 in",
    width: "8 ft 4 in",
    weightT: 40,
  },
  {
    id: "heavy-rigid",
    name: "Heavy Rigid",
    icon: "🚚",
    length: "39 ft 4 in",
    height: "13 ft 1 in",
    width: "8 ft 4 in",
    weightT: 26,
  },
  {
    id: "heavy-rigid-trailer",
    name: "Heavy Rigid with Trailer",
    icon: "🚛",
    length: "61 ft 6 in",
    height: "13 ft 1 in",
    width: "8 ft 4 in",
    weightT: 40,
  },
  {
    id: "midsize",
    name: "Midsize",
    icon: "🚐",
    length: "32 ft 10 in",
    height: "12 ft 6 in",
    width: "8 ft 4 in",
    weightT: 11.99,
  },
  {
    id: "light",
    name: "Light",
    icon: "🛻",
    length: "26 ft 3 in",
    height: "11 ft 6 in",
    width: "7 ft 10 in",
    weightT: 7.49,
  },
];

export const DEFAULT_PROFILE_ID = "microlise-light-duty";

export function getProfile(id: string | null | undefined): VehicleProfile {
  return (
    VEHICLE_PROFILES.find((p) => p.id === id) ??
    VEHICLE_PROFILES.find((p) => p.id === DEFAULT_PROFILE_ID)!
  );
}
