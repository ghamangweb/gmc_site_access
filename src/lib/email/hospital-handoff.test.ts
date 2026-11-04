import assert from "node:assert/strict";
import { test } from "node:test";
import {
  hospitalClearedTemplate,
  hospitalFitWithConditionsTemplate,
} from "./templates";

test("Hospital emails identify the actual next department without claiming exempted induction is complete", () => {
  const previous = process.env.AUTH_URL;
  process.env.AUTH_URL = "https://example.test";
  try {
    const opts = { personName: "Kojo <Mensah>", engagementId: "example" };
    const normal = hospitalClearedTemplate(opts);
    assert.match(normal.html, /induction/i);
    const bypass = hospitalClearedTemplate({
      ...opts,
      nextRole: "SecurityStaff",
    });
    assert.match(bypass.html, /ready for Security processing/);
    assert.match(bypass.html, /dashboard\/security\/example/);
    assert.match(bypass.html, /Kojo &lt;Mensah&gt;/);
    assert.doesNotMatch(bypass.html, /due for induction|completed.*induction/i);
    const conditional = hospitalFitWithConditionsTemplate({
      ...opts,
      nextRole: "SecurityStaff",
    });
    assert.match(conditional.html, /Fit with Conditions/);
    assert.match(conditional.html, /ready for Security processing/);
    assert.doesNotMatch(conditional.html, /due for induction/);
  } finally {
    if (previous === undefined) delete process.env.AUTH_URL;
    else process.env.AUTH_URL = previous;
  }
});
