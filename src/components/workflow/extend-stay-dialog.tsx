"use client";

import { format, parseISO } from "date-fns";
import { useId, useState, useTransition } from "react";
import { toast } from "sonner";

import { extendStayAction } from "@/actions/engagements";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
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
import { earliestExtensionDate } from "@/lib/domain/stay-extensions";

type ExtendStayDialogProps = {
  engagementId: string;
  personName: string;
  /** YYYY-MM-DD, the departure date being extended. */
  currentDepartureDate: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExtended: () => void;
};

// Opened from the approvals queue's row menu. Only the departure date moves:
// the dialog says so, because the access card is Security's to update.
export function ExtendStayDialog({
  engagementId,
  personName,
  currentDepartureDate,
  open,
  onOpenChange,
  onExtended,
}: ExtendStayDialogProps) {
  const fieldId = useId();
  const [newDate, setNewDate] = useState("");
  const [reason, setReason] = useState("");
  const [signature, setSignature] = useState<SignatureValue | null>(null);
  const [isPending, startTransition] = useTransition();

  const canConfirm = !!newDate && !!reason.trim() && !!signature?.value.trim();

  function handleOpenChange(value: boolean): void {
    if (isPending) return;

    onOpenChange(value);

    if (!value) {
      setNewDate("");
      setReason("");
      setSignature(null);
    }
  }

  function handleExtend(): void {
    if (isPending || !canConfirm) return;

    startTransition(async () => {
      const result = await extendStayAction(engagementId, {
        newDepartureDate: newDate,
        reason: reason.trim(),
        signature: JSON.stringify(signature),
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      if (result.warning) toast.warning(result.warning);
      else toast.success("Stay extended");

      handleOpenChange(false);
      onExtended();
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Extend Stay</DialogTitle>
          <DialogDescription>
            {personName}&apos;s current departure date is{" "}
            {format(parseISO(currentDepartureDate), "PPP")}. Pick the new date
            and explain why. Your reason and signature will be recorded with the
            extension.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Label>New departure date *</Label>
          <DatePicker
            value={newDate}
            onChange={setNewDate}
            disabled={isPending}
            minDate={earliestExtensionDate(currentDepartureDate)}
            placeholder="Pick the new departure date"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${fieldId}-reason`}>Reason for extending *</Label>
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
        <p className="text-sm text-muted-foreground">
          Only the departure date changes. Security, Reception, HSE and the
          Department Head are notified, and Security updates the access card.
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
            disabled={!canConfirm}
            loading={isPending}
            onClick={handleExtend}
          >
            Confirm Extension
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
