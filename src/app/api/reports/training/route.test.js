import { beforeEach, expect, test } from "bun:test";
import { exportTrainingCsv, requireWriteAccess } from "../report-test-mocks";

const { GET } = await import("./route");

beforeEach(() => {
  requireWriteAccess.mockClear();
  exportTrainingCsv.mockClear();
});

test("unauthorized users cannot query report data", async () => {
  requireWriteAccess.mockRejectedValueOnce(new Error("Write access required"));
  const response = await GET(
    new Request("https://example.test/api/reports/training"),
  );

  expect(response.status).toBe(403);
  expect(requireWriteAccess).toHaveBeenCalledWith("TrainingStaff");
  expect(exportTrainingCsv).not.toHaveBeenCalled();
});

test("old tab parameters do not restrict the combined report", async () => {
  const response = await GET(
    new Request("https://example.test/api/reports/training?view=all"),
  );

  expect(response.status).toBe(200);
  expect(exportTrainingCsv).toHaveBeenCalledWith();
});

test("combined export ignores tab, search, and displayed page", async () => {
  const response = await GET(
    new Request(
      "https://example.test/api/reports/training?view=recorded&q=Mensah&page=3",
    ),
  );

  expect(exportTrainingCsv).toHaveBeenCalledWith();
  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toBe("text/csv; charset=utf-8");
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(response.headers.get("content-disposition")).toMatch(
    /^attachment; filename="training-report-\d{4}-\d{2}-\d{2}\.csv"$/,
  );
});

test("default export downloads the combined report", async () => {
  const response = await GET(
    new Request("https://example.test/api/reports/training"),
  );

  expect(response.status).toBe(200);
  expect(exportTrainingCsv).toHaveBeenCalledWith();
});
