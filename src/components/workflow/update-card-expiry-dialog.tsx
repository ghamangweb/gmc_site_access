"use client";

import { format, parseISO } from "date-fns";
import { useId, useState, useTransition } from "react";
import { toast } from "sonner";

import { updateCardExpiryAction } from "@/actions/engagements";
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
import { isoToday } from "@/lib/domain/types";

type UpdateCardExpiryDialogProps = {
  engagementId: string;
  accessProvisioningId: string;
  personName: string;
  /** YYYY-MM-DD */
  currentExpiry: string;
  /** YYYY-MM-DD — the card can't outlast the stay. */
  departureDate: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
};

// Opened from Security's "Site Access Granted" row menu. Same bounds as
// activation: today at the earliest, the departure date at the latest.
export function UpdateCardExpiryDialog({
  engagementId,
  accessProvisioningId,
  personName,
  currentExpiry,
  departureDate,
  open,
  onOpenChange,
  onUpdated,
}: UpdateCardExpiryDialogProps) {
  const fieldId = useId();
  const [newExpiry, setNewExpiry] = useState("");
  const [comments, setComments] = useState("");
  const [isPending, startTransition] = useTransition();

  // A stay that has already ended leaves no date to pick: a stakeholder has
  // to extend it first.
  const stayOver = departureDate < isoToday();
  const canConfirm = !stayOver && !!newExpiry && !!comments.trim();

  function handleOpenChange(value: boolean): void {
    if (isPending) return;

    onOpenChange(value);

    if (!value) {
      setNewExpiry("");
      setComments("");
    }
  }

  function handleUpdate(): void {
    if (isPending || !canConfirm) return;

    startTransition(async () => {
      const result = await updateCardExpiryAction(
        engagementId,
        accessProvisioningId,
        { newExpiry, comments: comments.trim() },
      );

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      if (result.warning) toast.warning(result.warning);
      else toast.success("Card expiry updated");

      handleOpenChange(false);
      onUpdated();
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Card Expiry</DialogTitle>
          <DialogDescription>
            {personName}&apos;s card is valid until{" "}
            {format(parseISO(currentExpiry), "PPP")}. The new expiry can&apos;t
            be later than the departure date (
            {format(parseISO(departureDate), "PPP")}).
          </DialogDescription>
        </DialogHeader>
        {stayOver ? (
          <p className="text-sm text-foreground">
            This stay has already ended. A stakeholder needs to extend it before
            the card can be re-dated.
          </p>
        ) : (
          <>
            <div className="flex flex-col gap-2">
              <Label>New card expiry *</Label>
              <DatePicker
                value={newExpiry}
                onChange={setNewExpiry}
                disabled={isPending}
                minDate={isoToday()}
                maxDate={departureDate}
                placeholder="Pick the new expiry date"
              />
            </div>
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
            <p className="text-sm text-muted-foreground">
              Reception and HSE are notified. An expired card becomes active
              again.
            </p>
          </>
        )}
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
            onClick={handleUpdate}
          >
            Confirm Update
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
