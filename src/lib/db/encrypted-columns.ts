import { customType } from "drizzle-orm/pg-core";

import { decrypt, encrypt } from "@/lib/crypto";

// Columns whose value is encrypted on the way in and decrypted on the way out,
// so services and components keep reading and writing plain strings and
// objects. The database column is `text` and holds ciphertext.
//
// Consequence: an encrypted column cannot be filtered, sorted or compared in
// SQL. Anything that has to be looked up has a blind-index column beside it.

export const encryptedText = customType<{ data: string; driverData: string }>({
  dataType() {
    return "text";
  },
  toDriver(value) {
    return encrypt(value);
  },
  fromDriver(value) {
    return decrypt(value);
  },
});

export const encryptedJson = customType<{ data: unknown; driverData: string }>({
  dataType() {
    return "text";
  },
  toDriver(value) {
    return encrypt(JSON.stringify(value));
  },
  fromDriver(value) {
    return JSON.parse(decrypt(value));
  },
});
