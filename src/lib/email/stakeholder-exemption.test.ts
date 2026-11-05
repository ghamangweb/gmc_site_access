import assert from "node:assert/strict";
import { test } from "node:test";
import type { WorkflowExemptionMessage } from "@/lib/domain/workflow-exemptions";
import { workflowExemptionNotification } from "@/lib/domain/workflow-exemptions";
import { stakeholderExemptionApprovedTemplate } from "./templates";

test("Reception exemption email escapes visitor/approver comments and preserves line breaks", () => {
  const previous = process.env.AUTH_URL;
  process.env.AUTH_URL = "https://example.test";
  try {
    const message: WorkflowExemptionMessage = {
      engagementId: "engagement-1",
      personName: "Kojo <Mensah>",
      passportNo: "G&123",
      stages: ["Hospital", "Training"],
      reason: 'Verified <script>alert("x")</script>\r\nSecond line & details',
      approverName: "Jane <Doe>",
      approverRole: "GMM",
      approvedAt: new Date("2026-11-04T10:00:00Z"),
      nextState: "AtSecurity",
    };
    const email = stakeholderExemptionApprovedTemplate(message);
    for (const expected of [
      "Kojo &lt;Mensah&gt;",
      "G&amp;123",
      "Jane &lt;Doe&gt;",
      "Hospital, Training School",
      "&lt;script&gt;",
      "<br>Second line &amp; details",
      "2026-11-04T10:00:00.000Z",
      "<strong>Security</strong>",
      "/dashboard/reception/engagement-1",
    ])
      assert.ok(email.html.includes(expected), expected);
    assert.ok(!email.html.includes("<script>"));
    // The bell notice is short (wording agreed 2026-11-05): who, and which
    // stages. Passport, approver, comment and next stage stay in the email.
    const notice = workflowExemptionNotification(message);
    assert.equal(
      notice,
      `${message.personName}'s application has been approved with an exemption from Hospital and Training School.`,
    );
    for (const absent of [message.passportNo, message.reason, "Next stage"])
      assert.ok(!notice.includes(absent), absent);
  } finally {
    if (previous === undefined) delete process.env.AUTH_URL;
    else process.env.AUTH_URL = previous;
  }
});
