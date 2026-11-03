import assert from "node:assert/strict";
import { test } from "node:test";
import { csvRow } from "./csv";

test("CSV preserves commas, quotes, newlines, Unicode and empty fields", () => {
  assert.equal(
    csvRow(['Mensah, "Kojo"', "first\nsecond", "张伟", ""]),
    '"Mensah, ""Kojo""","first\nsecond","张伟",""\r\n',
  );
});

test("spreadsheet formulas and leading control characters are neutralized", () => {
  for (const value of [
    "=1+1",
    "+123",
    "-1+2",
    "@SUM(A1)",
    "  =1+1",
    "\t=1+1",
    "\rtext",
    "\ntext",
  ]) {
    assert.equal(csvRow([value]), `"'${value}"\r\n`);
  }
});

test("ordinary identifiers and ISO dates are unchanged", () => {
  assert.equal(
    csvRow(["001234", "2026-11-03", "AB-123"]),
    '"001234","2026-11-03","AB-123"\r\n',
  );
});
