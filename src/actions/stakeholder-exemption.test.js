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
};
const input = {
  signature: JSON.stringify({ mode: "type", value: "Jane Doe" }),
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
const recipients = [
  { id: "reception-1", email: "reception-1@example.test" },
  { id: "reception-2", email: "reception-2@example.test" },
];
const decision = {
  engagement: { id: message.engagementId, workflowState: "AtTraining" },
  recipients,
  nextRole: "TrainingStaff",
  exemptionMessage: message,
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

test("exemption sends the saved details only to returned Reception recipients and refreshes workflow pages", async () => {
  expect(
    await applyStakeholderExemptionAction(message.engagementId, input),
  ).toEqual({ success: true });
  expect(applyStakeholderExemption).toHaveBeenCalledWith(
    message.engagementId,
    session,
    {
      ...input,
      exemption: { ...input.exemption, reason: "Medical already verified" },
    },
    session.staffUserId,
  );
  expect(sendEmail.mock.calls.map(([email]) => email.to)).toEqual(
    recipients.map((recipient) => recipient.email),
  );
  for (const [email] of sendEmail.mock.calls) {
    expect(email.subject).toContain(
      "Workflow Exemption Approved - Kojo Mensah",
    );
    expect(email.html).toContain("Medical already verified");
    expect(email.html).toContain("G1234567");
    expect(email.html).toContain("Training School");
    expect(email.html).toContain("/dashboard/reception/engagement-1");
    expect(email.html).not.toContain("/dashboard/training/");
  }
  expect(revalidatePath).toHaveBeenCalledWith("/dashboard", "layout");
  expect(revalidatePath).toHaveBeenCalledWith("/dashboard/training");
});

test("Guest, MM, delegates and unconfirmed PIN cannot invoke exemption approval", async () => {
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
    { ...input, signature: "" },
    { ...input, exemption: { stages: [], reason: "Reason" } },
    { ...input, exemption: { stages: ["Hospital"], reason: " " } },
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

test("a failed email warns without undoing approval or skipping other Reception recipients", async () => {
  sendEmail.mockResolvedValueOnce(false);
  const result = await applyStakeholderExemptionAction(
    message.engagementId,
    input,
  );
  expect(result.success).toBe(true);
  expect(result.warning).toContain("Reception notification emails");
  expect(applyStakeholderExemption).toHaveBeenCalledTimes(1);
  expect(sendEmail).toHaveBeenCalledTimes(2);
});

test("an unexpected sender rejection still tries the other Reception address", async () => {
  sendEmail.mockRejectedValueOnce(new Error("Sender failed"));
  const result = await applyStakeholderExemptionAction(
    message.engagementId,
    input,
  );
  expect(result.success).toBe(true);
  expect(result.warning).toContain("Reception notification emails");
  expect(sendEmail).toHaveBeenCalledTimes(2);
});

test("missing active Reception users produces a saved-approval warning without sending to another department", async () => {
  applyStakeholderExemption.mockResolvedValueOnce({
    ...decision,
    recipients: [],
  });
  const result = await applyStakeholderExemptionAction(
    message.engagementId,
    input,
  );
  expect(result.success).toBe(true);
  expect(result.warning).toContain("no active Receptionist");
  expect(sendEmail).not.toHaveBeenCalled();
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
  expect(sendEmail).toHaveBeenCalledTimes(2);
  expect(applyStakeholderExemption).toHaveBeenCalledTimes(1);
});

test("template configuration failure after commit is a warning, not a failed approval", async () => {
  delete process.env.AUTH_URL;
  const result = await applyStakeholderExemptionAction(
    message.engagementId,
    input,
  );
  expect(result.success).toBe(true);
  expect(result.warning).toContain("Reception notification emails");
  expect(sendEmail).not.toHaveBeenCalled();
});
