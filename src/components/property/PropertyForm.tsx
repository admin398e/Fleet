"use client";

import { useActionState } from "react";
import { createAddress, type ActionState } from "@/app/properties/actions";

export function PropertyForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    createAddress,
    {},
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <label className="text-sm font-medium">
        Address
        <input
          name="addressLine"
          required
          placeholder="12 High Street, Anytown"
          className="input mt-1"
        />
      </label>
      <label className="text-sm font-medium">
        Postcode
        <input
          name="postcode"
          required
          autoCapitalize="characters"
          placeholder="AB12 3CD"
          className="input mt-1"
        />
      </label>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Saving…" : "Create property"}
      </button>
    </form>
  );
}
