"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { submitTrainingCompletionAction } from "@/actions/engagements";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DocumentSelector } from "@/components/workflow/document-selector";
import type { Document } from "@/lib/services/document-service";
import type { ClearanceAge } from "@/lib/services/workflow-service";

const REQUIRED_DOCS = [
  "induction_declaration_form",
  "induction_registration_form",
] as const;

type LatestInduction = {
  generalSiteInduction: boolean;
  otherInductions: boolean;
  trainerComments: string;
  completedAt: Date;
};

export function TrainingForm({
  engagementId,
  uploadedDocuments,
  clearance,
  latestInduction,
  readOnly,
}: {
  engagementId: string;
  uploadedDocuments: Document[];
  /** Work-path medicals expire after three months; visit+mine records never
   * went through Hospital and report `applicable: false`. */
  clearance: ClearanceAge;
  latestInduction?: LatestInduction;
  readOnly: boolean;
}) {
  const [generalSiteInduction, setGeneralSiteInduction] = useState(true);
  const [otherInductions, setOtherInductions] = useState(false);
  const [comments, setComments] = useState("");
  const [isPending, startTransition] = useTransition();

  const expired = clearance.applicable && clearance.expired;
  const disabled = readOnly || isPending || expired;

  const missingDocs = REQUIRED_DOCS.filter(
    (docType) => !uploadedDocuments.some((doc) => doc.docType === docType),
  );

  const canSubmit =
    !disabled && missingDocs.length === 0 && comments.trim().length > 0;

  function handleSubmit() {
    startTransition(async () => {
      const result = await submitTrainingCompletionAction(engagementId, {
        generalSiteInduction,
        otherInductions,
        trainerComments: comments,
      });

      if (!result.success) {
        toast.error(result.error);

        return;
      }

      if (result.warning) {
        toast.warning(result.warning);
      } else {
        toast.success("Induction recorded — forwarded to Security");
      }

      setComments("");
    });
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h2 className="mb-4 text-lg font-semibold text-foreground">
        Induction Sign-Off
      </h2>

      {clearance.applicable && (expired || clearance.expiringSoon) && (
        <div
          className={`mb-4 rounded-md px-4 py-3 text-sm ${
            expired
              ? "bg-status-danger-bg text-status-danger-fg"
              : "bg-status-warning-bg text-status-warning-fg"
          }`}
        >
          {expired
            ? "Hospital clearance has expired. This record must go back to the Hospital stage before induction can be signed off."
            : `Hospital clearance expires in ${clearance.daysRemaining} day${
                clearance.daysRemaining === 1 ? "" : "s"
              }. Complete the induction before then, or the record returns to Hospital.`}
        </div>
      )}

      {latestInduction && (
        <p className="mb-4 text-xs text-muted-foreground">
          Last recorded: {latestInduction.trainerComments} (
          {latestInduction.completedAt.toLocaleDateString()})
        </p>
      )}

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label>Induction Forms *</Label>
          <DocumentSelector
            engagementId={engagementId}
            mode="required"
            docTypes={[...REQUIRED_DOCS]}
            uploadedDocuments={uploadedDocuments}
            disabled={disabled}
          />
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Checkbox
              id="general-site-induction"
              checked={generalSiteInduction}
              onCheckedChange={(checked) =>
                setGeneralSiteInduction(checked === true)
              }
              disabled={disabled}
            />
            <Label
              htmlFor="general-site-induction"
              className="normal-case tracking-normal"
            >
              General Site Induction completed
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="other-inductions"
              checked={otherInductions}
              onCheckedChange={(checked) =>
                setOtherInductions(checked === true)
              }
              disabled={disabled}
            />
            <Label
              htmlFor="other-inductions"
              className="normal-case tracking-normal"
            >
              Other inductions / training completed
            </Label>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="trainer-comments">Trainer Comments *</Label>
          <Textarea
            id="trainer-comments"
            value={comments}
            onChange={(event) => setComments(event.target.value)}
            disabled={disabled}
          />
        </div>

        {!readOnly && (
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              onClick={handleSubmit}
              loading={isPending}
              disabled={!canSubmit}
              className="w-fit"
            >
              Complete Induction
            </Button>
            {missingDocs.length > 0 && !expired && (
              <p className="text-xs text-muted-foreground">
                Upload both induction forms to continue.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
