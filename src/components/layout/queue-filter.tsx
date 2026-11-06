"use client";

import { CheckIcon, ChevronLeftIcon, ListFilterIcon } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { useQueueTransition } from "@/components/layout/queue-transition";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { QueueFilterOption } from "@/lib/domain/queue-filters";
import { cn } from "@/lib/utils";

export type QueueFilterField = {
  param: string;
  /** Field label in the panel; "All" clears it. */
  label: string;
  options: QueueFilterOption[];
};

// One "Filter" button beside the queue search. It opens a single popover:
// first the tab's filters (searchable), then — in the same popover, never a
// second one on top — the options of whichever filter was clicked. One value
// per filter, as every queue's query takes. Like QueueSearch it writes to the
// URL, not local state — the queue is server-rendered — and drops the page,
// since page 4 of the old result set means nothing under the new filter.
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
  const { isPending, startTransition } = useQueueTransition();
  const [open, setOpen] = useState(false);
  // The filter whose options are showing; null while choosing a filter.
  const [activeParam, setActiveParam] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  // With a single filter there is nothing to choose between, so the panel
  // opens straight on its options and never shows the list of filters.
  const singleField = fields.length === 1 ? fields[0] : undefined;
  const activeField =
    singleField ?? fields.find((field) => field.param === activeParam);

  function selectedOption(
    field: QueueFilterField,
  ): QueueFilterOption | undefined {
    const current = searchParams.get(field.param);

    return field.options.find((option) => option.value === current);
  }

  const activeCount = fields.filter((field) => selectedOption(field)).length;

  function handleOpenChange(next: boolean) {
    setOpen(next);

    // Always reopen on the list of filters, with an empty search.
    if (!next) {
      setActiveParam(null);
      setQuery("");
    }
  }

  function showField(param: string) {
    setActiveParam(param);
    setQuery("");
  }

  function showFields() {
    setActiveParam(null);
    setQuery("");
  }

  function navigate(update: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());

    update(params);
    params.delete(pageParam);

    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  function choose(param: string, value: string | null) {
    navigate((params) => {
      if (value === null) {
        params.delete(param);
      } else {
        params.set(param, value);
      }
    });
    handleOpenChange(false);
  }

  function handleClear() {
    navigate((params) => {
      for (const field of fields) {
        params.delete(field.param);
      }
    });
    handleOpenChange(false);
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
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
      <PopoverContent align="end" className="w-64 p-0">
        <Command
          key={activeField?.param ?? "fields"}
          // Items are keyed by their unique value (an id, for some filters)
          // and searched only by their visible label, carried as keywords —
          // so two options with the same label stay distinct, and typing
          // never matches characters of a hidden id.
          filter={(_value, search, keywords) =>
            (keywords ?? [])
              .join(" ")
              .toLowerCase()
              .includes(search.trim().toLowerCase())
              ? 1
              : 0
          }
        >
          {activeField && !singleField && (
            // Back to the list of filters, named for the one being edited.
            <button
              type="button"
              onClick={showFields}
              className="flex w-full items-center gap-1 border-border border-b px-2 py-1.5 text-muted-foreground text-xs hover:text-foreground"
            >
              <ChevronLeftIcon className="size-3.5" />
              {activeField.label}
            </button>
          )}
          <div className="relative">
            <CommandInput
              autoFocus
              value={query}
              onValueChange={setQuery}
              placeholder={
                activeField ? `${activeField.label}...` : "Filter..."
              }
              onKeyDown={(event) => {
                // Backspace in an empty box steps back, as in the reference.
                if (
                  event.key === "Backspace" &&
                  !query &&
                  activeField &&
                  !singleField
                ) {
                  event.preventDefault();
                  showFields();
                }
              }}
            />
          </div>
          <CommandList>
            <CommandEmpty>No matches.</CommandEmpty>
            {activeField ? (
              <CommandGroup>
                <CommandItem
                  value="__all__"
                  keywords={["All"]}
                  onSelect={() => choose(activeField.param, null)}
                >
                  <CheckIcon
                    className={cn(
                      selectedOption(activeField) ? "invisible" : "visible",
                    )}
                  />
                  All
                </CommandItem>
                {activeField.options.map((option) => {
                  const selected =
                    selectedOption(activeField)?.value === option.value;

                  return (
                    <CommandItem
                      key={option.value}
                      value={`option:${option.value}`}
                      keywords={[option.label]}
                      onSelect={() =>
                        // Picking the current choice again clears it.
                        choose(
                          activeField.param,
                          selected ? null : option.value,
                        )
                      }
                    >
                      <CheckIcon
                        className={cn(selected ? "visible" : "invisible")}
                      />
                      {option.label}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ) : (
              <CommandGroup>
                {fields.map((field) => (
                  <CommandItem
                    key={field.param}
                    value={`field:${field.param}`}
                    keywords={[field.label]}
                    onSelect={() => showField(field.param)}
                  >
                    <span className="flex-1">{field.label}</span>
                    {selectedOption(field) && (
                      <span className="truncate text-muted-foreground text-xs">
                        {selectedOption(field)?.label}
                      </span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {activeCount > 0 && !activeField && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    value="__clear__"
                    keywords={["Clear filters"]}
                    onSelect={handleClear}
                  >
                    Clear filters
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
