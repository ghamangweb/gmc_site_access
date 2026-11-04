import type { Attention } from "@/lib/domain/attention";
import { cn } from "@/lib/utils";

const TONE: Record<Attention["tone"], string> = {
  danger: "bg-status-danger",
  success: "bg-status-success",
};

// The pulsing dot. Under "reduce motion" the ring stays still and only the
// solid dot shows.
export function AttentionDot({ attention }: { attention: Attention }) {
  return (
    <span
      className="relative inline-flex size-2 shrink-0"
      title={attention.label}
    >
      <span
        aria-hidden
        className={cn(
          "absolute inline-flex size-full animate-ping rounded-full opacity-75 motion-reduce:hidden",
          TONE[attention.tone],
        )}
      />
      <span
        aria-hidden
        className={cn(
          "relative inline-flex size-2 rounded-full",
          TONE[attention.tone],
        )}
      />
      <span className="sr-only">{attention.label}</span>
    </span>
  );
}

// A queue row's name cell content. The dot's slot is always reserved so names
// line up whether or not a row is flagged.
export function NameWithAttention({
  attention,
  children,
}: {
  attention: Attention | undefined;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      {attention ? (
        <AttentionDot attention={attention} />
      ) : (
        <span aria-hidden className="inline-flex size-2 shrink-0" />
      )}
      {children}
    </span>
  );
}
