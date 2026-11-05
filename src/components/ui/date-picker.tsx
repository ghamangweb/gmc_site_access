"use client";

import { format, isValid, parseISO } from "date-fns";
import { CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type DatePickerProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  captionLayout?: "label" | "dropdown";
  /** YYYY-MM-DD. Days before it can't be picked. */
  minDate?: string;
  /** YYYY-MM-DD. Days after it can't be picked. */
  maxDate?: string;
};

export function DatePicker({
  value,
  onChange,
  disabled,
  placeholder = "Pick a date",
  captionLayout = "label",
  minDate,
  maxDate,
}: DatePickerProps) {
  const parsed = value ? parseISO(value) : undefined;
  const selected = parsed && isValid(parsed) ? parsed : undefined;
  const min = minDate ? parseISO(minDate) : undefined;
  const max = maxDate ? parseISO(maxDate) : undefined;
  const bounds = [
    ...(min && isValid(min) ? [{ before: min }] : []),
    ...(max && isValid(max) ? [{ after: max }] : []),
  ];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "h-11 w-full justify-start font-normal",
            !selected && "text-muted-foreground",
          )}
        >
          <CalendarIcon />
          {selected ? format(selected, "PPP") : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          captionLayout={captionLayout}
          selected={selected}
          defaultMonth={selected ?? min}
          disabled={bounds.length > 0 ? bounds : undefined}
          onSelect={(date) => onChange(date ? format(date, "yyyy-MM-dd") : "")}
        />
      </PopoverContent>
    </Popover>
  );
}
