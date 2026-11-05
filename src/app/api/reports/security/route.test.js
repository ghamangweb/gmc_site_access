import { beforeEach, expect, test } from "bun:test";
import {
  exportSecurityRows,
  requireWriteAccess,
  workbookSheetNames,
} from "../report-test-mocks";

const { GET } = await import("./route");

beforeEach(() => {
  requireWriteAccess.mockClear();
  exportSecurityRows.mockClear();
});

test("unauthorized users cannot query Security report data", async () => {
  requireWriteAccess.mockRejectedValueOnce(new Error("Write access required"));
  const response = await GET(
    new Request("https://example.test/api/reports/security"),
  );
  expect(response.status).toBe(403);
  expect(requireWriteAccess).toHaveBeenCalledWith("SecurityStaff");
  expect(exportSecurityRows).not.toHaveBeenCalled();
  expect(response.headers.get("cache-control")).toBe("no-store");
});

test("combined CSV ignores selected tab, search, and displayed page", async () => {
  const response = await GET(
    new Request(
      "https://example.test/api/reports/security?view=revocations&q=Mensah&page=3",
    ),
  );
  expect(response.status).toBe(200);
  expect(exportSecurityRows).toHaveBeenCalledWith();
  expect(response.headers.get("content-type")).toBe(
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  expect(response.headers.get("content-disposition")).toMatch(
    /^attachment; filename="security-data-\d{4}-\d{2}-\d{2}\.xlsx"$/,
  );
  const bytes = new Uint8Array(await response.arrayBuffer());
  // An .xlsx is a zip: it starts with "PK". All Records first, then the tabs.
  expect(Array.from(bytes.slice(0, 2))).toEqual([0x50, 0x4b]);
  expect(await workbookSheetNames(bytes)).toEqual([
    "All Records",
    "Awaiting Review",
    "Site Access Granted",
    "Revocations",
  ]);
});

test("failed exports return a non-cacheable error without exposing internal details", async () => {
  exportSecurityRows.mockRejectedValueOnce(new Error("Database unavailable"));
  const response = await GET(
    new Request("https://example.test/api/reports/security"),
  );
  expect(response.status).toBe(500);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(await response.json()).toEqual({
    success: false,
    error: "Couldn't export security records. Please try again.",
  });
});
