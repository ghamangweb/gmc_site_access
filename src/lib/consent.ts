export type ConsentChoice = "accepted" | "denied";

export const LOCALE_STORAGE_KEY = "gmc-registration-locale";

const CONSENT_STORAGE_KEY = "gmc-cookie-consent";

// Every access is guarded: private windows and blocked site data make
// localStorage throw, and the page must behave as "no choice made yet".
export function readConsent(): ConsentChoice | null {
  try {
    const stored = window.localStorage.getItem(CONSENT_STORAGE_KEY);

    return stored === "accepted" || stored === "denied" ? stored : null;
  } catch {
    return null;
  }
}

// Denying also removes anything already remembered, so a visitor who changes
// their mind isn't left with a stored language they refused.
export function writeConsent(choice: ConsentChoice): void {
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, choice);

    if (choice === "denied") {
      window.localStorage.removeItem(LOCALE_STORAGE_KEY);
    }
  } catch {
    // The choice still applies to this visit; it just won't be remembered.
  }
}
