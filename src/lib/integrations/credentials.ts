/**
 * Per-tenant integration credentials ("bring your own API key").
 *
 * Operators supply their own keys (e.g. a TruTac/TruLinks key generated in the
 * TruLinks developer portal, or Microlise client credentials). We resolve them
 * here so call sites depend on a small interface, never on where the secret
 * came from. Two sources are supported: a per-user store backed by Supabase
 * (see integrations/server.ts) and process env for single-tenant/dev setups.
 */

/** Providers we can hold credentials for. Keep in sync with the SQL enum. */
export type IntegrationProvider = "trutac" | "microlise";

/** Resolved credentials for one provider. Only the fields it needs are set. */
export interface ProviderCredentials {
  /** API key for key-auth providers (TruTac/TruLinks). */
  apiKey?: string;
  /** Optional base URL override (defaults live in each adapter). */
  baseUrl?: string;
  /** OAuth client credentials for Microlise. */
  clientId?: string;
  clientSecret?: string;
}

/** A source of provider credentials (Supabase-backed or env-backed). */
export interface CredentialStore {
  get(provider: IntegrationProvider): Promise<ProviderCredentials | null>;
}
