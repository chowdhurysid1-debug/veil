import { randomUUID } from "node:crypto";

import { ConfigError, getServerEnv } from "./env";
import { describeError, errorResponse } from "./http";
import type { BlobStore } from "./storage";
import type { VeilStore } from "./store";
import { createAdminBlobStore, createSupabaseAdmin } from "./supabase";
import { createSupabaseStore } from "./supabaseStore";

// Everything a handler touches outside its own logic, so tests can swap each piece.
export interface VeilDeps {
  store: VeilStore;
  blobs: BlobStore;
  signingSecret: string;
  vaultSecret: string;
  now: () => Date;
  newId: () => string;
}

let cached: VeilDeps | null = null;

export function getDeps(): VeilDeps {
  if (cached) return cached;
  const env = getServerEnv();
  const client = createSupabaseAdmin(env);
  cached = {
    store: createSupabaseStore(client),
    blobs: createAdminBlobStore(client),
    signingSecret: env.signingSecret,
    vaultSecret: env.vaultSecret,
    now: () => new Date(),
    newId: () => randomUUID(),
  };
  return cached;
}

// Route handlers call this so a missing setting or a crash becomes a friendly JSON error.
export async function runHandler(
  label: string,
  handler: (deps: VeilDeps) => Promise<Response>,
  loadDeps: () => VeilDeps = getDeps,
): Promise<Response> {
  try {
    return await handler(loadDeps());
  } catch (error) {
    console.error(`[${label}] failed. ${describeError(error)}`);
    if (error instanceof ConfigError) {
      return errorResponse(
        503,
        "Veil's storage is not connected yet. Try again once setup is finished.",
      );
    }
    return errorResponse(
      500,
      "Something went wrong on our side. Try again in a moment.",
    );
  }
}
