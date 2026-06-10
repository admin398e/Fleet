/**
 * Supabase database types.
 *
 * Hand-written to match supabase/migrations. Once a Supabase project is linked,
 * regenerate with `npm run db:types` to keep this in sync automatically.
 */

export type PinType = "door" | "parking";
export type IntegrationProvider = "trutac" | "microlise";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; display_name: string | null; created_at: string };
        Insert: { id: string; display_name?: string | null; created_at?: string };
        Update: { display_name?: string | null };
        Relationships: [];
      };
      addresses: {
        Row: {
          id: string;
          postcode: string;
          postcode_norm: string;
          address_line: string;
          lat: number | null;
          lng: number | null;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          postcode: string;
          address_line: string;
          lat?: number | null;
          lng?: number | null;
          created_by?: string;
          created_at?: string;
        };
        Update: {
          postcode?: string;
          address_line?: string;
          lat?: number | null;
          lng?: number | null;
        };
        Relationships: [];
      };
      pins: {
        Row: {
          id: string;
          address_id: string;
          pin_type: PinType;
          lat: number;
          lng: number;
          what3words: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          address_id: string;
          pin_type: PinType;
          lat: number;
          lng: number;
          what3words?: string | null;
          created_by?: string;
        };
        Update: {
          lat?: number;
          lng?: number;
          what3words?: string | null;
          pin_type?: PinType;
        };
        Relationships: [];
      };
      pin_confirmations: {
        Row: { pin_id: string; user_id: string; created_at: string };
        Insert: { pin_id: string; user_id?: string; created_at?: string };
        Update: { created_at?: string };
        Relationships: [];
      };
      notes: {
        Row: {
          id: string;
          address_id: string;
          body: string;
          created_by: string;
          created_at: string;
        };
        Insert: { id?: string; address_id: string; body: string; created_by?: string };
        Update: { body?: string };
        Relationships: [];
      };
      photos: {
        Row: {
          id: string;
          address_id: string;
          storage_path: string;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          address_id: string;
          storage_path: string;
          created_by?: string;
        };
        Update: { storage_path?: string };
        Relationships: [];
      };
      integration_credentials: {
        Row: {
          user_id: string;
          provider: IntegrationProvider;
          config: Record<string, string> | null;
          secret_cipher: string | null;
          updated_at: string;
        };
        Insert: {
          user_id?: string;
          provider: IntegrationProvider;
          config?: Record<string, string> | null;
          secret_cipher?: string | null;
          updated_at?: string;
        };
        Update: {
          config?: Record<string, string> | null;
          secret_cipher?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      pins_with_confirmations: {
        Row: {
          id: string;
          address_id: string;
          pin_type: PinType;
          lat: number;
          lng: number;
          what3words: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
          confirmation_count: number;
        };
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
    Enums: { pin_type: PinType; integration_provider: IntegrationProvider };
    CompositeTypes: Record<string, never>;
  };
}
