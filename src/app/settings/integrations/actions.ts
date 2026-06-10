"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { encryptSecret } from "@/lib/crypto/secretBox";
import { getEncryptionKey } from "@/lib/integrations/server";
import { saveIntegrationSchema } from "@/lib/validation/schemas";
import type { Database, IntegrationProvider } from "@/types/database";

type IntegrationCredentialInsert =
  Database["public"]["Tables"]["integration_credentials"]["Insert"];

export interface ActionState {
  error?: string;
  ok?: boolean;
}

/**
 * Save an operator's own API key for a provider. The secret is encrypted
 * server-side before it touches the database; only non-secret config (baseUrl,
 * Microlise clientId) is stored in clear.
 */
export async function saveIntegrationCredential(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = saveIntegrationSchema.safeParse({
    provider: formData.get("provider"),
    apiKey: formData.get("apiKey") || undefined,
    baseUrl: formData.get("baseUrl") || undefined,
    clientId: formData.get("clientId") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid details" };
  }
  const { provider, apiKey, baseUrl, clientId } = parsed.data;

  let key: string;
  try {
    key = getEncryptionKey();
  } catch {
    return {
      error:
        "Server is missing INTEGRATION_ENCRYPTION_KEY — set it before saving credentials.",
    };
  }

  const config: Record<string, string> = {};
  if (baseUrl) config.baseUrl = baseUrl;
  if (clientId) config.clientId = clientId;

  const row: IntegrationCredentialInsert = { provider, config };
  // Only overwrite the secret when a new one was entered, so re-saving baseUrl
  // alone doesn't wipe an existing key.
  if (apiKey) row.secret_cipher = encryptSecret(apiKey, key);

  const supabase = await createClient();
  const { error } = await supabase
    .from("integration_credentials")
    .upsert(row, { onConflict: "user_id,provider" });
  if (error) return { error: error.message };

  revalidatePath("/settings/integrations");
  return { ok: true };
}

/** Remove an operator's stored credentials for a provider. */
export async function removeIntegrationCredential(
  provider: IntegrationProvider,
): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from("integration_credentials")
    .delete()
    .eq("provider", provider);
  revalidatePath("/settings/integrations");
}
