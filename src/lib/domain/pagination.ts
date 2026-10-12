// One shape for every queue: the rows for this page plus the total so the
// footer can say "1–20 of 137". Queues are server-rendered, so paging and
// searching live in the URL — no client state, and a filtered view is
// shareable and survives a refresh.
export const DEFAULT_PAGE_SIZE = 20;

export type PageRequest = {
  /** Free-text match on name or passport/Ghana Card number. */
  search?: string;
  /** 1-based. Out-of-range values are clamped by `toPageRequest`. */
  page?: number;
  pageSize?: number;
};

export type Page<TRow> = {
  rows: TRow[];
  total: number;
  page: number;
  pageSize: number;
};

export function toPageRequest(
  search: string | undefined,
  page: string | undefined,
  pageSize = DEFAULT_PAGE_SIZE,
): Required<Pick<PageRequest, "page" | "pageSize">> & { search?: string } {
  const parsed = Number.parseInt(page ?? "1", 10);
  const trimmed = search?.trim();

  return {
    // A junk `?page=abc` reads as page 1 rather than erroring at the visitor.
    page: Number.isFinite(parsed) && parsed > 0 ? parsed : 1,
    pageSize,
    search: trimmed && trimmed.length > 0 ? trimmed : undefined,
  };
}

export function pageOffset(page: number, pageSize: number): number {
  return (page - 1) * pageSize;
}

export function totalPages(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}
