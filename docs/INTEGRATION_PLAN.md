# DoorPin → Microlise Integration & Smart-Routing Plan

A build-and-test plan for turning the current what3words sat-nav MVP into a
Microlise bolt-on that Waitrose can adopt without rip-and-replace, plus two
driver-driven routing features: **deviation re-routing with time-saving
learning** and **crowdsourced road closures / hazards** (e.g. hanging branches).

> Status legend: ✅ done · 🟡 mock/demo-ready · ⬜ to build

---

## 1. Why this shape sells to Waitrose

- Waitrose already runs **Microlise** fleet-wide. The winning pitch is a
  **bolt-on enrichment layer**, not a replacement: Microlise stays the system
  of record for journeys and ePOD; DoorPin adds *door-level* precision
  (what3words) on top of *postcode-level* stops.
- Hard objection removed: **no data migration, no new system of record.**
- ROI story in one line: *Microlise gets the driver to the postcode; DoorPin
  gets them to the door/loading point — fewer failed drops, every pin captured
  once and reused.*
- The hazard + re-routing features add a **safety + time-saving** narrative
  (height-aware avoidance for HGVs, measurable minutes saved per route).

---

## 2. Architecture already in place ✅

`src/lib/integrations/` is built on an adapter pattern so real implementations
drop in behind feature flags with **zero UI changes**:

- `MicroliseAdapter` — `getTodaysJourney()`, `submitProofOfDelivery()`
- `StubMicroliseAdapter` — safe no-op until credentials exist
- `NavigationAdapter` — Google Maps today, CoPilot deep-link stub for later
- `registry.ts` — selects real vs stub via `MICROLISE_ENABLED` /
  `NEXT_PUBLIC_NAV_PROVIDER`

The whole plan below slots into this seam.

---

## 3. Workstream A — Microlise integration

### A1. Data model (Supabase) ⬜
- `journeys` (id, driver_id, date, source: microlise|manual|import, status)
- `stops` (id, journey_id, sequence, address_line, postcode, lat, lng,
  microlise_stop_ref, planned_eta, status)
- `door_pins` (id, postcode_norm, lat, lng, what3words, kind: door|parking|
  loading, notes, photo_path, created_by) — the reusable, shared asset
- `pods` (id, stop_id, delivered_at, signature_name, photo_path, notes, geo)

### A2. `RealMicroliseAdapter` ⬜
- Config: `MICROLISE_BASE_URL`, `MICROLISE_CLIENT_ID/SECRET` (OAuth client-
  credentials), token cache.
- Implements `getTodaysJourney` (Journey Management API) and
  `submitProofOfDelivery` (SmartPOD/ePOD API).
- Registry branches on `MICROLISE_ENABLED`; stub stays the fallback.
- ⚠️ Real endpoint contracts are partner-NDA — wired as config, filled when
  Waitrose sponsors API access.

### A3. Manifest importer 🟡 (enables pilots with no live API)
- Accept Microlise journey export (CSV/JSON) → populate `journeys`/`stops`.
- Lets us demo a *real* Waitrose route before any API credential exists.

### A4. "Today's Journey" screen ⬜
- Microlise-style ordered stop list, per-stop ETA, progress.
- Each stop resolves its shared **door pin** (overlay on map) → one-tap
  navigate (Workstream B) → mark delivered.

### A5. ePOD capture ⬜
- Photo (use existing `browser-image-compression` dep), signature, timestamp,
  geostamp → `submitProofOfDelivery`.
- Offline-queued (see §6) — mirrors Microlise's "Rest Queue Service".

### A6. CoPilot hand-off 🟡
- `StubCoPilotNavigationAdapter` → real Android intent/deep-link so a stop
  launches in the on-device CoPilot engine. Lowest-friction "integration":
  rides alongside the Microlise driver app on the same Zebra device.

**Test:** import sample manifest → journey renders → navigate stop → capture
ePOD → ePOD persists + (mock) submit logged. Playwright E2E + device check.

---

## 4. Workstream B — Deviation re-routing & time-saving learning

> "Update routes if the driver changes course and saves time."

### B1. Deviation detection ⬜
- On each GPS fix, compute distance from the active route polyline
  (point-to-segment). If off-route > threshold (e.g. 40 m) for N fixes →
  auto-reroute from current position (OSRM) and resync ETA.

### B2. Faster-route detection ⬜
- Periodically request OSRM `alternatives`; if an alternative's remaining ETA
  beats the current by > threshold (e.g. 2 min) → non-blocking prompt:
  *"Faster route — saves X min. Switch?"*

