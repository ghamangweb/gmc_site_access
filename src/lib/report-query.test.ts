import assert from "node:assert/strict";
import { test } from "node:test";
import { PgDialect } from "drizzle-orm/pg-core";

import { engagements } from "@/lib/db/schema";
import { reportDateBounds } from "@/lib/domain/report-creation-window";
import { reportCreationCondition } from "./report-query";

test("export date filter includes the start, excludes next-day midnight and caps at generation time", () => {
  const generatedAt = new Date("2026-11-08T12:00:00Z");

  const condition = reportCreationCondition(engagements.createdAt, {
    ...reportDateBounds({ start: "2026-11-01", end: "2026-11-08" }),
    generatedAt,
  });

  assert.ok(condition);

  const query = new PgDialect({ casing: "snake_case" }).sqlToQuery(condition);

  assert.match(query.sql, />= \$1/);
  assert.match(query.sql, /< \$2/);
  assert.match(query.sql, /<= \$3/);
  assert.deepEqual(query.params, [
    "2026-11-01T00:00:00.000Z",
    "2026-11-09T00:00:00.000Z",
    generatedAt.toISOString(),
  ]);
});

test("existing Excel exports have no additional date condition when no range is supplied", () => {
  assert.equal(reportCreationCondition(engagements.createdAt), undefined);
});
