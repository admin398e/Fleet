"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function PropertySearch({ defaultValue }: { defaultValue: string }) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (value.trim()) params.set("q", value.trim());
    router.push(`/?${params.toString()}`);
  }

  return (
    <form onSubmit={submit} className="flex gap-2">
      <input
        type="search"
        inputMode="search"
        placeholder="Search postcode or address…"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="input"
        aria-label="Search properties"
      />
      <button type="submit" className="btn-primary px-4">
        Search
      </button>
    </form>
  );
}
