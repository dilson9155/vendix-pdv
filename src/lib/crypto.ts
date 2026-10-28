import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

function key(): Buffer {
  const raw = process.env.SETTINGS_ENCRYPTION_KEY;
  if (!raw) throw new Error("SETTINGS_ENCRYPTION_KEY não configurada.");
  const decoded = Buffer.from(raw, "base64");
  if (decoded.length === 32) return decoded;
  // Aceita qualquer segredo longo derivando 32 bytes.
  return createHash("sha256").update(raw).digest();
}

/** Cifra JSON com AES-256-GCM. Formato: iv.tag.payload (base64url). */
export function encryptConfig(value: unknown): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const payload = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64url")}.${tag.toString("base64url")}.${payload.toString("base64url")}`;
}

export function decryptConfig<T>(value: string | null | undefined): T | null {
  if (!value) return null;
  try {
    const [ivPart, tagPart, payloadPart] = value.split(".");
    if (!ivPart || !tagPart || !payloadPart) return null;
    const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(ivPart, "base64url"));
    decipher.setAuthTag(Buffer.from(tagPart, "base64url"));
    const json = Buffer.concat([
      decipher.update(Buffer.from(payloadPart, "base64url")),
      decipher.final(),
    ]).toString("utf8");
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function newToken(): string {
  return randomBytes(32).toString("base64url");
}
