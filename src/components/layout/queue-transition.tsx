"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createContext,
  type TransitionStartFunction,
  useContext,
  useMemo,
  useTransition,
} from "react";

type QueueTransition = {
  isPending: boolean;
  startTransition: TransitionStartFunction;
};

const QueueTransitionContext = createContext<QueueTransition | null>(null);

// One transition for everything on a queue that changes its URL — the view
// tabs, Filter, Search and the pagination links. While it is pending the
// table swaps to its skeleton (QueuePending), so a filter that takes a moment
// shows the table loading instead of the old rows sitting there unchanged.
// It only changes how the navigation is tracked: the page still fetches on
// the server exactly as before.
export function QueueTransitionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isPending, startTransition] = useTransition();
  const value = useMemo(() => ({ isPending, startTransition }), [isPending]);

  return (
    <QueueTransitionContext value={value}>{children}</QueueTransitionContext>
  );
}

// The shared transition when inside a provider; otherwise the component's own,
// so a control used outside a wrapped queue behaves exactly as it always did.
export function useQueueTransition(): QueueTransition {
  const shared = useContext(QueueTransitionContext);
  const [isPending, startTransition] = useTransition();

  return shared ?? { isPending, startTransition };
}

// The table's skeleton while the queue navigates, the real content otherwise.
export function QueuePending({
  fallback,
  children,
}: {
  fallback: React.ReactNode;
  children: React.ReactNode;
}) {
  const shared = useContext(QueueTransitionContext);

  return shared?.isPending ? fallback : children;
}

// A plain Next Link — prefetching, cmd/ctrl-click into a new tab, the same
// href — whose in-app navigation runs through the queue's transition.
export function QueueLink({
  href,
  scroll,
  replace,
  onNavigate,
  ...props
}: Omit<React.ComponentProps<typeof Link>, "href"> & { href: string }) {
  const shared = useContext(QueueTransitionContext);
  const router = useRouter();

  return (
    <Link
      href={href}
      scroll={scroll}
      replace={replace}
      onNavigate={(event) => {
        onNavigate?.(event);

        if (!shared) {
          return;
        }

        event.preventDefault();
        shared.startTransition(() => {
          const options = { scroll: scroll ?? true };

          if (replace) {
            router.replace(href, options);
          } else {
            router.push(href, options);
          }
        });
      }}
      {...props}
    />
  );
}
