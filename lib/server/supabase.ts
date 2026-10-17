import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { ServerEnv } from "./env";
import { createSupabaseBlobStore, type BlobStore } from "./storage";

// Uses the secret key, which bypasses RLS. Import only from route handlers and lib/server.
// Untyped on purpose: every query result is parsed with a Zod row schema in supabaseStore.ts.
export function createSupabaseAdmin(
  env: Pick<ServerEnv, "supabaseUrl" | "supabaseSecretKey">,
): SupabaseClient {
  return createClient(env.supabaseUrl, env.supabaseSecretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export function createAdminBlobStore(client: SupabaseClient): BlobStore {
  return createSupabaseBlobStore(client.storage);
}
