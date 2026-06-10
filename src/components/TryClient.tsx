"use client";

import { useRef, useState } from "react";
import { getCurrentPosition } from "@/lib/geo/geolocation";
import {
  fetchWordsForCoords,
  fetchCoordsForWords,
  fetchSuggestions,
} from "@/lib/w3w/api";
import type { W3WSuggestion } from "@/lib/w3w/types";
import { NavigateButton } from "@/components/pins/NavigateButton";

interface Result {
  words?: string;
  lat: number;
  lng: number;
  accuracy?: number;
  nearestPlace?: string;
}

export function TryClient() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [wordsInput, setWordsInput] = useState("");
  const [suggestions, setSuggestions] = useState<W3WSuggestion[]>([]);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function captureGps() {
    setBusy(true);
    setError(null);
    try {
      const fix = await getCurrentPosition();
      const w = await fetchWordsForCoords({ lat: fix.lat, lng: fix.lng });
      setResult({
        words: w.words,
        lat: w.coordinates.lat,
        lng: w.coordinates.lng,
        accuracy: fix.accuracy,
        nearestPlace: w.nearestPlace,
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
      setSuggestions(await fetchSuggestions(value.trim()));
    }, 300);
  }

  async function lookupWords(words: string) {
    setBusy(true);
    setError(null);
    setSuggestions([]);
    try {
      const w = await fetchCoordsForWords(words);
      setResult({
        words: w.words,
        lat: w.coordinates.lat,
        lng: w.coordinates.lng,
        nearestPlace: w.nearestPlace,
      });
      setWordsInput(w.words);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't find that address.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="card flex flex-col gap-3">
        <h2 className="font-semibold">1 · Where am I?</h2>
        <p className="text-sm text-gray-500">
          Stand at the front door (or parking spot) and tap below.
        </p>
        <button onClick={captureGps} disabled={busy} className="btn-primary">
          {busy ? "Locating…" : "📍 Use my current location"}
        </button>
      </section>

      <section className="card flex flex-col gap-3">
        <h2 className="font-semibold">2 · Or look up a what3words address</h2>
        <div className="relative">
          <input
            value={wordsInput}
            onChange={(e) => onWordsChange(e.target.value)}
            placeholder="filled.count.soap"
            className="input font-mono"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            onKeyDown={(e) => {
              if (e.key === "Enter" && wordsInput.trim()) lookupWords(wordsInput.trim());
            }}
          />
          {suggestions.length > 0 && (
            <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
              {suggestions.map((s) => (
                <li key={s.words}>
                  <button
                    type="button"
                    onClick={() => lookupWords(s.words)}
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
        <button
          onClick={() => wordsInput.trim() && lookupWords(wordsInput.trim())}
          disabled={busy || !wordsInput.trim()}
          className="btn-secondary self-start"
        >
          Find
        </button>
      </section>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {result && (
        <section className="card flex flex-col gap-3">
          <h2 className="font-semibold">3 · Navigate</h2>
          {result.words && (
            <p className="font-mono text-lg font-semibold text-brand">
              {"///"}
              {result.words}
            </p>
          )}
          <p className="text-sm text-gray-500">
            {result.lat.toFixed(5)}, {result.lng.toFixed(5)}
            {result.accuracy != null && ` · ±${Math.round(result.accuracy)}m`}
            {result.nearestPlace && ` · near ${result.nearestPlace}`}
          </p>
          <NavigateButton lat={result.lat} lng={result.lng} label="Destination" />
        </section>
      )}
    </div>
  );
}
