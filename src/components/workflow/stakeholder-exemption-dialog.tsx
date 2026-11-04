"use client";

import { useId, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  SignatureField,
  type SignatureValue,
} from "@/components/workflow/signature-field";
import {
  type AccessPurpose,
  type ActionResult,
  WORKFLOW_EXEMPTION_STAGE_LABELS,
  type WorkflowExemptionStage,
} from "@/lib/domain/types";
import {
  approvalDestination,
  requiredWorkflowStages,
  type WorkflowExemptionApprovalInput,
  workflowExemptionNextStageLabel,
} from "@/lib/domain/workflow-exemptions";

type StakeholderExemptionDialogProps = {
  accessPurpose: AccessPurpose;
  onApprove: (input: WorkflowExemptionApprovalInput) => Promise<ActionResult>;
  onApproved: () => void;
};

export function StakeholderExemptionDialog({
  accessPurpose,
  onApprove,
  onApproved,
}: StakeholderExemptionDialogProps) {
  const fieldId = useId();
  const [open, setOpen] = useState(false);
  const [stages, setStages] = useState<WorkflowExemptionStage[]>([]);
  const [reason, setReason] = useState("");
  const [signature, setSignature] = useState<SignatureValue | null>(null);
  const [isPending, startTransition] = useTransition();
  const [approved, setApproved] = useState(false);
  const applicable = requiredWorkflowStages(accessPurpose);
  const destination = approvalDestination(accessPurpose, stages);

  const nextStage = workflowExemptionNextStageLabel(destination.nextState);

  const canConfirm =
    stages.length > 0 && !!reason.trim() && !!signature?.value.trim();

  function handleOpenChange(value: boolean): void {
    if (isPending || approved) return;

    setOpen(value);

    if (!value) {
      setStages([]);
      setReason("");
      setSignature(null);
    }
  }

  function handleApprove(): void {
    if (isPending || approved) return;

    if (!canConfirm) {
      toast.error(
        "Select at least one stage, enter a reason and capture a signature",
      );

      return;
    }

    startTransition(async () => {
      let result: ActionResult;

      try {
        result = await onApprove({
          signature: JSON.stringify(signature),
          exemption: { stages, reason: reason.trim() },
        });
      } catch {
        toast.error(
          "Couldn't confirm the approval status. Refresh this record before trying again.",
        );

        return;
      }

      if (!result.success) {
        toast.error(result.error);

        return;
      }

      setApproved(true);
      setOpen(false);

      if (result.warning) toast.warning(result.warning);
      else toast.success("Engagement approved with exemption");
      onApproved();
    });
  }

  if (applicable.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={isPending || approved}
        >
          Approve with Exemption
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Approve with Exemption</DialogTitle>
          <DialogDescription>
            Select the stages to exempt and explain why. Your reason and
            signature will be recorded with the approval.
          </DialogDescription>
        </DialogHeader>
        <fieldset className="flex flex-col gap-3" disabled={isPending}>
          <legend className="mb-3 text-sm font-medium text-foreground">
            Exempt stages *
          </legend>
          {applicable.map((stage) => (
            <div key={stage} className="flex items-center gap-2">
              <Checkbox
                disabled={isPending}
                id={`${fieldId}-${stage}`}
                checked={stages.includes(stage)}
                onCheckedChange={(checked) =>
                  setStages((selected) =>
                    checked === true
                      ? [...selected.filter((value) => value !== stage), stage]
                      : selected.filter((value) => value !== stage),
                  )
                }
              />
              <Label htmlFor={`${fieldId}-${stage}`}>
                {WORKFLOW_EXEMPTION_STAGE_LABELS[stage]}
              </Label>
            </div>
          ))}
        </fieldset>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${fieldId}-reason`}>Reason / Comment *</Label>
          <Textarea
            id={`${fieldId}-reason`}
            required
            disabled={isPending}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </div>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium text-foreground">
            Signature *
          </legend>
          <SignatureField
            value={signature}
            onChange={setSignature}
            disabled={isPending}
          />
        </fieldset>
        {stages.length > 0 && (
          <output className="text-sm text-foreground">
            After approval, this engagement will move to{" "}
            <strong>{nextStage}</strong>.
          </output>
        )}
        <p className="text-sm text-muted-foreground">
          Reception will receive the exemption details and your comment by
          dashboard notification and email.
        </p>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!canConfirm || approved}
            loading={isPending}
            onClick={handleApprove}
          >
            Confirm Exemption
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
