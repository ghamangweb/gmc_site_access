"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  requestDelegatedApprovalAction,
  requestStakeholderApprovalAction,
} from "@/actions/engagements";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// Reception's approval requests from a queue row menu. Same actions, copy and
// toasts as the record's Stakeholder Approval panel; the server re-checks the
// stage and the required documents.

export function useRequestApproval(engagementId: string) {
  const [isRequesting, startTransition] = useTransition();

  function requestApproval() {
    startTransition(async () => {
      const result = await requestStakeholderApprovalAction(engagementId);
      if (result.success) {
        if (result.warning) {
          toast.warning(result.warning);
        } else {
          toast.success("Stakeholder approval requested");
        }
      } else {
        toast.error(result.error);
      }
    });
  }

  return { requestApproval, isRequesting };
}

type DelegatedApprovalDialogProps = {
  engagementId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function DelegatedApprovalDialog({
  engagementId,
  open,
  onOpenChange,
}: DelegatedApprovalDialogProps) {
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (!next) setReason("");
  }

  function handleSubmit() {
    startTransition(async () => {
      const result = await requestDelegatedApprovalAction(engagementId, reason);
      if (result.success) {
        if (result.warning) {
          toast.warning(result.warning);
        } else {
          toast.success("Delegated approval requested");
        }
        handleOpenChange(false);
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request Delegated Approval</DialogTitle>
          <DialogDescription>
            Notifies CSO, HCM, GMM, EM and the System Administrator that all
            four approvers are unavailable.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Label>Reason *</Label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
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
            onClick={handleSubmit}
            loading={isPending}
            disabled={!reason.trim()}
          >
            Send Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
