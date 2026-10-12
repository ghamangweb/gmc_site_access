import type { ActionErrorCode, DocType } from "@/lib/domain/types";

// Thrown by the registration service so the Server Action can hand the public
// form a stable code to translate, instead of the client having to pattern
// match on an English sentence. `message` stays a real English sentence —
// it is what gets logged and what any non-translating caller shows.
export class RegistrationError extends Error {
  readonly code: ActionErrorCode;
  readonly missingDocTypes?: DocType[];

  constructor(
    code: ActionErrorCode,
    message: string,
    missingDocTypes?: DocType[],
  ) {
    super(message);
    this.name = "RegistrationError";
    this.code = code;
    this.missingDocTypes = missingDocTypes;
  }
}
