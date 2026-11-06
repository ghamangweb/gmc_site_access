import assert from "node:assert/strict";
import { test } from "node:test";
import { isSamePhoneNumber } from "./phone-numbers";

test("identifies the same international phone number despite formatting", () => {
  assert.equal(isSamePhoneNumber("+233 241234567", "+233 (24) 123-4567"), true);
  assert.equal(isSamePhoneNumber("+44 7911123456", "+44 07911 123456"), true);
});

test("allows different numbers and the same national number in different countries", () => {
  assert.equal(isSamePhoneNumber("+233 241234567", "+233 241234568"), false);
  assert.equal(isSamePhoneNumber("+1 2025550123", "+20 12025550123"), false);
});

test("leaves missing and invalid values to the phone field's own validation", () => {
  assert.equal(isSamePhoneNumber("", ""), false);
  assert.equal(isSamePhoneNumber("+233", "+233"), false);
  assert.equal(isSamePhoneNumber("not a number", "not a number"), false);
});
