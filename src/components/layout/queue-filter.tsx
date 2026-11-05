"use client";

import { ListFilterIcon } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { QueueFilterOption } from "@/lib/domain/queue-filters";

// Radix Select can't hold an empty-string value, so "All" needs a stand-in.
const ALL = "__all__";

export type QueueFilterField = {
  param: string;
  /** Field label in the panel; the first option is always "All". */
  label: string;
  options: QueueFilterOption[];
};

// One "Filter" button beside the queue search, holding every filter for the
// tab in a panel, so the toolbar stays a button and a search box however many
// filters a tab has. Like QueueSearch it writes to the URL, not local state —
// the queue is server-rendered — and drops the page, since page 4 of the old
// result set means nothing under the new filter.
export function QueueFilters({
  fields,
  pageParam,
}: {
  fields: QueueFilterField[];
  pageParam: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function selectedValue(field: QueueFilterField): string {
    const current = searchParams.get(field.param);

    return field.options.some((option) => option.value === current)
      ? (current as string)
      : ALL;
  }

  const activeCount = fields.filter(
    (field) => selectedValue(field) !== ALL,
  ).length;

  function navigate(update: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());

    update(params);
    params.delete(pageParam);

    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  function handleChange(param: string, next: string) {
    navigate((params) => {
      if (next === ALL) {
        params.delete(param);
      } else {
        params.set(param, next);
      }
    });
  }

  function handleClear() {
    navigate((params) => {
      for (const field of fields) {
        params.delete(field.param);
      }
    });
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="h-11"
          aria-busy={isPending}
        >
          <ListFilterIcon />
          Filter
          {activeCount > 0 && (
            <span className="rounded-full bg-primary px-1.5 text-primary-foreground text-xs">
              {activeCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="flex flex-col gap-4">
        {fields.map((field) => (
          <div key={field.param} className="flex flex-col gap-2">
            <Label>{field.label}</Label>
            <Select
              value={selectedValue(field)}
              onValueChange={(next) => handleChange(field.param, next)}
            >
              <SelectTrigger className="w-full" aria-label={field.label}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All</SelectItem>
                {field.options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
        {activeCount > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="self-end"
            onClick={handleClear}
          >
            Clear filters
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}