### B3. Learned deviations (the differentiator) ⬜
- When a driver goes off-route and rejoins downstream having **beaten the
  original segment ETA**, record the chosen path as a *preferred deviation*
  for that area (`learned_segments`: from_cell, to_cell, polyline, avg_saving,
  confirmations).
- Future routes through that area prefer the learned path.
- Surfaces fleet-wide tribal knowledge ("the back entrance is quicker").

### B4. Planned-vs-actual accounting ⬜
- Track planned vs actual time per stop → "saved X min today" — also a **sales
  metric** for Waitrose (quantified efficiency).

**Engine note:** public OSRM can't ingest custom weights, so B3 is applied as
our own candidate-path preference until the engine in §7 lands.

**Test:** simulate a GPS track that deviates → reroute fires; replay a faster
parallel path → prompt appears; replay repeated time-saving deviation →
`learned_segments` row created and reused next run.

---

## 5. Workstream C — Crowdsourced road closures & hazards

> "Mark if a road is closed / not the best route — e.g. hanging trees."

### C1. Hazard model ⬜
`hazards`: type (`closure | low_branch | height | width | weight | no_hgv |
flood | temporary`), point **or** segment, severity, **constraint value**
(height m / width m / weight t), photo, reporter, created_at, expires_at,
confirmations, status.

### C2. Reporting UI (glove-friendly) ⬜
- "Report" button in nav → one-tap category tiles → optional photo + voice
  note. Auto-captures GPS + nearest road (we already reverse-geocode).
- Fast enough to use safely in-cab.

### C3. Sharing & display ⬜
- Central store (Supabase) → all drivers in the area see it as a map marker
  (the hazard icon already appears on the route in the screenshots).
- "Still there? / Gone" votes → confirmations + auto-expiry so a cleared
  branch ages out.

### C4. Routing influence — ties to Vehicle Profiles ⬜
- When routing, **avoid segments with active blocking hazards**, and compare
  height/width/weight hazards against the **selected Vehicle Profile** (a
  hanging branch at 4.0 m blocks a 4.1 m Heavy Rigid but not a 3.0 m van).
- This is what makes the **Vehicle Routing Profiles enforceable, not
  cosmetic.**
- On public OSRM: post-filter/score alternatives to drop hazard-crossing
  routes, or nudge via waypoints. True avoidance needs §7.

**Test:** report a `low_branch` height hazard in session A → it appears on the
map in session B → routing with a tall profile avoids it; with a short profile
it doesn't. Confirm expiry/age-out.

---

## 6. Cross-cutting: offline & PWA ⬜
- App is already an installable PWA (serwist). Add **background-sync queues**
  for ePOD submissions and hazard reports so in-cab use survives signal gaps,
  then flush when back online (mirrors Microlise's queue services).

---

## 7. Routing-engine decision (the real unlock) ⬜

- **Now (MVP/demo):** public OSRM *driving* — no truck costing, no avoidance.
  Fine for the Waitrose demo.
- **Production target: self-host [Valhalla].** It supports **truck costing**
  (height / weight / length / width), `avoid_locations`, and `avoid_polygons`.
  This single change makes three features *actually enforceable*:
  1. Vehicle Routing Profiles (real HGV-aware routing)
  2. Hazard avoidance (C4) and closures
  3. Learned-deviation preferences (B3, via custom costing)
- Recommendation: plan the data model now so the swap from OSRM → Valhalla is
  config-only.

---

## 8. Security & commercial gating
- Per-driver auth via Supabase (already scaffolded); Microlise creds via env +
  OAuth client-credentials, never client-side.
- **Blocker:** real Microlise Journey/ePOD API access requires **Waitrose
  sponsorship + a Microlise partner agreement (NDA)**. Everything above runs on
  mock/imported data until then.

---

## 9. Phased delivery

| Phase | Deliverable | Engine | Data |
|------|-------------|--------|------|
| 0 ✅ | what3words sat-nav MVP | OSRM | — |
| 1 | Microlise demo: mock journey + ePOD + manifest import | OSRM | A1–A6 |
| 2 | Deviation reroute + faster-route prompt + saved-minutes | OSRM | B1,B2,B4 |
| 3 | Hazard reporting + sharing + map display | OSRM | C1–C3 |
| 4 | Self-host Valhalla → profile-aware + hazard-avoidance + learned deviations | Valhalla | B3,C4 |
| 5 | Real Microlise API wiring | — | A2 live |

Phases 1–3 are demo-able with no Microlise credentials — enough to put in
front of a Waitrose buyer. Phase 4 is the genuine product moat. Phase 5 flips
on when access is granted.

---

## 10. Immediate next build step
Phase 1 (Microlise demo on mock data) is the highest-leverage thing to build
next and needs nothing from Microlise. Ready to start there on this branch.
