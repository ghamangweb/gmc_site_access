import { beforeEach, expect, test } from "bun:test";
import {
  AI_REPORT_TIMEOUT_MESSAGE,
  AiReportTimeoutError,
} from "@/lib/domain/ai-report-error";
import { workflowAiReportData } from "@/lib/domain/workflow-ai-report";
import {
  countEngagementsAwaitingApproval,
  countStakeholderApprovalsBy,
  generateReceptionAiReport,
  generateWorkflowAiReport,
  requirePinConfirmed,
  requireWriteAccess,
} from "./report-test-mocks";

const workflows = [
  ["reception", "Reception", "Receptionist"],
  ["hospital", "Hospital", "HospitalStaff"],
  ["training", "Training", "TrainingStaff"],
  ["security", "Security", "SecurityStaff"],
  ["approvals", "Approvals", null],
];

const period = { start: "2026-11-01", end: "2026-11-08" };

const session = {
  staffUserId: "viewer-1",
  systemRole: "Admin",
  workflowRoles: ["CSO"],
  pinConfirmed: true,
};

function request(slug, body = JSON.stringify(period)) {
  return new Request(`https://example.test/api/reports/${slug}`, {
    method: "POST",
    headers: {
      origin: "https://example.test",
      "content-type": "application/json",
    },
    body,
  });
}

function result(workflow) {
  return {
    statistics: workflowAiReportData(
      workflow,
      period,
      [],
      new Date("2026-11-08T12:00:00Z"),
    ),
    report: {
      executiveSummary: "No matching records.",
      keyFindings: [],
      workloadAnalysis: "No workload conclusions.",
      recommendedActions: [],
    },
  };
}

beforeEach(() => {
  requireWriteAccess.mockReset().mockResolvedValue({});
  requirePinConfirmed.mockReset().mockResolvedValue(session);
  countEngagementsAwaitingApproval.mockReset().mockResolvedValue(0);
  countStakeholderApprovalsBy.mockReset().mockResolvedValue(0);
  generateReceptionAiReport.mockReset();
  generateWorkflowAiReport.mockReset();
});

for (const [slug, workflow, role] of workflows) {
  const { POST } = await import(`./${slug}/route`);

  test(`${workflow} generation checks the existing export permission before calling AI`, async () => {
    if (role)
      requireWriteAccess.mockRejectedValueOnce(new Error("Not authorized"));
    else requirePinConfirmed.mockRejectedValueOnce(new Error("Not authorized"));

    const response = await POST(request(slug));

    expect(response.status).toBe(403);

    if (role) expect(requireWriteAccess).toHaveBeenCalledWith(role);
    expect(generateReceptionAiReport).not.toHaveBeenCalled();
    expect(generateWorkflowAiReport).not.toHaveBeenCalled();
  });

  test(`${workflow} returns its own statistics and generated report`, async () => {
    const data = result(workflow);

    const generator =
      workflow === "Reception"
        ? generateReceptionAiReport
        : generateWorkflowAiReport;

    generator.mockResolvedValueOnce(data);

    const response = await POST(request(slug));

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ success: true, data });

    if (workflow === "Reception")
      expect(generator).toHaveBeenCalledWith(period);
    else expect(generator).toHaveBeenCalledWith(workflow, period, undefined);
  });

  test(`${workflow} refuses malformed dates and caller-supplied scope or metrics`, async () => {
    for (const body of [
      "not JSON",
      JSON.stringify({ start: "2026-11-09", end: "2026-11-01" }),
      JSON.stringify({ ...period, delegatedApproverId: "another-person" }),
      JSON.stringify({ ...period, metrics: [] }),
    ]) {
      expect((await POST(request(slug, body))).status).toBe(400);
    }

    expect(generateReceptionAiReport).not.toHaveBeenCalled();
    expect(generateWorkflowAiReport).not.toHaveBeenCalled();
  });

  test(`${workflow} refuses cross-origin generation and non-JSON bodies`, async () => {
    const foreign = request(slug);

    foreign.headers.set("origin", "https://other.test");
    expect((await POST(foreign)).status).toBe(403);

    const plain = request(slug);

    plain.headers.set("content-type", "text/plain");
    expect((await POST(plain)).status).toBe(415);
    expect(generateReceptionAiReport).not.toHaveBeenCalled();
    expect(generateWorkflowAiReport).not.toHaveBeenCalled();
  });

  test(`${workflow} hides internal generation errors`, async () => {
    const generator =
      workflow === "Reception"
        ? generateReceptionAiReport
        : generateWorkflowAiReport;

    generator.mockRejectedValueOnce(new Error("PRIVATE database or API error"));

    const response = await POST(request(slug));

    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain("PRIVATE");
  });

  test(`${workflow} returns a clear timeout message when Gemini exceeds its deadline`, async () => {
    const generator =
      workflow === "Reception"
        ? generateReceptionAiReport
        : generateWorkflowAiReport;

    generator.mockRejectedValueOnce(new AiReportTimeoutError());

    const response = await POST(request(slug));

    expect(response.status).toBe(504);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({
      success: false,
      error: AI_REPORT_TIMEOUT_MESSAGE,
    });
  });
}

const { POST: approvalsPOST } = await import("./approvals/route");

for (const role of ["Guest", "User"]) {
  test(`${role} cannot generate an Approvals report`, async () => {
    requirePinConfirmed.mockResolvedValueOnce({ ...session, systemRole: role });
    expect((await approvalsPOST(request("approvals"))).status).toBe(403);
    expect(generateWorkflowAiReport).not.toHaveBeenCalled();
  });
}

for (const role of ["CSO", "HCM", "GMM", "EM", "MM"]) {
  test(`${role} generates the full Approvals export scope`, async () => {
    requirePinConfirmed.mockResolvedValueOnce({
      ...session,
      workflowRoles: [role],
    });
    generateWorkflowAiReport.mockResolvedValueOnce(result("Approvals"));

    expect((await approvalsPOST(request("approvals"))).status).toBe(200);
    expect(generateWorkflowAiReport).toHaveBeenCalledWith(
      "Approvals",
      period,
      undefined,
    );
    expect(countEngagementsAwaitingApproval).not.toHaveBeenCalled();
  });
}

for (const mode of ["pending", "signed"]) {
  test(`delegate with ${mode} records generates only their authenticated scope`, async () => {
    requirePinConfirmed.mockResolvedValueOnce({
      ...session,
      workflowRoles: ["Receptionist"],
    });

    if (mode === "pending")
      countEngagementsAwaitingApproval.mockResolvedValueOnce(1);
    else countStakeholderApprovalsBy.mockResolvedValueOnce(1);
    generateWorkflowAiReport.mockResolvedValueOnce(result("Approvals"));

    expect((await approvalsPOST(request("approvals"))).status).toBe(200);
    expect(generateWorkflowAiReport).toHaveBeenCalledWith(
      "Approvals",
      period,
      "viewer-1",
    );
  });
}

test("staff without stakeholder or delegate history cannot generate Approvals reports", async () => {
  requirePinConfirmed.mockResolvedValueOnce({
    ...session,
    workflowRoles: ["Receptionist"],
  });

  expect((await approvalsPOST(request("approvals"))).status).toBe(403);
  expect(generateWorkflowAiReport).not.toHaveBeenCalled();
});
