import assert from "node:assert/strict";
import { test } from "node:test";
import {
  getRegistrationDocTypes,
  getRequiredRegistrationDocTypes,
} from "./types";

test("only foreign registration offers optional passport photographs", () => {
  assert.ok(!getRegistrationDocTypes("Local").includes("passport_photo"));
  assert.ok(getRegistrationDocTypes("Foreign").includes("passport_photo"));

  for (const registrationType of ["Local", "Foreign"] as const) {
    assert.ok(
      !getRequiredRegistrationDocTypes(registrationType).includes(
        "passport_photo",
      ),
    );
  }
});

test("visa on arrival still only exempts the visa from required foreign documents", () => {
  assert.deepEqual(
    getRequiredRegistrationDocTypes("Foreign", "Visa on Arrival"),
    ["passport_biodata"],
  );
  assert.deepEqual(getRequiredRegistrationDocTypes("Foreign", "Work Visa"), [
    "passport_biodata",
    "valid_visa",
  ]);
  assert.deepEqual(getRequiredRegistrationDocTypes("Local"), ["ghana_card"]);
});
