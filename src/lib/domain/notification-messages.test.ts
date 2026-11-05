import assert from "node:assert/strict";
import { test } from "node:test";
import { notice, noticeDate } from "./notification-messages";
import { ROLE_LABELS } from "./types";

test("access request names the role without its abbreviation", () => {
  assert.equal(
    notice.accessRequested("Ama Mensah", ROLE_LABELS.CSO),
    "Ama Mensah has requested access as Chief Sustainability Officer.",
  );
  // Labels with no abbreviation are left as they are.
  assert.equal(
    notice.accessRequested("Ama Mensah", ROLE_LABELS.TrainingStaff),
    "Ama Mensah has requested access as Training School.",
  );
});

test("dates read as day, short month, year", () => {
  assert.equal(noticeDate("2026-11-12"), "12 Nov 2026");
  assert.equal(
    notice.stayExtendedForSecurity("Kofi Boateng", "2026-11-30"),
    "Kofi Boateng's stay has been extended to 30 Nov 2026. Please update the access card.",
  );
});
