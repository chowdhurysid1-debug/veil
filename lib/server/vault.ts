import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

// Demo key wrapping: each face key is sealed with AES-256-GCM under a key derived from
// VEIL_VAULT_KEY. Production would hand this to a KMS instead.
const WRAP_VERSION = "v1";
const WRAP_AAD = Buffer.from("veil-face-key");
const IV_BYTES = 12;
const TAG_BYTES = 16;
export const FACE_KEY_BYTES = 32;

export class VaultError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VaultError";
  }
}

function wrappingKey(vaultSecret: string): Buffer {
  return createHash("sha256").update(vaultSecret).digest();
}

export function wrapKey(vaultSecret: string, rawKeyBase64: string): string {
  const rawKey = Buffer.from(rawKeyBase64, "base64");
  if (rawKey.length !== FACE_KEY_BYTES) {
    throw new VaultError(`Face keys must be ${FACE_KEY_BYTES} bytes.`);
  }

  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", wrappingKey(vaultSecret), iv);
  cipher.setAAD(WRAP_AAD);
  const sealed = Buffer.concat([cipher.update(rawKey), cipher.final()]);

  return [
    WRAP_VERSION,
    iv.toString("base64"),
    cipher.getAuthTag().toString("base64"),
    sealed.toString("base64"),
  ].join(".");
}

export function unwrapKey(vaultSecret: string, wrapped: string): string {
  const [version, ivPart, tagPart, sealedPart] = wrapped.split(".");
  if (version !== WRAP_VERSION || !ivPart || !tagPart || !sealedPart) {
    throw new VaultError("Wrapped key is not in a format this server reads.");
  }

  const iv = Buffer.from(ivPart, "base64");
  const tag = Buffer.from(tagPart, "base64");
  if (iv.length !== IV_BYTES || tag.length !== TAG_BYTES) {
    throw new VaultError("Wrapped key is corrupted.");
  }

  try {
    const decipher = createDecipheriv(
      "aes-256-gcm",
      wrappingKey(vaultSecret),
      iv,
    );
    decipher.setAAD(WRAP_AAD);
    decipher.setAuthTag(tag);
    const rawKey = Buffer.concat([
      decipher.update(Buffer.from(sealedPart, "base64")),
      decipher.final(),
    ]);
    return rawKey.toString("base64");
  } catch {
    throw new VaultError(
      "Wrapped key could not be opened with this vault secret.",
    );
  }
}
