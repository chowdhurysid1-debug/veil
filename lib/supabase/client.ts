import { createBrowserClient } from "@supabase/ssr";

import { getSupabaseEnv } from "./env";

export function createSupabaseBrowser() {
  const { url, publishableKey } = getSupabaseEnv();
  return createBrowserClient(url, publishableKey);
}
