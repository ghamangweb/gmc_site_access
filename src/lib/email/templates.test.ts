import assert from "node:assert/strict";
import { test } from "node:test";
import { registrationRejectedTemplate } from "./templates";

test("rejection notice explains the decision and the need for a new invitation without a staff-only link", () => {
  const template = registrationRejectedTemplate({
    department: "Mining",
    reason: "Visit dates are unavailable",
  });

  assert.match(template.subject, /Registration Not Approved/);
  assert.match(template.html, /Mining department/);
  assert.match(template.html, /Visit dates are unavailable/);
  assert.match(template.html, /new invitation is required/);
  assert.doesNotMatch(template.html, /\/dashboard|\/register\?token=/);
});

test("rejection notice escapes the department and reason and preserves line breaks", () => {
  const template = registrationRejectedTemplate({
    department: "Mining & <Operations>",
    reason: '<script>alert("unsafe")</script>\r\nContact the department',
  });

  assert.match(template.html, /Mining &amp; &lt;Operations&gt;/);
  assert.match(
    template.html,
    /&lt;script&gt;alert\(&quot;unsafe&quot;\)&lt;\/script&gt;<br>Contact the department/,
  );
  assert.doesNotMatch(template.html, /<script>/);
});
