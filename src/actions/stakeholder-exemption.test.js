import { afterEach, beforeEach, expect, test } from "bun:test";
import {
  applyStakeholderExemption,
  requirePinConfirmed,
  revalidatePath,
  sendEmail,
} from "@/app/api/reports/report-test-mocks";

const { applyStakeholderExemptionAction } = await import("./engagements");
const session = {
  staffUserId: "stakeholder",
  systemRole: "Admin",
  workflowRoles: ["GMM"],
  pinConfirmed: true,
  displayName: "Jane Doe",
  email: "jane@example.test",
};
// The Medical By-pass dialog sends only the comment: no signature box.
const input = {
  exemption: { stages: ["Hospital"], reason: "  Medical already verified  " },
};
const message = {
  engagementId: "engagement-1",
  personName: "Kojo Mensah",
  passportNo: "G1234567",
  stages: ["Hospital"],
  reason: "Medical already verified",
  approverName: "Jane Doe",
  approverRole: "GMM",
  approvedAt: new Date("2026-11-04T10:00:00Z"),
  nextState: "AtTraining",
};
const user = (id) => ({ id, email: `${id}@example.test` });
// Everyone but Hospital (2026-11-05), each with the audience that picks
// their link.
const exemptionRecipients = [
  { user: user("reception-1"), audience: "Receptionist" },
  { user: user("reception-2"), audience: "Receptionist" },
  { user: user("training-1"), audience: "TrainingStaff" },
  { user: user("security-1"), audience: "SecurityStaff" },
  { user: user("hse-1"), audience: "HSE" },
  { user: user("hod-1"), audience: "DepartmentHead" },
];
const decision = {
  engagement: { id: message.engagementId, workflowState: "AtTraining" },
  recipients: exemptionRecipients.map((recipient) => recipient.user),
  nextRole: "TrainingStaff",
  exemptionMessage: message,
  exemptionRecipients,
};
let previousOrigin;

beforeEach(() => {
  previousOrigin = process.env.AUTH_URL;
  process.env.AUTH_URL = "https://example.test";
  requirePinConfirmed.mockReset();
  requirePinConfirmed.mockResolvedValue(session);
  applyStakeholderExemption.mockReset();
  applyStakeholderExemption.mockResolvedValue(decision);
  sendEmail.mockReset();
  sendEmail.mockResolvedValue(true);
  revalidatePath.mockReset();
});

afterEach(() => {
  if (previousOrigin === undefined) delete process.env.AUTH_URL;
  else process.env.AUTH_URL = previousOrigin;
});

test("a Medical By-pass emails every stage but Hospital, each with a link they can open", async () => {
  expect(
    await applyStakeholderExemptionAction(message.engagementId, input),
  ).toEqual({ success: true });

  // The comment is trimmed; the signature is the signed-in stakeholder's name.
  expect(applyStakeholderExemption).toHaveBeenCalledWith(
    message.engagementId,
    session,
    {
      exemption: { stages: ["Hospital"], reason: "Medical already verified" },
      signature: JSON.stringify({ mode: "type", value: "Jane Doe" }),
    },
    session.staffUserId,
  );

  const sent = new Map(
    sendEmail.mock.calls.map(([email]) => [email.to, email.html]),
  );
  expect([...sent.keys()]).toEqual(
    exemptionRecipients.map((recipient) => recipient.user.email),
  );
  expect(sent.get("reception-1@example.test")).toContain(
    "/dashboard/reception/engagement-1",
  );
  expect(sent.get("training-1@example.test")).toContain("/dashboard/training");
  expect(sent.get("security-1@example.test")).toContain("/dashboard/security");
  expect(sent.get("hse-1@example.test")).toContain("/dashboard/overview");
  expect(sent.get("hod-1@example.test")).toContain("/dashboard/department");
  for (const html of sent.values()) {
    expect(html).toContain("Medical already verified");
    expect(html).not.toContain("/dashboard/hospital");
  }
  expect(revalidatePath).toHaveBeenCalledWith("/dashboard", "layout");
  expect(revalidatePath).toHaveBeenCalledWith("/dashboard/training");
});

