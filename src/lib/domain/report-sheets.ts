import type { APPROVALS_REPORT_HEADERS } from "@/lib/domain/approvals-report";
import type { HOSPITAL_REPORT_HEADERS } from "@/lib/domain/hospital-report";
import type { RECEPTION_REPORT_HEADERS } from "@/lib/domain/reception-report";
import type { SECURITY_REPORT_HEADERS } from "@/lib/domain/security-report";
import type { TRAINING_REPORT_HEADERS } from "@/lib/domain/training-report";

// A dashboard export as an Excel workbook: "All Records" carries every column
// of the existing report, then one sheet per dashboard tab with only that
// tab's rows and a shorter, agreed column set (2026-11-05). The tab sheets are
// cut from the same report rows, so they can never disagree with All Records.

type ReportRecord = Record<string, string>;

export type ReportSheetSpec<Header extends string> = {
  name: string;
  columns: readonly Header[];
  include: (row: ReportRecord) => boolean;
};

export type ReportSheet = {
  name: string;
  columns: readonly string[];
  rows: string[][];
};

export const ALL_RECORDS_SHEET = "All Records";

export function buildReportSheets<Header extends string>(
  headers: readonly Header[],
  rows: string[][],
  specs: readonly ReportSheetSpec<Header>[],
): ReportSheet[] {
  const records = rows.map((row) =>
    Object.fromEntries(
      headers.map((header, index) => [header, row[index] ?? ""]),
    ),
  );

  return [
    { name: ALL_RECORDS_SHEET, columns: headers, rows },
    ...specs.map((spec) => ({
      name: spec.name,
      columns: spec.columns,
      rows: records
        .filter(spec.include)
        .map((record) => spec.columns.map((column) => record[column] ?? "")),
    })),
  ];
}

type ReceptionHeader = (typeof RECEPTION_REPORT_HEADERS)[number];
type HospitalHeader = (typeof HOSPITAL_REPORT_HEADERS)[number];
type TrainingHeader = (typeof TRAINING_REPORT_HEADERS)[number];
type SecurityHeader = (typeof SECURITY_REPORT_HEADERS)[number];
type ApprovalsHeader = (typeof APPROVALS_REPORT_HEADERS)[number];

export const RECEPTION_SHEETS: ReportSheetSpec<ReceptionHeader>[] = [
  {
    name: "Submitted Registrations",
    columns: [
      "Name",
      "Passport/ID Number",
      "Registration Type",
      "Company",
      "Department",
      "Nature of Visit",
      "Submitted At (UTC)",
      "Submission Status",
    ],
    // What Reception's tab lists: approved submissions, converted or not.
    include: (row) =>
      row["Submission Status"] === "Approved — Awaiting Conversion" ||
      row["Submission Status"] === "Converted",
  },
  {
    name: "Engagements",
    columns: [
      "Name",
      "Passport/ID Number",
      "Company",
      "Nature of Visit",
      "Arrival Date",
      "Departure Date",
      "Current Workflow Stage",
      "Access Status",
    ],
    include: (row) => row["Current Workflow Stage"] !== "",
  },
  {
    name: "Rejected",
    columns: [
      "Name",
      "Passport/ID Number",
      "Company",
      "Nature of Visit",
      "Rejected By",
      "Rejection Reason",
      "Rejected At (UTC)",
    ],
    // A rejection only stands while the record is still at Reception.
    include: (row) =>
      row["Rejected At (UTC)"] !== "" &&
      row["Current Workflow Stage"] === "Reception",
  },
];

export const HOSPITAL_SHEETS: ReportSheetSpec<HospitalHeader>[] = [
  {
    name: "Awaiting Clearance",
    columns: [
      "Name",
      "Passport/ID Number",
      "Company",
      "Nature of Visit",
      "Arrival Date",
      "Departure Date",
    ],
    include: (row) =>
      row["Hospital Status"] === "Awaiting Clearance" ||
      row["Hospital Status"] === "Awaiting Re-clearance",
  },
  {
    name: "Awaiting Review",
    columns: [
      "Name",
      "Passport/ID Number",
      "Clearance Outcome",
      "Doctor Comments",
      "Recorded At (UTC)",
      "Recorded By",
      "Next Review Date",
      "Current Workflow Stage",
    ],
    include: (row) => row["Hospital Status"] === "Awaiting Review",
  },
  {
    name: "Recorded Clearances",
    columns: [
      "Name",
      "Passport/ID Number",
      "Clearance Outcome",
      "Doctor Comments",
      "Recorded At (UTC)",
      "Recorded By",
      "Current Workflow Stage",
    ],
    include: (row) => row["Clearance Outcome"] !== "",
  },
];

export const TRAINING_SHEETS: ReportSheetSpec<TrainingHeader>[] = [
  {
    name: "Awaiting Induction",
    columns: [
      "Name",
      "Passport/ID Number",
      "Nature of Visit",
      "Current Workflow Stage",
    ],
    include: (row) => row["Training Status"] === "Awaiting",
  },
  {
    name: "Recorded Inductions",
    columns: [
      "Name",
      "Passport/ID Number",
      "Nature of Visit",
      "General Site Induction",
      "Other Inductions",
      "Completion Date (UTC)",
      "Completed By",
    ],
    include: (row) => row["Training Status"] === "Completed",
  },
];

export const SECURITY_SHEETS: ReportSheetSpec<SecurityHeader>[] = [
  {
    name: "Awaiting Review",
    columns: [
      "Name",
      "Passport/ID Number",
      "Company",
      "Nature of Visit",
      "Arrival Date",
      "Departure Date",
    ],
    include: (row) => row["Security Status"] === "Awaiting Review",
  },
  {
    name: "Site Access Granted",
    columns: [
      "Name",
      "Passport/ID Number",
      "Company",
      "Card Type",
      "Card Number",
      "Card Expiry",
      "Activated At (UTC)",
      "Activated By",
      "Access Status",
    ],
    // Every card issued, as on the dashboard tab — including ones now
    // awaiting revocation.
    include: (row) => row["Card Number"] !== "",
  },
  {
    name: "Revocations",
    columns: [
      "Name",
      "Passport/ID Number",
      "Card Number",
      "Revocation Requested At (UTC)",
      "Revocation Requested By",
      "Revocation Reason",
    ],
    include: (row) => row["Security Status"] === "Revocation Requested",
  },
];

export const APPROVALS_SHEETS: ReportSheetSpec<ApprovalsHeader>[] = [
  {
    name: "Awaiting Approval",
    columns: [
      "Name",
      "Passport/ID Number",
      "Company",
      "Nature of Visit",
      "Arrival Date",
      "Departure Date",
      "Approval Requested At (UTC)",
      "Delegated To",
    ],
    include: (row) => row["Approval Status"] === "Awaiting Approval",
  },
  {
    name: "Approved",
    columns: [
      "Name",
      "Passport/ID Number",
      "Company",
      "Nature of Visit",
      "Approved By",
      "Approver Role",
      "Approved At (UTC)",
      "Current Workflow Stage",
      "Departure Date",
    ],
    include: (row) => row["Approval Status"] === "Approved",
  },
];
