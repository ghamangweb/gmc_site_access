import { afterEach, beforeEach, expect, mock, spyOn, test } from "bun:test";

import { AiReportTimeoutError } from "@/lib/domain/ai-report-error";
import { workflowAiReportData } from "@/lib/domain/workflow-ai-report";

// Next.js supplies this marker; the test runs the server helper outside Next.js.
mock.module("server-only", () => ({}));

const { generateAiReport } = await import("./ai-report-service");

const originalKey = process.env.GEMINI_API_KEY;

const originalModel = process.env.GEMINI_MODEL;

const data = workflowAiReportData(
  "Reception",
  { start: "2026-11-01", end: "2026-11-08" },
  [],
  new Date("2026-11-08T12:00:00Z"),
);

const report = {
  executiveSummary: "No matching records were found.",
  keyFindings: [],
  workloadAnalysis: "There are no matching records to analyse.",
  recommendedActions: [],
};

let fetchSpy;

function response(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  process.env.GEMINI_API_KEY = "report-test-key";
  process.env.GEMINI_MODEL = "gemini-3.8-flash";
  fetchSpy = spyOn(globalThis, "fetch");
});

afterEach(() => {
  fetchSpy.mockRestore();

  if (originalKey === undefined) delete process.env.GEMINI_API_KEY;
  else process.env.GEMINI_API_KEY = originalKey;

  if (originalModel === undefined) delete process.env.GEMINI_MODEL;
  else process.env.GEMINI_MODEL = originalModel;
});

for (const model of [
  "gemini-3.8-flash",
  "models/gemini-3.8-flash",
  "gemini-2.5-flash",
]) {
  test(`${model} receives compatible reasoning settings through the real SDK serializer`, async () => {
    process.env.GEMINI_MODEL = model;
    fetchSpy.mockResolvedValueOnce(
      response({
        candidates: [
          {
            finishReason: "STOP",
            content: {
              role: "model",
              parts: [{ text: JSON.stringify(report) }],
            },
          },
        ],
      }),
    );

    expect(await generateAiReport(data)).toEqual(report);

    const body = JSON.parse(fetchSpy.mock.calls[0][1].body);

    expect(body.generationConfig.thinkingConfig?.thinkingLevel).toBe(
      model.includes("gemini-3") ? "LOW" : undefined,
    );
    expect(body.generationConfig.responseMimeType).toBe("application/json");
    expect(body.generationConfig.responseJsonSchema.required).toContain(
      "executiveSummary",
    );
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
}

test("Google's 504 deadline response becomes a safe report timeout", async () => {
  fetchSpy.mockResolvedValueOnce(
    response(
      {
        error: {
          code: 504,
          status: "DEADLINE_EXCEEDED",
          message: "PRIVATE provider details",
        },
      },
      504,
    ),
  );

  await expect(generateAiReport(data)).rejects.toBeInstanceOf(
    AiReportTimeoutError,
  );
  expect(fetchSpy).toHaveBeenCalledTimes(1);
});

for (const name of ["TimeoutError", "AbortError"]) {
  test(`${name} becomes a safe report timeout`, async () => {
    fetchSpy.mockRejectedValueOnce(
      new DOMException("PRIVATE transport details", name),
    );

    await expect(generateAiReport(data)).rejects.toBeInstanceOf(
      AiReportTimeoutError,
    );
  });
}

test("malformed generated reports still fail validation without exposing their content", async () => {
  fetchSpy.mockResolvedValueOnce(
    response({
      candidates: [
        {
          finishReason: "STOP",
          content: {
            role: "model",
            parts: [
              {
                text: JSON.stringify({ executiveSummary: "PRIVATE response" }),
              },
            ],
          },
        },
      ],
    }),
  );

  await expect(generateAiReport(data)).rejects.toThrow(
    "Couldn't generate the report. Please try again.",
  );
});
