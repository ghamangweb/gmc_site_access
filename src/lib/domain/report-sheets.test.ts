import assert from "node:assert/strict";
import { test } from "node:test";
import { HOSPITAL_REPORT_HEADERS } from "./hospital-report";
import {
  ALL_RECORDS_SHEET,
  buildReportSheets,
  HOSPITAL_SHEETS,
} from "./report-sheets";

function hospitalRow(values: Partial<Record<string, string>>): string[] {
  return HOSPITAL_REPORT_HEADERS.map((header) => values[header] ?? "");
}

test("All Records comes first with every column and every row", () => {
  const rows = [hospitalRow({ Name: "A", "Hospital Status": "Exempted" })];
  const [all] = buildReportSheets(
    HOSPITAL_REPORT_HEADERS,
    rows,
    HOSPITAL_SHEETS,
  );

  assert.equal(all?.name, ALL_RECORDS_SHEET);
  assert.deepEqual(all?.columns, HOSPITAL_REPORT_HEADERS);
  assert.deepEqual(all?.rows, rows);
});

test("each tab sheet keeps only its rows and its agreed columns, in order", () => {
  const rows = [
    hospitalRow({
      Name: "Awaiting",
      "Passport/ID Number": "P1",
      "Hospital Status": "Awaiting Clearance",
    }),
    hospitalRow({
      Name: "Back for re-clearance",
      "Hospital Status": "Awaiting Re-clearance",
      "Clearance Outcome": "Unfit",
    }),
    hospitalRow({
      Name: "Review due",
      "Hospital Status": "Awaiting Review",
      "Clearance Outcome": "Fit with Conditions",
      "Doctor Comments": "Recheck BP",
    }),
  ];

  const sheets = buildReportSheets(
    HOSPITAL_REPORT_HEADERS,
    rows,
    HOSPITAL_SHEETS,
  );

  assert.deepEqual(
    sheets.map((sheet) => sheet.name),
    [
      ALL_RECORDS_SHEET,
      "Awaiting Clearance",
      "Awaiting Review",
      "Recorded Clearances",
    ],
  );

  const awaiting = sheets[1];
  assert.deepEqual(
    awaiting?.rows.map((row) => row[0]),
    ["Awaiting", "Back for re-clearance"],
  );
  assert.deepEqual(awaiting?.rows[0], ["Awaiting", "P1", "", "", "", ""]);

  const review = sheets[2];
  assert.deepEqual(review?.columns.slice(0, 4), [
    "Name",
    "Passport/ID Number",
    "Clearance Outcome",
    "Doctor Comments",
  ]);
  assert.deepEqual(review?.rows, [
    ["Review due", "", "Fit with Conditions", "Recheck BP", "", "", "", ""],
  ]);

  // Every recorded outcome, whatever its status.
  assert.deepEqual(
    sheets[3]?.rows.map((row) => row[0]),
    ["Back for re-clearance", "Review due"],
  );
});
