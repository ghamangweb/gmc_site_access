// A queue row's "needs attention" flag, shown as a pulsing dot before the
// name. Danger: something is wrong or urgent (revocation requested, Unfit,
// rejected, expired). Warning: something is about to need action (a stay
// ending soon). Success: something new is waiting on *this* viewer (a review
// due, a card update unlocked). The label is the tooltip and the
// screen-reader text, so colour is never the only signal.
export type Attention = {
  tone: "danger" | "warning" | "success";
  label: string;
};

type Candidate = Attention | false | null | undefined;

// One dot per row: the first danger wins, then the first warning, then the
// first success.
export function pickAttention(
  ...candidates: Candidate[]
): Attention | undefined {
  const present = candidates.filter((c): c is Attention => !!c);

  return (
    present.find((c) => c.tone === "danger") ??
    present.find((c) => c.tone === "warning") ??
    present.find((c) => c.tone === "success")
  );
}

export const danger = (label: string): Attention => ({ tone: "danger", label });
export const warning = (label: string): Attention => ({
  tone: "warning",
  label,
});
export const success = (label: string): Attention => ({
  tone: "success",
  label,
});
