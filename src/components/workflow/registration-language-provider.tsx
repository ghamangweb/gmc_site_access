"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import type { ActionErrorCode, DocType } from "@/lib/domain/types";
import {
  type RegistrationLocale,
  translate,
  translateActionError,
  translateValidationMessage,
} from "@/lib/i18n/registration-dictionary";

type ActionFailure = {
  error: string;
  errorCode?: ActionErrorCode;
  missingDocTypes?: DocType[];
};

const STORAGE_KEY = "gmc-registration-locale";

type RegistrationLanguage = {
  locale: RegistrationLocale;
  setLocale: (locale: RegistrationLocale) => void;
  t: (key: string) => string;
  tValidation: (message: string) => string;
  tActionError: (failure: ActionFailure) => string;
};

// Defaults to English with an identity translator, so every component below
// can call `t()` unconditionally — the staff-facing ReceptionForm renders
// without a provider and gets its English strings back unchanged.
const RegistrationLanguageContext = createContext<RegistrationLanguage>({
  locale: "en",
  setLocale: () => {},
  t: (key) => key,
  tValidation: (message) => message,
  tActionError: (failure) => failure.error,
});

function readStoredLocale(): RegistrationLocale {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "zh" ? "zh" : "en";
  } catch {
    return "en";
  }
}

export function RegistrationLanguageProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // Always English on the first render, then the stored choice is applied
  // after mount. Reading storage during render instead would disagree with
  // the server-rendered HTML and break hydration for a returning visitor —
  // the cost is one frame of English on reload, not a mismatch.
  const [locale, setLocaleState] = useState<RegistrationLocale>("en");

  useEffect(() => {
    setLocaleState(readStoredLocale());
  }, []);

  const setLocale = useCallback((next: RegistrationLocale) => {
    setLocaleState(next);

    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Private windows and blocked site data throw here. The switch still
      // works for this visit; it just won't be remembered.
    }
  }, []);

  const t = useCallback((key: string) => translate(locale, key), [locale]);

  const tValidation = useCallback(
    (message: string) => translateValidationMessage(locale, message),
    [locale],
  );

  const tActionError = useCallback(
    (failure: ActionFailure) => translateActionError(locale, failure),
    [locale],
  );

  return (
    <RegistrationLanguageContext.Provider
      value={{ locale, setLocale, t, tValidation, tActionError }}
    >
      {children}
    </RegistrationLanguageContext.Provider>
  );
}

export function useRegistrationLanguage(): RegistrationLanguage {
  return useContext(RegistrationLanguageContext);
}
