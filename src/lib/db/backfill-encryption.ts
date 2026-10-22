import { eq, sql } from "drizzle-orm";

import {
  blindIndex,
  decrypt,
  encrypt,
  isEncrypted,
  personSearchTokens,
} from "@/lib/crypto";
import { db } from "@/lib/db/client";
import { persons } from "@/lib/db/schema";

// One-off, and safe to re-run: encrypts every sensitive value that is still
// plaintext, and rebuilds each person's passport hash and search tokens.
// Run it straight after migration 0025. Values already encrypted are skipped,
// so a second run changes nothing.
//
// It reads and writes through raw SQL on purpose: the Drizzle columns would
// decrypt on the way out and re-encrypt on the way in, hiding exactly the rows
// this exists to find.

const ENCRYPTED_COLUMNS: { table: string; columns: string[] }[] = [
  {
    table: "persons",
    columns: [
      "passport_no",
      "full_name",
      "date_of_birth",
      "gender",
      "nationality",
      "email",
      "phone",
      "emergency_contact_name",
      "emergency_contact_phone",
    ],
  },
  { table: "engagements", columns: ["reception_data"] },
  { table: "registration_requests", columns: ["form_data"] },
  {
    table: "hospital_clearances",
    columns: ["clearance_status", "doctor_comments"],
  },
  { table: "induction_records", columns: ["trainer_comments"] },
  { table: "termination_requests", columns: ["reason"] },
  { table: "invitations", columns: ["email"] },
  { table: "notifications", columns: ["message"] },
  { table: "workflow_transitions", columns: ["comments"] },
];

async function encryptColumn(table: string, column: string): Promise<number> {
  const rows = await db.execute<{ id: string; value: string | null }>(
    sql`select id, ${sql.identifier(column)} as value from ${sql.identifier(table)}`,
  );

  let changed = 0;

  for (const row of rows) {
    if (row.value === null || isEncrypted(row.value)) {
      continue;
    }

    await db.execute(
      sql`update ${sql.identifier(table)} set ${sql.identifier(column)} = ${encrypt(row.value)} where id = ${row.id}`,
    );
    changed += 1;
  }

  return changed;
}

async function rebuildPersonIndexes(): Promise<number> {
  const rows = await db.execute<{
    id: string;
    passport_no: string;
    full_name: string;
  }>(sql`select id, passport_no, full_name from persons`);

  for (const row of rows) {
    // Decrypt first: after the loop above these are ciphertext.
    const passportNo = decrypt(row.passport_no);
    const fullName = decrypt(row.full_name);

    // Only the two blind columns, so the encrypted ones are not touched.
    await db
      .update(persons)
      .set({
        passportNoHash: blindIndex(passportNo),
        searchTokens: personSearchTokens(fullName, passportNo),
      })
      .where(eq(persons.id, row.id));
  }

  return rows.length;
}

async function backfillEncryption() {
  for (const { table, columns } of ENCRYPTED_COLUMNS) {
    for (const column of columns) {
      const changed = await encryptColumn(table, column);

      console.log(`${table}.${column}: encrypted ${changed}`);
    }
  }

  console.log(`persons: indexed ${await rebuildPersonIndexes()}`);
}

backfillEncryption()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
