import "server-only";

import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { isSupabaseConfigured } from "@/lib/env";

interface GuardOptions {
  /** Logical bucket name, e.g. "convert" or "autosuggest". */
  bucket: string;
  capacity: number;
  refillPerSec: number;
}

type GuardSuccess = { ok: true; userId: string };
type GuardFailure = { ok: false; response: NextResponse };

/**
 * Shared gate for w3w proxy routes: requires an authenticated Supabase session
 * and applies a per-user token-bucket rate limit. Returns either the user id or
 * a ready-to-send error response.
 */
export async function guardW3WRequest(
  opts: GuardOptions,
): Promise<GuardSuccess | GuardFailure> {
  // Identity for auth + rate limiting. With Supabase configured we require a
  // signed-in user; in demo mode (no Supabase) we allow the request and rate
  // limit by client IP so the proxy still can't be hammered.
  let identity: string;

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return {
        ok: false,
        response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      };
    }
    identity = user.id;
  } else {
    const hdrs = await headers();
    const ip =
      hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      hdrs.get("x-real-ip") ||
      "demo";
    identity = `ip:${ip}`;
  }

  const limit = rateLimit(
    `w3w:${opts.bucket}:${identity}`,
    opts.capacity,
    opts.refillPerSec,
  );
  if (!limit.ok) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Too many requests" },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)),
          },
        },
      ),
    };
  }

  return { ok: true, userId: identity };
}
