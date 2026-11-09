import { beforeEach, expect, test } from "bun:test";
import { receptionAiReportData } from "@/lib/domain/reception-ai-report";
import {
  exportReceptionRows,
  generateReceptionAiReport,
  requireWriteAccess,
  workbookSheetNames,
} from "../report-test-mocks";

const { GET, POST } = await import("./route");

beforeEach(() => {
  requireWriteAccess.mockClear();
  exportReceptionRows.mockClear();
  generateReceptionAiReport.mockReset();
});

test("unauthorized users cannot query Reception report data", async () => {
  requireWriteAccess.mockRejectedValueOnce(new Error("Write access required"));
  const response = await GET(
    new Request("https://example.test/api/reports/reception"),
  );
  expect(response.status).toBe(403);
  expect(requireWriteAccess).toHaveBeenCalledWith("Receptionist");
  expect(exportReceptionRows).not.toHaveBeenCalled();
  expect(response.headers.get("cache-control")).toBe("no-store");
});

test("combined CSV ignores selected tab, search, and displayed page", async () => {
  const response = await GET(
    new Request(
      "https://example.test/api/reports/reception?view=rejected&type=Local&q=Mensah&page=3",
    ),
  );
  expect(response.status).toBe(200);
  expect(exportReceptionRows).toHaveBeenCalledWith();
  expect(response.headers.get("content-type")).toBe(
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  expect(response.headers.get("content-disposition")).toMatch(
    /^attachment; filename="reception-data-\d{4}-\d{2}-\d{2}\.xlsx"$/,
  );
  const bytes = new Uint8Array(await response.arrayBuffer());
  // An .xlsx is a zip: it starts with "PK". All Records first, then the tabs.
  expect(Array.from(bytes.slice(0, 2))).toEqual([0x50, 0x4b]);
  expect(await workbookSheetNames(bytes)).toEqual([
    "All Records",
    "Submitted Registrations",
    "Engagements",
    "Rejected",
  ]);
});

test("failed exports return a non-cacheable error without exposing internal details", async () => {
  exportReceptionRows.mockRejectedValueOnce(new Error("Database unavailable"));
  const response = await GET(
    new Request("https://example.test/api/reports/reception"),
  );
  expect(response.status).toBe(500);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(await response.json()).toEqual({
    success: false,
    error: "Couldn't export reception records. Please try again.",
  });
});

function reportRequest(
  body = JSON.stringify({ start: "2026-11-01", end: "2026-11-08" }),
) {
  return new Request("https://example.test/api/reports/reception", {
    method: "POST",
    headers: {
      origin: "https://example.test",
      "content-type": "application/json",
    },
    body,
  });
}

test("AI reports require Reception write access before generation", async () => {
  requireWriteAccess.mockRejectedValueOnce(new Error("Write access required"));

  const response = await POST(reportRequest());

  expect(response.status).toBe(403);
  expect(requireWriteAccess).toHaveBeenCalledWith("Receptionist");
  expect(generateReceptionAiReport).not.toHaveBeenCalled();
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(await response.json()).toEqual({
    success: false,
    error: "Not authorized",
  });
});

test("cross-origin and missing-origin requests cannot generate AI reports", async () => {
  for (const origin of ["https://other.test", null]) {
    const request = reportRequest();

    if (origin === null) {
      request.headers.delete("origin");
    } else {
      request.headers.set("origin", origin);
    }

    const response = await POST(request);

    expect(response.status).toBe(403);
    expect(response.headers.get("cache-control")).toBe("no-store");
  }

  expect(generateReceptionAiReport).not.toHaveBeenCalled();
});

test("AI reports reject non-JSON content before generation", async () => {
  const request = reportRequest();

  request.headers.set("content-type", "text/plain");

  const response = await POST(request);

  expect(response.status).toBe(415);
  expect(generateReceptionAiReport).not.toHaveBeenCalled();
});

test("AI reports reject malformed JSON, invalid dates and unexpected input fields", async () => {
  for (const body of [
    "not JSON",
    "null",
    "[]",
    JSON.stringify({}),
    JSON.stringify({ start: "2026-02-30", end: "2026-11-08" }),
    JSON.stringify({ start: "2026-11-09", end: "2026-11-08" }),
    JSON.stringify({
      start: "2026-11-01",
      end: "2026-11-08",
      workflow: "Hospital",
    }),
    JSON.stringify({ start: "2026-11-01", end: "2026-11-08", metrics: [] }),
  ]) {
    const response = await POST(reportRequest(body));

    expect(response.status).toBe(400);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect((await response.json()).success).toBe(false);
  }

  expect(generateReceptionAiReport).not.toHaveBeenCalled();
});

test("AI reports return authoritative statistics together with the generated summary and report", async () => {
  const period = { start: "2026-11-01", end: "2026-11-08" };

  const data = {
    statistics: receptionAiReportData(
      period,
      [],
      new Date("2026-11-08T12:00:00Z"),
    ),
    report: {
      executiveSummary: "No matching engagements were found.",
      keyFindings: [],
      workloadAnalysis: "No workload conclusions can be drawn.",
      recommendedActions: [],
    },
  };

  generateReceptionAiReport.mockResolvedValueOnce(data);

  const request = reportRequest(JSON.stringify(period));

  request.headers.set("content-type", "application/json; charset=utf-8");

  const response = await POST(request);

  expect(response.status).toBe(200);
  expect(generateReceptionAiReport).toHaveBeenCalledTimes(1);
  expect(generateReceptionAiReport).toHaveBeenCalledWith(period);
  expect(exportReceptionRows).not.toHaveBeenCalled();
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  expect(await response.json()).toEqual({ success: true, data });
});

test("generation failures return a safe error instead of internal details", async () => {
  generateReceptionAiReport.mockRejectedValueOnce(
    new Error("private database or API details"),
  );

  const response = await POST(reportRequest());

  expect(response.status).toBe(500);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(await response.json()).toEqual({
    success: false,
    error: "Couldn't generate the reception report. Please try again.",
  });
});
