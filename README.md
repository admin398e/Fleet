# DoorPin — shared delivery pins for multi-drop drivers

DoorPin is an installable web app (PWA) that solves the gap left by commercial
truck-navigation: it doesn't know **where the front door actually is** or **where
it's safe to park**. Drivers record, per property, the exact **front door** and
**best parking spot** as [what3words](https://what3words.com) addresses (3 m
precision), plus notes — and the next driver to that address sees them instantly
and taps straight into **Google Maps** to navigate.

It runs from one codebase on **iPhone (home-screen install), Android, and the web**.

> **Status: working proof-of-concept.** The what3words pinning, shared address
> book, confirmations, notes, and Google Maps navigation are fully functional.
> **Microlise** (journey manifest / ePOD) and **Trimble CoPilot** (turn-by-turn)
> integrations are designed-in behind clean adapters but **stubbed**, because both
> require enterprise API credentials only Waitrose can grant. See
> [Integration roadmap](#integration-roadmap).

---

## Tech stack

| Layer | Choice |
|---|---|
| Frontend / PWA | Next.js 15 (App Router, TypeScript, Tailwind) + Serwist service worker |
| Backend / DB / Auth / Storage | Supabase (Postgres + Row Level Security + email/Google auth + Storage) |
| what3words | REST API, **proxied server-side** so the key never reaches the browser |
| Navigation | Google Maps universal deep link (opens the native app) — Apple Maps offered too |
| Hosting | Vercel |

## Project layout

```
src/
  app/                      App Router pages + route handlers
    api/w3w/*               Server-side what3words proxy (auth-gated, rate-limited)
    auth/*                  OAuth/magic-link callback + signout
    properties/*            Create / view properties, server actions
  components/               UI (pins, property, auth, install prompt)
  lib/
    supabase/               Browser + server + middleware clients (@supabase/ssr)
    w3w/                    Server-side w3w client + client-side fetch helpers
    geo/                    Geolocation wrapper + deep-link URL builders
    integrations/           Microlise + CoPilot adapters (stubs) behind interfaces
    validation/             zod schemas for every input
    rate-limit.ts           Token-bucket limiter for the w3w proxy
  types/database.ts         Supabase types (regenerate with `npm run db:types`)
supabase/migrations/        Schema, RLS policies, storage bucket
tests/                      vitest unit tests + Playwright e2e
```

## Getting started

### 1. Create a Supabase project
1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL editor, run the migrations **in order**:
   `supabase/migrations/0001_init_schema.sql`, then `0002_rls_policies.sql`,
   then `0003_storage_buckets.sql`.
3. **Auth → Providers:** enable Email, and (optionally) Google. Add your site URL
   and `…/auth/callback` to the allowed redirect URLs.
4. Copy the project URL and the **anon/publishable** key.

### 2. Get a what3words key
Sign up at [developer.what3words.com](https://developer.what3words.com) and create
an API key (free tier).

### 3. Configure env
```bash
cp .env.example .env.local
# fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, W3W_API_KEY
```

### 4. Run
```bash
npm install
npm run dev        # http://localhost:3000
```

## Scripts
| Command | Purpose |
|---|---|
| `npm run dev` | Local dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run typecheck` | TypeScript, no emit |
| `npm run lint` | Next/ESLint |
| `npm test` | vitest unit tests |
| `npm run test:e2e` | Playwright (set `BASE_URL` for a deployed preview) |
| `npm run db:types` | Regenerate `src/types/database.ts` from a linked Supabase project |

## Deploy & test on your iPhone
1. Push the branch; import the repo in **Vercel** and set the same env vars.
2. Vercel gives an **HTTPS preview URL** — HTTPS is required for geolocation, the
   service worker, and installability.
3. On the iPhone: open the URL in **Safari → Share → Add to Home Screen**, then
   launch the installed icon. It runs full-screen with no Safari chrome.
4. Verify: Google/email sign-in, "Use my current location" resolves a what3words
   address, **Save pin**, then **Navigate** launches the Google Maps app.

> iOS notes: Safari has no programmatic install prompt (we show a manual hint);
> geolocation only works over HTTPS and after a tap; installed-PWA storage can be
> evicted after long inactivity — Supabase is always the source of truth.

## Security

- what3words key is **server-only** (`W3W_API_KEY`, never `NEXT_PUBLIC_*`), used
  only in `src/lib/w3w/client.ts` (guarded by `server-only`). Verified absent from
  the client bundle.
- Every w3w proxy route is **auth-gated**, **zod-validated**, and **rate-limited**.
- **Row Level Security** on every table: shared read for signed-in drivers, but you
  can only edit/delete your own contributions; `WITH CHECK` prevents spoofing
  `created_by`. Run Supabase's security advisors after applying migrations.
- Photo bucket is **private**; images are served via short-lived signed URLs.
- Security headers (HSTS, X-Frame-Options, Permissions-Policy, etc.) set in
  `next.config.mjs`.

## Integration roadmap

The app is structured so the enterprise pieces drop in without touching the UI —
all coupling lives in `src/lib/integrations/`, selected by feature flags.

- **Google Maps navigation** — live now (`GoogleMapsNavigationAdapter`).
- **Trimble CoPilot** — `StubCoPilotNavigationAdapter` + `buildCoPilotUrl()`
  placeholder. When Waitrose/Trimble grant access, implement the real CoPilot
  URL-intent / Mobile SDK; set `NEXT_PUBLIC_NAV_PROVIDER=copilot`.
- **Microlise** — `StubMicroliseAdapter` (`getTodaysJourney`,
  `submitProofOfDelivery`). When Waitrose grant Journey/ePOD API keys, implement
  the real adapter and set `MICROLISE_ENABLED=true`; the "today's round" UI then
  lights up and each stop links to its shared pin data.

**The pitch to Waitrose:** prove the shared-pin value on Google Maps first, then
feed that institutional door/parking knowledge into the CoPilot + Microlise stack
they already run.
