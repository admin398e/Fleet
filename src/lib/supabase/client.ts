"use client";

import { createBrowserClient } from "@supabase/ssr";
import { publicEnv, isSupabaseConfigured } from "@/lib/env";
import type { Database } from "@/types/database";

/** Browser-side Supabase client (uses the public anon key + cookie session). */
export function createClient() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured (running in demo mode).");
  }
  return createBrowserClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL!,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
