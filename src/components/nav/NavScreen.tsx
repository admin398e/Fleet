"use client";

import dynamic from "next/dynamic";

// Leaflet touches `window`, so the map screen is loaded client-side only.
const CoPilotNav = dynamic(
  () => import("./CoPilotNav").then((m) => m.CoPilotNav),
  {
    ssr: false,
    loading: () => (
      <div className="fixed inset-0 flex items-center justify-center bg-[#0e1116] text-gray-400">
        Loading map…
      </div>
    ),
  },
);

export function NavScreen() {
  return <CoPilotNav />;
}
