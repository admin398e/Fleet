/** Normalised shapes returned by our what3words proxy (never the raw upstream). */

export interface LatLng {
  lat: number;
  lng: number;
}

export interface W3WResult {
  /** The three-word address, e.g. "filled.count.soap". */
  words: string;
  /** Coordinates of the centre of the 3m square. */
  coordinates: LatLng;
  /** Nearest named place, for human context. */
  nearestPlace?: string;
  /** ISO country code of the square. */
  country?: string;
}

export interface W3WSuggestion {
  words: string;
  nearestPlace?: string;
  country?: string;
  distanceToFocusKm?: number;
}
