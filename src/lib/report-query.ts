import { and, gte, lt, lte, type SQL, type SQLWrapper } from "drizzle-orm";

import type { ReportCreationWindow } from "@/lib/domain/report-creation-window";

export function reportCreationCondition(
  column: SQLWrapper,
  window?: ReportCreationWindow,
): SQL | undefined {
  if (!window) return undefined;

  return and(
    gte(column, window.start),
    lt(column, window.endExclusive),
    lte(column, window.generatedAt),
  );
}
