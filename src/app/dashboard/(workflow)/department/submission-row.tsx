"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  approveRegistrationRequestAction,
  rejectRegistrationRequestAction,
} from "@/actions/registration";
import { Badge } from "@/components/ui/badge";
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
import { TableCell, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { ACCESS_PURPOSE_LABELS } from "@/lib/domain/types";
import type {
  RegistrationRequestStatus,
  RegistrationRequestSummary,
} from "@/lib/services/registration-service";
import { formatQueueDate } from "@/lib/utils";

// Converted means Reception has already turned it into an Engagement — from
// the Department Head's side that is still just "Approved".
const STATUS_BADGES: Record<
  RegistrationRequestStatus,
  { label: string; className: string }
> = {
  PendingDepartmentApproval: {
    label: "Awaiting Approval",
    className: "bg-status-warning-bg text-status-warning-fg",
  },
  Approved: {
    label: "Approved",
    className: "bg-status-success-bg text-status-success-fg",
  },
  Converted: {
    label: "Approved",
    className: "bg-status-success-bg text-status-success-fg",
  },
  Rejected: {
    label: "Rejected",
    className: "bg-status-danger-bg text-status-danger-fg",
  },
};

export function SubmissionRow({
  request,
  canManage,
}: {
  request: RegistrationRequestSummary;
  canManage: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const badge = STATUS_BADGES[request.status];
  const awaiting = request.status === "PendingDepartmentApproval";

  function handleApprove() {
    startTransition(async () => {
      const result = await approveRegistrationRequestAction(request.id);
      if (result.success) {
        if (result.warning) {
          toast.warning(result.warning);
        } else {
          toast.success("Registration approved");
        }
        setApproveOpen(false);
      } else {
        toast.error("Couldn't approve registration", {
          description: result.error,
        });
      }
    });
  }

  function handleReject() {
    if (!rejectReason.trim()) {
      toast.error("Give a reason for the rejection");
      return;
    }
    startTransition(async () => {
      const result = await rejectRegistrationRequestAction(
        request.id,
        rejectReason,
      );
      if (result.success) {
        toast.success("Registration rejected");
        setRejectOpen(false);
      } else {
        toast.error("Couldn't reject registration", {
          description: result.error,
        });
      }
    });
  }

  return (
    <>
      <TableRow>
        <TableCell>{request.fullName}</TableCell>
        <TableCell>{request.registrationType}</TableCell>
        <TableCell>{ACCESS_PURPOSE_LABELS[request.accessPurpose]}</TableCell>
        <TableCell>{formatQueueDate(request.submittedAt)}</TableCell>
        <TableCell className="max-w-xs whitespace-normal">
          <div className="flex flex-col gap-1">
            <Badge className={badge.className}>{badge.label}</Badge>
            {request.status === "Rejected" && request.rejectionReason && (
              <span className="text-xs text-muted-foreground">
                Reason: {request.rejectionReason}
              </span>
            )}
          </div>
        </TableCell>
        {canManage && (
          <TableCell className="text-right">
            {awaiting && (
              <div className="flex justify-end gap-2">
                <Button size="sm" onClick={() => setApproveOpen(true)}>
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setRejectOpen(true)}
                >
                  Reject
                </Button>
              </div>
            )}
          </TableCell>
        )}
      </TableRow>

      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Registration</DialogTitle>
            <DialogDescription>
              {request.fullName}&apos;s registration goes to Reception, which is
              notified to turn it into an engagement.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setApproveOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button onClick={handleApprove} loading={isPending}>
              Confirm Approval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Registration</DialogTitle>
            <DialogDescription>
              {request.fullName}&apos;s registration will not go to Reception.
              This cannot be undone — send a new invitation if they should
              register again.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label>Reason *</Label>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setRejectOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              loading={isPending}
              disabled={!rejectReason.trim()}
            >
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
