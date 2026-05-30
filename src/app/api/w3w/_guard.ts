import "server-only";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

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

  const limit = rateLimit(
    `w3w:${opts.bucket}:${user.id}`,
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

  return { ok: true, userId: user.id };
}
