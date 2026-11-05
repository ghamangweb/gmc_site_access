import { beforeEach, expect, test } from "bun:test";
import { exportHospitalCsv, requireWriteAccess } from "../report-test-mocks";

const { GET } = await import("./route");

beforeEach(() => {
  requireWriteAccess.mockClear();
  exportHospitalCsv.mockClear();
});

test("unauthorized users cannot query Hospital report data", async () => {
  requireWriteAccess.mockRejectedValueOnce(new Error("Write access required"));
  const response = await GET(
    new Request("https://example.test/api/reports/hospital"),
  );
  expect(response.status).toBe(403);
  expect(requireWriteAccess).toHaveBeenCalledWith("HospitalStaff");
  expect(exportHospitalCsv).not.toHaveBeenCalled();
  expect(response.headers.get("cache-control")).toBe("no-store");
});

test("combined CSV ignores selected tab, search, and displayed page", async () => {
  const response = await GET(
    new Request(
      "https://example.test/api/reports/hospital?view=review&q=Mensah&page=3",
    ),
  );
  expect(response.status).toBe(200);
  expect(exportHospitalCsv).toHaveBeenCalledWith();
  expect(response.headers.get("content-type")).toBe("text/csv; charset=utf-8");
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  expect(response.headers.get("content-disposition")).toMatch(
    /^attachment; filename="hospital-report-\d{4}-\d{2}-\d{2}\.csv"$/,
  );
  const bytes = new Uint8Array(await response.arrayBuffer());
  expect(Array.from(bytes.slice(0, 3))).toEqual([0xef, 0xbb, 0xbf]);
  expect(new TextDecoder().decode(bytes)).toBe('"Name"\r\n');
});

test("failed exports return a non-cacheable error without exposing internal details", async () => {
  exportHospitalCsv.mockRejectedValueOnce(new Error("Database unavailable"));
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
