"use client";

import { useActionState } from "react";
import {
  saveIntegrationCredential,
  type ActionState,
} from "@/app/settings/integrations/actions";

export interface IntegrationFormProps {
  provider: "trutac" | "microlise";
  title: string;
  description: string;
  /** Whether a secret is already stored (so we can show "configured"). */
  configured: boolean;
  baseUrl?: string;
  clientId?: string;
  /** Microlise also needs a client id alongside the secret. */
  showClientId?: boolean;
}

export function IntegrationForm({
  provider,
  title,
  description,
  configured,
  baseUrl,
  clientId,
  showClientId = false,
}: IntegrationFormProps) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    saveIntegrationCredential,
    {},
  );

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-lg border border-gray-200 p-4 dark:border-gray-800"
    >
      <input type="hidden" name="provider" value={provider} />
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">{title}</h2>
        <span
          className={
            configured
              ? "text-xs font-medium text-green-600"
              : "text-xs text-gray-500"
          }
        >
          {configured ? "Connected" : "Not connected"}
        </span>
      </div>
      <p className="text-sm text-gray-500">{description}</p>

      {showClientId && (
        <label className="text-sm font-medium">
          Client ID
          <input
            name="clientId"
            defaultValue={clientId}
            placeholder="microlise-client-id"
            className="input mt-1"
          />
        </label>
      )}

      <label className="text-sm font-medium">
        {showClientId ? "Client secret" : "API key"}
        <input
          name="apiKey"
          type="password"
          autoComplete="off"
          placeholder={configured ? "•••••••• (leave blank to keep)" : "Paste your key"}
          className="input mt-1"
        />
      </label>

      <label className="text-sm font-medium">
        Base URL <span className="font-normal text-gray-400">(optional)</span>
        <input
          name="baseUrl"
          defaultValue={baseUrl}
          placeholder="https://api.trulinks.co.uk"
          className="input mt-1"
        />
      </label>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.ok && <p className="text-sm text-green-600">Saved.</p>}
      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
