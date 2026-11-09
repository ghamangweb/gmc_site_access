"use client";

import { addDays, format, parseISO } from "date-fns";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  submitHospitalClearanceAction,
  submitHospitalReviewAction,
} from "@/actions/engagements";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  HOSPITAL_CLEARANCE_LABELS,
  type HospitalClearanceStatus,
} from "@/lib/domain/types";
import { formatQueueDate } from "@/lib/utils";

// What each outcome does to the engagement, per project-overview.md. Spelled
// out because the three are not interchangeable: one advances the visitor,
// one advances them and warns Reception, one holds them here.
const STATUS_CONSEQUENCES: Record<HospitalClearanceStatus, string> = {
  Fit: "Proceeds to Training School.",
  FitWithConditions: "Proceeds to Training School, and Reception is notified.",
  Unfit: "Stays at the Hospital stage, and Reception is notified.",
};

// A review leaves the record's stage alone, so none of the above applies.
const REVIEW_CONSEQUENCES: Record<HospitalClearanceStatus, string> = {
  Fit: "Recorded as a review. The record's stage is not changed.",
  FitWithConditions:
    "Recorded as a review, with a new review date if one is set. The record's stage is not changed.",
  Unfit:
    "Recorded as a review. The record's stage is not changed, and Reception is notified.",
};

type LatestClearance = {
  clearanceStatus: HospitalClearanceStatus;
  doctorComments: string;
  clearanceDate: Date;
};

type HospitalFormProps = {
  engagementId: string;
  latestClearance?: LatestClearance;
  readOnly: boolean;
  /** Set when reviewing a Fit with Conditions clearance from the recorded
   * tab: submits a review of that clearance instead of a new clearance. */
  reviewOfClearanceId?: string;
  /** YYYY-MM-DD. Set only when the review being recorded is ahead of the
   * date the doctor scheduled — early reviews are allowed, just flagged. */
  earlyReviewDate?: string;
};

export function HospitalForm({
  engagementId,
  latestClearance,
  readOnly,
  reviewOfClearanceId,
  earlyReviewDate,
}: HospitalFormProps) {
  const router = useRouter();
  const [status, setStatus] = useState<HospitalClearanceStatus | "">("");
  const [comments, setComments] = useState("");
  const [nextReviewDate, setNextReviewDate] = useState("");
  const [isPending, startTransition] = useTransition();

  const isReview = reviewOfClearanceId !== undefined;
  const disabled = readOnly || isPending;
  const commentsRequired = status === "FitWithConditions" || status === "Unfit";
  // Not every condition needs a medical follow-up, so the date is optional.
  const showReviewDate = status === "FitWithConditions";
  const canSubmit =
    !disabled && status !== "" && (!commentsRequired || comments.trim() !== "");
  // The server checks the same rule; this just keeps today and earlier out of
  // the picker.

  const tomorrow = format(addDays(new Date(), 1), "yyyy-MM-dd");

  function handleSubmit() {
    if (status === "") return;

    const input = {
      clearanceStatus: status,
      doctorComments: comments,
      nextReviewDate:
        showReviewDate && nextReviewDate !== "" ? nextReviewDate : undefined,
    };

    startTransition(async () => {
      const result = isReview
        ? await submitHospitalReviewAction(
            engagementId,
            reviewOfClearanceId,
            input,
          )
        : await submitHospitalClearanceAction(engagementId, input);
      if (!result.success) {
        toast.error(result.error);

        return;
      }

      setStatus("");
      setComments("");
      setNextReviewDate("");

      if (result.warning) {
        toast.warning(result.warning);
      } else {
        toast.success(isReview ? "Review recorded" : "Clearance recorded");
      }

      // Hospital records a decision and moves on, so the queue — not the
      // record just acted on — is where the next piece of work is.
      router.push("/dashboard/hospital");
    });
  }

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <h2 className="text-lg font-semibold text-foreground mb-4">
        {isReview ? "Record Review" : "Hospital Clearance"}
      </h2>

      {isReview && earlyReviewDate && (
        <div className="mb-4 rounded-md px-4 py-3 text-sm bg-status-warning-bg text-status-warning-fg">
          This review is scheduled for{" "}
          {formatQueueDate(parseISO(earlyReviewDate))}. You are recording it
          early.
        </div>
      )}

      {latestClearance && (
        <p className="mb-4 text-xs text-muted-foreground">
          Last recorded:{" "}
          {HOSPITAL_CLEARANCE_LABELS[latestClearance.clearanceStatus]}
          {latestClearance.doctorComments &&
            `: ${latestClearance.doctorComments}`}{" "}
          ({latestClearance.clearanceDate.toLocaleDateString()})
        </p>
      )}

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label>Clearance Status *</Label>
          <Select
            value={status}
            onValueChange={(value) =>
              setStatus(value as HospitalClearanceStatus)
            }
            disabled={disabled}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              {(
                Object.keys(
                  HOSPITAL_CLEARANCE_LABELS,
                ) as HospitalClearanceStatus[]
              ).map((value) => (
                <SelectItem key={value} value={value}>
                  {HOSPITAL_CLEARANCE_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {status !== "" && (
            <p className="text-xs text-muted-foreground">
              {(isReview ? REVIEW_CONSEQUENCES : STATUS_CONSEQUENCES)[status]}
            </p>
          )}
        </div>

        {showReviewDate && (
          <div className="flex flex-col gap-2">
            <Label>Next Review Date (optional)</Label>
            <DatePicker
              value={nextReviewDate}
              onChange={setNextReviewDate}
              disabled={disabled}
              minDate={tomorrow}
            />
          </div>
        )}

        <div className="flex flex-col gap-2">
          <Label>Doctor Comments {commentsRequired ? "*" : "(optional)"}</Label>
          <Textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            disabled={disabled}
          />
        </div>

        {!readOnly && (
          <div className="flex justify-end">
            <Button
              type="button"
              loading={isPending}
              disabled={!canSubmit}
              onClick={handleSubmit}
            >
              {isReview ? "Submit Review" : "Submit Clearance"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
