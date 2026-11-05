import { beforeEach, expect, test } from "bun:test";
import {
  exportTrainingRows,
  requireWriteAccess,
  workbookSheetNames,
} from "../report-test-mocks";

const { GET } = await import("./route");

beforeEach(() => {
  requireWriteAccess.mockClear();
  exportTrainingRows.mockClear();
});

test("unauthorized users cannot query report data", async () => {
  requireWriteAccess.mockRejectedValueOnce(new Error("Write access required"));
  const response = await GET(
    new Request("https://example.test/api/reports/training"),
  );

  expect(response.status).toBe(403);
  expect(requireWriteAccess).toHaveBeenCalledWith("TrainingStaff");
  expect(exportTrainingRows).not.toHaveBeenCalled();
});

test("old tab parameters do not restrict the combined report", async () => {
  const response = await GET(
    new Request("https://example.test/api/reports/training?view=all"),
  );

  expect(response.status).toBe(200);
  expect(exportTrainingRows).toHaveBeenCalledWith();
});

test("combined export ignores tab, search, and displayed page", async () => {
  const response = await GET(
    new Request(
      "https://example.test/api/reports/training?view=recorded&q=Mensah&page=3",
    ),
  );

  expect(exportTrainingRows).toHaveBeenCalledWith();
  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toBe(
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(response.headers.get("content-disposition")).toMatch(
    /^attachment; filename="training-data-\d{4}-\d{2}-\d{2}\.xlsx"$/,
  );
  const bytes = new Uint8Array(await response.arrayBuffer());
  // An .xlsx is a zip: it starts with "PK". All Records first, then the tabs.
  expect(Array.from(bytes.slice(0, 2))).toEqual([0x50, 0x4b]);
  expect(await workbookSheetNames(bytes)).toEqual([
    "All Records",
    "Awaiting Induction",
    "Recorded Inductions",
  ]);
});

test("default export downloads the combined report", async () => {
  const response = await GET(
    new Request("https://example.test/api/reports/training"),
  );

  expect(response.status).toBe(200);
  expect(exportTrainingRows).toHaveBeenCalledWith();
});
