"use client";

import { ChevronDownIcon } from "lucide-react";
import { type Ref, useMemo, useState } from "react";

import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useRegistrationLanguage } from "@/components/workflow/registration-language-provider";
import { COUNTRY_CALLING_CODES } from "@/lib/domain/countries";

type PhoneInputProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  ref?: Ref<HTMLInputElement>;
};

// Most visitors are Ghanaian. Applied only while the field is empty, so it is
// a real starting value the visitor can change, and an untouched optional
// field still submits empty rather than a bare "+233".
const DEFAULT_DIAL_CODE = "+233";

const DIAL_CODES = Array.from(
  new Set(COUNTRY_CALLING_CODES.map((country) => country.dialCode)),
);

function splitValue(value: string): { code: string; number: string } {
  const firstSpace = value.indexOf(" ");
  if (firstSpace === -1) {
    return value.startsWith("+")
      ? { code: value, number: "" }
      : { code: "", number: value };
  }
  return {
    code: value.slice(0, firstSpace),
    number: value.slice(firstSpace + 1),
  };
}

export function PhoneInput({
  value,
  onChange,
  disabled,
  ref,
}: PhoneInputProps) {
  const { t } = useRegistrationLanguage();
  const [open, setOpen] = useState(false);
  const { code, number } = useMemo(
    () => (value ? splitValue(value) : { code: DEFAULT_DIAL_CODE, number: "" }),
    [value],
  );

  function updateCode(newCode: string) {
    onChange(number ? `${newCode} ${number}` : newCode);
  }

  function updateNumber(newNumber: string) {
    onChange(code ? `${code} ${newNumber}` : newNumber);
  }

  return (
    <div className="flex h-11 items-stretch rounded-md border border-input bg-background focus-within:ring-1 focus-within:ring-ring">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverAnchor asChild>
          <div className="flex items-center gap-1 rounded-l-md border-r border-input bg-accent pr-1.5 pl-3">
            <input
              value={code}
              onChange={(e) => updateCode(e.target.value.replace(/\s/g, ""))}
              disabled={disabled}
              className="w-12 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            />
            <PopoverTrigger asChild>
              <button
                type="button"
                disabled={disabled}
                className="rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronDownIcon className="size-4" />
              </button>
            </PopoverTrigger>
          </div>
        </PopoverAnchor>
        <PopoverContent align="start" sideOffset={4} className="w-24 p-1">
          <div className="flex max-h-60 flex-col overflow-y-auto">
            {DIAL_CODES.map((dialCode) => (
              <button
                key={dialCode}
                type="button"
                onClick={() => {
                  updateCode(dialCode);
                  setOpen(false);
                }}
                className="rounded-sm px-2 py-1.5 text-left text-sm text-foreground hover:bg-accent"
              >
                {dialCode}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
      <input
        ref={ref}
        value={number}
        onChange={(e) => updateNumber(e.target.value.replace(/[^\d\s-]/g, ""))}
        disabled={disabled}
        type="tel"
        placeholder={t("Phone number")}
        className="flex-1 rounded-r-md bg-transparent px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
      />
    </div>
  );
}
