// Server-only configuration, read at call time so `next build` works before Supabase exists.
// Error messages name the missing variables and never include a value.
export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

export interface ServerEnv {
  supabaseUrl: string;
  supabaseSecretKey: string;
  signingSecret: string;
  vaultSecret: string;
}

export const MIN_SECRET_LENGTH = 32;

const REQUIRED = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SECRET_KEY",
  "VEIL_SIGNING_SECRET",
  "VEIL_VAULT_KEY",
] as const;

export function getServerEnv(
  env: Record<string, string | undefined> = process.env,
): ServerEnv {
  const missing = REQUIRED.filter((name) => !env[name]?.trim());
  if (missing.length > 0) {
    throw new ConfigError(
      `Missing server environment variables: ${missing.join(", ")}. Add them to .env.local.`,
    );
  }

  const short = (["VEIL_SIGNING_SECRET", "VEIL_VAULT_KEY"] as const).filter(
    (name) => (env[name] ?? "").length < MIN_SECRET_LENGTH,
  );
  if (short.length > 0) {
    throw new ConfigError(
      `${short.join(" and ")} must be at least ${MIN_SECRET_LENGTH} characters.`,
    );
  }

  if (env.VEIL_SIGNING_SECRET === env.VEIL_VAULT_KEY) {
    throw new ConfigError(
      "VEIL_SIGNING_SECRET and VEIL_VAULT_KEY must be different values.",
    );
  }

  return {
    supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    supabaseSecretKey: env.SUPABASE_SECRET_KEY ?? "",
    signingSecret: env.VEIL_SIGNING_SECRET ?? "",
    vaultSecret: env.VEIL_VAULT_KEY ?? "",
  };
}
