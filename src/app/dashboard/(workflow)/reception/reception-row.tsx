"use client";

import { MoreVerticalIcon } from "lucide-react";
import Link from "next/link";
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
import { NameWithAttention } from "@/components/workflow/attention-dot";
import { RecordStatusBadge } from "@/components/workflow/record-status-badge";
import type { Attention } from "@/lib/domain/attention";
import { recordStatus } from "@/lib/domain/record-status";
import {
  ACCESS_PURPOSE_LABELS,
  type AccessPurpose,
  type AccessState,
  getEffectiveAccessState,
  type WorkflowState,
} from "@/lib/domain/types";

type ReceptionRowProps = {
  engagementId: string;
  personName: string;
  accessPurpose: string;
  workflowState: WorkflowState;
  accessState: string;
  /** The current card's expiry, so a lapsed card reads Expired. */
  cardExpiry: string | undefined;
  /** A stakeholder rejected it and Reception has not asked again. */
  approvalRejected: boolean;
  /** The row's attention dot, worked out by the page. */
  attention: Attention | undefined;
  canManage: boolean;
};

export function ReceptionRow({
  engagementId,
  personName,
  accessPurpose,
  workflowState,
  accessState,
  cardExpiry,
  approvalRejected,
  attention,
  canManage,
}: ReceptionRowProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();

  // Only live access can be revoked. Anything still moving through the
  // workflow is cancelled instead, and an expired or already-revoked card has
  // nothing left to switch off — read from the card's date, so a lapsed card
  // isn't offered. The server re-checks this against the card.
  const eligibleForTermination =
    getEffectiveAccessState(accessState as AccessState, cardExpiry) ===
    "Active";

  function handleSubmit() {
    startTransition(async () => {
      const result = await requestTerminationAction(engagementId, reason);
      if (result.success) {
        setOpen(false);
        setReason("");
        if (result.warning) {
          toast.warning(result.warning);
        } else {
          toast.success("Revocation requested");
        }
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <>
      {/* Not a link: the row menu's View opens the record, as on every other
          queue. */}
      <TableRow className="hover:bg-muted/50">
        <TableCell>
          <NameWithAttention attention={attention}>
            {personName}
          </NameWithAttention>
        </TableCell>
        <TableCell>
          {ACCESS_PURPOSE_LABELS[accessPurpose as AccessPurpose]}
        </TableCell>
        <TableCell>
          {approvalRejected ? (
            <Badge className="bg-status-danger-bg text-status-danger-fg">
              Approval Rejected
            </Badge>
          ) : (
            <RecordStatusBadge
              status={recordStatus({
                workflowState,
                // SAFETY: access_state is a text column written only from the
                // AccessState union.
                accessState: accessState as AccessState,
                cardExpiry,
              })}
            />
          )}
        </TableCell>
        <TableCell className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8">
                <MoreVerticalIcon />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/dashboard/reception/${engagementId}`}>View</Link>
              </DropdownMenuItem>
              {canManage && (
                <DropdownMenuItem
                  disabled={!eligibleForTermination}
                  onSelect={() => setOpen(true)}
                >
                  Request Revocation
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
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
            <DialogTitle>Request Access Revocation</DialogTitle>
            <DialogDescription>
              Asks Security to revoke site access for {personName}.
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
