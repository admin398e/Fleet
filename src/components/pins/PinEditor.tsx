"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { PinType } from "@/types/database";
import { getCurrentPosition } from "@/lib/geo/geolocation";
import {
  fetchWordsForCoords,
  fetchCoordsForWords,
  fetchSuggestions,
} from "@/lib/w3w/api";
import { savePin } from "@/app/properties/actions";
import type { W3WSuggestion } from "@/lib/w3w/types";

interface Draft {
  lat: number;
  lng: number;
  words?: string;
  accuracy?: number;
  nearestPlace?: string;
}

export function PinEditor({
  addressId,
  pinType,
  label,
}: {
  addressId: string;
  pinType: PinType;
  label: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [wordsInput, setWordsInput] = useState("");
  const [suggestions, setSuggestions] = useState<W3WSuggestion[]>([]);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function captureGps() {
    setBusy(true);
    setError(null);
    try {
      const fix = await getCurrentPosition();
      const result = await fetchWordsForCoords({ lat: fix.lat, lng: fix.lng });
      setDraft({
        lat: result.coordinates.lat,
        lng: result.coordinates.lng,
        words: result.words,
        accuracy: fix.accuracy,
        nearestPlace: result.nearestPlace,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not get your location.");
    } finally {
      setBusy(false);
    }
  }

  function onWordsChange(value: string) {
    setWordsInput(value);
    if (debounce.current) clearTimeout(debounce.current);
    if (value.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    debounce.current = setTimeout(async () => {
      const focus = draft ? { lat: draft.lat, lng: draft.lng } : undefined;
      setSuggestions(await fetchSuggestions(value.trim(), focus));
    }, 300);
  }

  async function applyWords(words: string) {
    setBusy(true);
    setError(null);
    setSuggestions([]);
    try {
      const result = await fetchCoordsForWords(words);
      setDraft({
        lat: result.coordinates.lat,
        lng: result.coordinates.lng,
        words: result.words,
        nearestPlace: result.nearestPlace,
      });
      setWordsInput(result.words);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't find that address.");
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!draft) return;
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.set("addressId", addressId);
    fd.set("pinType", pinType);
    fd.set("lat", String(draft.lat));
    fd.set("lng", String(draft.lng));
    if (draft.words) fd.set("what3words", draft.words);

    const result = await savePin({}, fd);
    setBusy(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    // Reset and refresh the server component data.
    setDraft(null);
    setWordsInput("");
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-secondary self-start text-sm">
        + Drop {label.toLowerCase()} pin
      </button>
    );
  }

  return (
    <div className="card flex flex-col gap-3">
      <p className="text-sm font-semibold">Set the {label.toLowerCase()} location</p>

      <button onClick={captureGps} disabled={busy} className="btn-primary">
        {busy ? "Locating…" : "📍 Use my current location"}
      </button>

      <div className="flex items-center gap-3 text-xs text-gray-400">
        <span className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
        or enter a what3words address
        <span className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
      </div>

      <div className="relative">
        <input
          value={wordsInput}
          onChange={(e) => onWordsChange(e.target.value)}
          placeholder="filled.count.soap"
          className="input font-mono"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
        />
        {suggestions.length > 0 && (
          <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
            {suggestions.map((s) => (
              <li key={s.words}>
                <button
                  type="button"
                  onClick={() => applyWords(s.words)}
                  className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <span className="font-mono text-brand">{"///"}{s.words}</span>
                  {s.nearestPlace && (
                    <span className="ml-2 text-gray-500">{s.nearestPlace}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {draft && (
        <div className="rounded-xl bg-gray-50 p-3 text-sm dark:bg-gray-800">
          {draft.words && (
            <p className="font-mono font-semibold text-brand">{"///"}{draft.words}</p>
          )}
          <p className="text-gray-500">
            {draft.lat.toFixed(5)}, {draft.lng.toFixed(5)}
            {draft.accuracy != null && ` · ±${Math.round(draft.accuracy)}m`}
          </p>
          {draft.nearestPlace && (
            <p className="text-gray-500">Near {draft.nearestPlace}</p>
          )}
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button onClick={save} disabled={!draft || busy} className="btn-primary flex-1">
          Save pin
        </button>
        <button
          onClick={() => {
            setOpen(false);
            setDraft(null);
            setError(null);
          }}
          className="btn-secondary px-4"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
