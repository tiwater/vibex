import { createClient, SupabaseClient } from "@supabase/supabase-js";

function getUrl(): string {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error(
      "Supabase URL not configured. Set SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL"
    );
  }
  return url;
}

export function createServiceRoleClient(): SupabaseClient {
  const url = getUrl();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for service access");
  }
  return createClient(url, key);
}

export function createAnonClient(accessToken?: string): SupabaseClient {
  const url = getUrl();
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!anonKey) {
    throw new Error(
      "Supabase anon key missing. Set SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }
  return createClient(url, anonKey, {
    global: accessToken
      ? {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      : undefined,
  });
}
