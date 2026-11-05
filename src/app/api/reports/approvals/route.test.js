import { beforeEach, expect, test } from "bun:test";
import {
  countEngagementsAwaitingApproval,
  countStakeholderApprovalsBy,
  exportApprovalsCsv,
  requirePinConfirmed,
} from "../report-test-mocks";

const { GET } = await import("./route");

const session = {
  staffUserId: "viewer-1",
  systemRole: "Admin",
  workflowRoles: ["CSO"],
  pinConfirmed: true,
};

const request = () => new Request("https://example.test/api/reports/approvals");

beforeEach(() => {
  requirePinConfirmed.mockReset().mockResolvedValue(session);
  countEngagementsAwaitingApproval.mockReset().mockResolvedValue(0);
  countStakeholderApprovalsBy.mockReset().mockResolvedValue(0);
  exportApprovalsCsv.mockReset().mockResolvedValue('\uFEFF"Name"\r\n');
});

test("missing PIN, expired session or inactive account is denied before querying report data", async () => {
  requirePinConfirmed.mockRejectedValueOnce(new Error("PIN not confirmed"));
  const response = await GET(request());
  expect(response.status).toBe(403);
  expect(exportApprovalsCsv).not.toHaveBeenCalled();
  expect(countEngagementsAwaitingApproval).not.toHaveBeenCalled();
  expect(response.headers.get("cache-control")).toBe("no-store");
});

for (const role of ["Guest", "User"]) {
  test(`${role} cannot export even with a stakeholder role`, async () => {
    requirePinConfirmed.mockResolvedValueOnce({ ...session, systemRole: role });
    expect((await GET(request())).status).toBe(403);
    expect(exportApprovalsCsv).not.toHaveBeenCalled();
  });
}

for (const role of ["CSO", "HCM", "GMM", "EM", "MM"]) {
  test(`${role} receives the full pending and approved report`, async () => {
    requirePinConfirmed.mockResolvedValueOnce({
      ...session,
      workflowRoles: [role],
    });
    expect((await GET(request())).status).toBe(200);
    expect(exportApprovalsCsv).toHaveBeenCalledWith(undefined);
    expect(countEngagementsAwaitingApproval).not.toHaveBeenCalled();
  });
}

test("delegate with pending assignment exports using the authenticated staff ID", async () => {
  requirePinConfirmed.mockResolvedValueOnce({
    ...session,
    workflowRoles: ["Receptionist"],
  });
  countEngagementsAwaitingApproval.mockResolvedValueOnce(1);

  const response = await GET(
    new Request(
      "https://example.test/api/reports/approvals?staffUserId=someone-else&delegatedTo=&view=approved&q=Mensah&page=5",
    ),
  );

  expect(response.status).toBe(200);
  expect(countEngagementsAwaitingApproval).toHaveBeenCalledWith("viewer-1");
  expect(countStakeholderApprovalsBy).toHaveBeenCalledWith("viewer-1");
  expect(exportApprovalsCsv).toHaveBeenCalledWith("viewer-1");
});

test("delegate with only signed history retains access to their own report", async () => {
  requirePinConfirmed.mockResolvedValueOnce({ ...session, workflowRoles: [] });
  countStakeholderApprovalsBy.mockResolvedValueOnce(1);
  expect((await GET(request())).status).toBe(200);
  expect(exportApprovalsCsv).toHaveBeenCalledWith("viewer-1");
});

test("non-stakeholder with no pending assignment or signed history is denied", async () => {
  requirePinConfirmed.mockResolvedValueOnce({
    ...session,
    workflowRoles: ["HospitalStaff"],
  });
  expect((await GET(request())).status).toBe(403);
  expect(exportApprovalsCsv).not.toHaveBeenCalled();
});

test("combined CSV ignores filters and returns a dated non-cacheable UTF-8 download", async () => {
  const response = await GET(
    new Request(
      "https://example.test/api/reports/approvals?view=awaiting&q=Mensah&page=3&staffUserId=another",
    ),
  );

  expect(response.status).toBe(200);
  expect(exportApprovalsCsv).toHaveBeenCalledWith(undefined);
  expect(response.headers.get("content-type")).toBe("text/csv; charset=utf-8");
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  expect(response.headers.get("content-disposition")).toMatch(
    /^attachment; filename="approvals-report-\d{4}-\d{2}-\d{2}\.csv"$/,
  );
  const bytes = new Uint8Array(await response.arrayBuffer());
  expect(Array.from(bytes.slice(0, 3))).toEqual([0xef, 0xbb, 0xbf]);
});

test("failed report returns a safe non-cacheable error", async () => {
  exportApprovalsCsv.mockRejectedValueOnce(
    new Error("Internal database failure"),
  );
  const response = await GET(request());
  expect(response.status).toBe(500);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(await response.json()).toEqual({
    success: false,
    error: "Couldn't export approval records. Please try again.",
  });
});
