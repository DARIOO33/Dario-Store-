import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// Encryption at rest for the order chat (messages and photos): what is written to the database is
// unreadable without CHAT_ENCRYPTION_KEY, so a leaked database dump or backup does not leak accounts.
// AES-256-GCM: encrypted and tamper-proof. Stored as "enc:v1:" + base64(iv + tag + ciphertext).
// Anything not starting with that prefix is old plaintext and is passed through unchanged, so turning
// the key on never breaks existing messages (npm run chat:encrypt encrypts them too).
const PREFIX = "enc:v1:";
const IV_BYTES = 12;
const TAG_BYTES = 16;

// Shown instead of a message the server can't decrypt (wrong or missing key).
export const LOCKED_TEXT = "[Encrypted message: this server does not have the right key to read it]";

function getKey() {
  const raw = process.env.CHAT_ENCRYPTION_KEY;
  if (!raw) return null;

  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error("CHAT_ENCRYPTION_KEY must be 32 bytes in base64. Make one with: openssl rand -base64 32");
  return key;
}

export const chatEncryptionEnabled = () => getKey() !== null;
export const isSealed = (stored: string) => stored.startsWith(PREFIX);

function seal(plain: Buffer, key: Buffer) {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plain), cipher.final()]);
  return PREFIX + Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64");
}

function unseal(stored: string, key: Buffer) {
  const raw = Buffer.from(stored.slice(PREFIX.length), "base64");
  const decipher = createDecipheriv("aes-256-gcm", key, raw.subarray(0, IV_BYTES));
  decipher.setAuthTag(raw.subarray(IV_BYTES, IV_BYTES + TAG_BYTES));
  return Buffer.concat([decipher.update(raw.subarray(IV_BYTES + TAG_BYTES)), decipher.final()]);
}

// Without a key everything is stored as before (in production the server says so once in its log).
let warned = false;
function keyOrWarn() {
  const key = getKey();
  if (!key && !warned && process.env.NODE_ENV === "production") {
    warned = true;
    console.error("[chat] CHAT_ENCRYPTION_KEY is not set: chat messages and photos are stored WITHOUT encryption");
  }
  return key;
}

export function sealText(text: string) {
  const key = keyOrWarn();
  return key && text ? seal(Buffer.from(text, "utf8"), key) : text;
}

export function openText(stored: string) {
  if (!isSealed(stored)) return stored;

  const key = getKey();
  if (!key) return LOCKED_TEXT;
  try {
    return unseal(stored, key).toString("utf8");
  } catch {
    return LOCKED_TEXT;
  }
}

// Photos: `base64` is the image as the database has always held it.
export function sealBase64(base64: string) {
  const key = keyOrWarn();
  return key ? seal(Buffer.from(base64, "base64"), key) : base64;
}

// Returns the image as base64, or null when it can't be decrypted.
export function openBase64(stored: string) {
  if (!isSealed(stored)) return stored;

  const key = getKey();
  if (!key) return null;
  try {
    return unseal(stored, key).toString("base64");
  } catch {
    return null;
  }
}
