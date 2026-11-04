import assert from "node:assert/strict";
import { test } from "node:test";
import type { AccessPurpose, WorkflowExemptionStage } from "./types";
import {
  approvalDestination,
  canGrantWorkflowExemption,
  type ExemptionActor,
  hospitalDestination,
  validateWorkflowExemption,
  workflowExemptionSchema,
} from "./workflow-exemptions";

const actor: ExemptionActor = {
  systemRole: "Admin",
  workflowRoles: ["GMM"],
  pinConfirmed: true,
};
const signature = JSON.stringify({ mode: "type", value: "Stakeholder One" });

const paths: {
  purpose: AccessPurpose;
  stages: WorkflowExemptionStage[];
  state: string;
  role: string | null;
}[] = [
  { purpose: "Work", stages: [], state: "AtHospital", role: "HospitalStaff" },
  {
    purpose: "Work",
    stages: ["Hospital"],
    state: "AtTraining",
    role: "TrainingStaff",
  },
  {
    purpose: "Work",
    stages: ["Training"],
    state: "AtHospital",
    role: "HospitalStaff",
  },
  {
    purpose: "Work",
    stages: ["Hospital", "Training"],
    state: "AtSecurity",
    role: "SecurityStaff",
  },
  {
    purpose: "WorkMine",
    stages: [],
    state: "AtHospital",
    role: "HospitalStaff",
  },
  {
    purpose: "WorkMine",
    stages: ["Hospital"],
    state: "AtTraining",
    role: "TrainingStaff",
  },
  {
    purpose: "WorkMine",
    stages: ["Training"],
    state: "AtHospital",
    role: "HospitalStaff",
  },
  {
    purpose: "WorkMine",
    stages: ["Hospital", "Training"],
    state: "AtSecurity",
    role: "SecurityStaff",
  },
  {
    purpose: "VisitMine",
    stages: [],
    state: "AtTraining",
    role: "TrainingStaff",
  },
  {
    purpose: "VisitMine",
    stages: ["Training"],
    state: "AtSecurity",
    role: "SecurityStaff",
  },
  { purpose: "Visit", stages: [], state: "Completed", role: null },
];

for (const path of paths) {
  test(`${path.purpose}, exempt ${path.stages.join(" + ") || "none"}: ${path.state}`, () => {
    assert.deepEqual(approvalDestination(path.purpose, path.stages), {
      nextState: path.state,
      nextRole: path.role,
    });
  });
}

test("only the four approved stakeholder roles with write access and confirmed PIN grant exemptions", () => {
  for (const role of ["CSO", "HCM", "GMM", "EM"] as const) {
    assert.equal(
      canGrantWorkflowExemption({ ...actor, workflowRoles: [role] }),
      true,
    );
  }
  assert.equal(
    canGrantWorkflowExemption({ ...actor, systemRole: "Guest" }),
    false,
  );
  assert.equal(
    canGrantWorkflowExemption({ ...actor, systemRole: "User" }),
    false,
  );
  assert.equal(
    canGrantWorkflowExemption({
      ...actor,
      systemRole: "SystemAdmin",
      workflowRoles: [],
    }),
    false,
  );
  assert.equal(
    canGrantWorkflowExemption({ ...actor, workflowRoles: ["Receptionist"] }),
    false,
  );
  assert.equal(
    canGrantWorkflowExemption({ ...actor, workflowRoles: ["MM"] }),
    false,
  );
  assert.equal(
    canGrantWorkflowExemption({ ...actor, pinConfirmed: false }),
    false,
  );
});

test("server validation rejects empty, duplicate and unknown stages and blank reasons", () => {
  for (const input of [
    { stages: [], reason: "Reason" },
    { stages: ["Hospital", "Hospital"], reason: "Reason" },
    { stages: ["Security"], reason: "Reason" },
    { stages: ["Hospital"], reason: " \n " },
    { stages: "Hospital", reason: "Reason" },
    { stages: ["Hospital"], reason: null },
  ])
    assert.equal(workflowExemptionSchema.safeParse(input).success, false);
});

test("inapplicable exemptions are rejected and a valid reason is trimmed", () => {
  assert.throws(
    () =>
      validateWorkflowExemption(
        { stages: ["Hospital"], reason: "Reason" },
        "VisitMine",
        actor,
        signature,
      ),
    /required/,
  );
  assert.throws(
    () =>
      validateWorkflowExemption(
        { stages: ["Training"], reason: "Reason" },
        "Visit",
        actor,
        signature,
      ),
    /required/,
  );
  assert.deepEqual(
    validateWorkflowExemption(
      { stages: ["Hospital"], reason: "  Verified medical  " },
      "Work",
      actor,
      signature,
    ),
    {
      stages: ["Hospital"],
      reason: "Verified medical",
    },
  );
});

test("an empty or malformed captured signature cannot authorize an exemption", () => {
  for (const invalid of [
    "",
    "not-json",
    "null",
    "{}",
    JSON.stringify({ mode: "type", value: " " }),
    JSON.stringify({ mode: "invalid", value: "Name" }),
  ]) {
    assert.throws(
      () =>
        validateWorkflowExemption(
          { stages: ["Hospital"], reason: "Reason" },
          "Work",
          actor,
          invalid,
        ),
      /signature/,
    );
  }
});

test("Hospital handoff skips only an exempted Training stage", () => {
  assert.deepEqual(hospitalDestination([]), {
    nextState: "AtTraining",
    nextRole: "TrainingStaff",
  });
  assert.deepEqual(hospitalDestination(["Training"]), {
    nextState: "AtSecurity",
    nextRole: "SecurityStaff",
  });
});
