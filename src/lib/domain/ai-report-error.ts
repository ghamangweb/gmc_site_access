export const AI_REPORT_TIMEOUT_MESSAGE =
  "Report generation took too long. Please try again.";

export class AiReportTimeoutError extends Error {
  constructor() {
    super(AI_REPORT_TIMEOUT_MESSAGE);
    this.name = "AiReportTimeoutError";
  }
}
