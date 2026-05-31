import type { Metadata } from "next";
import { TryClient } from "@/components/TryClient";

export const metadata: Metadata = {
  title: "Quick test — what3words + Maps",
};

// Always render dynamically; this page must not be statically cached.
export const dynamic = "force-dynamic";

export default function TryPage() {
  return (
    <main className="flex flex-1 flex-col gap-5 p-5">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight">DoorPin · Quick test</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          No sign-in needed. Find a what3words address, then navigate to it in
          Google Maps. This is the core loop you&apos;ll use at the door.
        </p>
      </header>
      <TryClient />
    </main>
  );
}
