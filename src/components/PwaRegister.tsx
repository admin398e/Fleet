"use client";

import { useEffect } from "react";

/**
 * Registers the Serwist-generated service worker. Serwist can auto-register,
 * but doing it explicitly keeps behaviour predictable and lets us scope it.
 */
export function PwaRegister() {
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      process.env.NODE_ENV !== "production"
    ) {
      return;
    }
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Registration failures are non-fatal; the app works without offline cache.
    });
  }, []);

  return null;
}
