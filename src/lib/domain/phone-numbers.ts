import { parsePhoneNumberFromString } from "libphonenumber-js";

export const EMERGENCY_PHONE_ERROR =
  "Emergency contact number must be different from the main telephone number";

export function isSamePhoneNumber(first: string, second: string): boolean {
  const firstNumber = parsePhoneNumberFromString(first, { extract: false });
  const secondNumber = parsePhoneNumberFromString(second, { extract: false });

  return !!(
    firstNumber?.isValid() &&
    secondNumber?.isValid() &&
    firstNumber.number === secondNumber.number
  );
}
