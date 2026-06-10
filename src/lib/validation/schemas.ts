import { z } from "zod";

/** A what3words address: exactly three dot-separated word groups. */
export const wordsSchema = z
  .string()
  .trim()
  .regex(
    /^\/{0,3}[\p{L}]+\.[\p{L}]+\.[\p{L}]+$/u,
    "Must be a three-word address like filled.count.soap",
  )
  .transform((s) => s.replace(/^\/+/, ""));

export const latSchema = z.coerce.number().min(-90).max(90);
export const lngSchema = z.coerce.number().min(-180).max(180);

export const coordsSchema = z.object({
  lat: latSchema,
  lng: lngSchema,
});

export const autosuggestSchema = z.object({
  input: z.string().trim().min(3).max(64),
  focusLat: latSchema.optional(),
  focusLng: lngSchema.optional(),
});

export const pinTypeSchema = z.enum(["door", "parking"]);

export const createPinSchema = z.object({
  addressId: z.string().uuid(),
  pinType: pinTypeSchema,
  lat: latSchema,
  lng: lngSchema,
  what3words: wordsSchema.optional(),
});

export const createAddressSchema = z.object({
  postcode: z.string().trim().min(3).max(12),
  addressLine: z.string().trim().min(1).max(200),
  lat: latSchema.optional(),
  lng: lngSchema.optional(),
});

export const createNoteSchema = z.object({
  addressId: z.string().uuid(),
  body: z.string().trim().min(1).max(1000),
});

export const integrationProviderSchema = z.enum(["trutac", "microlise"]);

/** Save form for bring-your-own-key integration credentials. */
export const saveIntegrationSchema = z.object({
  provider: integrationProviderSchema,
  // Optional so an operator can update baseUrl/clientId without re-entering the
  // secret; the action only overwrites the stored secret when this is present.
  apiKey: z.string().trim().min(8).max(512).optional(),
  baseUrl: z.string().trim().url().max(200).optional(),
  clientId: z.string().trim().min(1).max(200).optional(),
});

export type CreatePinInput = z.infer<typeof createPinSchema>;
export type CreateAddressInput = z.infer<typeof createAddressSchema>;
export type SaveIntegrationInput = z.infer<typeof saveIntegrationSchema>;
