import { eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { documents } from "@/lib/db/schema";
import { deleteUploadedFile } from "@/lib/uploadthing/api";

// One-off: Hospital no longer uploads a fitness form (it records the outcome
// only), and the doc type has been removed from the code. This deletes the
// fitness forms uploaded before that change: the file in UploadThing first,
// then its row, so a failed file delete leaves the row to retry. Safe to
// re-run: once nothing matches, it does nothing.
//
// The doc type is a literal here on purpose: it no longer exists in DocType.
const LEGACY_DOC_TYPE = "hospital_fitness_form";

async function cleanupFitnessForms() {
  const rows = await db
    .select({ id: documents.id, fileKey: documents.fileKey })
    .from(documents)
    .where(eq(documents.docType, LEGACY_DOC_TYPE));

  let deleted = 0;

  for (const row of rows) {
    try {
      await deleteUploadedFile(row.fileKey);
    } catch (error) {
      console.error(`Could not delete file for document ${row.id}`, error);
      continue;
    }

    await db.delete(documents).where(eq(documents.id, row.id));
    deleted += 1;
  }

  console.log(`Deleted ${deleted} of ${rows.length} fitness form documents.`);
}

cleanupFitnessForms()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
