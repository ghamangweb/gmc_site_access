import { z } from "zod";
import {
  type AccessState,
  isoToday,
  type WorkflowState,
} from "@/lib/domain/types";

// Security can re-date the card a record was activated with — typically after
// a stakeholder extends the stay. Only a live or lapsed card on a finished
// record: one awaiting revocation, or revoked, is not Security's to extend.
export function isCardExpiryUpdatable(engagement: {
  workflowState: WorkflowState;
  accessState: AccessState;
}): boolean {
  return (
    engagement.workflowState === "Completed" &&
    (engagement.accessState === "Active" ||
      engagement.accessState === "Expired")
  );
}

export type CardExpiryUpdateInput = {
  newExpiry: string;
  comments: string;
};

const cardExpiryUpdateSchema = z.object({
  newExpiry: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Pick the new card expiry date"),
  comments: z.string().trim().min(1, "Comments are required"),
});

// The activation rules still hold: valid through its expiry, so today at the
// earliest, and never later than the departure date.
export function validateCardExpiryUpdate(
  input: CardExpiryUpdateInput,
  current: { accessCardExpiry: string; departureDate: string },
): CardExpiryUpdateInput {
  const parsed = cardExpiryUpdateSchema.safeParse(input);

  if (!parsed.success) {
    throw new Error(
      parsed.error.issues[0]?.message ?? "Invalid card expiry update",
    );
  }

  const { newExpiry } = parsed.data;

  if (newExpiry === current.accessCardExpiry) {
    throw new Error("Pick a different date from the current card expiry");
  }

  if (newExpiry < isoToday()) {
    throw new Error("Access card expiry cannot be in the past");
  }

  if (newExpiry > current.departureDate) {
    throw new Error(
      `Access card expiry cannot be later than the departure date (${current.departureDate})`,
    );
  }

  return { newExpiry, comments: parsed.data.comments.trim() };
}

// Security never extends a stay on its own: a card can only be re-dated once
// a stakeholder has extended the stay *after* the card was issued (an
// extension before activation was already reflected in the card Security
// issued), and Security hasn't acted on it yet. Each extension unlocks one
// update; the next needs another extension.
export function hasPendingStayExtension(opts: {
  cardActivatedAt: Date;
  latestExtensionAt: Date | null;
  latestCardUpdateAt: Date | null;
}): boolean {
  if (!opts.latestExtensionAt) return false;

  const lastHandled =
    opts.latestCardUpdateAt && opts.latestCardUpdateAt > opts.cardActivatedAt
      ? opts.latestCardUpdateAt
      : opts.cardActivatedAt;

  return opts.latestExtensionAt > lastHandled;
}
