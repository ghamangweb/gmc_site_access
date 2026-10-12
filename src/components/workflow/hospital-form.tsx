"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { submitHospitalClearanceAction } from "@/actions/engagements";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DocumentSelector } from "@/components/workflow/document-selector";
import type { HospitalClearanceStatus } from "@/lib/domain/types";
import type { Document } from "@/lib/services/document-service";

const STATUS_LABELS: Record<HospitalClearanceStatus, string> = {
  Fit: "Fit",
  FitWithConditions: "Fit with Conditions",
  Unfit: "Unfit",
};

// What each outcome does to the engagement, per project-overview.md. Spelled
// out because the three are not interchangeable: one advances the visitor,
// one advances them and warns Reception, one holds them here.
const STATUS_CONSEQUENCES: Record<HospitalClearanceStatus, string> = {
  Fit: "Proceeds to Training School.",
  FitWithConditions: "Proceeds to Training School, and Reception is notified.",
  Unfit: "Stays at the Hospital stage, and Reception is notified.",
};

type LatestClearance = {
  clearanceStatus: HospitalClearanceStatus;
  doctorComments: string;
  clearanceDate: Date;
};

type HospitalFormProps = {
  engagementId: string;
  uploadedDocuments: Document[];
  latestClearance?: LatestClearance;
  readOnly: boolean;
};

export function HospitalForm({
  engagementId,
  uploadedDocuments,
  latestClearance,
  readOnly,
}: HospitalFormProps) {
  const [status, setStatus] = useState<HospitalClearanceStatus | "">("");
  const [comments, setComments] = useState("");
  const [isPending, startTransition] = useTransition();

  const disabled = readOnly || isPending;
  const hasFitnessForm = uploadedDocuments.some(
    (doc) => doc.docType === "hospital_fitness_form",
  );
  const canSubmit =
    !disabled && hasFitnessForm && status !== "" && comments.trim().length > 0;

  function handleSubmit() {
    if (status === "") return;

    startTransition(async () => {
      const result = await submitHospitalClearanceAction(engagementId, {
        clearanceStatus: status,
        doctorComments: comments,
      });
      if (result.success) {
        setStatus("");
        setComments("");
        if (result.warning) {
          toast.warning(result.warning);
        } else {
          toast.success("Clearance recorded");
        }
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <h2 className="text-lg font-semibold text-foreground mb-4">
        Hospital Clearance
      </h2>

      {latestClearance && (
        <p className="mb-4 text-xs text-muted-foreground">
          Last recorded: {STATUS_LABELS[latestClearance.clearanceStatus]} —{" "}
          {latestClearance.doctorComments} (
          {latestClearance.clearanceDate.toLocaleDateString()})
        </p>
      )}

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label>Fitness Form *</Label>
          <DocumentSelector
            engagementId={engagementId}
            mode="required"
            docTypes={["hospital_fitness_form"]}
            uploadedDocuments={uploadedDocuments}
            disabled={disabled}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label>Clearance Status *</Label>
          <Select
            value={status}
            onValueChange={(value) =>
              setStatus(value as HospitalClearanceStatus)
            }
            disabled={disabled}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(STATUS_LABELS) as HospitalClearanceStatus[]).map(
                (value) => (
                  <SelectItem key={value} value={value}>
                    {STATUS_LABELS[value]}
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>
          {status !== "" && (
            <p className="text-xs text-muted-foreground">
              {STATUS_CONSEQUENCES[status]}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label>Doctor Comments *</Label>
          <Textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            disabled={disabled}
          />
        </div>

        {!readOnly && (
          <div className="flex justify-end">
            <Button
              type="button"
              loading={isPending}
              disabled={!canSubmit}
              onClick={handleSubmit}
            >
              Submit Clearance
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
