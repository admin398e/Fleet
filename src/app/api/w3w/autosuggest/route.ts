import { NextResponse, type NextRequest } from "next/server";
import { guardW3WRequest } from "../_guard";
import { autosuggest, W3WError } from "@/lib/w3w/client";
import { autosuggestSchema } from "@/lib/validation/schemas";

/** GET ?input=fil.cou.soa&focusLat=..&focusLng=.. → suggestions (stricter limit). */
export async function GET(req: NextRequest) {
  // Autosuggest fires per keystroke, so it gets a tighter bucket.
  const guard = await guardW3WRequest({ bucket: "autosuggest", capacity: 20, refillPerSec: 5 });
  if (!guard.ok) return guard.response;

  const sp = req.nextUrl.searchParams;
  const parsed = autosuggestSchema.safeParse({
    input: sp.get("input"),
    focusLat: sp.get("focusLat") ?? undefined,
    focusLng: sp.get("focusLng") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const focus =
    parsed.data.focusLat !== undefined && parsed.data.focusLng !== undefined
      ? { lat: parsed.data.focusLat, lng: parsed.data.focusLng }
      : undefined;

  try {
    const suggestions = await autosuggest(parsed.data.input, focus);
    return NextResponse.json({ suggestions });
  } catch (err) {
    const status = err instanceof W3WError ? err.status : 502;
    return NextResponse.json({ error: "what3words lookup failed" }, { status });
  }
}
