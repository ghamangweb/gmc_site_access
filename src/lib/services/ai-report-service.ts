import "server-only";

import { ApiError, GoogleGenAI, ThinkingLevel } from "@google/genai";
import { z } from "zod";

import {
  AI_REPORT_INSTRUCTIONS,
  type AiReport,
  type AiReportData,
  aiReportDataSchema,
  aiReportSchema,
  parseAiReport,
} from "@/lib/domain/ai-report";
import { AiReportTimeoutError } from "@/lib/domain/ai-report-error";

const GENERATION_TIMEOUT_MS = 60_000;

export async function generateAiReport(data: AiReportData): Promise<AiReport> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const model = process.env.GEMINI_MODEL?.trim();

  if (!apiKey || !model) {
    throw new Error("Gemini report generation is not configured.");
  }

  const modelId = model.split("/").at(-1) ?? model;

  const parsed = aiReportDataSchema.safeParse(data);

  if (!parsed.success) {
    throw new Error("The report statistics are invalid.");
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        timeout: GENERATION_TIMEOUT_MS,
        retryOptions: { attempts: 1 },
      },
    });

    const response = await ai.models.generateContent({
      model,
      contents: `Generate the workflow report from this JSON:\n${JSON.stringify(parsed.data)}`,
      config: {
        systemInstruction: AI_REPORT_INSTRUCTIONS,
        responseMimeType: "application/json",
        responseJsonSchema: z.toJSONSchema(aiReportSchema),
        maxOutputTokens: 8192,
        thinkingConfig: modelId.startsWith("gemini-3")
          ? { thinkingLevel: ThinkingLevel.LOW }
          : undefined,
        abortSignal: AbortSignal.timeout(GENERATION_TIMEOUT_MS),
      },
    });

    if (response.candidates?.[0]?.finishReason !== "STOP") {
      throw new Error("Gemini did not complete the report.");
    }

    const text = response.text;

    if (!text?.trim()) {
      throw new Error("Gemini returned an empty report.");
    }

    return parseAiReport(text);
  } catch (error) {
    // SDK errors can contain request data; keep secrets and report content out of logs.
    console.error(
      "[ai-report] Generation failed",
      error instanceof ApiError
        ? { name: error.name, status: error.status }
        : error instanceof Error
          ? error.name
          : "Unknown error",
    );

    if (
      (error instanceof ApiError && error.status === 504) ||
      (error instanceof Error &&
        (error.name === "TimeoutError" || error.name === "AbortError"))
    ) {
      throw new AiReportTimeoutError();
    }

    throw new Error("Couldn't generate the report. Please try again.");
  }
}
