"use client";

import { useActionState, useEffect, useRef } from "react";
import { addNote, type ActionState } from "@/app/properties/actions";

interface Note {
  id: string;
  body: string;
  created_at: string;
}

export function NotesSection({
  addressId,
  notes,
}: {
  addressId: string;
  notes: Note[];
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    addNote,
    {},
  );
  const formRef = useRef<HTMLFormElement>(null);

  // Clear the textarea after a successful submit.
  useEffect(() => {
    if (!pending && !state.error) formRef.current?.reset();
  }, [pending, state.error]);

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
        Notes
      </h2>

      <ul className="flex flex-col gap-2">
        {notes.map((n) => (
          <li key={n.id} className="card text-sm">
            {n.body}
          </li>
        ))}
        {notes.length === 0 && (
          <li className="text-sm text-gray-500">
            No notes yet — add gate codes, access tips, hazards.
          </li>
        )}
      </ul>

      <form ref={formRef} action={formAction} className="flex flex-col gap-2">
        <input type="hidden" name="addressId" value={addressId} />
        <textarea
          name="body"
          required
          maxLength={1000}
          rows={2}
          placeholder="e.g. Use side gate, code 1066. Park on the verge opposite."
          className="input py-2"
        />
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        <button type="submit" disabled={pending} className="btn-secondary self-start text-sm">
          {pending ? "Saving…" : "Add note"}
        </button>
      </form>
    </section>
  );
}
