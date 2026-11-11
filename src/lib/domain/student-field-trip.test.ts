import assert from "node:assert/strict";
import { test } from "node:test";
import { registrationRequestToFormValues } from "./registration-prefill";
import {
  getStudentListFileError,
  LOCAL_EMPLOYMENT_STATUSES,
  STUDENT_FIELD_TRIP,
  STUDENT_LIST_MAX_BYTES,
  studentFieldTripSchema,
} from "./student-field-trip";
import {
  getRegistrationDocTypes,
  getRequiredRegistrationDocTypes,
  isApplicableDocType,
} from "./types";

test("local status options contain only the three local choices", () => {
  assert.deepEqual(LOCAL_EMPLOYMENT_STATUSES, [
    "Visitor (Local)",
    "Third Party Contractor",
    "Student Field Trip",
  ]);
});

test("only local student field trips require a student list", () => {
  assert.deepEqual(
    getRequiredRegistrationDocTypes("Local", undefined, STUDENT_FIELD_TRIP),
    ["ghana_card", "student_list"],
  );
  assert.deepEqual(
    getRequiredRegistrationDocTypes("Local", undefined, "Visitor (Local)"),
    ["ghana_card"],
  );
  assert.deepEqual(
    getRequiredRegistrationDocTypes(
      "Foreign",
      "Visa on Arrival",
      STUDENT_FIELD_TRIP,
    ),
    ["passport_biodata"],
  );
  assert.ok(getRegistrationDocTypes("Local").includes("student_list"));
  assert.ok(!getRegistrationDocTypes("Foreign").includes("student_list"));
  assert.equal(isApplicableDocType("student_list"), false);
});

test("school details require a school and a positive integer count", () => {
  assert.deepEqual(
    studentFieldTripSchema.parse({
      schoolName: "  Local School  ",
      studentCount: 30,
    }),
    { schoolName: "Local School", studentCount: 30 },
  );

  for (const studentCount of [
    0,
    -1,
    1.5,
    NaN,
    Infinity,
    2147483648,
    "30",
    null,
  ]) {
    assert.equal(
      studentFieldTripSchema.safeParse({
        schoolName: "Local School",
        studentCount,
      }).success,
      false,
    );
  }

  for (const schoolName of ["", "  ", "a".repeat(201), null]) {
    assert.equal(
      studentFieldTripSchema.safeParse({ schoolName, studentCount: 30 })
        .success,
      false,
    );
  }
});

test("student list validation accepts CSV and both Excel formats including browser MIME fallbacks", () => {
  for (const [name, type] of [
    ["students.csv", "text/csv"],
    ["students.CSV", "application/vnd.ms-excel"],
    ["students.xls", "application/vnd.ms-excel"],
    [
      "students.xlsx",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ],
    ["students.csv", ""],
    ["students.xlsx", "application/octet-stream"],
  ]) {
    assert.equal(
      getStudentListFileError({ name, type, size: STUDENT_LIST_MAX_BYTES }),
      null,
    );
  }
});

test("student lists reject unsupported, empty and oversized files", () => {
  for (const file of [
    { name: "students.pdf", type: "application/pdf", size: 100 },
    { name: "students.xlsm", type: "application/vnd.ms-excel", size: 100 },
    { name: "students.csv.exe", type: "application/octet-stream", size: 100 },
    { name: "students.csv", type: "text/html", size: 100 },
    { name: "students.csv", type: "text/csv", size: 0 },
    {
      name: "students.csv",
      type: "text/csv",
      size: STUDENT_LIST_MAX_BYTES + 1,
    },
  ]) {
    assert.ok(getStudentListFileError(file));
  }
});

test("school details survive registration prefill for staff and older submissions still load", () => {
  const registrationData = {
    employmentStatus: STUDENT_FIELD_TRIP,
    schoolName: "Local School",
    studentCount: 30,
  };

  const local = registrationRequestToFormValues({ registrationData });

  const converted = registrationRequestToFormValues({
    receptionData: registrationData,
  });

  assert.equal(local.schoolName, "Local School");
  assert.equal(local.studentCount, 30);
  assert.deepEqual(converted, local);
  assert.deepEqual(
    registrationRequestToFormValues({
      registrationData: { employmentStatus: "Employee" },
    }),
    { employmentStatus: "Employee" },
  );
  assert.equal(
    registrationRequestToFormValues({ registrationData: { studentCount: -2 } })
      .studentCount,
    undefined,
  );
});
