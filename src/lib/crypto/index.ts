import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  hkdfSync,
  randomBytes,
} from "node:crypto";

import { getMasterKey } from "@/lib/crypto/key";

// Application-level encryption: the server encrypts before a value reaches the
// database and decrypts after it comes back, so the database (and anyone with
// only database access) sees ciphertext. AES-256-GCM, a fresh random IV per
// value, so equal plaintexts never produce equal ciphertexts, and the auth tag
// makes tampering detectable.
//
// Server-only. Never import this from a client component: the key must never
// reach a browser.

const PREFIX = "enc1.";

// Separate keys for separate jobs, derived from the one master key, so the
// encryption key is never also used to build the search hashes.
function deriveKey(info: string): Buffer {
  return Buffer.from(
    hkdfSync("sha256", getMasterKey().export(), Buffer.alloc(0), info, 32),
  );
}

export function isEncrypted(value: string): boolean {
  return value.startsWith(PREFIX);
}

export function encrypt(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", deriveKey("data"), iv);
  const body = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  return `${PREFIX}${[iv, cipher.getAuthTag(), body]
    .map((part) => part.toString("base64url"))
    .join(".")}`;
}

// A value that is not in the encrypted format is returned as it is. That is
// deliberate and temporary: rows written before encryption was switched on are
// still plaintext until the backfill script has run, and the app has to keep
// working in between. After the backfill nothing takes this branch.
export function decrypt(stored: string): string {
  if (!isEncrypted(stored)) {
    return stored;
  }

  const [iv, tag, body] = stored
    .slice(PREFIX.length)
    .split(".")
    .map((part) => Buffer.from(part, "base64url"));

  if (!iv || !tag || !body) {
    throw new Error("Malformed encrypted value");
  }

  const decipher = createDecipheriv("aes-256-gcm", deriveKey("data"), iv);

  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(body), decipher.final()]).toString(
    "utf8",
  );
}

// A keyed hash for looking something up without storing it: the same input
// always gives the same output, so equality works, but it cannot be reversed
// without the key. Normalised first so "A1234567" and " a1234567 " agree.
export function blindIndex(value: string): string {
  return createHmac("sha256", deriveKey("index"))
    .update(value.trim().toLowerCase())
    .digest("hex");
}

const MIN_PREFIX = 2;

function words(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word.length > 0);
}

// What a person is searchable by: every word of their name and their passport
// number, each as the hash of every prefix of at least two characters. That is
// what lets a search for "men" find "Mensah" without the database ever holding
// "Mensah". It reveals word lengths and shared prefixes, never the words.
export function personSearchTokens(
  fullName: string,
  passportNo: string,
): string[] {
  const tokens = new Set<string>();

  for (const word of [...words(fullName), ...words(passportNo)]) {
    for (let length = MIN_PREFIX; length <= word.length; length += 1) {
      tokens.add(blindIndex(word.slice(0, length)));
    }
  }

  return [...tokens];
}

// The hashes a typed search must find: one per word typed. Words shorter than
// the minimum prefix cannot match anything stored, so they are dropped.
export function searchQueryTokens(query: string): string[] {
  return words(query)
    .filter((word) => word.length >= MIN_PREFIX)
    .map((word) => blindIndex(word));
}
