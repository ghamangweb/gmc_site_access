import assert from "node:assert/strict";
import { test } from "node:test";
import { danger, pickAttention, success, warning } from "./attention";

test("one dot per row: any danger beats success, in the order given", () => {
  assert.deepEqual(
    pickAttention(success("Review due"), danger("Revocation requested")),
    danger("Revocation requested"),
  );
  assert.deepEqual(
    pickAttention(danger("Revocation requested"), danger("Access expired")),
    danger("Revocation requested"),
  );
  assert.deepEqual(
    pickAttention(false, success("Stay extended")),
    success("Stay extended"),
  );
});

test("no flag when nothing applies", () => {
  assert.equal(pickAttention(false, null, undefined), undefined);
  assert.equal(pickAttention(), undefined);
});

test("red beats yellow, and yellow beats green", () => {
  assert.deepEqual(
    pickAttention(warning("Stay ends in 3 days"), danger("Access expired")),
    danger("Access expired"),
  );
  assert.deepEqual(
    pickAttention(success("Review due"), warning("Stay ends in 3 days")),
    warning("Stay ends in 3 days"),
  );
});