test("Guest, MM, delegates and unconfirmed PIN cannot invoke a Medical By-pass", async () => {
  for (const denied of [
    { ...session, systemRole: "Guest" },
    { ...session, workflowRoles: ["MM"] },
    { ...session, workflowRoles: ["Receptionist"] },
    { ...session, pinConfirmed: false },
  ]) {
    requirePinConfirmed.mockResolvedValueOnce(denied);
    expect(
      (await applyStakeholderExemptionAction(message.engagementId, input))
        .success,
    ).toBe(false);
  }
  expect(applyStakeholderExemption).not.toHaveBeenCalled();
  expect(sendEmail).not.toHaveBeenCalled();
});

test("invalid payloads never reach the approval transaction or sender", async () => {
  for (const invalid of [
    null,
    {},
    { exemption: { stages: [], reason: "Reason" } },
    { exemption: { stages: ["Hospital"], reason: " " } },
  ]) {
    expect(
      (await applyStakeholderExemptionAction(message.engagementId, invalid))
        .success,
    ).toBe(false);
  }
  expect(applyStakeholderExemption).not.toHaveBeenCalled();
  expect(sendEmail).not.toHaveBeenCalled();
});

test("a rejected or duplicate transaction does not send email", async () => {
  applyStakeholderExemption.mockRejectedValueOnce(
    new Error("This request has already been decided"),
  );
  expect(
    (await applyStakeholderExemptionAction(message.engagementId, input))
      .success,
  ).toBe(false);
  expect(sendEmail).not.toHaveBeenCalled();
});

test("a failed email warns without undoing the approval or skipping anyone else", async () => {
  sendEmail.mockResolvedValueOnce(false);
  const result = await applyStakeholderExemptionAction(
    message.engagementId,
    input,
  );
  expect(result.success).toBe(true);
  expect(result.warning).toContain("notification emails may not have sent");
  expect(applyStakeholderExemption).toHaveBeenCalledTimes(1);
  expect(sendEmail).toHaveBeenCalledTimes(exemptionRecipients.length);
});

test("an unexpected sender rejection still tries everyone else", async () => {
  sendEmail.mockRejectedValueOnce(new Error("Sender failed"));
  const result = await applyStakeholderExemptionAction(
    message.engagementId,
    input,
  );
  expect(result.success).toBe(true);
  expect(result.warning).toContain("notification emails may not have sent");
  expect(sendEmail).toHaveBeenCalledTimes(exemptionRecipients.length);
});

test("no active Receptionist warns, and the other stages are still emailed", async () => {
  applyStakeholderExemption.mockResolvedValueOnce({
    ...decision,
    exemptionRecipients: exemptionRecipients.filter(
      (recipient) => recipient.audience !== "Receptionist",
    ),
  });
  const result = await applyStakeholderExemptionAction(
    message.engagementId,
    input,
  );
  expect(result.success).toBe(true);
  expect(result.warning).toContain("no active Receptionist");
  expect(sendEmail).toHaveBeenCalledTimes(4);
});

test("refresh failure after commit reports success with a refresh warning", async () => {
  revalidatePath.mockImplementationOnce(() => {
    throw new Error("Refresh failed");
  });
  const result = await applyStakeholderExemptionAction(
    message.engagementId,
    input,
  );
  expect(result.success).toBe(true);
  expect(result.warning).toContain("approval is saved");
  expect(sendEmail).toHaveBeenCalledTimes(exemptionRecipients.length);
  expect(applyStakeholderExemption).toHaveBeenCalledTimes(1);
});

test("template configuration failure after commit is a warning, not a failed approval", async () => {
  delete process.env.AUTH_URL;
  const result = await applyStakeholderExemptionAction(
    message.engagementId,
    input,
  );
  expect(result.success).toBe(true);
  expect(result.warning).toContain("notification emails may not have sent");
  expect(sendEmail).not.toHaveBeenCalled();
});
