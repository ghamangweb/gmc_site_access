import { eq, isNull } from "drizzle-orm";

import { blindIndex } from "@/lib/crypto";
import { db } from "@/lib/db/client";
import { hospitalClearances } from "@/lib/db/schema";

// One-off, and safe to re-run: fills `clearance_status_index` for clearances
// recorded before migration 0033, so the Recorded tab's Outcome filter finds
// them. Run it straight after that migration. Rows already indexed are
// skipped, so a second run changes nothing.
//
// Unlike backfill-encryption.ts this reads through Drizzle on purpose: the
// encrypted column decrypts on the way out, which is the plaintext we need.

async function backfillClearanceStatusIndex() {
  const rows = await db
    .select({
      id: hospitalClearances.id,
      clearanceStatus: hospitalClearances.clearanceStatus,
    })
    .from(hospitalClearances)
    .where(isNull(hospitalClearances.clearanceStatusIndex));

  for (const row of rows) {
    await db
      .update(hospitalClearances)
      .set({ clearanceStatusIndex: blindIndex(row.clearanceStatus) })
      .where(eq(hospitalClearances.id, row.id));
  }

  console.log(`hospital_clearances: indexed ${rows.length}`);
}

backfillClearanceStatusIndex()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
