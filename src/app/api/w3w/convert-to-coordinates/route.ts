import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { guardW3WRequest } from "../_guard";
import { convertToCoordinates, W3WError } from "@/lib/w3w/client";
import { wordsSchema } from "@/lib/validation/schemas";

const bodySchema = z.object({ words: wordsSchema });

/** POST { words } → { coordinates, words, nearestPlace }. */
export async function POST(req: NextRequest) {
  const guard = await guardW3WRequest({ bucket: "convert", capacity: 30, refillPerSec: 2 });
  if (!guard.ok) return guard.response;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid three-word address" },
      { status: 400 },
    );
  }

  try {
    const result = await convertToCoordinates(parsed.data.words);
    return NextResponse.json(result);
  } catch (err) {
    const status = err instanceof W3WError ? err.status : 502;
    return NextResponse.json({ error: "what3words lookup failed" }, { status });
  }
}
