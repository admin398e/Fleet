"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  createAddressSchema,
  createPinSchema,
  createNoteSchema,
} from "@/lib/validation/schemas";

export interface ActionState {
  error?: string;
}

/** Create a shared address record and go to its detail page. */
export async function createAddress(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = createAddressSchema.safeParse({
    postcode: formData.get("postcode"),
    addressLine: formData.get("addressLine"),
    lat: formData.get("lat") || undefined,
    lng: formData.get("lng") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid address" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("addresses")
    .insert({
      postcode: parsed.data.postcode,
      address_line: parsed.data.addressLine,
      lat: parsed.data.lat ?? null,
      lng: parsed.data.lng ?? null,
    })
    .select("id")
    .single();

  if (error || !data) return { error: error?.message ?? "Could not save address" };
  redirect(`/properties/${data.id}`);
}

/** Add or replace this driver's pin of a given type for an address. */
export async function savePin(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = createPinSchema.safeParse({
    addressId: formData.get("addressId"),
    pinType: formData.get("pinType"),
    lat: formData.get("lat"),
    lng: formData.get("lng"),
    what3words: formData.get("what3words") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid pin" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("pins").insert({
    address_id: parsed.data.addressId,
    pin_type: parsed.data.pinType,
    lat: parsed.data.lat,
    lng: parsed.data.lng,
    what3words: parsed.data.what3words ?? null,
  });
  if (error) return { error: error.message };

  revalidatePath(`/properties/${parsed.data.addressId}`);
  return {};
}

/** Toggle this driver's confirmation of a pin. */
export async function toggleConfirmation(pinId: string, addressId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: existing } = await supabase
    .from("pin_confirmations")
    .select("pin_id")
    .eq("pin_id", pinId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("pin_confirmations")
      .delete()
      .eq("pin_id", pinId)
      .eq("user_id", user.id);
  } else {
    await supabase.from("pin_confirmations").insert({ pin_id: pinId });
  }
  revalidatePath(`/properties/${addressId}`);
}

export async function addNote(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = createNoteSchema.safeParse({
    addressId: formData.get("addressId"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid note" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("notes").insert({
    address_id: parsed.data.addressId,
    body: parsed.data.body,
  });
  if (error) return { error: error.message };

  revalidatePath(`/properties/${parsed.data.addressId}`);
  return {};
}
