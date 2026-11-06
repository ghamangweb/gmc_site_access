import assert from "node:assert/strict";
import { test } from "node:test";
import { reportTimestamp } from "./report-timestamp";

test("report timestamps omit the calendar date, timezone suffix and fractional seconds", () => {
  assert.equal(
    reportTimestamp(new Date("2026-11-06T14:30:12.123Z")),
    "14:30:12",
  );
  assert.equal(reportTimestamp(new Date("2026-11-06T00:00:00Z")), "00:00:00");
});

test("report time stays UTC regardless of the source offset, including day boundaries", () => {
  assert.equal(
    reportTimestamp(new Date("2026-11-06T01:30:12.123+02:00")),
    "23:30:12",
  );
});

test("missing report timestamps stay blank", () => {
  assert.equal(reportTimestamp(null), "");
  assert.equal(reportTimestamp(undefined), "");
});

test("fractional seconds are discarded without rounding the time forward", () => {
  const time = reportTimestamp(new Date("2026-11-06T14:30:12.123456Z"));
  assert.equal(time, "14:30:12");
  assert.match(time, /^\d{2}:\d{2}:\d{2}$/);
  assert.equal(
    reportTimestamp(new Date("2026-11-06T23:59:59.999Z")),
    "23:59:59",
  );
});
