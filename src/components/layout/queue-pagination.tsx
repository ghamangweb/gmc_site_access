import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { pageOffset, totalPages } from "@/lib/domain/pagination";

// Server-rendered paging: plain links, so there is no client state to fall out
// of step with the URL and the back button does the obvious thing.
export function QueuePagination({
  page,
  pageSize,
  total,
  pageParam,
  searchParams,
}: {
  page: number;
  pageSize: number;
  total: number;
  /** Which query param this table pages on — a page with two queues gives
   * each its own, so paging one doesn't reset the other. */
  pageParam: string;
  /** Every other param currently in the URL, preserved across page links. */
  searchParams: Record<string, string | undefined>;
}) {
  const pages = totalPages(total, pageSize);

  // Nothing to page through: one screenful needs no footer, and an empty
  // table certainly doesn't.
  if (total === 0 || pages <= 1) {
    return null;
  }

  const first = pageOffset(page, pageSize) + 1;
  const last = Math.min(page * pageSize, total);

  function hrefFor(nextPage: number): string {
    const params = new URLSearchParams();

    for (const [key, value] of Object.entries(searchParams)) {
      if (value && key !== pageParam) {
        params.set(key, value);
      }
    }

    if (nextPage > 1) {
      params.set(pageParam, String(nextPage));
    }

    const query = params.toString();

    return query ? `?${query}` : "?";
  }

  return (
    <div className="flex items-center justify-between gap-4 border-border border-t px-4 py-3">
      <span className="text-xs text-muted-foreground">
        {first}–{last} of {total}
      </span>

      <div className="flex items-center gap-2">
        {/* Children sit directly on the Button in both states — wrapping them
            in a span drops the button's own flex/gap and collapses the icon
            onto the label. */}
        {page > 1 ? (
          <Button asChild variant="outline" size="sm">
            <Link href={hrefFor(page - 1)} scroll={false}>
              <ChevronLeftIcon />
              Previous
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            <ChevronLeftIcon />
            Previous
          </Button>
        )}

        <span className="px-1 text-muted-foreground text-xs">
          Page {page} of {pages}
        </span>

        {page < pages ? (
          <Button asChild variant="outline" size="sm">
            <Link href={hrefFor(page + 1)} scroll={false}>
              Next
              <ChevronRightIcon />
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            Next
            <ChevronRightIcon />
          </Button>
        )}
      </div>
    </div>
  );
}
