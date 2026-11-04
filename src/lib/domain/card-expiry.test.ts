import assert from "node:assert/strict";
import { test } from "node:test";
import { isCardExpiryUpdatable, validateCardExpiryUpdate } from "./card-expiry";
import { isoToday } from "./types";

function daysFromToday(days: number): string {
  const date = new Date(`${isoToday()}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

test("only a live or lapsed card on a completed record can be re-dated", () => {
  assert.equal(
    isCardExpiryUpdatable({
      workflowState: "Completed",
      accessState: "Active",
    }),
    true,
  );
  assert.equal(
    isCardExpiryUpdatable({
      workflowState: "Completed",
      accessState: "Expired",
    }),
    true,
  );
  assert.equal(
    isCardExpiryUpdatable({
      workflowState: "Completed",
      accessState: "TerminationRequested",
    }),
    false,
  );
  assert.equal(
    isCardExpiryUpdatable({
      workflowState: "Completed",
      accessState: "Terminated",
    }),
    false,
  );
  assert.equal(
    isCardExpiryUpdatable({
      workflowState: "AtSecurity",
      accessState: "Pending",
    }),
    false,
  );
});

test("the new expiry is today or later, within the stay, and actually changes", () => {
  const current = {
    accessCardExpiry: daysFromToday(-3),
    departureDate: daysFromToday(20),
  };

  assert.deepEqual(
    validateCardExpiryUpdate(
      { newExpiry: daysFromToday(20), comments: "  Stay extended  " },
      current,
    ),
    { newExpiry: daysFromToday(20), comments: "Stay extended" },
  );
  assert.throws(
    () =>
      validateCardExpiryUpdate(
        { newExpiry: daysFromToday(21), comments: "x" },
        current,
      ),
    /later than the departure date/,
  );
  assert.throws(
    () =>
      validateCardExpiryUpdate(
        { newExpiry: daysFromToday(-1), comments: "x" },
        current,
      ),
    /cannot be in the past/,
  );
  assert.throws(
    () =>
      validateCardExpiryUpdate(
        { newExpiry: current.accessCardExpiry, comments: "x" },
        current,
      ),
    /different date/,
  );
  assert.throws(
    () =>
      validateCardExpiryUpdate(
        { newExpiry: daysFromToday(5), comments: "  " },
        current,
      ),
    /Comments are required/,
  );
});
