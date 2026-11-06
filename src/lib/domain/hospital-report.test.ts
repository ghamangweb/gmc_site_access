import assert from "node:assert/strict";
import { test } from "node:test";
import { csvRow } from "@/lib/csv";
import {
  HOSPITAL_REPORT_HEADERS,
  type HospitalReportClearance,
  type HospitalReportCycle,
  hospitalReportRows,
} from "./hospital-report";
import type { WorkflowExemptionReportRecord } from "./workflow-exemption-report";

const cycle: HospitalReportCycle = {
  id: "cycle-2",
  engagementId: "engagement-1",
  name: "Akosua Mensah",
  passport: "001234",
  company: "Example Ltd",
  purpose: "WorkMine",
  arrival: "2026-11-01",
  departure: "2026-12-31",
  workflowState: "AtHospital",
  archivedAt: null,
};

const clearance: HospitalReportClearance = {
  workflowCycleId: cycle.id,
  clearanceStatus: "FitWithConditions",
  doctorComments: "Follow up next week",
  clearanceDate: new Date("2026-11-04T09:00:00Z"),
  recordedByName: "Doctor One",
  nextReviewDate: "2026-11-10",
  isLatest: true,
  awaitingReview: true,
};

const exemption: WorkflowExemptionReportRecord = {
  engagementId: cycle.engagementId,
  workflowCycleId: cycle.id,
  stage: "Hospital",
  reason: "Medical evidence accepted",
  approverName: "Authoriser",
  approverRole: "CSO",
  approvedAt: new Date("2026-11-03T10:00:00Z"),
  archivedAt: null,
};

function values(row: string[]): Record<string, string> {
  assert.equal(row.length, HOSPITAL_REPORT_HEADERS.length);

  return Object.fromEntries(
    HOSPITAL_REPORT_HEADERS.map((header, index) => [header, row[index]]),
  );
}

test("awaiting cycle has one row without invented clearance, doctor or date", () => {
  const row = values(hospitalReportRows([cycle], [])[0]);
  assert.equal(row["Hospital Status"], "Awaiting Clearance");
  assert.equal(row["Current Workflow Stage"], "Hospital");
  assert.equal(row["Passport/ID Number"], "001234");

  for (const key of [
    "Clearance Outcome",
    "Doctor Comments",
    "Recorded At (UTC)",
    "Recorded By",
    "Latest Clearance",
    "Review Status",
  ]) {
    assert.equal(row[key], "");
  }
});

test("each recorded decision and review remains a separate row", () => {
  const rows = hospitalReportRows(
    [{ ...cycle, workflowState: "AtSecurity" }],
    [
      clearance,
      {
        ...clearance,
        clearanceStatus: "Unfit",
        doctorComments: "Earlier decision",
        clearanceDate: new Date("2026-11-01"),
        isLatest: false,
        awaitingReview: false,
        nextReviewDate: null,
      },
    ],
  ).map(values);

  assert.equal(rows.length, 2);
  assert.equal(rows[0]["Clearance Outcome"], "Fit with Conditions");
  assert.equal(rows[0]["Hospital Status"], "Awaiting Review");
  assert.equal(rows[0]["Recorded By"], "Doctor One");
  assert.equal(rows[0]["Recorded At (UTC)"], "09:00:00");
  assert.equal(rows[1]["Clearance Outcome"], "Unfit");
  assert.equal(rows[1]["Doctor Comments"], "Earlier decision");
  assert.equal(rows[1]["Hospital Status"], "Recorded");
  assert.equal(rows[1]["Latest Clearance"], "No");
});

test("latest Unfit at Hospital is awaiting re-clearance without a duplicate awaiting row", () => {
  const rows = hospitalReportRows(
    [cycle],
    [
      {
        ...clearance,
        clearanceStatus: "Unfit",
        nextReviewDate: null,
        awaitingReview: false,
      },
    ],
  ).map(values);

  assert.equal(rows.length, 1);
  assert.equal(rows[0]["Hospital Status"], "Awaiting Re-clearance");
  assert.equal(rows[0]["Clearance Outcome"], "Unfit");
});

test("review timing labels are deterministic for overdue, today and upcoming", () => {
  for (const [date, expected] of [
    ["2026-11-04", "Overdue"],
    ["2026-11-05", "Due Today"],
    ["2026-11-06", "Upcoming"],
  ]) {
    const row = values(
      hospitalReportRows(
        [{ ...cycle, workflowState: "Completed" }],
        [{ ...clearance, nextReviewDate: date }],
        [],
        "2026-11-05",
      )[0],
    );

    assert.equal(row["Review Status"], expected);
    assert.equal(row["Next Review Date"], date);
  }
});

test("historical or no-longer-pending review dates never claim an outstanding review", () => {
  const rows = hospitalReportRows(
    [
      {
        ...cycle,
        archivedAt: new Date("2026-11-04"),
        workflowState: "AtTraining",
      },
      { ...cycle, id: "cancelled", workflowState: "Cancelled" },
    ],
    [
      clearance,
      { ...clearance, workflowCycleId: "cancelled", awaitingReview: false },
    ],
  ).map(values);

  assert.equal(rows[0]["Hospital Status"], "Recorded");
  assert.equal(rows[0]["Review Status"], "");
  assert.equal(rows[1]["Hospital Status"], "Recorded");
  assert.equal(rows[1]["Review Status"], "");
});

test("a Medical By-pass cycle is left out of Hospital's export entirely", () => {
  assert.deepEqual(
    hospitalReportRows(
      [{ ...cycle, workflowState: "AtSecurity" }],
      [],
      [exemption],
    ),
    [],
  );
});

test("Hospital's export carries no exemption columns", () => {
  for (const header of HOSPITAL_REPORT_HEADERS) {
    assert.ok(!/Exempt/i.test(header), header);
  }
});

test("a by-pass only removes its own cycle and engagement", () => {
  // The by-passed cycle is gone; a later cycle, and an exemption on another
  // engagement, change nothing for the rows that remain.
  const rows = hospitalReportRows(
    [cycle, { ...cycle, id: "cycle-new" }],
    [clearance, { ...clearance, workflowCycleId: "cycle-new" }],
    [
      exemption,
      {
        ...exemption,
        engagementId: "another-engagement",
        workflowCycleId: "cycle-new",
      },
    ],
  ).map(values);

  assert.equal(rows.length, 1);
  assert.equal(rows[0]["Doctor Comments"], clearance.doctorComments);
});

test("a Training-only exemption (history) keeps the actual Hospital outcome", () => {
  const row = values(
    hospitalReportRows(
      [{ ...cycle, workflowState: "AtTraining" }],
      [
        {
          ...clearance,
          clearanceStatus: "Fit",
          recordedByName: null,
          nextReviewDate: null,
          awaitingReview: false,
        },
      ],
      [{ ...exemption, stage: "Training" }],
    )[0],
  );

  assert.equal(row["Hospital Status"], "Recorded");
  assert.equal(row["Clearance Outcome"], "Fit");
  assert.equal(row["Recorded By"], "");
});

test("empty data and spreadsheet safety preserve medical comments accurately", () => {
  assert.deepEqual(hospitalReportRows([], []), []);

  const row = hospitalReportRows(
    [cycle],
    [{ ...clearance, doctorComments: '=Formula, "quoted"\nSecond line' }],
  )[0];

  assert.ok(csvRow(row).includes('"\'=Formula, ""quoted""\nSecond line"'));
});
