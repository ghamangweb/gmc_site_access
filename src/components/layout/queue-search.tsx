"use client";

import { SearchIcon, XIcon } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const DEBOUNCE_MS = 300;

// Types into the URL, not into local state: the queue is server-rendered, so
// the search term has to reach the server to filter anything. Debounced so a
// five-letter name is one request, not five.
export function QueueSearch({
  searchParam,
  pageParam,
  placeholder = "Search by name or passport number",
}: {
  searchParam: string;
  /** Reset to page 1 on a new search — page 4 of the old result set is
   * meaningless against the new one. */
  pageParam: string;
  placeholder?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const current = searchParams.get(searchParam) ?? "";
  const [value, setValue] = useState(current);

  // Keeps the box in step when the URL changes from elsewhere — a filter
  // link, the back button — without fighting what is being typed.
  useEffect(() => {
    setValue(current);
  }, [current]);

  useEffect(() => {
    if (value === current) {
      return;
    }

    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());

      if (value.trim().length > 0) {
        params.set(searchParam, value.trim());
      } else {
        params.delete(searchParam);
      }

      params.delete(pageParam);

      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      });
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [
    value,
    current,
    pathname,
    router,
    searchParam,
    pageParam,
    searchParams.toString,
  ]);

  return (
    <div className="relative w-full max-w-xs">
      <SearchIcon className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
      <Input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        className="px-9"
        aria-busy={isPending}
      />
      {value.length > 0 && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="-translate-y-1/2 absolute top-1/2 right-1 size-7"
          onClick={() => setValue("")}
        >
          <XIcon />
          <span className="sr-only">Clear search</span>
        </Button>
      )}
    </div>
  );
}
