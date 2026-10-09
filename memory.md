# Memory — Route Groups + Homepage/Sign-in Cleanup

Last updated: 2026-07-08

> **Superseded.** This snapshot predates Slices 2–7 and the Neon/dotenvx/Lefthook/Oxlint/Bun
> migrations (2026-10-09). Its "Next session starts with" items are long resolved. Do not act
> on this file via `/remember restore` without checking `docs/context/progress-tracker.md` for
> current state first.

## What was built

- `context/architecture.md` — documented a `dashboard/(workflow)/` route group holding
  `reception/`, `hospital/`, `training/`, `security/`, `it/`, kept separate from `admin/`.
  Updated the "Dashboard Layout" section to explain the rationale and confirm no URL/layout
  impact (route groups add no segment; `dashboard/layout.tsx` still covers every child route).
- `src/app/page.tsx` — reduced to a pure redirect: no session → `/sign-in`; `User` role →
  `/unauthorized`; no PIN → `/pin` or `/pin/setup`; otherwise → `/dashboard`. No longer renders
  any UI itself.
- `src/components/layout/public-shell.tsx` — now renders the `bg-auth.jpg` full-bleed background
  + rounded-3xl floating card + logo (this used to live only in the old root `page.tsx`). Every
  `(auth)` page (`sign-in`, `pin`, `pin/setup`, `unauthorized`) inherits this look through the
  shared `(auth)/layout.tsx` → `PublicShell` wrapper.
- `src/app/(auth)/sign-in/page.tsx` — now carries the original homepage heading/subtitle
  ("Ghana Manganese Company Limited" / "Site Access Workflow Management System"), the Entra
  icon inside the submit button, and an added line "Sign in with your Microsoft account to
  continue." placed below the button, styled `text-xs text-muted-foreground`.
- `src/components/ui/button.tsx` — added `cursor-pointer` and `disabled:cursor-not-allowed` to
  the shared `buttonVariants` base class, so every `Button`/`SubmitButton` usage app-wide shows
  a pointer cursor on hover (covers sign-in button, pin/setup submit, admin user-row actions,
  etc. — all via this one shared primitive).

## Decisions made

- `dashboard/` stays a plain folder (it's a real URL segment, `/dashboard/...`) — only
  `(workflow)` was introduced underneath it, purely organizational, mirroring the project's
  documented System Roles vs. Workflow Roles split. `admin/` was deliberately left ungrouped
  (single self-contained section, not five siblings needing grouping).
- Homepage/sign-in duplication was resolved by making `/` a pure redirect and moving the
  richer bg-image/card treatment into the shared `PublicShell` (option: apply to *all* auth
  pages, not just sign-in) — user's explicit choice.
- Cursor-pointer fix applied at the shared `Button` primitive level (not a global CSS reset in
  `globals.css`), since every clickable control in the app already goes through this one
  component, and it matches the `cursor-pointer` convention shadcn's own `dropdown-menu.tsx`
  already uses.

## Problems solved

- Root cause of the duplicated sign-in UI: `page.tsx` had drifted from the documented flow
  (`project_overview.md`: "/ → redirect to dashboard or sign-in") by rendering its own full
  sign-in card instead of redirecting to `/sign-in`.
- Root cause of missing pointer cursor: Tailwind v4 preflight does not set `cursor: pointer` on
  `<button>` by default; the shared `buttonVariants` base class never had it either, unlike
  other shadcn-generated components in this repo (`dropdown-menu.tsx`) which already do.
- Clarified `[layer]` in `architecture.md`/`project_overview.md` is documentation shorthand for
  "one static folder per layer," not a literal Next.js dynamic route — confirmed against
  `build-plan.md`'s concrete per-slice file paths and the SRS's genuinely divergent per-layer
  field sets (a single templated `[layer]/page.tsx` wouldn't fit).

## Current state

- No workflow-layer folders (`reception/`, `hospital/`, `training/`, `security/`, `it/`) exist
  in the filesystem yet — only `dashboard/admin/` is built (Slice 1 is still the active slice
  per `progress-tracker.md`). The `(workflow)` group is a documented convention for when
  Slice 2+ actually creates those folders; nothing physical needed moving yet.
- `tsc --noEmit` is clean after every change made this session.
- Nothing verified in-browser yet (per CLAUDE.md, dev server isn't started/curled from here) —
  user still needs to eyeball `/`, `/sign-in`, and button hover states.

## Next session starts with

Resolve two stale doc references flagged but not yet fixed (user hadn't answered before the
conversation moved on):
- `context/build-plan.md` Slices 2–7 list file paths without the group, e.g.
  `src/app/dashboard/reception/page.tsx` should become
  `src/app/dashboard/(workflow)/reception/page.tsx` before Slice 2 actually starts building
  there — otherwise the next slice gets built in the wrong location.
- `context/project_overview.md` line 18 still shows `/dashboard/[layer]` — same stale shorthand.

## Open questions

- Should `build-plan.md` and `project_overview.md` be updated now for consistency, or deferred
  until Slice 2 (Reception) actually kicks off? Ask the user before touching either file.
