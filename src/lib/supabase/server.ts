import "server-only";

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

type CookieToSet = { name: string; value: string; options: CookieOptions };
import { publicEnv } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Server-side Supabase client bound to the request cookies. Use inside Server
 * Components and Route Handlers. Still uses the anon key — all access control
 * is enforced by Row Level Security, never the service-role key.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // setAll called from a Server Component — safe to ignore because
            // the middleware refreshes the session cookie on every request.
          }
        },
      },
    },
  );
}
