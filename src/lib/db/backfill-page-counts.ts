import { eq, isNull } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { documents } from "@/lib/db/schema";
import { countUploadedPages } from "@/lib/uploadthing/api";

// One-off: fills `documents.page_count` for rows uploaded before the column
// existed. Only touches rows where it is still null, so it is safe to re-run.
// A PDF that cannot be parsed stays null and previews as a single page.
async function backfillPageCounts() {
  const rows = await db
    .select()
    .from(documents)
    .where(isNull(documents.pageCount));

  let filled = 0;

  for (const row of rows) {
    const pageCount = await countUploadedPages(
      row.fileKey,
      row.contentType ?? "",
    );

    if (pageCount === null) {
      continue;
    }

    await db
      .update(documents)
      .set({ pageCount })
      .where(eq(documents.id, row.id));
    filled += 1;
  }

  console.log(`Backfilled ${filled} of ${rows.length} documents.`);
}

backfillPageCounts()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
