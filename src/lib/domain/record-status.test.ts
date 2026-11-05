import assert from "node:assert/strict";
import { test } from "node:test";
import { recordStatus } from "./record-status";
import { isoToday } from "./types";

function daysFromToday(days: number): string {
  const date = new Date(`${isoToday()}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

test("in-progress records show their stage", () => {
  assert.deepEqual(
    recordStatus({
      workflowState: "AtTraining",
      accessState: "Pending",
      cardExpiry: undefined,
    }),
    { kind: "stage", state: "AtTraining" },
  );
});

test("completed records with a card show the card's state", () => {
  assert.deepEqual(
    recordStatus({
      workflowState: "Completed",
      accessState: "Active",
      cardExpiry: daysFromToday(10),
    }),
    { kind: "access", state: "Active" },
  );
  assert.deepEqual(
    recordStatus({
      workflowState: "Completed",
      accessState: "Terminated",
      cardExpiry: daysFromToday(10),
    }),
    { kind: "access", state: "Terminated" },
  );
  assert.deepEqual(
    recordStatus({
      workflowState: "Completed",
      accessState: "TerminationRequested",
      cardExpiry: daysFromToday(10),
    }),
    { kind: "access", state: "TerminationRequested" },
  );
});

test("a lapsed card reads Expired before the stored state catches up", () => {
  assert.deepEqual(
    recordStatus({
      workflowState: "Completed",
      accessState: "Active",
      cardExpiry: daysFromToday(-1),
    }),
    { kind: "access", state: "Expired" },
  );
});

test("a completed Familiarization Visit has no card, so it still reads Completed", () => {
  assert.deepEqual(
    recordStatus({
      workflowState: "Completed",
      accessState: "Pending",
      cardExpiry: undefined,
    }),
    { kind: "stage", state: "Completed" },
  );
});
