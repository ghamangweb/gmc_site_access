"use client";

import { Languages } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useRegistrationLanguage } from "@/components/workflow/registration-language-provider";

// Shows the language it switches *to*, so the label is always readable by
// someone who can't read the language currently on screen.
export function RegistrationLanguageToggle() {
  const { locale, setLocale } = useRegistrationLanguage();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => setLocale(locale === "en" ? "zh" : "en")}
      aria-label={locale === "en" ? "切换到中文" : "Switch to English"}
    >
      <Languages className="h-4 w-4" />
      {locale === "en" ? "中文" : "English"}
    </Button>
  );
}
