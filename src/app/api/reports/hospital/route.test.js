import { beforeEach, expect, test } from "bun:test";
import {
  exportHospitalRows,
  requireWriteAccess,
  workbookSheetNames,
} from "../report-test-mocks";

const { GET } = await import("./route");

beforeEach(() => {
  requireWriteAccess.mockClear();
  exportHospitalRows.mockClear();
});

test("unauthorized users cannot query Hospital report data", async () => {
  requireWriteAccess.mockRejectedValueOnce(new Error("Write access required"));
  const response = await GET(
    new Request("https://example.test/api/reports/hospital"),
  );
  expect(response.status).toBe(403);
  expect(requireWriteAccess).toHaveBeenCalledWith("HospitalStaff");
  expect(exportHospitalRows).not.toHaveBeenCalled();
  expect(response.headers.get("cache-control")).toBe("no-store");
});

test("combined CSV ignores selected tab, search, and displayed page", async () => {
  const response = await GET(
    new Request(
      "https://example.test/api/reports/hospital?view=review&q=Mensah&page=3",
    ),
  );
  expect(response.status).toBe(200);
  expect(exportHospitalRows).toHaveBeenCalledWith();
  expect(response.headers.get("content-type")).toBe(
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  expect(response.headers.get("content-disposition")).toMatch(
    /^attachment; filename="hospital-data-\d{4}-\d{2}-\d{2}\.xlsx"$/,
  );
  const bytes = new Uint8Array(await response.arrayBuffer());
  // An .xlsx is a zip: it starts with "PK". All Records first, then the tabs.
  expect(Array.from(bytes.slice(0, 2))).toEqual([0x50, 0x4b]);
  expect(await workbookSheetNames(bytes)).toEqual([
    "All Records",
    "Awaiting Clearance",
    "Awaiting Review",
    "Recorded Clearances",
  ]);
});

test("failed exports return a non-cacheable error without exposing internal details", async () => {
  exportHospitalRows.mockRejectedValueOnce(new Error("Database unavailable"));
  const response = await GET(
    new Request("https://example.test/api/reports/hospital"),
  );
  expect(response.status).toBe(500);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(await response.json()).toEqual({
    success: false,
    error: "Couldn't export hospital records. Please try again.",
  });
});
