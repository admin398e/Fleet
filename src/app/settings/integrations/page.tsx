import { redirect } from "next/navigation";
import { isSupabaseConfigured, getServerEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/AppHeader";
import { IntegrationForm } from "@/components/settings/IntegrationForm";

export const metadata = { title: "Integrations" };

interface StoredCredential {
  provider: string;
  config: Record<string, string> | null;
  secret_cipher: string | null;
}

export default async function IntegrationsPage() {
  if (!isSupabaseConfigured()) redirect("/try");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("integration_credentials")
    .select("provider, config, secret_cipher");
  const rows = (data ?? []) as StoredCredential[];
  const byProvider = (p: string) => rows.find((r) => r.provider === p);
  const trutac = byProvider("trutac");
  const microlise = byProvider("microlise");

  const encryptionReady = !!getServerEnv().INTEGRATION_ENCRYPTION_KEY;

  return (
    <>
      <AppHeader />
      <main className="flex flex-1 flex-col gap-4 p-4">
        <div>
          <h1 className="text-xl font-bold">Integrations</h1>
          <p className="text-sm text-gray-500">
            Connect your own fleet systems by pasting the API keys you generate
            in each provider&apos;s portal. Keys are encrypted and only used
            server-side — never shared with other operators.
          </p>
        </div>

        {!encryptionReady && (
          <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">
            Saving is disabled until the server&apos;s
            <code className="mx-1">INTEGRATION_ENCRYPTION_KEY</code>
            is configured.
          </p>
        )}

        <IntegrationForm
          provider="trutac"
          title="TruTac · TruLinks (compliance)"
          description="Driver hours, walkaround checks and defects. Generate a key in the TruLinks developer portal (trulinks.co.uk)."
          configured={!!trutac?.secret_cipher}
          baseUrl={trutac?.config?.baseUrl}
        />

        <IntegrationForm
          provider="microlise"
          title="Microlise (journeys & ePOD)"
          description="Today's journey and proof-of-delivery. Uses your Microlise API client credentials."
          configured={!!microlise?.secret_cipher}
          baseUrl={microlise?.config?.baseUrl}
          clientId={microlise?.config?.clientId}
          showClientId
        />
      </main>
    </>
  );
}
