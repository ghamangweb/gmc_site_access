"use client";

import { useId, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { AccessPurpose, ActionResult } from "@/lib/domain/types";
import {
  exemptableStages,
  type WorkflowExemptionApprovalInput,
} from "@/lib/domain/workflow-exemptions";

type StakeholderExemptionDialogProps = {
  accessPurpose: AccessPurpose;
  onApprove: (
    input: Pick<WorkflowExemptionApprovalInput, "exemption">,
  ) => Promise<ActionResult>;
  onApproved: () => void;
  /**
   * Controlled mode, for opening it from elsewhere (the approvals queue's row
   * menu). Given these, the dialog renders no trigger button of its own.
   */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

// The Medical By-pass (2026-11-05): approve the record and skip Hospital.
// Hospital is the only stage that can be by-passed, so there is nothing to
// choose — just a compulsory comment. No signature box: the stakeholder is
// signed in, and the server records their name as the approval's signature.
export function StakeholderExemptionDialog({
  accessPurpose,
  onApprove,
  onApproved,
  open: controlledOpen,
  onOpenChange,
}: StakeholderExemptionDialogProps) {
  const fieldId = useId();
  const controlled = controlledOpen !== undefined;
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlled ? controlledOpen : uncontrolledOpen;
  const setOpen = (value: boolean) =>
    controlled ? onOpenChange?.(value) : setUncontrolledOpen(value);
  const [comments, setComments] = useState("");
  const [isPending, startTransition] = useTransition();
  const [approved, setApproved] = useState(false);
  const stages = exemptableStages(accessPurpose);

  const canConfirm = !!comments.trim();

  function handleOpenChange(value: boolean): void {
    if (isPending || approved) return;

    setOpen(value);

    if (!value) {
      setComments("");
    }
  }

  function handleApprove(): void {
    if (isPending || approved || !canConfirm) return;

    startTransition(async () => {
      let result: ActionResult;

      try {
        result = await onApprove({
          exemption: { stages, reason: comments.trim() },
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
      else toast.success("Medical By-pass approved");
      onApproved();
    });
  }

  if (stages.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {!controlled && (
        <DialogTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={isPending || approved}
          >
            Medical By-pass
          </Button>
        </DialogTrigger>
      )}
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Medical By-pass</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${fieldId}-comments`}>Comments *</Label>
          <Textarea
            id={`${fieldId}-comments`}
            required
            disabled={isPending}
            value={comments}
            onChange={(event) => setComments(event.target.value)}
          />
        </div>
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
            Confirm Medical By-pass
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
