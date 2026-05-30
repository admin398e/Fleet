import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/AppHeader";
import { PinSection } from "@/components/pins/PinSection";
import { NotesSection } from "@/components/property/NotesSection";

export default async function PropertyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: address } = await supabase
    .from("addresses")
    .select("id, postcode, address_line")
    .eq("id", id)
    .maybeSingle();

  if (!address) notFound();

  const [{ data: pins }, { data: notes }, { data: userRes }] = await Promise.all([
    supabase
      .from("pins_with_confirmations")
      .select("*")
      .eq("address_id", id)
      .order("confirmation_count", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("notes")
      .select("id, body, created_at")
      .eq("address_id", id)
      .order("created_at", { ascending: false }),
    supabase.auth.getUser(),
  ]);

  // Which pins has the current user confirmed?
  const userId = userRes.user?.id;
  let confirmedPinIds: string[] = [];
  if (userId && pins && pins.length > 0) {
    const { data: confs } = await supabase
      .from("pin_confirmations")
      .select("pin_id")
      .eq("user_id", userId)
      .in(
        "pin_id",
        pins.map((p) => p.id),
      );
    confirmedPinIds = (confs ?? []).map((c) => c.pin_id);
  }

  const doorPins = (pins ?? []).filter((p) => p.pin_type === "door");
  const parkingPins = (pins ?? []).filter((p) => p.pin_type === "parking");

  return (
    <>
      <AppHeader />
      <main className="flex flex-1 flex-col gap-5 p-4">
        <div>
          <h1 className="text-xl font-bold">{address.address_line}</h1>
          <p className="text-gray-500">{address.postcode}</p>
        </div>

        <PinSection
          title="Front door"
          pinType="door"
          addressId={address.id}
          pins={doorPins}
          confirmedPinIds={confirmedPinIds}
        />
        <PinSection
          title="Best parking"
          pinType="parking"
          addressId={address.id}
          pins={parkingPins}
          confirmedPinIds={confirmedPinIds}
        />

        <NotesSection addressId={address.id} notes={notes ?? []} />
      </main>
    </>
  );
}
