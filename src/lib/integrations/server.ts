import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getServerEnv } from "@/lib/env";
import { decryptSecret } from "@/lib/crypto/secretBox";
import type {
  CredentialStore,
  IntegrationProvider,
  ProviderCredentials,
} from "./credentials";

/**
 * Supabase-backed credential store. Reads the signed-in operator's own
 * integration_credentials row (RLS scopes it to them), decrypting the secret
 * with the server-held key. Never exposes plaintext to the client.
 */
class SupabaseCredentialStore implements CredentialStore {
  async get(
    provider: IntegrationProvider,
  ): Promise<ProviderCredentials | null> {
    const supabase = await createClient();
    const { data } = await supabase
      .from("integration_credentials")
      .select("config, secret_cipher")
      .eq("provider", provider)
      .maybeSingle();
    if (!data) return null;

    const config = (data.config ?? {}) as Record<string, string>;
    const creds: ProviderCredentials = { baseUrl: config.baseUrl };

    if (data.secret_cipher) {
      const key = getEncryptionKey();
      const secret = decryptSecret(data.secret_cipher, key);
      // For TruTac the secret is the API key; for Microlise it's the client
      // secret (clientId travels in non-secret config).
      if (provider === "microlise") {
        creds.clientId = config.clientId;
        creds.clientSecret = secret;
      } else {
        creds.apiKey = secret;
      }
    }
    return creds;
  }
}

/** Singleton store used by route handlers / server components. */
export const credentialStore: CredentialStore = new SupabaseCredentialStore();

/** Throws a clear error if the at-rest encryption key is not configured. */
export function getEncryptionKey(): string {
  const key = getServerEnv().INTEGRATION_ENCRYPTION_KEY;
  if (!key) {
    throw new Error(
      "INTEGRATION_ENCRYPTION_KEY is not set — required to store/read integration secrets.",
    );
  }
  return key;
}
