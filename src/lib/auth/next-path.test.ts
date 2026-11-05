import assert from "node:assert/strict";
import { test } from "node:test";
import { safeCallbackPath, safeNextPath } from "./next-path";

test("next: only same-site /dashboard paths", () => {
  assert.equal(
    safeNextPath("/dashboard/hospital/abc"),
    "/dashboard/hospital/abc",
  );
  assert.equal(safeNextPath("//evil.example/dashboard"), undefined);
  assert.equal(safeNextPath("/dashboard\\..\\evil"), undefined);
  assert.equal(safeNextPath("/sign-in"), undefined);
  assert.equal(safeNextPath(undefined), undefined);
});

test("callbackUrl: keeps the path and query of an absolute URL", () => {
  assert.equal(
    safeCallbackPath("http://localhost:3000/dashboard/security?view=granted"),
    "/dashboard/security?view=granted",
  );
  assert.equal(
    safeCallbackPath("/dashboard/approvals"),
    "/dashboard/approvals",
  );
});

test("callbackUrl: anything that isn't a /dashboard path is dropped", () => {
  // A foreign host can only ever contribute a path back into this site — and
  // only a /dashboard one.
  assert.equal(safeCallbackPath("https://evil.example/phish"), undefined);
  assert.equal(safeCallbackPath("http://localhost:3000/"), undefined);
  assert.equal(safeCallbackPath("//evil.example/dashboard"), undefined);
  assert.equal(safeCallbackPath("javascript:alert(1)"), undefined);
  assert.equal(safeCallbackPath("not a url"), undefined);
  assert.equal(safeCallbackPath(undefined), undefined);
});
