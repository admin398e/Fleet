import Link from "next/link";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/AppHeader";
import { PropertySearch } from "@/components/property/PropertySearch";
import { InstallPrompt } from "@/components/InstallPrompt";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  // Demo mode (no Supabase): the only usable surface is the standalone test.
  if (!isSupabaseConfigured()) redirect("/try");

  const { q } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("addresses")
    .select("id, postcode, address_line")
    .order("created_at", { ascending: false })
    .limit(25);

  if (q && q.trim()) {
    const term = q.trim();
    const norm = term.toUpperCase().replace(/\s/g, "");
    query = query.or(`address_line.ilike.%${term}%,postcode_norm.ilike.%${norm}%`);
  }

  const { data: addresses } = await query;

  return (
    <>
      <AppHeader />
      <main className="flex flex-1 flex-col gap-4 p-4">
        <InstallPrompt />
        <PropertySearch defaultValue={q ?? ""} />

        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            {q ? "Results" : "Recent properties"}
          </h2>
          <Link href="/properties/new" className="text-sm font-semibold text-brand">
            + Add property
          </Link>
        </div>

        <ul className="flex flex-col gap-2">
          {(addresses ?? []).map((a) => (
            <li key={a.id}>
              <Link href={`/properties/${a.id}`} className="card block hover:bg-gray-50 dark:hover:bg-gray-800">
                <p className="font-semibold">{a.address_line}</p>
                <p className="text-sm text-gray-500">{a.postcode}</p>
              </Link>
            </li>
          ))}
          {addresses && addresses.length === 0 && (
            <li className="card text-center text-gray-500">
              {q ? "No matches." : "No properties yet."}{" "}
              <Link href="/properties/new" className="font-semibold text-brand">
                Add the first one
              </Link>
              .
            </li>
          )}
        </ul>
      </main>
    </>
  );
}
