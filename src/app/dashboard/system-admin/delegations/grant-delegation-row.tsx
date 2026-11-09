"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { grantDelegatedApprovalAction } from "@/actions/admin";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TableCell, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { formatQueueDate } from "@/lib/utils";

type Receptionist = { id: string; displayName: string };

type GrantDelegationRowProps = {
  engagementId: string;
  personName: string;
  receptionists: Receptionist[];
  /** Reception's request: shown in the row, and the dialog's defaults. */
  requestReason: string;
  requestedById: string | null;
  requestedByName: string;
  requestedAt: Date;
};

export function GrantDelegationRow({
  engagementId,
  personName,
  receptionists,
  requestReason,
  requestedById,
  requestedByName,
  requestedAt,
}: GrantDelegationRowProps) {
  const [open, setOpen] = useState(false);
  // The receptionist who asked is the usual delegate, and their reason the
  // usual grant reason; the System Admin can change either.
  const [receptionistId, setReceptionistId] = useState(
    receptionists.find((r) => r.id === requestedById)?.id ??
      receptionists[0]?.id ??
      "",
  );
  const [reason, setReason] = useState(requestReason);
  const [isPending, startTransition] = useTransition();

  function handleGrant() {
    startTransition(async () => {
      const result = await grantDelegatedApprovalAction(
        engagementId,
        receptionistId,
        reason,
      );
      if (result.success) {
        setOpen(false);
        if (result.warning) {
          toast.warning(result.warning);
        } else {
          toast.success("Delegated approval granted");
        }
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <TableRow>
      <TableCell>{personName}</TableCell>
      <TableCell className="max-w-xs whitespace-normal">
        {requestReason || "-"}
      </TableCell>
      <TableCell>{requestedByName}</TableCell>
      <TableCell className="text-muted-foreground">
        {formatQueueDate(requestedAt)}
      </TableCell>
      <TableCell className="text-right">
        <Button
          size="sm"
          disabled={receptionists.length === 0}
          onClick={() => setOpen(true)}
        >
          Grant
        </Button>
      </TableCell>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Grant Delegated Approval</DialogTitle>
            <DialogDescription>
              Allows the selected Receptionist to perform one approval action
              for {personName}&rsquo;s engagement.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label>Receptionist *</Label>
              <Select value={receptionistId} onValueChange={setReceptionistId}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {receptionists.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Reason *</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
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
              onClick={handleGrant}
              loading={isPending}
              disabled={!reason || !receptionistId}
            >
              Grant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TableRow>
  );
}
