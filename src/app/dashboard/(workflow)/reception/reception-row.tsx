"use client";

import { MoreHorizontalIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { requestTerminationAction } from "@/actions/engagements";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { TableCell, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  ACCESS_PURPOSE_LABELS,
  type AccessPurpose,
  WORKFLOW_STATE_LABELS,
  type WorkflowState,
} from "@/lib/domain/types";

export const WORKFLOW_STATE_BADGE: Record<WorkflowState, string> = {
  Draft: "bg-status-neutral-bg text-status-neutral-fg",
  AtReception: "bg-status-info-bg text-status-info-fg",
  AtHospital: "bg-status-info-bg text-status-info-fg",
  AtTraining: "bg-status-info-bg text-status-info-fg",
  AtSecurity: "bg-status-info-bg text-status-info-fg",
  AwaitingProvisioning: "bg-status-neutral-bg text-status-neutral-fg",
  Completed: "bg-status-success-bg text-status-success-fg",
  Cancelled: "bg-status-danger-bg text-status-danger-fg",
};

type ReceptionRowProps = {
  engagementId: string;
  personName: string;
  passportNo: string;
  accessPurpose: string;
  workflowState: WorkflowState;
  canManage: boolean;
};

export function ReceptionRow({
  engagementId,
  personName,
  passportNo,
  accessPurpose,
  workflowState,
  canManage,
}: ReceptionRowProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();

  const eligibleForTermination =
    workflowState !== "Cancelled" && workflowState !== "Completed";

  function handleSubmit() {
    startTransition(async () => {
      const result = await requestTerminationAction(engagementId, reason);
      if (result.success) {
        setOpen(false);
        setReason("");
        if (result.warning) {
          toast.warning(result.warning);
        } else {
          toast.success("Termination requested");
        }
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <>
      <TableRow
        className="cursor-pointer"
        onClick={() => router.push(`/dashboard/reception/${engagementId}`)}
      >
        <TableCell>
          <Link href={`/dashboard/reception/${engagementId}`}>
            {personName}
          </Link>
        </TableCell>
        <TableCell>{passportNo}</TableCell>
        <TableCell>
          {ACCESS_PURPOSE_LABELS[accessPurpose as AccessPurpose]}
        </TableCell>
        <TableCell>
          <Badge className={WORKFLOW_STATE_BADGE[workflowState]}>
            {WORKFLOW_STATE_LABELS[workflowState]}
          </Badge>
        </TableCell>
        {canManage && (
          <TableCell className="text-right">
            {eligibleForTermination && (
              // biome-ignore lint/a11y/noStaticElementInteractions: firewall only — stops the click bubbling to the row's navigation onClick, the DropdownMenuTrigger/Item inside are the real interactive elements
              // biome-ignore lint/a11y/useKeyWithClickEvents: same — this span has no keyboard-relevant behavior of its own
              <span onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="size-8">
                      <MoreHorizontalIcon />
                      <span className="sr-only">Open menu</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => setOpen(true)}>
                      Request Termination
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </span>
            )}
          </TableCell>
        )}
      </TableRow>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setReason("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Termination</DialogTitle>
            <DialogDescription>
              Notifies the System Administrator to review and approve access
              revocation for {personName}.
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
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleSubmit}
              loading={isPending}
              disabled={!reason.trim()}
            >
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
