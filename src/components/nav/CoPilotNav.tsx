"use client";

import "leaflet/dist/leaflet.css";
import { useCallback, useEffect, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import type { LatLng } from "@/lib/w3w/types";
import {
  fetchRoutes,
  searchPlaces,
  reverseRoad,
  formatDistance,
  formatDuration,
  compassHeading,
  formatSpeedMph,
  type Route,
} from "@/lib/nav/routing";
import {
  VEHICLE_PROFILES,
  DEFAULT_PROFILE_ID,
  getProfile,
} from "@/lib/nav/profiles";
import { fetchSuggestions, fetchCoordsForWords } from "@/lib/w3w/api";
import type { W3WSuggestion } from "@/lib/w3w/types";

/** Yeovil — used as the map centre until a real GPS fix arrives. */
const FALLBACK: LatLng = { lat: 50.9413, lng: -2.6376 };

interface Destination extends LatLng {
  label: string;
  words?: string;
}

interface Fix extends LatLng {
  heading: number | null;
  speed: number | null;
  accuracy: number;
}

const TILES = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
const TILE_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

export function CoPilotNav() {
  const mapEl = useRef<HTMLDivElement>(null);
  const L = useRef<typeof Leaflet | null>(null);
  const map = useRef<Leaflet.Map | null>(null);
  const meMarker = useRef<Leaflet.Marker | null>(null);
  const routeLayer = useRef<Leaflet.LayerGroup | null>(null);

  const [ready, setReady] = useState(false);
  const [fix, setFix] = useState<Fix | null>(null);
  const [profileId, setProfileId] = useState(DEFAULT_PROFILE_ID);
  const [destination, setDestination] = useState<Destination | null>(null);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [routeIdx, setRouteIdx] = useState(0);
  const [tab, setTab] = useState<"map" | "plan">("map");
  const [showProfiles, setShowProfiles] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [currentRoad, setCurrentRoad] = useState<string | null>(null);
  const [routing, setRouting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const follow = useRef(true);

  // ── init map (once, client only) ──────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const leaflet = await import("leaflet");
      if (cancelled || !mapEl.current || map.current) return;
      L.current = leaflet;
      const m = leaflet.map(mapEl.current, {
        center: [FALLBACK.lat, FALLBACK.lng],
        zoom: 15,
        zoomControl: false,
        attributionControl: true,
      });
      leaflet.tileLayer(TILES, { attribution: TILE_ATTR, maxZoom: 19, detectRetina: true }).addTo(m);
      leaflet.control.scale({ imperial: true, metric: false, position: "bottomright" }).addTo(m);
      // Dragging the map breaks "follow me" until the user re-centres.
      m.on("dragstart", () => (follow.current = false));
      routeLayer.current = leaflet.layerGroup().addTo(m);
      map.current = m;
      setReady(true);
    })();
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // ── restore saved vehicle profile ─────────────────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem("vehicleProfile");
    if (saved) setProfileId(saved);
  }, []);

  // ── live position (watchPosition) ─────────────────────────────────────────
  useEffect(() => {
    if (!navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      (p) =>
        setFix({
          lat: p.coords.latitude,
          lng: p.coords.longitude,
          heading: p.coords.heading,
          speed: p.coords.speed,
          accuracy: p.coords.accuracy,
        }),
      () => {
        /* keep the fallback centre on permission denial */
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  // ── render the "me" arrow + follow camera ─────────────────────────────────
  useEffect(() => {
    const leaflet = L.current;
    const m = map.current;
    if (!leaflet || !m || !fix) return;

    const rot = fix.heading ?? 0;
    const icon = leaflet.divIcon({
      className: "",
      html: `<div style="transform:rotate(${rot}deg)" class="me-arrow">
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="11" fill="#1565ff" fill-opacity="0.25"/>
          <path d="M12 3l6 15-6-3-6 3 6-15z" fill="#1565ff" stroke="#fff" stroke-width="1.2" stroke-linejoin="round"/>
        </svg></div>`,
      iconSize: [34, 34],
      iconAnchor: [17, 17],
    });
    if (!meMarker.current) {
      meMarker.current = leaflet.marker([fix.lat, fix.lng], { icon, zIndexOffset: 1000 }).addTo(m);
    } else {
      meMarker.current.setLatLng([fix.lat, fix.lng]);
      meMarker.current.setIcon(icon);
    }
    if (follow.current && tab === "map" && !destination) {
      m.setView([fix.lat, fix.lng], Math.max(m.getZoom(), 16), { animate: true });
    }
  }, [fix, tab, destination]);

  // ── reverse-geocode current road (throttled to ~every 12s) ────────────────
  const lastRoadAt = useRef(0);
  useEffect(() => {
    if (!fix) return;
    const now = Date.now();
    if (now - lastRoadAt.current < 12000) return;
    lastRoadAt.current = now;
    reverseRoad(fix).then((r) => r && setCurrentRoad(r));
  }, [fix]);

  // ── draw the route(s) whenever they (or the selection) change ─────────────
  const drawRoutes = useCallback(() => {
    const leaflet = L.current;
    const m = map.current;
    const group = routeLayer.current;
    if (!leaflet || !m || !group || !destination) return;
    group.clearLayers();

    // Alternatives first (so the active one paints on top).
    routes.forEach((r, i) => {
      if (i === routeIdx) return;
      const line = leaflet.polyline(r.coords, {
        color: "#9aa3af",
        weight: 6,
        opacity: 0.9,
      }).addTo(group);
      line.on("click", () => setRouteIdx(i));
      addEtaBubble(leaflet, group, r, false, () => setRouteIdx(i));
    });

    const active = routes[routeIdx];
    if (active) {
      leaflet.polyline(active.coords, { color: "#1565ff", weight: 8, opacity: 1 }).addTo(group);
      addEtaBubble(leaflet, group, active, true, () => setRouteIdx(routeIdx));
      // origin (green) + destination (red), matching the CoPilot look.
      const start = active.coords[0];
      if (start) {
        leaflet.marker(start, { icon: dot(leaflet, "#16a34a", "▲"), zIndexOffset: 800 }).addTo(group);
      }
    }
    leaflet
      .marker([destination.lat, destination.lng], { icon: dot(leaflet, "#dc2626"), zIndexOffset: 900 })
      .addTo(group);
  }, [routes, routeIdx, destination]);

  // Redraw on selection change; fit bounds only when the route set changes.
  const prevRoutes = useRef<Route[]>([]);
  useEffect(() => {
    if (!ready) return;
    drawRoutes();
    const leaflet = L.current;
    const m = map.current;
    if (leaflet && m && routes.length && routes !== prevRoutes.current) {
      prevRoutes.current = routes;
      const all = routes.flatMap((r) => r.coords);
      m.fitBounds(leaflet.latLngBounds(all as Leaflet.LatLngExpression[]).pad(0.18));
    }
  }, [ready, drawRoutes, routes]);

  // ── set a destination and compute the route ───────────────────────────────
  const navigateTo = useCallback(
    async (dest: Destination) => {
      setError(null);
      setRouting(true);
      setShowSearch(false);
      setDestination(dest);
      follow.current = false;
      try {
        const from = fix ?? FALLBACK;
        const rs = await fetchRoutes(from, dest);
        setRoutes(rs);
        setRouteIdx(0);
        setTab("map");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Routing failed.");
        setRoutes([]);
      } finally {
        setRouting(false);
      }
    },
    [fix],
  );

  function clearDestination() {
    setDestination(null);
    setRoutes([]);
    setRouteIdx(0);
    routeLayer.current?.clearLayers();
    prevRoutes.current = [];
    follow.current = true;
    setTab("map");
  }

  function recentre() {
    follow.current = true;
    const m = map.current;
    const target = fix ?? FALLBACK;
    m?.setView([target.lat, target.lng], 16, { animate: true });
  }

  function chooseProfile(id: string) {
    setProfileId(id);
    localStorage.setItem("vehicleProfile", id);
    setShowProfiles(false);
  }

  const profile = getProfile(profileId);
  const active = routes[routeIdx];

  return (
    <div className="fixed inset-0 flex flex-col bg-[#0e1116] text-white">
      {/* Map fills everything; overlays float on top. */}
      <div ref={mapEl} className="absolute inset-0 z-0" />

      {/* ── TOP CHROME ─────────────────────────────────────────────── */}
      {destination ? (
        <div className="relative z-10">
          <div className="flex items-center gap-2 bg-[#0e1116]/95 px-2 py-2 backdrop-blur">
            <button onClick={clearDestination} aria-label="Back" className="p-2 text-2xl leading-none">
              ‹
            </button>
            <div className="flex flex-1 overflow-hidden rounded-md bg-white/10 p-0.5">
              {(["map", "plan"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex-1 rounded py-1.5 text-sm font-bold uppercase tracking-wide ${
                    tab === t ? "bg-[#1565ff] text-white" : "text-gray-300"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <button onClick={() => setShowProfiles(true)} aria-label="Menu" className="px-3 text-xl">
              ⋯
            </button>
          </div>
          <div className="truncate bg-[#0e1116]/95 px-3 pb-2 text-center text-sm text-gray-200 backdrop-blur">
            <span className="text-gray-400">To: </span>
            {destination.words ? `///${destination.words}` : destination.label}
          </div>
        </div>
      ) : (
        <>
          <div className="absolute left-3 top-3 z-10 flex flex-col gap-2">
            <button
              onClick={() => setShowProfiles(true)}
              aria-label="Vehicle profiles"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-2xl text-gray-800 shadow-lg"
            >
              ☰
            </button>
            <button
              onClick={() => setShowSearch(true)}
              aria-label="Search"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-black text-xl text-white shadow-lg"
            >
              🔍
            </button>
          </div>
          {/* Speed-limit badge — demo value (live limit data needs a paid source). */}
          <div className="absolute right-3 top-3 z-10 flex h-12 w-12 items-center justify-center rounded-full border-4 border-red-600 bg-white text-lg font-extrabold text-black shadow-lg">
            30
          </div>
        </>
      )}

      {/* ── ZOOM CONTROLS ──────────────────────────────────────────── */}
      <div className="absolute bottom-28 left-3 z-10 flex flex-col overflow-hidden rounded-lg shadow-lg">
        <button onClick={() => map.current?.zoomIn()} className="h-10 w-10 bg-white text-2xl text-gray-800">
          +
        </button>
        <button onClick={() => map.current?.zoomOut()} className="h-10 w-10 border-t border-gray-200 bg-white text-2xl text-gray-800">
          −
        </button>
      </div>

      {/* ── PLAN (turn list) ───────────────────────────────────────── */}
      {destination && tab === "plan" && (
        <div className="absolute inset-x-0 bottom-0 top-[88px] z-20 overflow-y-auto bg-[#0e1116]">
          {active ? (
            <ul className="divide-y divide-white/10">
              {active.steps.map((s, i) => (
                <li key={i} className="flex items-center gap-3 px-4 py-3">
                  <span className="text-lg">↱</span>
                  <div className="flex-1">
                    <p className="text-sm">{s.instruction}</p>
                    {s.distanceM > 0 && (
                      <p className="text-xs text-gray-400">{formatDistance(s.distanceM)}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="p-6 text-center text-gray-400">No directions available.</p>
          )}
        </div>
      )}

      {/* ── BOTTOM PANEL ───────────────────────────────────────────── */}
      <div className="absolute inset-x-0 bottom-0 z-10">
        {active && tab === "map" ? (
          <div className="flex items-center gap-3 bg-[#0e1116]/95 px-4 py-3 backdrop-blur">
            <span className="text-2xl">{profile.icon}</span>
            <div className="flex-1">
              <p className="text-lg font-bold">
                {formatDuration(active.durationS)}, {formatDistance(active.distanceM)}
              </p>
              <p className="text-sm text-gray-300">{currentRoad ?? active.steps[0]?.name ?? "—"}</p>
              <p className="text-xs text-amber-400">Traffic Delay: 0 min</p>
            </div>
            <button
              onClick={recentre}
              aria-label="Recentre"
              className="flex h-14 w-14 items-center justify-center rounded-full bg-[#16a34a] text-2xl text-white shadow-lg active:scale-95"
            >
              ◎
            </button>
          </div>
        ) : (
          tab === "map" && (
            <div className="bg-[#0e1116]/95 px-4 py-3 text-center backdrop-blur">
              <div className="flex items-stretch justify-around">
                <div className="flex-1">
                  <p className="text-xs uppercase tracking-wide text-gray-400">Speed</p>
                  <p className="text-lg font-bold">
                    {formatSpeedMph(fix?.speed)} <span className="text-xs font-normal">mph</span>
                  </p>
                </div>
                <div className="w-px bg-white/15" />
                <div className="flex-1">
                  <p className="text-xs uppercase tracking-wide text-gray-400">Heading</p>
                  <p className="text-lg font-bold">{compassHeading(fix?.heading)}</p>
                </div>
              </div>
              <p className="mt-1 border-t border-white/10 pt-1 text-base font-semibold">
                {currentRoad ?? (destination ? "" : "No destination")}
              </p>
            </div>
          )
        )}
      </div>

      {/* ── ROUTING SPINNER / ERROR ────────────────────────────────── */}
      {routing && (
        <div className="absolute left-1/2 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2 rounded-lg bg-black/80 px-4 py-2 text-sm">
          Calculating route…
        </div>
      )}
      {error && (
        <div className="absolute left-1/2 top-20 z-30 -translate-x-1/2 rounded-lg bg-red-600 px-4 py-2 text-sm shadow-lg">
          {error}
        </div>
      )}

      {/* ── SEARCH OVERLAY ─────────────────────────────────────────── */}
      {showSearch && (
        <SearchOverlay
          focus={fix ?? FALLBACK}
          onClose={() => setShowSearch(false)}
          onPick={navigateTo}
        />
      )}

      {/* ── VEHICLE ROUTING PROFILES ───────────────────────────────── */}
      {showProfiles && (
        <div className="absolute inset-0 z-40 flex flex-col bg-[#0e1116]">
          <div className="flex items-center gap-2 border-b border-white/10 px-2 py-3">
            <button onClick={() => setShowProfiles(false)} aria-label="Back" className="p-2 text-2xl leading-none">
              ‹
            </button>
            <h1 className="text-lg font-semibold">Vehicle Routing Profiles</h1>
          </div>
          <ul className="flex-1 divide-y divide-white/10 overflow-y-auto">
            {VEHICLE_PROFILES.map((p) => (
              <li key={p.id}>
                <button
                  onClick={() => chooseProfile(p.id)}
                  className="flex w-full items-center gap-4 px-4 py-4 text-left"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-2xl">
                    {p.icon}
                  </span>
                  <div className="flex-1">
                    <p className="font-semibold">{p.name}</p>
                    <p className="text-xs text-gray-400">
                      Length: {p.length}, Height: {p.height}, Width: {p.width}, Weight:{" "}
                      {p.weightT.toFixed(2)} t
                    </p>
                  </div>
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                      profileId === p.id ? "border-[#1565ff]" : "border-gray-500"
                    }`}
                  >
                    {profileId === p.id && <span className="h-2.5 w-2.5 rounded-full bg-[#1565ff]" />}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── helpers ──────────────────────────────────────────────────────────────────

function dot(leaflet: typeof Leaflet, color: string, glyph = ""): Leaflet.DivIcon {
  return leaflet.divIcon({
    className: "",
    html: `<div style="background:${color}" class="flex h-5 w-5 items-center justify-center rounded-full border-2 border-white text-[10px] text-white shadow">${glyph}</div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}

function addEtaBubble(
  leaflet: typeof Leaflet,
  group: Leaflet.LayerGroup,
  route: Route,
  active: boolean,
  onClick: () => void,
) {
  const mid = route.coords[Math.floor(route.coords.length / 2)];
  if (!mid) return;
  const bg = active ? "#1565ff" : "#6b7280";
  const icon = leaflet.divIcon({
    className: "",
    html: `<div style="background:${bg}" class="whitespace-nowrap rounded-md px-2 py-1 text-center text-[11px] font-bold leading-tight text-white shadow-lg">${formatDuration(
      route.durationS,
    )}<br/>${formatDistance(route.distanceM)}</div>`,
    iconSize: [56, 30],
    iconAnchor: [28, 15],
  });
  leaflet.marker(mid, { icon, zIndexOffset: active ? 700 : 600 }).addTo(group).on("click", onClick);
}

// ── search overlay (what3words first, then places) ───────────────────────────

function SearchOverlay({
  focus,
  onClose,
  onPick,
}: {
  focus: LatLng;
  onClose: () => void;
  onPick: (d: Destination) => void;
}) {
  const [q, setQ] = useState("");
  const [w3w, setW3w] = useState<W3WSuggestion[]>([]);
  const [places, setPlaces] = useState<{ label: string; lat: number; lng: number }[]>([]);
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function onChange(v: string) {
    setQ(v);
    if (timer.current) clearTimeout(timer.current);
    if (v.trim().length < 3) {
      setW3w([]);
      setPlaces([]);
      return;
    }
    timer.current = setTimeout(async () => {
      setBusy(true);
      const [w, p] = await Promise.all([
        fetchSuggestions(v.trim(), focus),
        searchPlaces(v.trim()),
      ]);
      setW3w(w);
      setPlaces(p);
      setBusy(false);
    }, 350);
  }

  async function pickWords(words: string) {
    try {
      const r = await fetchCoordsForWords(words);
      onPick({
        lat: r.coordinates.lat,
        lng: r.coordinates.lng,
        label: r.nearestPlace ?? words,
        words: r.words,
      });
    } catch {
      /* ignore — user can retry */
    }
  }

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-[#0e1116]">
      <div className="flex items-center gap-2 border-b border-white/10 p-2">
        <button onClick={onClose} aria-label="Back" className="p-2 text-2xl leading-none">
          ‹
        </button>
        <input
          autoFocus
          value={q}
          onChange={(e) => onChange(e.target.value)}
          placeholder="what3words, postcode or place"
          className="min-h-11 flex-1 rounded-lg bg-white/10 px-3 text-base text-white placeholder:text-gray-400 focus:outline-none"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
        />
      </div>
      <div className="flex-1 overflow-y-auto">
        {busy && <p className="p-4 text-sm text-gray-400">Searching…</p>}
        {w3w.length > 0 && (
          <p className="px-4 pt-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
            what3words
          </p>
        )}
        {w3w.map((s) => (
          <button
            key={s.words}
            onClick={() => pickWords(s.words)}
            className="block w-full border-b border-white/5 px-4 py-3 text-left"
          >
            <span className="font-mono text-[#e11d48]">{"///"}{s.words}</span>
            {s.nearestPlace && <span className="ml-2 text-sm text-gray-400">{s.nearestPlace}</span>}
          </button>
        ))}
        {places.length > 0 && (
          <p className="px-4 pt-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Places
          </p>
        )}
        {places.map((p, i) => (
          <button
            key={`${p.lat}-${i}`}
            onClick={() => onPick({ lat: p.lat, lng: p.lng, label: p.label })}
            className="block w-full border-b border-white/5 px-4 py-3 text-left text-sm"
          >
            {p.label}
          </button>
        ))}
        {!busy && q.trim().length >= 3 && w3w.length === 0 && places.length === 0 && (
          <p className="p-4 text-sm text-gray-400">No matches.</p>
        )}
      </div>
    </div>
  );
}
