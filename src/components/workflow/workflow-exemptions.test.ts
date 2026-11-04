import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { ActionResult } from "@/lib/domain/types";
import type { WorkflowExemptionDetails } from "@/lib/services/workflow-service";
import { PriorLayersSummary } from "./prior-layers-summary";
import { StakeholderExemptionDialog } from "./stakeholder-exemption-dialog";
import { WorkflowExemptionsSummary } from "./workflow-exemptions-summary";

const exemption: WorkflowExemptionDetails = {
  id: "exemption-1",
  engagementId: "engagement-1",
  workflowCycleId: "cycle-1",
  stakeholderApprovalId: "approval-1",
  stage: "Hospital",
  reason: "Verified <medical> & clearance",
  cycleNumber: 1,
  archivedAt: null,
  approverName: "Stakeholder One",
  approverRole: "GMM",
  approvedAt: new Date("2026-11-04T10:00:00Z"),
};

test("exemption summary shows stage, reason, approver and cycle history with escaped comments", () => {
  const html = renderToStaticMarkup(
    createElement(WorkflowExemptionsSummary, {
      exemptions: [
        exemption,
        {
          ...exemption,
          id: "old",
          cycleNumber: 0,
          archivedAt: new Date(),
          stage: "Training",
        },
      ],
    }),
  );
  for (const text of [
    "Hospital",
    "Training School",
    "Exempted",
    "Stakeholder One",
    "GMM",
    "Current cycle",
    "Previous cycle",
    "Verified &lt;medical&gt; &amp; clearance",
  ]) {
    assert.ok(html.includes(text), text);
  }
  assert.ok(!html.includes("Verified <medical>"));
  assert.equal(
    renderToStaticMarkup(
      createElement(WorkflowExemptionsSummary, { exemptions: [] }),
    ),
    "",
  );
});

test("Security displays authorised exemptions instead of missing or completed outcomes", () => {
  const html = renderToStaticMarkup(
    createElement(PriorLayersSummary, {
      approval: undefined,
      clearance: {
        id: "clearance",
        workflowCycleId: "cycle-1",
        clearanceStatus: "Fit",
        doctorComments: "Stale medical",
        clearanceDate: new Date(),
      },
      induction: {
        id: "induction",
        workflowCycleId: "cycle-1",
        generalSiteInduction: true,
        otherInductions: false,
        trainerComments: "Stale induction",
        completedAt: new Date(),
      },
      exemptions: [
        exemption,
        { ...exemption, id: "training", stage: "Training" },
      ],
    }),
  );
  assert.equal((html.match(/>Exempted</g) ?? []).length, 2);
  assert.ok(!html.includes("Stale medical"));
  assert.ok(!html.includes("Stale induction"));
  assert.ok(!html.includes("Not applicable"));
  assert.ok(!html.includes(">Completed<"));
});

test("visit-only engagements do not offer a stage exemption dialog", () => {
  const callbacks = {
    onApprove: async (): Promise<ActionResult> => ({ success: true }),
    onApproved: (): void => undefined,
  };
  assert.equal(
    renderToStaticMarkup(
      createElement(StakeholderExemptionDialog, {
        accessPurpose: "Visit",
        ...callbacks,
      }),
    ),
    "",
  );
  const html = renderToStaticMarkup(
    createElement(StakeholderExemptionDialog, {
      accessPurpose: "Work",
      ...callbacks,
    }),
  );
  assert.ok(html.includes("Approve with Exemption"));
});
