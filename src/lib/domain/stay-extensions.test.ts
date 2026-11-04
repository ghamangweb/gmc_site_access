import assert from "node:assert/strict";
import { test } from "node:test";
import {
  earliestExtensionDate,
  isStayExtendable,
  type StayExtensionActor,
  stayExtensionRole,
  validateStayExtension,
} from "./stay-extensions";
import { isoToday } from "./types";

const signature = JSON.stringify({ mode: "type", value: "Stakeholder One" });

function daysFromToday(days: number): string {
  const date = new Date(`${isoToday()}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

test("only a signed-in, writable stakeholder can extend a stay", () => {
  const stakeholder: StayExtensionActor = {
    systemRole: "Admin",
    workflowRoles: ["MM"],
    pinConfirmed: true,
  };

  assert.equal(stayExtensionRole(stakeholder), "MM");
  assert.equal(
    stayExtensionRole({ ...stakeholder, systemRole: "Guest" }),
    undefined,
  );
  assert.equal(
    stayExtensionRole({ ...stakeholder, pinConfirmed: false }),
    undefined,
  );
  // A delegate holds no stakeholder role.
  assert.equal(
    stayExtensionRole({ ...stakeholder, workflowRoles: ["Receptionist"] }),
    undefined,
  );
});

test("approved records qualify unless cancelled or revoked; expired access still does", () => {
  assert.equal(
    isStayExtendable({ workflowState: "Completed", accessState: "Active" }),
    true,
  );
  assert.equal(
    isStayExtendable({ workflowState: "Completed", accessState: "Expired" }),
    true,
  );
  assert.equal(
    isStayExtendable({ workflowState: "AtHospital", accessState: "Pending" }),
    true,
  );
  assert.equal(
    isStayExtendable({ workflowState: "AtReception", accessState: "Pending" }),
    false,
  );
  assert.equal(
    isStayExtendable({ workflowState: "Cancelled", accessState: "Pending" }),
    false,
  );
  assert.equal(
    isStayExtendable({ workflowState: "Completed", accessState: "Terminated" }),
    false,
  );
});

test("the new date must be later than the current one and not in the past", () => {
  const current = daysFromToday(-10);
  const valid = validateStayExtension(
    {
      newDepartureDate: daysFromToday(5),
      reason: "  Project overran  ",
      signature,
    },
    current,
  );

  assert.equal(valid.reason, "Project overran");

  assert.throws(
    () =>
      validateStayExtension(
        { newDepartureDate: current, reason: "x", signature },
        current,
      ),
    /after the current one/,
  );
  assert.throws(
    () =>
      validateStayExtension(
        { newDepartureDate: daysFromToday(-1), reason: "x", signature },
        current,
      ),
    /cannot be in the past/,
  );
});

test("a reason and a captured signature are required", () => {
  const current = daysFromToday(1);
  const newDepartureDate = daysFromToday(10);

  assert.throws(
    () =>
      validateStayExtension(
        { newDepartureDate, reason: "   ", signature },
        current,
      ),
    /reason is required/,
  );
  assert.throws(
    () =>
      validateStayExtension(
        {
          newDepartureDate,
          reason: "x",
          signature: JSON.stringify({ mode: "type", value: " " }),
        },
        current,
      ),
    /signature/,
  );
});

test("the picker starts the day after departure, or today once that has passed", () => {
  assert.equal(earliestExtensionDate(daysFromToday(3)), daysFromToday(4));
  assert.equal(earliestExtensionDate(daysFromToday(-30)), isoToday());
});
