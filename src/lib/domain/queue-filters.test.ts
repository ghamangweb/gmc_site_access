import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ACCESS_PURPOSES,
  accessPurposeOptions,
  parseFilter,
  parseIdFilter,
} from "./queue-filters";

test("a known filter value passes through", () => {
  assert.equal(parseFilter("WorkMine", ACCESS_PURPOSES), "WorkMine");
});

test("an unknown, missing or wrongly cased value reads as no filter", () => {
  assert.equal(parseFilter("Holiday", ACCESS_PURPOSES), undefined);
  assert.equal(parseFilter(undefined, ACCESS_PURPOSES), undefined);
  assert.equal(parseFilter("work", ACCESS_PURPOSES), undefined);
});

test("only a well-formed id reaches an id-column filter", () => {
  const id = "5f0c6b8e-3a2d-4c1e-9b7a-2d4e6f8a0b1c";
  assert.equal(parseIdFilter(id), id);
  assert.equal(parseIdFilter("not-an-id"), undefined);
  assert.equal(parseIdFilter(`${id}' or 1=1`), undefined);
  assert.equal(parseIdFilter(undefined), undefined);
});

test("options can be narrowed to the values a queue actually holds", () => {
  assert.deepEqual(
    accessPurposeOptions(["Work", "VisitMine"]).map((option) => option.value),
    ["Work", "VisitMine"],
  );
});
