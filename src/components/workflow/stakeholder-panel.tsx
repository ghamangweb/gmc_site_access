"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  applyStakeholderApprovalAction,
  requestDelegatedApprovalAction,
  requestStakeholderApprovalAction,
} from "@/actions/engagements";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import {
  SignatureField,
  type SignatureValue,
} from "@/components/workflow/signature-field";
import type { ApproverRole } from "@/lib/domain/types";
import type { StakeholderApproval } from "@/lib/services/workflow-service";

type StakeholderPanelProps = {
  engagementId: string;
  approvals: StakeholderApproval[];
  approveAs: ApproverRole | null;
  canRequestApproval: boolean;
  /** Where to send the approver once they've signed. A stakeholder belongs
   * back in their own queue, not in Reception's. */
  returnHref?: string;
};

export function StakeholderPanel({
  engagementId,
  returnHref = "/dashboard/reception",
  approvals,
  approveAs,
  canRequestApproval,
}: StakeholderPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [delegateOpen, setDelegateOpen] = useState(false);
  const [delegateReason, setDelegateReason] = useState("");
  const [approveOpen, setApproveOpen] = useState(false);
  const [signature, setSignature] = useState<SignatureValue | null>(null);
  const redirectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }
    };
  }, []);

  const approval = approvals[0];

  if (approval) {
    return (
      <Card className="flex flex-col gap-2 p-6">
        <h2 className="text-lg font-semibold text-foreground">
          Stakeholder Approval
        </h2>
        <p className="text-sm text-foreground">
          Approved by {approval.approverName} ({approval.approverRole})
        </p>
        <p className="text-xs text-muted-foreground">
          {new Date(approval.approvedAt).toLocaleString()}
        </p>
        {approval.isDelegated && (
          <Badge className="w-fit bg-status-warning-bg text-status-warning-fg">
            Delegated approval
          </Badge>
        )}
      </Card>
    );
  }

  function handleRequestApproval() {
    startTransition(async () => {
      const result = await requestStakeholderApprovalAction(engagementId);
      if (result.success) {
        if (result.warning) {
          toast.warning(result.warning);
        } else {
          toast.success("Stakeholder approval requested");
        }
        redirectTimeoutRef.current = setTimeout(
          () => router.push(returnHref),
          2000,
        );
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleRequestDelegated() {
    startTransition(async () => {
      const result = await requestDelegatedApprovalAction(
        engagementId,
        delegateReason,
      );
      if (result.success) {
        if (result.warning) {
          toast.warning(result.warning);
        } else {
          toast.success("Delegated approval requested");
        }
        setDelegateOpen(false);
      } else {
        toast.error(result.error);
      }
    });
  }

  const hasSignature = !!signature?.value.trim();

  function handleApprove() {
    if (!hasSignature) {
      toast.error("Capture a signature first");
      return;
    }
    startTransition(async () => {
      const result = await applyStakeholderApprovalAction(engagementId, {
        signature: JSON.stringify(signature),
      });
      if (result.success) {
        if (result.warning) {
          toast.warning(result.warning);
        } else {
          toast.success("Engagement approved");
        }
        setApproveOpen(false);
        redirectTimeoutRef.current = setTimeout(
          () => router.push("/dashboard/reception"),
          2000,
        );
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Card className="flex flex-col gap-4 p-6">
      <h2 className="text-lg font-semibold text-foreground">
        Stakeholder Approval
      </h2>
      <p className="text-sm text-muted-foreground">
        Awaiting approval from HCM, GMM, or DMD.
      </p>

      <div className="flex flex-wrap gap-2">
        {canRequestApproval && (
          <>
            <Button loading={isPending} onClick={handleRequestApproval}>
              Request Approval
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDelegateOpen(true)}
            >
              Request Delegated Approval
            </Button>
          </>
        )}
        {approveAs && (
          <Button onClick={() => setApproveOpen(true)}>Approve</Button>
        )}
      </div>

      <Dialog open={delegateOpen} onOpenChange={setDelegateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Delegated Approval</DialogTitle>
            <DialogDescription>
              Notifies HCM, GMM, DMD, and the System Administrator that all
              three approvers are unavailable.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label>Reason *</Label>
            <Textarea
              value={delegateReason}
              onChange={(e) => setDelegateReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDelegateOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRequestDelegated}
              loading={isPending}
              disabled={!delegateReason}
            >
              Send Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Engagement</DialogTitle>
            <DialogDescription>
              Your signature will be recorded with the approval timestamp.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label>Signature *</Label>
            <SignatureField value={signature} onChange={setSignature} />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setApproveOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleApprove}
              loading={isPending}
              disabled={!hasSignature}
            >
              Confirm Approval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
