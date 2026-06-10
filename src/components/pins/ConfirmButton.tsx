"use client";

import { useTransition } from "react";
import { toggleConfirmation } from "@/app/properties/actions";

export function ConfirmButton({
  pinId,
  addressId,
  confirmed,
  count,
}: {
  pinId: string;
  addressId: string;
  confirmed: boolean;
  count: number;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(() => toggleConfirmation(pinId, addressId))
      }
      className={
        "inline-flex items-center gap-1 self-start rounded-full border px-3 py-1 text-sm font-medium transition " +
        (confirmed
          ? "border-brand bg-brand/10 text-brand"
          : "border-gray-300 text-gray-600 dark:border-gray-700 dark:text-gray-300")
      }
      aria-pressed={confirmed}
    >
      {confirmed ? "✓ Confirmed" : "Confirm this spot"}
      {count > 0 && <span className="opacity-70">· {count}</span>}
    </button>
  );
}
