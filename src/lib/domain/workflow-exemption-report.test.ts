import assert from "node:assert/strict";
import { test } from "node:test";
import {
  type WorkflowExemptionReportRecord,
  workflowExemptionReportValues,
} from "./workflow-exemption-report";

const exemption: WorkflowExemptionReportRecord = {
  engagementId: "engagement-1",
  workflowCycleId: "cycle-1",
  stage: "Hospital",
  reason: "Approved exemption",
  approverName: "Approver",
  approverRole: "CSO",
  approvedAt: new Date("2026-11-06T10:00:00.123Z"),
  archivedAt: null,
};

test("distinct exemption approvals retain separate entries when their UTC times match on different dates", () => {
  const values = workflowExemptionReportValues([
    exemption,
    { ...exemption, approvedAt: new Date("2026-11-07T10:00:00.123Z") },
  ]);

  assert.equal(values[3], "10:00:00; 10:00:00");
});

test("the same approval timestamp is still deduplicated", () => {
  assert.equal(
    workflowExemptionReportValues([exemption, exemption])[3],
    "10:00:00",
  );
  assert.equal(workflowExemptionReportValues([])[3], "");
});
