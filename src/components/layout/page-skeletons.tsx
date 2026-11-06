import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

// Loading placeholders shaped like the components they stand in for: the same
// card, header, table headers and toolbar heights, with grey blocks where the
// content will land. Used by the routes' loading.tsx and by QueuePending.

/** What a column holds, so its placeholder is the right shape. */
export type SkeletonCell =
  | "name"
  | "text"
  | "short"
  | "date"
  | "long"
  | "badge"
  | "button"
  | "menu";

export type SkeletonColumn = {
  header: string;
  cell: SkeletonCell;
  align?: "right";
  /** Passed to both the header and the cells, e.g. `w-px`. */
  className?: string;
};

// Varied a little per row so the placeholder reads as a list, not a grid.
const NAME_WIDTHS = ["w-36", "w-28", "w-40", "w-32", "w-24"];

const TEXT_WIDTHS = ["w-28", "w-24", "w-32", "w-20"];

function CellSkeleton({
  cell,
  row,
  align,
}: {
  cell: SkeletonCell;
  row: number;
  align?: "right";
}) {
  const position = align === "right" ? "ml-auto" : undefined;

  switch (cell) {
    case "name":
      return (
        <Skeleton
          className={cn("h-4", NAME_WIDTHS[row % NAME_WIDTHS.length], position)}
        />
      );
    case "text":
      return (
        <Skeleton
          className={cn("h-4", TEXT_WIDTHS[row % TEXT_WIDTHS.length], position)}
        />
      );
    case "short":
      return <Skeleton className={cn("h-4 w-16", position)} />;
    case "date":
      return <Skeleton className={cn("h-4 w-24", position)} />;
    case "long":
      return <Skeleton className={cn("h-4 w-48", position)} />;
    case "badge":
      return <Skeleton className={cn("h-5 w-20 rounded-full", position)} />;
    case "button":
      return <Skeleton className={cn("h-9 w-28", position)} />;
    case "menu":
      return <Skeleton className={cn("size-8", position)} />;
  }
}

/** A queue table's rows and footer, to sit inside the existing card. */
export function TableSkeleton({
  columns,
  rows = 10,
  pagination = false,
}: {
  columns: SkeletonColumn[];
  rows?: number;
  /** Placeholder for the QueuePagination footer under paged queues. */
  pagination?: boolean;
}) {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading</span>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {columns.map((column) => (
              <TableHead
                key={column.header}
                className={cn(
                  column.align === "right" && "text-right",
                  column.className,
                )}
              >
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rows }, (_, row) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder rows
            <TableRow key={row} className="hover:bg-transparent">
              {columns.map((column) => (
                <TableCell key={column.header} className={column.className}>
                  <CellSkeleton
                    cell={column.cell}
                    row={row}
                    align={column.align}
                  />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {pagination && (
        <div className="flex items-center justify-between gap-4 border-border border-t px-4 py-3">
          <Skeleton className="h-4 w-20" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-9 w-20" />
          </div>
        </div>
      )}
    </div>
  );
}

/** PageHeader: title, optional subtitle, optional action on the right. */
export function PageHeaderSkeleton({
  subtitle = true,
  action = false,
}: {
  subtitle?: boolean;
  action?: boolean;
}) {
  return (
    <div className="mb-6 flex items-center justify-between">
      <div>
        <Skeleton className="h-8 w-64" />
        {subtitle && <Skeleton className="mt-2 h-4 w-96" />}
      </div>
      {action && <Skeleton className="h-10 w-40" />}
    </div>
  );
}

/** QueueViewTabs: the bordered segmented switch. */
export function ViewTabsSkeleton({ tabs }: { tabs: number }) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-border p-1">
      {Array.from({ length: tabs }, (_, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder tabs
        <Skeleton key={index} className="h-9 w-36" />
      ))}
    </div>
  );
}

/** A queue page: header, tabs + filter/search/export toolbar, table card. */
export function QueuePageSkeleton({
  columns,
  tabs = 0,
  filter = true,
  search = true,
  exportButton = true,
  headerAction = false,
  pagination = true,
}: {
  columns: SkeletonColumn[];
  tabs?: number;
  filter?: boolean;
  search?: boolean;
  exportButton?: boolean;
  headerAction?: boolean;
  pagination?: boolean;
}) {
  const hasTools = filter || search || exportButton;

  return (
    <div>
      <PageHeaderSkeleton action={headerAction} />
      {(tabs > 0 || hasTools) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          {tabs > 0 && <ViewTabsSkeleton tabs={tabs} />}
          {hasTools && (
            <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
              {filter && <Skeleton className="h-11 w-24" />}
              {search && <Skeleton className="h-11 w-56" />}
              {exportButton && <Skeleton className="h-11 w-32" />}
            </div>
          )}
        </div>
      )}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <TableSkeleton columns={columns} pagination={pagination} />
      </div>
    </div>
  );
}

/** A card of labelled fields, like ReceptionDetailsPreview's sections. */
export function FieldsCardSkeleton({ fields = 6 }: { fields?: number }) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-40" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: fields }, (_, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder fields
          <div key={index} className="flex flex-col gap-1">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-4 w-32" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** A form card: heading, stacked label + input rows, submit button. */
export function FormCardSkeleton({ fields = 3 }: { fields?: number }) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6">
      <Skeleton className="h-6 w-48" />
      {Array.from({ length: fields }, (_, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder fields
        <div key={index} className="flex flex-col gap-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      <Skeleton className="h-10 w-36 self-end" />
    </div>
  );
}

/** The bar PreviewEditPanel shows above a preview: hint + Edit button. */
export function PreviewBarSkeleton() {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-card px-6 py-4">
      <Skeleton className="h-4 w-72" />
      <Skeleton className="h-9 w-36" />
    </div>
  );
}

/** A record page: name header, then its stack of cards. */
export function DetailPageSkeleton({
  subtitle = false,
  headerAction = false,
  children,
}: {
  subtitle?: boolean;
  headerAction?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading</span>
      <PageHeaderSkeleton subtitle={subtitle} action={headerAction} />
      <div className="flex flex-col gap-6">{children}</div>
    </div>
  );
}

/** EngagementDetail (Reception and Approvals record pages). */
export function EngagementDetailSkeleton() {
  return (
    <DetailPageSkeleton>
      <PreviewBarSkeleton />
      <FieldsCardSkeleton fields={12} />
      <FieldsCardSkeleton fields={6} />
      <FormCardSkeleton fields={2} />
    </DetailPageSkeleton>
  );
}
