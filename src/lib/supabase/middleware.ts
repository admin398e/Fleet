import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { publicEnv, isSupabaseConfigured } from "@/lib/env";
import type { Database } from "@/types/database";

type CookieToSet = { name: string; value: string; options: CookieOptions };

/** Routes that don't require an authenticated session. */
const PUBLIC_PATHS = ["/login", "/auth"];
/** Routes reachable in demo mode (no Supabase): the standalone w3w+maps test. */
const DEMO_PATHS = ["/try", "/api/w3w"];

/**
 * Refreshes the Supabase auth session on every request and redirects
 * unauthenticated users to /login (except for public paths and assets).
 *
 * In demo mode (Supabase not configured) auth is skipped entirely: only the
 * /try page and the what3words proxy are reachable; everything else redirects
 * to /try.
 */
export async function updateSession(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    const { pathname } = request.nextUrl;
    if (DEMO_PATHS.some((p) => pathname.startsWith(p))) {
      return NextResponse.next({ request });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/try";
    url.search = "";
    return NextResponse.redirect(url);
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL!,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: do not run any code between createServerClient and getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
