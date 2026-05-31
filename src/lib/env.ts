/**
 * Centralised, validated environment access.
 *
 * `publicEnv` holds only values that are safe to ship to the browser
 * (NEXT_PUBLIC_*). `serverEnv` holds secrets and is guarded so it can never be
 * imported into client code.
 */
import { z } from "zod";

// Supabase is OPTIONAL: when its env vars are absent the app runs in "demo
// mode" — the no-login /try page that needs only the what3words key. When the
// vars are present, full auth + the shared address book are enabled.
const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_NAV_PROVIDER: z.enum(["google", "copilot"]).default("google"),
});

const serverSchema = z.object({
  W3W_API_KEY: z.string().min(1),
  MICROLISE_ENABLED: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
});

// NEXT_PUBLIC_* vars are statically inlined by Next, so reference them directly.
export const publicEnv = publicSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_NAV_PROVIDER: process.env.NEXT_PUBLIC_NAV_PROVIDER,
});

/** True when Supabase auth + database are configured (full app, not demo). */
export function isSupabaseConfigured(): boolean {
  return (
    !!publicEnv.NEXT_PUBLIC_SUPABASE_URL &&
    !!publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/**
 * Parse and return server-only env. Call this lazily inside server code
 * (route handlers, server components) — never at module top-level in code that
 * might be reachable from the client bundle.
 */
let cachedServerEnv: z.infer<typeof serverSchema> | null = null;
export function getServerEnv() {
  if (cachedServerEnv) return cachedServerEnv;
  cachedServerEnv = serverSchema.parse({
    W3W_API_KEY: process.env.W3W_API_KEY,
    MICROLISE_ENABLED: process.env.MICROLISE_ENABLED,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
  return cachedServerEnv;
}
