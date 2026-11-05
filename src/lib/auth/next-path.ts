// Where to send a user once they have signed in and entered their PIN: the
// dashboard page they originally asked for (an email link, usually), carried
// through sign-in and PIN as `?next=`. Only same-site /dashboard paths are
// accepted, so the parameter cannot be used to bounce someone to another
// site. Pure, so the client PIN pages can use it too.
export function safeNextPath(
  value: string | null | undefined,
): string | undefined {
  if (!value) {
    return undefined;
  }

  if (
    !value.startsWith("/dashboard") ||
    value.startsWith("//") ||
    value.includes("\\")
  ) {
    return undefined;
  }

  return value;
}

// Auth.js passes the return path as `callbackUrl` when it sends someone to
// the sign-in page, often as an absolute URL. Only its path and query are
// kept (so it can only ever point back into this site), then checked like
// `?next=`.
export function safeCallbackPath(
  value: string | null | undefined,
): string | undefined {
  if (!value) {
    return undefined;
  }

  if (value.startsWith("/")) {
    return safeNextPath(value);
  }

  try {
    const url = new URL(value);
    return safeNextPath(`${url.pathname}${url.search}`);
  } catch {
    return undefined;
  }
}

export function withNext(path: string, next: string | undefined): string {
  return next ? `${path}?next=${encodeURIComponent(next)}` : path;
}
