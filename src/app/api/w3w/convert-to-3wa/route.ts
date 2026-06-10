import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { guardW3WRequest } from "../_guard";
import { convertTo3wa, W3WError } from "@/lib/w3w/client";
import { coordsSchema } from "@/lib/validation/schemas";

const bodySchema = coordsSchema.extend({ language: z.string().length(2).optional() });

/** POST { lat, lng } → { words, coordinates, nearestPlace }. Powers GPS auto-fill. */
export async function POST(req: NextRequest) {
  const guard = await guardW3WRequest({ bucket: "convert", capacity: 30, refillPerSec: 2 });
  if (!guard.ok) return guard.response;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  try {
    const result = await convertTo3wa(
      { lat: parsed.data.lat, lng: parsed.data.lng },
      parsed.data.language,
    );
    return NextResponse.json(result);
  } catch (err) {
    const status = err instanceof W3WError ? err.status : 502;
    return NextResponse.json({ error: "what3words lookup failed" }, { status });
  }
}
