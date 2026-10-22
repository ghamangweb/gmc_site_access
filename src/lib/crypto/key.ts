import { createSecretKey, type KeyObject } from "node:crypto";

// The one place the master key is obtained. Today it is an environment
// variable. It only keeps the data from the technical team if that variable is
// set by someone else in the host's secret settings (marked sensitive) and the
// developer has no access to them or to a shell on the server. No Azure Key
// Vault is planned. If the key ever moves, only this function changes: everything else
// asks for a key through it and never sees where it came from.
let cached: KeyObject | undefined;

export function getMasterKey(): KeyObject {
  if (cached) {
    return cached;
  }

  const encoded = process.env.ENCRYPTION_KEY;

  if (!encoded) {
    throw new Error("ENCRYPTION_KEY is not set");
  }

  const bytes = Buffer.from(encoded, "base64");

  if (bytes.length !== 32) {
    throw new Error("ENCRYPTION_KEY must be 32 bytes, base64 encoded");
  }

  cached = createSecretKey(bytes);

  return cached;
}
