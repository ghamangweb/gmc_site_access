"use client";

import type { ReactElement } from "react";
import { WorkflowReportButton } from "@/components/layout/workflow-report-button";

export function ReceptionReportButton(): ReactElement {
  return <WorkflowReportButton workflow="Reception" />;
}
