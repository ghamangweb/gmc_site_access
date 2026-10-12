# UI Registry

Living document. Updated after every component is built or shadcn/ui component is installed.
Read this before building any new component — match existing patterns exactly before inventing new ones.

---

## How to Use

Before building any component:
1. Check if a similar component already exists here
2. If yes — match its exact classes and props pattern
3. If no — build it following `ui-rules.md` and `ui-tokens.md`, then add it here

After building any component: update this file immediately. Do not batch updates at the end of a slice.

---

## Installed shadcn/ui Components

| Component | File | Installed |
|---|---|---|
| Button | `src/components/ui/button.tsx` | 2026-07-07 |
| Input | `src/components/ui/input.tsx` | 2026-07-07 |
| Label | `src/components/ui/label.tsx` | 2026-07-07 |
| Card | `src/components/ui/card.tsx` | 2026-07-07 |
| Form | `src/components/ui/form.tsx` | 2026-07-07 |
| Alert | `src/components/ui/alert.tsx` | 2026-07-07 |
| DropdownMenu | `src/components/ui/dropdown-menu.tsx` | 2026-07-08 |
| Sonner (Toaster) | `src/components/ui/sonner.tsx` | 2026-07-08 |
| Avatar | `src/components/ui/avatar.tsx` | 2026-07-08 |
| Breadcrumb | `src/components/ui/breadcrumb.tsx` | 2026-07-08 |
| Table | `src/components/ui/table.tsx` | 2026-07-08 |
| RadioGroup | `src/components/ui/radio-group.tsx` | 2026-07-08 |
| Badge | `src/components/ui/badge.tsx` | 2026-07-08 |
| Dialog | `src/components/ui/dialog.tsx` | 2026-07-08 |
| Select | `src/components/ui/select.tsx` | 2026-07-09 |
| Checkbox | `src/components/ui/checkbox.tsx` | 2026-07-09 |
| Textarea | `src/components/ui/textarea.tsx` | 2026-07-09 |
| Tabs | `src/components/ui/tabs.tsx` | 2026-07-09 |
| Calendar | `src/components/ui/calendar.tsx` | 2026-07-09 |
| Popover | `src/components/ui/popover.tsx` | 2026-07-09 |
| Command | `src/components/ui/command.tsx` | 2026-07-23 |
| ScrollArea | `src/components/ui/scroll-area.tsx` | 2026-10-11 |

**`shadcn add` + the `cn` import (2026-10-11):** the CLI generated `scroll-area.tsx` with
`import { cn } from "cn"` and installed a junk `cn` npm package for it, instead of reading
`components.json`'s `utils` alias. Fixed by hand to `@/lib/utils` and `bun remove cn` — check
the import line and `git diff package.json` after every `shadcn add` in this project. Radix
primitives themselves need no new dependency: the unified `radix-ui` package is already
installed and generated components import from it (`import { X as XPrimitive } from "radix-ui"`).

**Button `ref` prop (2026-07-09):** Added `ref?: React.Ref<HTMLButtonElement>`
to `ButtonProps` and pass it straight to the underlying `Comp` — React 19's
"ref as a prop" support means no `forwardRef` wrapper is needed, just a typed
`ref` field read like any other prop. Needed because shadcn's generated
`Calendar` component's day-cell buttons (`CalendarDayButton`) render as
`<Button ref={ref}>` internally; without this the Calendar install type-errors
against this project's customized `Button` (which dropped `forwardRef` for the
`loading` prop rewrite in Slice 1) — the prev/next nav buttons are a separate
case, just `buttonVariants(...)` class strings merged onto `react-day-picker`'s
own native nav buttons, no `Button` component involved there. Any other
component that needs to forward a ref to `Button` now works the same way.

**Calendar/Popover → date-fns + react-day-picker:** Installing `Calendar` pulled
in `date-fns` and `react-day-picker` as dependencies automatically (shadcn CLI,
not a manual `pnpm add`) — expected, since Calendar is generated on top of
`react-day-picker` and `DatePicker` (below) uses `date-fns`'s `format`/`parseISO`
to convert to/from the `yyyy-MM-dd` strings this project's `date` columns use.

**Select / Checkbox history:** Both were briefly added for the Provision dialog in
Slice 1, then removed — the RadioGroup+Badge pattern below replaced both there
(single-select reads better as a badge stack than a `<select>`, and workflow role
turned out to need single-select too, not a checkbox multi-select — see Provision
Dialog notes). Reinstalled 2026-07-09 for Slice 2's Reception form, where they're
the correct fit: `Select` for real dropdowns (employment status, gender, access
level, etc.) and `Checkbox` for true multi-select/boolean fields (applicable
document picker, Section 6 confirmations) — the Provision dialog's narrow
single-choice-from-a-small-set case doesn't generalize to every dropdown or
checkbox in the app. Use the small badge-radio pattern only for that specific
single-choice-badge-stack use case; use plain `Select`/`Checkbox`/`RadioGroup`
(default styling, no Badge wrapper) for standard form fields.

**Table:** `TableHead`/`TableCell` are customized in-file (same precedent as
`DropdownMenu` below) to match `ui-rules.md`'s Tables convention out of the box —
`px-4 py-3`, headers `text-xs font-medium uppercase tracking-wide text-muted-foreground`,
cells `text-sm text-foreground`. `TableRow`'s upstream default already matched project
convention (`border-b` only — no vertical/column dividers, no alternating row colors,
`hover:bg-muted/50`) so it was left as-is. Give the header `TableRow` a
`hover:bg-transparent` override (see `dashboard/system-admin/users/page.tsx`) so the hover
effect doesn't apply to the header row itself. First used in
`dashboard/system-admin/users/page.tsx` + `user-row.tsx`, replacing a hand-rolled `<table>`.

**Row actions pattern:** A row's actions column is a single right-aligned
(`text-right` on both `TableHead` and `TableCell`) ghost icon button
(`variant="ghost" size="icon" className="size-8"`, `MoreHorizontalIcon` from
lucide-react, `<span className="sr-only">Open menu</span>` for a11y) that triggers a
`DropdownMenu` (`align="end"`) listing the row's actions, instead of multiple inline
`<Button>`s per row. This project's installed `DropdownMenu` is Radix-based — use
`DropdownMenuTrigger asChild` wrapping the `Button`, not a `render` prop (that's a
different, newer primitive API this project doesn't have installed). See
`user-row.tsx`'s Provision/Reset PIN menu for the reference implementation.

**Toasts (`sonner`):** Mounted once via `<Toaster />` in the root `layout.tsx`. This is
now the standard way to surface Server Action results on the client — call
`toast.error(result.error)`, `toast.success(...)`, or `toast.warning(result.warning)`
after a `useTransition`-wrapped action call, instead of hand-rolling local `error` state
+ an inline `<Alert>`. The generated `sonner.tsx` referenced `var(--popover)` /
`var(--popover-foreground)`, which this project's token set doesn't define — repointed
to `var(--color-card)` / `var(--color-card-foreground)` / `var(--color-border)` (the
Tailwind-generated, already-`hsl()`-wrapped variables from `@theme inline`, not the raw
unwrapped `:root` triples) to match the existing surface tokens. `Alert` is still
installed and valid for persistent inline state (e.g. "Your request is pending") — it's
just no longer used for transient action-result errors.

**DropdownMenu project tweaks:** (1) All interactive items (`Item`, `CheckboxItem`,
`RadioItem`, `SubTrigger`) use `cursor-pointer` instead of upstream's `cursor-default` —
keep this if the component is ever re-generated. (2) The panel's `bg-popover` /
`text-popover-foreground` tokens are defined in `globals.css` (added 2026-07-08, white
surface like `card`) — any future shadcn component that floats (Popover, Tooltip, Select,
Command) depends on them. (3) Menu items that navigate use `asChild` + Next `Link`, with a
lucide icon before the label (e.g. `LogOut` before "Sign out") — icon sizing is automatic
via the component's `[&_svg]` rules.

**Button `loading` prop:** `Button` takes an optional `loading?: boolean`. When true it
disables the button, sets `aria-busy`, and prepends a `Loader2` (lucide-react)
`animate-spin` icon before the children. Ignored when `asChild` is set (Slot requires a
single child element). Use on every button that triggers a Server Action / async
transition, so the UI never looks unresponsive during a click.

---

## Custom Components

### PublicShell

File: `src/components/layout/public-shell.tsx`
Last updated: 2026-07-07

| Property | Class |
|---|---|
| Outer | `flex flex-col flex-1 items-center justify-center bg-muted` |
| Panel | `w-full max-w-3xl flex flex-col items-center gap-10 py-24 px-16 bg-card` |
| Logo | GMC logo, always rendered at top |

**Pattern notes:**
Shared shell for every non-dashboard page (landing `/`, and everything in `(auth)/`
via `src/app/(auth)/layout.tsx`) — large centered panel with generous padding, GMC logo,
no card border/shadow. Headings use `text-3xl font-semibold`, subtitles
`text-lg text-muted-foreground`, primary CTA is `<Button size="lg">`. Dashboard pages
never use this — they use `DashboardShell` per `ui-rules.md`.

### DashboardShell / DashboardTopbar

File: `src/components/layout/dashboard-shell.tsx`, `src/components/layout/dashboard-topbar.tsx`
Last updated: 2026-07-08

| Property | Class |
|---|---|
| Shell outer | `min-h-screen bg-background` |
| Content column | `mx-auto w-full max-w-7xl p-6` |
| Top bar | `sticky top-0 z-10 w-full bg-background` — no separate surface color, no border; blends into the page |
| Top bar inner row | `mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-6` |
| Bell button | `h-9 w-9 text-muted-foreground rounded-md`; unread dot `h-2 w-2 rounded-full bg-destructive` |
| Avatar trigger | `h-8 w-8` Avatar, trigger `cursor-pointer rounded-full focus-visible:ring-1 focus-visible:ring-ring` |

**Pattern notes:**
Replaces the old sidebar-based shell — no sidebar anywhere in the app now. `DashboardShell`
is a Server Component: each `dashboard/{layer}/layout.tsx` calls `requireXxx()` guard, reads
`getSession()`, queries an unread `notifications` count plus the 10 most recent
`notifications` rows for `recipientStaffUserId`, and passes `homeHref` / `userName` /
`userEmail` / `userImage` / `unreadCount` / `notifications` down. `DashboardTopbar`
(the client half) is deliberately minimal — no nav links (navigation lives in `PageHeader`'s
breadcrumb): small GMC logo linking to `homeHref` (80×38 — the PNG's true ratio is ~2.1:1,
always keep width ≈ 2.1 × height when resizing or it distorts), a notifications bell, and a
shadcn `Avatar`
(`h-8 w-8`, Microsoft profile photo from session `image` with initials fallback — the Entra
provider fetches the 48px Graph photo as a base64 data URI by default) triggering a
`DropdownMenu` — label with name, email, and the user's system role as a neutral pill
(`rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground`; humanized in
the dashboard layout, e.g. "System Admin" — deliberately `bg-muted`, not a status bucket,
since roles aren't workflow states), separator, then a `LogOut`-icon "Sign out" item linking
to the `/sign-out` confirmation page. Rendered ONCE by the shared `src/app/dashboard/layout.tsx`
(which owns the session read + unread-count query and also renders `DashboardBreadcrumbs`
above children) — child layouts are guard-only (`system-admin/layout.tsx` = `requireSystemAdmin`
pass-through) and pages never render the shell themselves. The shell's `<main>` owns the
`p-6` — pages must not add their own outer padding. `/dashboard` (root page) role-routes:
SystemAdmin → `/dashboard/system-admin/users`; other roles get a centered "coming soon" empty state
until the workflow-layer dashboards exist.

Width invariant: the top bar inner row and the shell content column are both `max-w-7xl` and
must always change together (resolved 2026-07-08 after a brief 4xl/5xl drift).

**Notifications bell (2026-07-08):** Same `DropdownMenu` pattern as the avatar menu —
`DropdownMenuTrigger` is the bell button itself (`relative`, unread dot positioned
absolutely, `hover:bg-accent hover:text-accent-foreground` like a ghost icon button),
`DropdownMenuContent align="end" className="w-80"`. Header row: "Notifications" label +
conditional "Mark all as read" text button (`text-xs text-primary hover:underline`, only
rendered when `unreadCount > 0`). Each `DropdownMenuItem` is `flex-col items-start
whitespace-normal` (default `DropdownMenuItem` assumes a single line — override for
wrapping message text); unread items get a small `bg-destructive` dot + full-opacity
`text-foreground`, read items are plain `text-muted-foreground`. Selecting an unread item
calls `markNotificationReadAction`; selecting an already-read item is a no-op (still closes
the menu, Radix default). Empty state: centered `text-sm text-muted-foreground` line, no
icon (dropdown is too small for the full empty-state pattern in `ui-rules.md`). Relative
timestamps use a small inline `timeAgo()` helper in `dashboard-topbar.tsx` — no date library
added for this.

Mutations live in `src/actions/notifications.ts` (`markNotificationReadAction`,
`markAllNotificationsReadAction`) as Server Actions, not an API route — matches this
project's invariant that Server Actions own mutations and API routes are reserved for file
uploads. `architecture.md`'s folder tree previously listed a planned `api/notifications/`
mark-read route; corrected when this was built.

### PageHeader

File: `src/components/layout/page-header.tsx`
Last updated: 2026-07-08

| Property | Class |
|---|---|
| Outer | `mb-6 flex items-center justify-between` |
| Title | `text-2xl font-semibold text-foreground` |
| Subtitle | `mt-1 text-sm text-muted-foreground` |

**Pattern notes:**
Server Component; the standard header for every dashboard page — never rebuild this block
inline. Props: `title`, `subtitle?`, `actions?` (right-aligned ReactNode, e.g. the page's one
primary button). Breadcrumbs were removed from this component (2026-07-08) — they're now
rendered automatically by `DashboardBreadcrumbs` in the shared dashboard layout.

### DashboardBreadcrumbs

File: `src/components/layout/dashboard-breadcrumbs.tsx`
Last updated: 2026-07-08

| Property | Class |
|---|---|
| Breadcrumb | shadcn `Breadcrumb` defaults (chevron separators), `mb-4` |

**Pattern notes:**
Client component rendered once by `src/app/dashboard/layout.tsx` above page content — pages
never render their own breadcrumb. Takes a `homeHref` prop (same value passed to
`DashboardShell`, e.g. `/dashboard`) and builds the trail from `usePathname()` segments: every
segment becomes a crumb, with a **Home** crumb pointing at `homeHref` always prepended — the
trail reads `Home › Dashboard › Admin › Users` (`BreadcrumbLink asChild` + Next `Link`; last segment is a
non-clickable `BreadcrumbPage`). Labels come from the `SEGMENT_LABELS` map in the same file —
**add a label when a new dashboard route ships**; unmapped segments fall back to a capitalized
segment name (fine for static routes, wrong for dynamic ids — revisit when engagement detail
pages land in Slice 2). Every segment needs a real route: `/dashboard` and `/dashboard/system-admin`
are `redirect()`-only pages created for this.

### SubmitButton

File: `src/components/ui/submit-button.tsx`
Last updated: 2026-07-07

**Pattern notes:**
Thin client wrapper around `Button` using `useFormStatus()` to auto-derive
`loading={pending}`. Use inside any `<form action={serverAction}>` where the button
itself can't be a Server Component (e.g. the inline `"use server"` forms on `/`,
`/sign-in`, `/sign-out`) — `useFormStatus` only works in a child of the `<form>`. For
forms already tracked with `useTransition` client-side, pass `loading={isPending}` to
`Button` directly instead of reaching for this wrapper.

### PinInput

File: `src/components/auth/pin-input.tsx`
Last updated: 2026-07-07

**Pattern notes:**
Controlled 4-digit PIN entry (auto-focus next box, backspace navigates back). Used on
`/pin` and twice on `/pin/setup`. Not a shadcn primitive — built on top of `Input`.

### Radio badge group (role selector)

File: `src/app/(auth)/unauthorized/request-access-form.tsx`,
`src/app/dashboard/system-admin/users/user-row.tsx` (inline in both, not extracted)

**Pattern notes:**
Superseded 2026-07-08 — this used to be a hand-rolled native `<input type="radio">` +
`sr-only peer` trick specifically to avoid a Radix dependency. That reasoning turned out
to be wrong: Radix's `RadioGroup` already renders a hidden native bubble input per item
when given a `name`, so it posts through `FormData` in a Server Action form exactly like
a plain radio input would — there was no real tradeoff being avoided. Now built on the
actual shadcn `RadioGroup`/`RadioGroupItem` wrapped in a `Badge`:

```
<RadioGroup value={...} onValueChange={...} className="flex flex-row flex-wrap gap-2">
  <label htmlFor={id} className="cursor-pointer">
    <Badge variant="outline" className="gap-2 border-border bg-background px-2.5 py-1
      text-xs font-medium text-muted-foreground hover:bg-muted
      has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary
      has-[[data-state=checked]]:text-primary-foreground">
      <RadioGroupItem value={...} id={id} className="border-muted-foreground
        data-[state=checked]:border-primary-foreground [&_svg]:fill-primary-foreground" />
      {label}
    </Badge>
  </label>
</RadioGroup>
```

Two things this specific composition depends on: (1) the checked-state color flip on
`Badge` uses `has-[[data-state=checked]]:` on the label's own descendant — this only
works because the radio dot's ring color (`border-muted-foreground` /
`data-[state=checked]:border-primary-foreground`) is set explicitly on `RadioGroupItem`
itself, not inherited via `currentColor` from the badge — an earlier version relied on
inheritance and the ring silently disappeared when unchecked (see git history / memory
2026-07-08 if this regresses); (2) `user-row.tsx` uses `value`/`onValueChange` (controlled,
read into React state before calling a Server Action programmatically); `request-access-form.tsx`
switched from `defaultValue` to the same controlled `value`/`onValueChange` shape on
2026-10-09 so the form can conditionally reveal a department `Select` when
`"DepartmentHead"` is picked — per `ui-registry.md`'s own earlier note on `RadioGroup`,
going controlled doesn't change how it posts through `FormData` (still a hidden native
bubble input keyed by `name`), so this was a safe switch. Reuse this pattern for any
future single-choice-from-a-small-set picker before reaching for `Select` directly —
though note a *conditionally revealed* fixed dropdown (like the department picker) is a
`Select`, not a second badge group; see the Provision Dialog and
`request-access-form.tsx` entries for that shape.

### Provision Dialog

File: `src/app/dashboard/system-admin/users/user-row.tsx`
Last updated: 2026-07-08

**Pattern notes:**
Replaced an inline expanding `TableRow` (a second row that toggled open beneath the
clicked row) with a `Dialog` — cleaner, and doesn't push other rows down the page.
Content branches on whether the user has a pending access request with a stored
`requestedRole` (see `notifications.requested_role`, added this session):

- **Has a requested role** — plain confirmation, no picker: *"{name} requested the role
  '{role}'. Confirm to grant dashboard access."* Cancel / Confirm only. The requester
  already chose their role once (recorded in the request notification + email) — the
  System Admin isn't asked to pick it again, only to confirm it.
- **No pending request** (cold provisioning, or editing an already-provisioned user's
  roles) — falls back to the full picker: System Role and Workflow Role, each the
  Radio badge group above. **Workflow Role is single-select** — a staff user holds at
  most one workflow role at a time (see `architecture.md` Invariants); the picker
  includes an explicit `"none"` sentinel badge so a role can be cleared, since a radio
  group can't be clicked back to empty otherwise.

`handleProvision` computes the final `systemRole`/`workflowRoles` payload differently per
branch: from `requestedRole` directly (`"Guest"` → `systemRole: "Guest"`, no workflow
role; anything else → `systemRole: "Admin"`, `workflowRoles: [requestedRole]`) versus
from the picker's local state. `provisionUserAction` still takes `workflowRoles:
WorkflowRole[]` (the DB column stays `text[]`) — the UI just never sends more than one
element.

**Department picker (2026-10-09):** `"DepartmentHead"` is now a `WorkflowRole`, backed
by `GMC_LIAISON_DEPARTMENTS`/`GmcLiaisonDepartment` (`src/lib/domain/types.ts`) and a
new nullable `staff_users.department` column. A plain shadcn `Select` (not the
Badge/RadioGroup pattern — that one doesn't generalize past a narrow single-choice-badge
case, per the note above the Select/Checkbox history entry) appears conditionally in the
cold-provisioning branch when `workflowRole === "DepartmentHead"`, and **Save** is
disabled until a department is picked. The has-requested-role branch doesn't re-prompt
for department either (same "requester already chose it once" precedent as the role
itself) — it just names the requested department in the confirmation copy, sourced from
a new `notifications.requestedDepartment` column populated by the matching picker added
to `request-access-form.tsx` (see below). `provisionStaffUser` nulls out `department`
whenever `workflowRoles` doesn't include `"DepartmentHead"`, matching `architecture.md`'s
"only set when workflow_roles includes DepartmentHead" invariant.

### SessionRefresher

File: `src/app/(auth)/unauthorized/session-refresher.tsx`
Last updated: 2026-07-08

**Pattern notes:**
Tiny auto-firing client redirect component — same `useTransition`-adjacent shape as
`/pin`'s PIN-verify flow (`Loader2` spinner + `text-sm text-muted-foreground` copy),
but calls its Server Action (`refreshSessionAction`) automatically on mount via
`useEffect` instead of waiting on user input, then `router.push()`s on success. Used
when a Server Component detects (via a fresh DB read) that the visible page is no
longer valid for the user's current state, and the fix requires patching the live
JWT before navigating on. Reuse this shape for any other "state changed out-of-band,
resolve automatically on next load" case rather than a manual "click to continue"
button.

### ReceptionForm

File: `src/components/workflow/reception-form.tsx`
Last updated: 2026-07-09

**Pattern notes:**
First use of `react-hook-form` + `@hookform/resolvers/zod` in this codebase —
both were already approved/installed dependencies but unused until this form's
~35 fields made per-field `useState` unwieldy. Internal (non-exported) field
helpers — `TextField`, `TextAreaField`, `SelectField`, `ComboboxField`,
`YesNoField`, `CheckboxField` — wrap `FormField`/`FormItem`/`FormLabel`/`FormControl`/
`FormMessage` around one shadcn primitive each, keyed by `FieldPath<ReceptionFormValues>`.
Field-type → component mapping: small fixed dropdowns → `Select`, searchable
long-list dropdowns → `Combobox` (`nationality`, added 2026-07-23 — see
`Combobox`'s own entry above), binary yes/no → plain
`RadioGroup` (default styling, **not** the Badge-wrapped variant — that one's
reserved for the auth role-selector), checkboxes → `Checkbox`, multi-line text →
`Textarea`. `transportTo`/`transportFrom`/`otherInductions` (2026-07-23)
switched from free-text `TextField` to `YesNoField` — they sit in the "Site
Support Requirements" checklist alongside `airportPickup`/`generalSiteInduction`/
etc., which are all "is X required?" Yes/No questions; the three were
originally built as free-text by mistake, inconsistent with the rest of the
section (see `docs/ISSUES.md`). `ReceptionData` (`lib/domain/types.ts`) and the
zod schema both changed these three fields from `string` to `boolean` — no DB
migration needed since `engagements.receptionData` is a single `jsonb` column,
not individual typed columns. `applicableDocuments` is wired via a raw `Controller` (not one of the
field helpers) so it can hand `value`/`onChange` straight to `DocumentSelector`,
keeping that component RHF-agnostic and reusable outside this form. `readOnly`
disables every field and hides the submit button rather than swapping to a
separate read-only renderer — simpler, and shadcn's disabled styling already
communicates the state. One form serves both create (`/reception/new`, no
`engagementId`) and edit (`/reception/[id]`) — it calls `submitReceptionAction`
or `updateReceptionDataAction` depending on whether `engagementId` is set, then
`router.push`es to the new detail page on create.

**Duplicate-passport guard (2026-07-09):** `persons.passport_no` is unique, but
a passport being reused for a genuinely new visit is correct (Person is a
reusable identity — see `project-overview.md`); what isn't correct is starting
a second engagement while an earlier one for that passport is still in
progress. `lookupPersonByPassportAction` (fired by "Look up") now also returns
`activeEngagementId` from `getActiveEngagementForPassport` (workflow-service.ts
— any state except `Completed`/`Cancelled` counts as active); when set, a
persistent `Alert` (`variant="destructive"`, `Alert` is for exactly this kind
of standing page state, not `sonner`) appears under the passport field with a
link to the existing record, and the submit button disables via
`disabled={!!activeEngagementId}`. A `useEffect` on `form.watch("passportNo")`
clears the flag the moment the Receptionist edits the passport number again,
so a stale warning never lingers after a correction. This is a client-side
convenience only — `createEngagement` enforces the same check server-side
regardless of whether "Look up" was ever clicked, throwing a human-readable
error surfaced via the existing `error.message` toast path.

### SignaturePad

File: `src/components/workflow/signature-pad.tsx`
Last updated: 2026-07-09

**Pattern notes:**
Three capture modes behind a shadcn `Tabs` (Draw / Upload / Type) — only the
draw surface itself is hand-rolled (native `<canvas>` + pointer events); shadcn
has no drawing primitive and none was needed as a library. Value shape is
`{ mode: "draw" | "upload" | "type"; value: string }`, serialized with
`JSON.stringify` into the `stakeholder_approvals.signature` text column (kept as
one column rather than adding a `signature_mode` column, since the mode is only
ever needed alongside the value for rendering, never queried on its own).
`disabled` swaps to `SignaturePreview` (an `<img>` for draw/upload, plain text
for typed) instead of rendering inert controls.

### DocumentSelector

File: `src/components/workflow/document-selector.tsx`
Last updated: 2026-07-16

**Pattern notes:**
`Checkbox` per applicable document type (shadcn, not hand-rolled); each row is
`flex items-center justify-between` — checkbox + label on the left, the upload
slot (once checked) appears immediately at the far right of the **same** row,
not stacked below it (revised 2026-07-09 — the original stacked layout read as
sluggish/unclear about which document an upload button belonged to). The
upload slot's trigger is a hidden native `<input type="file">` opened via a
`Button`'s `onClick` — shadcn has no drop-zone/file-input primitive, so this is
a documented exception (same precedent as `Table`'s in-file
`TableHead`/`TableCell` tweaks). Posts directly to `/api/documents` via `fetch`
+ `FormData` (not a Server Action — file uploads are API-route-only per
`architecture.md`). "View" fetches a fresh SAS URL from
`GET /api/documents/[documentId]` and opens it in a new tab rather than caching
the URL, since SAS URLs expire after 15 minutes.

**`mode`/`docTypes` (2026-07-16):** Added `mode: "select" | "required"`
(default `"select"` — Reception's existing checkbox behavior, unchanged)
and an optional `docTypes` override (defaults to `RECEPTION_DOCUMENT_TYPES`,
the original 7 Reception types — kept as a separate constant from the full
`DOCUMENT_LABELS` key set so `hospital_fitness_form` never leaks into
Reception's default checkbox list). In `"required"` mode a doc type is
always treated as applicable — no checkbox, just a plain label, since it's
mandatory rather than Receptionist-selected. First consumer: Hospital's
`hospital-form.tsx` passes `mode="required"` `docTypes={["hospital_fitness_form"]}`.
`value`/`onChange` are now optional props, only meaningful in `"select"` mode.

**Create-mode uploads before the engagement exists (2026-07-09):** `documents.engagementId`
is a required FK, so a real upload can't happen until the engagement row
exists — but the record isn't created until the whole Reception form is
submitted. Rather than blocking the checkbox behind "save first" (confusing —
nothing else in the form is gated that way), checking a box on `/reception/new`
now reveals `PendingUploadSlot` instead of `UploadSlot`: it lets the user pick
a file immediately via the same hidden-`<input type="file">` pattern, but only
holds the `File` object in memory (lifted up to `reception-form.tsx`'s
`pendingFiles` state via `onPendingFilesChange` — no network call yet).
`reception-form.tsx`'s `onSubmit` creates the engagement first, then loops
over `pendingFiles` POSTing each to `/api/documents` with the new
`engagementId` before redirecting to the detail page — same upload path,
just sequenced after creation instead of before. On `/reception/[id]`
(`engagementId` already known) `DocumentSelector` renders `UploadSlot` as
before, uploading immediately on selection.

**Post-upload state + view/delete (2026-07-09):** Once a document exists
(`uploaded` truthy), `UploadSlot` swaps the "Upload file" button + "Required"
label for the filename itself as underlined link text (`text-primary
underline`, parsed from the blob URL's last path segment via
`fileNameFromUrl`) plus two ghost icon buttons — `EyeIcon` (same view/SAS-URL
fetch as before) and `Trash2Icon` (calls the new `DELETE
/api/documents/[documentId]` → `deleteDocument` → `document-service.ts`,
which removes both the blob via `deleteBlob` and the DB row — confirmed via
`window.confirm`, same precedent as `CancelEngagementButton`/`handleResetPin`
for a plain destructive yes/no with no extra data entry). `PendingUploadSlot`
mirrors this for create-mode: once a file is chosen, "Choose file" + Required
swap for the filename (underlined, opens a local `URL.createObjectURL`
preview — revoked on unmount/replacement via `useEffect` to avoid leaking
object URLs) + Eye/Trash icons, where Trash just clears that `docType` out of
`pendingFiles` (no network call, nothing's been uploaded yet).

**View always enabled, Delete hidden (not just disabled) when read-only
(2026-07-23):** Both `UploadSlot` and `PendingUploadSlot` previously applied
the same `disabled` prop to both the Eye (view) and Trash (delete) buttons —
so a stakeholder (HCM/GMM/DMD) viewing a Receptionist's uploaded documents
via the always-`readOnly` `ReceptionForm` (see `reception-form.tsx`'s
`formReadOnly` — true for anyone who isn't the active Receptionist) couldn't
even view a document, and saw a merely-grayed-out (still visible) delete
icon. Fixed: the Eye button no longer takes `disabled` at all — viewing has
no side effects and should always work regardless of the form's read-only
state; the Trash button is now wrapped in `{!disabled && ...}` so it's absent
entirely (not just inert) whenever the form is read-only, for any viewer —
matches the read-only semantic better than a disabled-but-visible icon, and
naturally covers the stakeholder case without a role-specific branch.

**Why `router.refresh()` matters here:** both upload and delete are plain
`fetch` calls from a Client Component, not Server Actions — so unlike the rest
of this app's mutations, nothing automatically revalidates the Server
Component page that owns `uploadedDocuments`. Every upload and delete handler
calls `router.refresh()` on success so the parent page re-fetches and the slot
actually reflects the new state — this was the root cause of "nothing visibly
changes after a successful upload" before this pass.

### StakeholderPanel

File: `src/components/workflow/stakeholder-panel.tsx`
Last updated: 2026-07-14

**Pattern notes:**
Branches on whether `approvals[0]` exists: an approval summary card if so,
otherwise action buttons gated by two props computed server-side from session +
engagement state (`canRequestApproval`, `approveAs`) — the component itself
holds no authorization logic. Two `Dialog`s (delegated-approval request, approve
with `SignaturePad`) follow the `user-row.tsx` Provision Dialog precedent
(`DialogHeader`/`DialogFooter`, Cancel/Confirm). The delegated-badge on an
approved record uses a literal Tailwind class string
(`bg-status-warning-bg text-status-warning-fg`) rather than interpolating the
bucket name — Tailwind v4's scanner needs the full class name to appear
literally in source to generate it; same reason the Reception queue page keeps
a `Record<WorkflowState, string>` of full class strings instead of building
`` `bg-status-${bucket}-bg` `` at runtime.

**Dropped `result.warning` toast (2026-07-23):** `handleRequestApproval`,
`handleRequestDelegated`, and `handleApprove` only checked `result.success`
and never read `result.warning` — so when `sendEmail` (`lib/email/send.ts`)
fails (Graph API error, caught and logged server-side, not thrown) the
server action still returns `{ success: true, warning: "...emails may not
have sent" }`, but the panel showed a plain success toast with no indication
email delivery failed. Fixed to check `result.warning` first and show
`toast.warning(...)` instead of the success toast, same pattern already used
in `reception-form.tsx`'s `onSubmit`, `hospital-form.tsx`, and
`user-row.tsx`/`grant-delegation-row.tsx`. This was the actual cause behind
a reported "only dashboard notifications arrive, never email" bug — dashboard
notifications and email attempts are gated by the identical `recipients`/
`nextRole` condition in `workflow-service.ts`, so they aren't really
independent; the email side was silently failing and the UI just wasn't
telling anyone. The underlying email-delivery failure itself is an
Azure/Graph API config issue (`lib/azure/graph-mail.ts` — check
`AZURE_TENANT_ID`/`AZURE_CLIENT_ID`/`AZURE_CLIENT_SECRET`/`GRAPH_SENDER_EMAIL`
and the App Registration's `Mail.Send` Application permission, admin-consented),
not something fixable from this file — the `console.error("[email]", error)`
in `send.ts` prints the real Graph error server-side; check there once this
warning toast starts appearing.

**Auto-redirect back to the queue after Request/Confirm Approval (2026-07-23):**
Both `handleRequestApproval` (Receptionist's plain "Request Approval", not the
delegated variant) and `handleApprove` ("Confirm Approval" in the Approve
dialog) previously just toasted success and left the viewer on the same
engagement detail page. Now both `setTimeout(() => router.push("/dashboard/reception"), 2000)`
on success, so the viewer lands back on the queue list ("where the records
were") a couple seconds after the toast — long enough to read the success
message first. Plain `setTimeout` + `useRouter` rather than
`SessionRefresher`'s `useEffect`-on-mount shape, since this fires from a user
action's success branch, not automatically on page load. Scoped to exactly
the two actions named in `docs/ISSUES.md` — "Request Delegated Approval"
still doesn't auto-redirect; extend it the same way if that's asked for too.

**Approve dialog is signature-only (2026-07-14):** previously asked every
approver — direct stakeholder and delegated alike — to also type an "Approval
Name" and (delegated only) pick "Approving as HCM/GMM/DMD". Both were fake
data: the session already knows exactly who is approving and, for a direct
stakeholder, which role they hold (`workflow-roles` invariant — one workflow
role per staff user); a delegate isn't actually HCM/GMM/DMD and shouldn't claim
to be. `applyStakeholderApproval` (`workflow-service.ts`) now derives
`approverName` from `session.displayName` and `approverRole` from the caller's
own direct role, falling back to the literal `"Delegated"` (added to the
`ApproverRole` union in `lib/domain/types.ts`) — neither is client input
anymore. The dialog itself is just `SignatureField` + Confirm/Cancel for both
approver types; check here before adding an identity field back into any
approval-style modal in this app.

### Combobox

File: `src/components/ui/combobox.tsx`
Last updated: 2026-07-23

**Pattern notes:**
Searchable-dropdown primitive, generated on top of shadcn's `Command`
(`cmdk` — newly added dependency, asked and approved before installing;
`pnpm dlx shadcn@latest add command` pulled it in) inside the existing
`Popover`, following the exact same trigger-`Button`-in-a-`Popover` shape as
`DatePicker`: `PopoverTrigger asChild` wraps a `variant="outline"` `Button`
(`h-11 w-full justify-between font-normal`, muted placeholder text when
empty, `ChevronsUpDownIcon` trailing icon), `PopoverContent` holds
`Command`/`CommandInput`/`CommandList`/`CommandEmpty`/`CommandGroup`/
`CommandItem`. Since Radix's unified `popover` export in this project
doesn't expose a `--radix-popover-trigger-width` CSS var (checked — only
`Select`'s primitive does), the content width is set directly from the
trigger `Button`'s measured `offsetWidth` via a ref, read at render time —
works because `PopoverContent` only mounts once `open` is true, by which
point the trigger has already mounted and the ref is populated; doesn't
track window resizes, but the trigger sits in a static form grid cell so
that's not a real case here. Props: `value`/`onChange` (plain strings, no
object items — matches every other field in this app's forms), `options:
string[]`, `placeholder`, `searchPlaceholder`, `emptyText`, `disabled`.
Selecting the already-selected option clears it back to `""` (can't
otherwise un-select from a single-select list), matching shadcn's own
Combobox recipe. First consumer: `reception-form.tsx`'s `nationality`
field (`ComboboxField` helper, mirroring `SelectField`'s shape), backed by
`NATIONALITIES` in `src/lib/domain/nationalities.ts` (demonyms, e.g.
"Ghanaian"/"Nigerian"/"British" — not country names, since the field is a
person's nationality, not a country picker like `PhoneInput`'s dial-code
list). Reuse this component for any other free-search-over-a-fixed-list
field before hand-rolling another `Popover`-based dropdown.

### DatePicker

File: `src/components/ui/date-picker.tsx`
Last updated: 2026-07-09

**Pattern notes:**
shadcn's own composed date-picker recipe — a `Popover` trigger `Button`
(`variant="outline"`, shows the formatted date or a placeholder, `CalendarIcon`
prefix) opening a `PopoverContent` with `Calendar` (`mode="single"`). Value/
`onChange` are plain `yyyy-MM-dd` strings (via `date-fns` `format`/`parseISO`),
matching this project's Postgres `date` columns exactly (Drizzle's `date()`
column defaults to string mode) — no `Date` objects cross the component
boundary. Placed in `components/ui/` rather than `components/workflow/` since
it's a generic reusable primitive with no business logic, same precedent as
`SubmitButton`. Replaced the native `<input type="date">` used for
`dateOfBirth`/`arrivalDate`/`departureDate` in `reception-form.tsx` — check
here before reaching for a native date input anywhere else in the app.

### PhoneInput

File: `src/components/workflow/phone-input.tsx`
Last updated: 2026-07-09

**Pattern notes:**
Revised 2026-07-09 after design feedback — the code segment must stay
**freely typable** (not locked to a picklist) and the dropdown must show
**only dial codes, never country names**. Neither requirement fits shadcn
`Select` (locks the value to one of its items, and its trigger always renders
the matched item's full children). So this is a compound native `<input>` +
`<input>` inside one shared bordered box (`rounded-md border border-input`,
`focus-within:ring-1 ring-ring` — mirrors `Input`'s own focus styling since
neither segment can be a real `Input` without fighting its own border/padding
inside a merged box), split by a single `border-r border-input` divider; the
code segment gets `bg-accent` to set it apart per the mock. The dropdown
**is** the shadcn `Popover` (not hand-rolled) — its content is a plain
deduped list of `DIAL_CODES` (from `COUNTRY_CALLING_CODES`, names stripped),
each a plain button that overwrites the code input's value on click; picking
one is a shortcut, not a constraint — the code input still accepts anything
typed directly. Combined value is stored as one `"+233 244123456"`-shaped
string (split on the first space in `splitValue`) so it still fits the
schema's single `text()` phone columns — no schema change needed. Replaces
free-typed phone `TextField`s in `reception-form.tsx` (`phone`,
`telephoneOnSite`, `emergencyContactPhone`, `companyEmergencyTel`).

### Text casing enforcement (`toTitleCase` / `toSentenceCase`)

File: `src/lib/utils.ts`

**Pattern notes:**
Two pure string helpers, applied inside `reception-form.tsx`'s `TextField`/
`TextAreaField` on every `onChange` (transform-before-`field.onChange`, not a
separate validation step) so free-caps typing is structurally impossible
rather than just flagged after the fact: `toTitleCase` capitalizes each word's
first letter and forces the rest lowercase (used for name-like fields via
`casing="title"` — `fullName`, `emergencyContactName`, `companyName`,
`contactNameMonthly`, `companyEmergencyName`, `gmcLiaisonPerson`);
`toSentenceCase` capitalizes only the first letter of the string and after
sentence-ending punctuation, forcing everything else lowercase (the default,
`casing="sentence"`, for free-text fields like `reasonForRequest`, `remarks`).
Fields excluded entirely via `casing="none"`: `passportNo` (identifier),
`email`/`contactEmail` (case-sensitive-ish, must not be mangled). Dropdown-
backed fields (`Select`/`RadioGroup`/`Checkbox`) and `PhoneInput`/`DatePicker`
never need a casing mode — only free-text `Input`/`Textarea` do.

### CancelEngagementButton

File: `src/components/workflow/cancel-engagement-button.tsx`
Last updated: 2026-07-09

**Pattern notes:**
Replaced the earlier `TerminateButton` (2026-07-09) after clarifying that
"cancel an engagement" and "request access termination" are two different
SRS-level concepts, not one relabeled button: cancelling is a Receptionist
soft-delete of a still-unapproved Reception record (no System Admin
involved, no reason needed) — "Request Termination" (below, in
`reception-row.tsx`) is the separate, SRS-mandated System-Admin-approval flow
for revoking access that's already progressed. Uses `window.confirm` for its
confirmation, not a `Dialog` — same precedent as `user-row.tsx`'s
`handleResetPin`: a plain yes/no with no extra data entry doesn't need a full
dialog. Rendered in `[engagementId]/page.tsx`'s `PageHeader` `actions` slot,
gated on the same `canRequestApproval` condition as the approval actions
(`workflowState === "AtReception"` and not yet approved) — matches the new
`cancelEngagement` service guard exactly.

### ReceptionRow (row actions + Request Termination)

File: `src/app/dashboard/(workflow)/reception/reception-row.tsx`
Last updated: 2026-07-23

**Whole-row navigation (2026-07-23):** Previously only the Name cell was a
`Link` to the engagement detail page — every other cell (passport no., access
purpose, status badge) was inert. Changed to a `cursor-pointer` `TableRow`
with an `onClick` (`useRouter().push`) instead of the per-cell `Link`, so the
entire row navigates on click, matching the "stakeholder dashboard" request
(this queue table is shared by Receptionist/HCM/GMM/DMD — see
`docs/ISSUES.md`). The `canManage` Actions `TableCell` stops propagation
(`onClick={(e) => e.stopPropagation()}`) so opening its row-actions dropdown
doesn't also trigger row navigation — React's synthetic event system bubbles
through the JSX tree (not raw DOM nesting), so this still catches clicks on
the `DropdownMenuContent`'s portaled items. First "whole row clickable"
pattern in this app — `hospital/page.tsx`'s queue table still only links its
Name cell; apply this same treatment there if that page gets the same ask.

**Pattern notes:**
"Request Termination" moved here (2026-07-09) from the engagement detail page
to the queue table's row-actions dropdown, following the exact
`user-row.tsx` "Row actions pattern" already documented above (ghost
`size="icon"` `Button` + `MoreHorizontalIcon` + `DropdownMenu align="end"`).
The Actions `TableHead`/`TableCell` only render at all when the viewer
`canManage` (Receptionist, non-Guest) — that flag comes from the page and is
the same for every row in one render, so column count never differs row to
row; within a rendered column, a row's cell is left empty (no dropdown) when
`workflowState` is `Cancelled` or `Completed` (nothing left to terminate).
The dropdown's one item opens a `Dialog` with a required reason `Textarea`
(this one **does** need a dialog + reason, unlike `CancelEngagementButton`,
since it triggers the real SRS termination-request workflow that notifies
the System Administrator) and calls the existing `requestTerminationAction`.
Also owns the exported `WORKFLOW_STATE_BADGE` map (moved from `page.tsx`),
now including `Cancelled → danger` bucket.

### Field height + shadow standardization (2026-07-14)

Files: `src/components/ui/input.tsx`, `src/components/ui/select.tsx`,
`src/components/workflow/phone-input.tsx`,
`src/components/ui/date-picker.tsx`

**Pattern notes:**
All single-line field controls now share `h-11` so a text `Input`, `Select`
trigger, `PhoneInput` box, `PassportField` box, and `DatePicker` trigger
button sit at the same height in a row — `SelectTrigger` previously
hardcoded `h-9` (shadcn default), `PhoneInput`/`PassportField` had no
explicit height at all (content-driven from padding, an unreliable match).
`DatePicker`'s height is set via an explicit `h-11` className override on
its trigger `Button`, not by changing `Button`'s own default size — that
default is shared by every button in the app (submit, cancel, look-up) and
those were never part of this ask. `Textarea` was bumped separately (not
part of this height-parity set, since it's multi-line) to `min-h-44`.
Also removed `shadow-xs`/`shadow-md` from every component that had it
(`phone-input.tsx`, `PassportField`'s box, `popover.tsx`, `calendar.tsx`) —
per explicit request, this app renders flat, no drop shadows anywhere.

**`SelectContent` position (2026-07-14):** default was Radix's
`position="item-aligned"`, which anchors the dropdown so the *currently
selected item* lines up over the trigger — the panel's position and width
shift depending on which option is selected and how far down the list it
sits, producing visibly inconsistent placement across different `Select`
instances (reported via screenshot: Visa Type vs. Access Level opening in
different spots/widths). Changed the default to `position="popper"`, which
anchors directly below the trigger and matches its width every time — the
conventional shadcn default. This is a base-component change so every
`Select` in the app (Visa Type, Access Level, Employment Status, Gender,
Access Purpose, delegation role picker) is fixed at once.
`transition-shadow`/`transition-[color,box-shadow]` classes elsewhere
(`checkbox.tsx`, `radio-group.tsx`, `badge.tsx`, `textarea.tsx`,
`select.tsx`) were left alone — they only declare which CSS properties
animate and don't apply a shadow by themselves.

### PassportField

File: `src/components/workflow/reception-form.tsx`
Last updated: 2026-07-14

**Pattern notes:**
Passport No. + its "Look up" trigger used to be a `TextField` next to an
external `Button` in their own `flex` row, exempt from the section's field
grid. Folded into the grid like every other field by embedding the lookup
trigger *inside* the input's own bordered box, following `PhoneInput`'s
"compound control sharing one border" precedent — a raw `<input>` plus a
raw `<button>` (not the shadcn `Button`, to avoid a second nested
border/background) side by side in one `rounded-md border border-input`
box, divided by `border-l`. Shows `SearchIcon` normally, swaps to a
spinning `Loader2` while `isLookingUp`. Only rendered when
`showLookup` (`allowLookup && !engagementId`) — editing an existing
engagement drops the button entirely and the input alone fills the box.

### DesktopOnlyGuard

File: `src/components/layout/desktop-only-guard.tsx`
Last updated: 2026-07-14

**Pattern notes:**
This app has zero responsive breakpoints anywhere else — it's desktop-only
by design, not "desktop-first responsive." Rather than detect viewport
width in JS (hydration flash risk, extra client state), it's a pure-CSS
`fixed inset-0 z-50` overlay that's `hidden` by default and switches to
`flex` via `max-lg:flex` — Tailwind's `lg` breakpoint (1024px) is the floor
below which the shell's layout has no room to render properly. It originally
matched the content column exactly; the column widened to `max-w-7xl`
(1280px) on 2026-10-11, so between 1024px and 1280px the column simply fills
the viewport (`w-full` with the max as a cap) and wide tables fall back to
their own `overflow-x-auto`. Mounted once in the root `layout.tsx` (alongside
`Toaster`) so it covers every route, including the pre-dashboard auth
pages — this is a device-capability gate, not a workflow-layer concern.

### EmptyState

File: `src/components/ui/empty-state.tsx`
Last updated: 2026-07-20

| Property | Class |
|---|---|
| Outer | `flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border py-16 text-center` |
| Icon badge | `flex size-12 items-center justify-center rounded-full bg-muted` |
| Icon | `size-6 text-muted-foreground` |
| Title | `text-sm font-medium text-foreground` |
| Description | `max-w-sm text-sm text-muted-foreground` |
| Shadow | none |

**Pattern notes:**
Generic reusable primitive (no business logic) placed in `components/ui/`,
same precedent as `DatePicker`/`SubmitButton`. Extracted from five near-identical
hand-rolled blocks (`flex flex-col items-center justify-center py-16 text-center`
+ a lone `<p>`) across `reception/page.tsx`, `hospital/page.tsx`,
`system-admin/users/page.tsx`, and `system-admin/delegations/page.tsx` (x2) — all
now render `<EmptyState icon={...} title="..." description="..." action={...} />`
instead. Props: `icon` (a `LucideIcon` component reference, not a rendered
element — `EmptyState` sizes/colors it itself so every empty state matches),
`title`, optional `description`, optional `action` (e.g. Reception's queue
passes its "New Registration" `Button` here when `canManage`, so the empty
state itself can offer the way out rather than requiring the page's `PageHeader`
button alone). Icon choice is picked per context to read as "modern," not
generic — `UsersRound` (Reception queue, Staff Users), `Stethoscope` (Hospital
queue), `UserCheck` (active delegations), `UserCog` (awaiting delegation). The
dashed border is the one exception to this app's "no visible container border
on bare list/queue backgrounds" default — it's what signals "this is an empty
placeholder region," same convention as file-drop zones. Check here before
hand-rolling another "no rows yet" block anywhere in the app.

### ReceptionSummary

File: `src/components/workflow/reception-summary.tsx`
Last updated: 2026-07-16

| Property | Class |
|---|---|
| Card | `bg-card border border-border rounded-xl p-6` |
| Title | `text-lg font-semibold text-foreground mb-4` |
| Field grid | `grid grid-cols-2 gap-4` |
| Field label | `text-xs font-medium uppercase tracking-wide text-muted-foreground` |
| Field value | `text-sm text-foreground` |
| Approval badge | `bg-status-success-bg text-status-success-fg` (approved) / `bg-status-warning-bg text-status-warning-fg` (awaiting) |

**Pattern notes:**
A deliberately minimal read-only card, not a reuse of the full
`ReceptionForm`/`StakeholderPanel` pair Reception's own detail page renders.
Hospital staff need patient identity + emergency contact + approval status
for a medical clearance decision — not company/GMC-liaison/transport/PPE/
visa data, none of which `project-overview.md`'s Hospital section calls for.
Internal (non-exported) `Field` label/value helper mirrors the label/value
pairing style used elsewhere, just not built on `FormField` since this
renders plain data, not a form. Dates are rendered as their raw
`yyyy-MM-dd` strings — no `date-fns` import, per `library-docs.md`'s rule
that only `components/ui/` (`DatePicker`, `Calendar`) may import it
directly. Reusable for any future layer (Training, Security, IT) that needs
the same "who is this person, are they approved" context without pulling in
Reception's full form.

### HospitalForm

File: `src/components/workflow/hospital-form.tsx`
Last updated: 2026-07-16

| Property | Class |
|---|---|
| Card | `bg-card border border-border rounded-xl p-6` |
| Title | `text-lg font-semibold text-foreground mb-4` |
| Field stack | `flex flex-col gap-4`, each field `flex flex-col gap-2` |

**Pattern notes:**
Plain `useState` + `useTransition`, not `react-hook-form` — only two real
input fields (clearance status, doctor comments) plus the upload slot;
RHF was justified for Reception's ~35 fields, not for this. Uses
`DocumentSelector` in `mode="required"` for the mandatory
`hospital_fitness_form` upload (see that component's notes above) — the
Submit Clearance button stays disabled until the file is uploaded AND a
status is chosen AND comments are non-empty, mirroring
`submitForStakeholderApproval`'s missing-document guard pattern but
enforced client-side too for immediate feedback (the server-side guard in
`recordHospitalClearance` is still the real enforcement). When a prior
clearance exists for the active workflow cycle, a small `text-xs
text-muted-foreground` line above the form shows it for context ("Last
recorded: Unfit — ... (date)") — the form itself always starts blank,
ready for a fresh submission, since `hospital_clearances` is append-only
(see `progress-tracker.md`'s Slice 3 entry). `readOnly` disables every
field and hides the submit button, same precedent as `ReceptionForm`.

### InviteForm / InvitationRow (Department Head invitation console)

Files: `src/app/dashboard/(workflow)/department/invite-form.tsx`,
`src/app/dashboard/(workflow)/department/invitation-row.tsx`
Last updated: 2026-10-09

**Pattern notes:**
`InviteForm` is a one-field `<form action={handleSubmit}>` (plain `Input` +
`Label`, no react-hook-form — same "one field doesn't justify RHF" call as
`hospital-form.tsx`), wrapped in a `useTransition` client component exactly
like `RequestAccessForm` (not `SubmitButton`, since `useTransition` already
tracks pending state — per this file's own `Button loading` note, reach for
`SubmitButton` only when there's no surrounding `useTransition`). Resets via
a `formRef` on success instead of `useState` + conditional unmount, since the
form stays visible after a send (unlike `RequestAccessForm`, which replaces
itself with a static "submitted" message once).

`InvitationRow` follows the Reception queue's row-actions pattern exactly:
ghost icon `Button` + `MoreHorizontalIcon` + `DropdownMenu align="end"`, one
item ("Revoke") confirmed via `window.confirm` (plain destructive yes/no, no
extra data entry — same precedent as `CancelEngagementButton`/reset-PIN, not
a `Dialog`). Status is a binary badge (`bg-status-success-bg`/`danger-bg`),
derived from `revokedAt` being null, not a stored status column — the Actions
column (and its `TableHead`) only renders at all when `canManage` (not a
Guest), matching `ReceptionRow`'s identical `canManage`-gated column.

**Registration-type picker (2026-10-09):** `InviteForm` gained a plain (not Badge-wrapped)
`RadioGroup` for `"Local" | "Foreign"` — binary choice, same precedent as `YesNoField` in
`reception-form.tsx`/`local-registration-form.tsx` (the Badge-wrapped variant is reserved
for the auth role-selector's small-set-of-named-options case, not a plain two-way toggle).
`InvitationRow`/the page's table gained a `Type` column showing it.

### ReceptionForm `publicToken` mode / LocalRegistrationForm (2026-10-09)

Files: `src/components/workflow/reception-form.tsx` (`publicToken` prop),
`src/components/workflow/local-registration-form.tsx` (new)

**Pattern notes:**
`/register` reuses `ReceptionForm` wholesale for Foreign registrations rather than forking
it — `publicToken?: string` switches three things: the "Applicable Document Uploads" `Card`
doesn't render (no `engagementId`/authed uploader exists yet to attach uploads to), submit
calls `submitRegistrationRequestAction(publicToken, payload)` instead of the
Receptionist-only actions, and success shows a plain "Thank you" `Card` instead of the
"Engagement created" one (nothing to link a public visitor to — they have no login).
`allowLookup` is simply never passed in this mode, so the passport-lookup button stays off
by default as it already was.

`LocalRegistrationForm` is a separate, smaller component rather than a third `ReceptionForm`
branch — same RHF/zod/field-helper shape (each helper duplicated locally, same convention as
every other per-form helper set in this codebase, e.g. `HospitalForm`), minus
`Nationality`/`Ghana Visa Required`/`Visa Type`/`GMC Liaison Department` (none apply to a
Ghanaian national, and liaison department is already injected from the invitation token).
"Passport No." becomes "Ghana Card No." on the same underlying field name (`passportNo`) —
`persons.passport_no` is reused as a generic ID-number column rather than adding a second
identity column; see `architecture.md`'s `invitations` notes for the reasoning. Always posts
to the same `submitRegistrationRequestAction` as the Foreign path (a `LocalRegistrationFormInput`
union member) — the two forms share the submission action, not the submission component.

**Liaison fields prefilled + locked from the invitation (2026-10-11):** on `/register` the
visitor no longer types who invited them. `validateInvitationToken` now joins `staff_users`
and returns `issuerName` alongside `department`, and the page passes both down as
`defaultValues` — `gmcLiaisonPerson` + `gmcLiaisonDept` for the Foreign form, `gmcLiaisonPerson`
for the Local one (which has no department field at all, since the token already carries it).
Both render `disabled`: `ReceptionForm` gained a `liaisonDisabled = disabled || !!publicToken`
so the authenticated Reception page keeps them editable, while `LocalRegistrationForm` — public
only — hard-codes `disabled`. `LocalRegistrationForm` gained a `defaultValues?:
Partial<LocalFormValues>` prop to receive it, mirroring `ReceptionForm`'s existing prop rather
than inventing a single-purpose one. A `disabled` `Input` is a DOM attribute only, so RHF still
holds the value and the `.min(1)` zod rules still pass.

`createRegistrationRequest` also overwrites both fields server-side from the invitation before
inserting, because a Server Action takes whatever payload it is handed — the read-only inputs
are UI, not enforcement. That function now validates the token up front and throws the
"invalid, already used, or revoked" error there (it previously skipped the document check for a
bad token and let the transaction raise the same error) so the issuer/department are available
for the overwrite; the in-transaction `consumeInvitation` row was renamed `consumed` to stop it
shadowing that outer `invitation`.

**Site Support Requirements → checkboxes + conditional reveals (2026-10-09):** that whole
section in `reception-form.tsx` moved from `YesNoField` (Yes/No `RadioGroup` per question) to
`CheckboxField` — a checked box now means "required", so the explicit "No" option is gone.
`YesNoField` was deleted from this file entirely (no remaining callers; `RadioGroup`'s import
went with it) — note `local-registration-form.tsx` still has its own `YesNoField` copy and was
deliberately left on radios. Two boxes reveal a dependent field when checked, each wrapped
with its checkbox in a `flex flex-col gap-3` grid cell so the reveal sits directly under its
own box rather than shifting the grid:
- `airportPickup` → `DateField` ("Pickup Date")
- `accommodationRequired` → `ComboboxField` ("Accommodation Location") over
  `GHANA_LOCATIONS` (`src/lib/domain/ghana-locations.ts`, a curated list of ~87 Ghanaian
  towns/cities — same static-list + searchable-`Combobox` pattern as `NATIONALITIES`, chosen
  over a live Places/geocoding API so no new dependency or API key is involved)

Both dependent values are required only while their box is checked, enforced by a
`.superRefine()` on the schema object with a `path:` targeting the specific field (not
`.min(1)` on the field itself, which would fire even when the box is unchecked). A `useEffect`
per box clears the dependent value on uncheck, and `onSubmit` sends `undefined` rather than
`""` for an unchecked box — so `receptionData` never carries an orphaned pickup date or
location. `ReceptionData.pickupDate`/`accommodationLocation` are **optional** (`?`) precisely
because `engagements.reception_data` is `jsonb` and existing rows predate both fields — that's
also why this needed no migration.

**`DocumentSelector` public/token mode (2026-10-09):** gained `invitationToken` (mutually
exclusive with `engagementId`) and `requiredDocTypes`. With a token it posts to
`/api/register/documents` and sends `token` instead of `engagementId`, and its view/delete
calls swing to that same route (the staff `/api/documents/[id]` SAS + DELETE endpoints are
`requirePinConfirmed`-guarded, so a visitor can't use them). `requiredDocTypes` splits
`mode="required"` into genuinely-required vs offered-but-optional rows — optional ones render
an "(optional)" suffix and their empty slot reads "Optional" instead of "Required". Because a
real parent id (the invitation) exists from first page load, public uploads use the immediate
`UploadSlot` path, **not** `PendingUploadSlot` — nothing is held in memory and a half-finished
form never loses attachments. `DOCUMENT_LABELS` moved out of this file into
`lib/domain/types.ts` so services can reuse it for error messages; same reason
`REGISTRATION_DOCUMENT_TYPES`/`getRegistrationDocTypes` live in `domain/` rather than
`document-service.ts` — a **value** import from that service into a `"use client"` form would
pull Drizzle and the Azure SDK into the browser bundle (the long-standing `import type
{ Document }` is fine, since types erase).

**`CheckboxField` label-click fix (2026-10-09):** the `Checkbox` inside it carried
`id={field.name}`, which (via Radix `Slot` prop precedence) overrode the `id={formItemId}`
that `FormControl` supplies — the one `FormLabel`'s `htmlFor` points at. So clicking a
checkbox's label did nothing. Dropping the manual `id` lets `FormControl` wire it up and makes
labels toggle their box. Worth knowing before adding `id` to any other `FormControl` child.

### Reception: submitted registrations queue (2026-10-11)

Files: `src/app/dashboard/(workflow)/reception/page.tsx`,
`registration-request-row.tsx` (new), `new/page.tsx`,
`src/lib/domain/registration-prefill.ts` (new)

| Property | Class |
|---|---|
| Section wrapper | `mb-6 flex flex-col gap-3`, above the Engagements table |
| Section heading | `text-lg font-semibold text-foreground` + `bg-status-warning-bg text-status-warning-fg` count pill ("N awaiting") |
| Table | the standard shadcn `Table` pattern — same header/cell classes as the Engagements queue |
| Converted badge | `bg-status-success-bg text-status-success-fg`, wrapped in a `Link` to the Engagement |
| Action button | shadcn `Button size="sm"` → `/dashboard/reception/new?requestId=…` |

**Pattern notes:**
Reception's page now leads with what the workflow actually starts from — the visitor's own
submission — and the existing Engagements table sits below under its own `Engagements`
heading. `RegistrationRequestRow` is a **Server Component**, unlike `ReceptionRow`: it has no
dialog or client state, only a link. Rows are not clickable; the action column is the only
target, since a submission has no detail page of its own.

**An uploaded file is never hidden behind its checkbox (2026-10-11):** `DocumentSelector`'s
`mode="select"` (Reception's "Applicable Document Uploads") only rendered a slot when the
Receptionist had ticked that doc type, so a document the visitor had already supplied showed
as nothing but an unticked checkbox — indistinguishable from a lost upload. `isApplicable` now
also returns true when a matching `uploadedDocuments` entry exists, and the slot picker uses
`UploadSlot` whenever `uploaded` is set even if there is no `engagementId` or
`invitationToken` — view and delete address the file by **document id**
(`/api/documents/:id`), so they work before an Engagement exists, under the staff PIN guard.
`PendingUploadSlot` is still what renders for a ticked-but-empty type.

`new/page.tsx` feeds that: it loads `getDocumentsForInvitation(request.invitationId)` and
passes both `uploadedDocuments` and an `applicableDocuments` default built from what actually
arrived, so the Create Engagement form opens with the visitor's files visible and their boxes
already ticked. `isApplicableDocType` narrows `documents.doc_type` (a plain text column)
against `DOC_TYPES` minus the hospital form, which is the one type that can never be a
registration upload.

**Visitor uploads now follow the submission into the Engagement (2026-10-11):** until this
fix nothing re-pointed them — a visitor could upload every compulsory document during
pre-registration and Reception's "Applicable Document Uploads" card would still render empty,
because `getDocumentsForEngagement` filters on `documents.engagement_id` while the rows still
carried `invitation_id`. `attachInvitationDocumentsToEngagement` (document-service) now runs
as part of `linkRequestToEngagement`: it sets `engagement_id`, clears `invitation_id` (the
`documents_single_parent_check` constraint demands exactly one parent, so both have to change
in the same statement) and stamps the Engagement's active `workflow_cycle_id`, matching what a
staff upload would have recorded. The file itself never moves — storage is keyed by the
document's own id, which is why the row's parent can change freely. If the request was already
converted the link update returns nothing and the documents are left with the first
Engagement. Verified against the live schema in a rolled-back transaction: 2 documents
re-pointed, both parents correct, both visible to `getDocumentsForEngagement`.

**Local / Foreign filter (2026-10-11):** three `Button asChild` links (All / Local / Foreign)
right-aligned on the section header row, each carrying its own count in a
`text-xs opacity-70` span. The active one is `variant="default"`, the rest `variant="ghost"` —
the same "one primary, others quiet" convention the rest of the dashboard uses, so no new
primitive (no Tabs, no Select) was introduced for a three-way choice.

Filtering is a **URL search param** (`/dashboard/reception?type=Local`), not client state: the
page is a Server Component, so a link re-renders it on the server with no client JS, and a
filtered view is shareable. An unrecognised `?type=` value falls back to All rather than
rendering an empty table. The counts always come from the unfiltered list, while the
"N awaiting" pill and the empty state follow the active filter — which is why the empty state
reads "No Local submissions" with a prompt to switch back to All. The Engagements table below
is untouched by the filter: an Engagement has no registration type once it exists, it belongs
to a Person.

### DocumentPreview (2026-10-11)

File: `src/components/workflow/document-preview.tsx`
Used by: `registration-submission-preview.tsx`

| Property | Class |
|---|---|
| Wrapper | `flex flex-col items-center gap-4` — no card, no surface of its own |
| Sheet stack | two `absolute` sheets at `-top-2 -right-2` and `-top-1 -right-1`, each `h-full w-full rounded-lg border border-border bg-card` |
| Page | `relative aspect-[1/1.414] overflow-hidden rounded-lg border border-border bg-card`, `max-w-[260px]` |
| Image | plain `<img>`, `h-full w-full object-contain` |
| PDF | `<iframe>` with `#toolbar=0&navpanes=0&view=FitH`, `pointer-events-none` |
| Fallback | lucide `FileTextIcon` `h-8 w-8` + "No preview", muted |
| Actions | `Button variant="ghost" size="sm"` for View and Download, centred under the label |
| Grid | `grid grid-cols-4 gap-8 pt-2` in the preview's Documents card |
| Shadow | none — see below |

**Pattern notes:**
The document is rendered as a **page**: an A4-proportioned sheet (`aspect-[1/1.414]`) with two
offset sheets behind it, and the actions as plain ghost buttons underneath. No card wrapper,
no filled thumbnail well — the page itself is the object.

**The reference design for this used a drop shadow for the stack.** `ui-rules.md` forbids
`shadow-*` outright (flat surfaces; separation via `border-border`), so the stack is built
from two offset bordered sheets instead. Same read, no elevation, invariant intact — worth
knowing before anyone "fixes" it by adding a shadow.

Three mechanics to keep:
- **`<img>`, not `next/image`** — a short-lived signed URL is nothing the optimizer can cache,
  and its host would need allow-listing for no gain.
- **The PDF iframe is `pointer-events-none`** so it reads as a preview, not a viewer.
- **Download goes through `/api/documents/:id/download`**, not the signed URL: a cross-origin
  `download` attribute is ignored by browsers and `generateSignedURL` takes only `expiresIn`
  (no content disposition), so the file would otherwise just open. That route is
  `requirePinConfirmed`-guarded and streams the body back through this origin with
  `Content-Disposition: attachment`, the stored filename, and `Cache-Control: private, no-store`.

The signed URL is generated **server-side while the page renders** (`getSignedFileUrl`,
15-minute window), caught per document so one failure degrades a single preview to the icon
rather than breaking the page. This needed `documents.file_name` and `documents.content_type`
(migration `0017`, both nullable): the UploadThing key carries neither, so without them there
is no way to tell an image from a PDF or to name a download. Both are captured in the file
router's `onUploadComplete` from `file.name` / `file.type`; rows predating the migration render
the icon fallback, and the seeded ones were backfilled.

### Queue search + pagination (2026-10-12)

Files: `lib/domain/pagination.ts`, `components/layout/queue-search.tsx`,
`components/layout/queue-pagination.tsx`; applied to Reception, Approvals, Hospital, Training

| Property | Class |
|---|---|
| Search box | shadcn `Input` with `px-9`, lucide `SearchIcon` absolutely placed left, clear `XIcon` ghost button right, `max-w-xs` |
| Queue card | `overflow-hidden rounded-xl border border-border bg-card` — the table and its pagination footer live inside one card, per `ui-rules.md`; a bare `bg-card` with no border reads as unstructured |
| View switcher | segmented: `flex items-center gap-1 rounded-lg border border-border p-1` wrapping `Button size="sm"` (active `default`, rest `ghost`) |
| Pagination bar | `flex items-center justify-between gap-4 border-t border-border px-4 py-3`, the card's footer |
| Range / page text | `text-xs text-muted-foreground` — "1–20 of 137", "Page 2 of 7" |
| Prev / Next | `Button variant="outline" size="sm"`; a `Link` when navigable, the same `Button` with `disabled` when not |

**Two layout rules this got wrong first time, worth not repeating:**
1. **Never wrap a Button's icon and label in a `<span>`.** `Button` is `inline-flex gap-2` and
   its `[&_svg]` rules size the icon; a `span` child is a plain inline box, so the chevron and
   its label collapsed onto each other. Children go directly on the Button in **both** the
   enabled and disabled branches.
2. **The toolbar's controls must share a height.** `Input` is `h-11`; `Button size="sm"` is
   `h-9`, so the segmented switcher's `p-1` wrapper brings it to 44px and the two align. Mixing
   a bare `h-9` control beside the search box is what made the row look thrown together.

Pagination **renders nothing when there is only one page** — a footer saying "Page 1 of 1" is
noise on a queue with four rows.

**Pattern notes:**
Every queue now pages at **20 rows** and filters **in Postgres** — `ilike` on name or passport
via a shared `personSearchFilter`, with `count()` for the total. Before this, each queue
`SELECT`ed every row and filtered in JS, which would not survive real volume.

**Paging and search live in the URL, not client state** (`?q=`, `?page=`), so the view is
shareable, survives a refresh, and the back button behaves. `QueueSearch` is the one client
component: it debounces typing by 300ms and `router.replace`s, **always clearing the page
param** — page 4 of the old result set is meaningless against a new search. `QueuePagination`
is a Server Component rendering plain links, and takes the other params so paging preserves
the search and filter.

Pages with two queues give each its own params (`aq`/`apage` for Approvals' "Approved"
table), so moving through one never resets the other.

Each queue is **one toolbar row** (view switcher left, search right) above one card. Reception's
Local/Foreign chips sit on a second, quieter row prefixed "Show", and the "N awaiting" pill was
dropped from it — the count already rides on the view tab, and saying it twice was part of what
made the screen feel crowded.

**Reception is two views, not two stacked tables** (`?view=submissions|engagements`,
submissions default since that is where the workflow starts). Stacking them meant two tables,
two paginators and two searches competing on one screen. Only the active view is queried —
the other costs nothing. The tab counts and the "N awaiting" pill come from their own
`count()` queries (`countRegistrationRequestsByType`,
`countOutstandingRegistrationRequests`) so they describe everything, not the page on screen.

**One exception to SQL filtering:** `listRegistrationRequests` searches in memory, because a
submission's name and ID live inside the `form_data` jsonb under keys that differ by
registration type (`receptionData` vs `registrationData`) — there is no column to index. It
is bounded by invitations issued rather than by every visitor ever; if that ever stops being
true, promote name and ID to columns on `registration_requests` rather than indexing jsonb
two ways.

`listEngagementsWithPerson` now returns a `Page`; the delegation picker needs the whole list,
so it calls **`listAllEngagementsWithPerson`** — kept separate so the paged queue can't be
used by accident where a complete list is meant.

### Training School (2026-10-12)

Files: `dashboard/(workflow)/training/page.tsx`, `training/[engagementId]/page.tsx`,
`training-form.tsx`, `workflow-service.ts` (`checkHospitalClearanceAge`,
`recordInductionCompletion`, `getLatestInductionRecord`)

**Pattern notes:**
Same shape as Hospital, deliberately: a queue with no status column (every row is `AtTraining`
by definition) carrying Nature of Visit, Arrival, Departure and a **"Record Induction"**
action, and a record page that is identity plus the form — no engagement preview. The queue
covers **both paths that reach induction**: `listEngagementsForLayer("AtTraining", ["Work",
"VisitMine"])` — work-path visitors arriving from Hospital, and mine-site visitors who come
straight from Reception.

`TrainingForm` requires **both** `induction_declaration_form` and
`induction_registration_form` before sign-off, mirroring Hospital's fitness-form gate, and
`recordInductionCompletion` enforces it server-side rather than trusting the button state.

**The clearance-age banner is unique to this layer.** A work-path medical is good for 90 days:
under 30 remaining shows a `status-warning` banner, expired shows `status-danger` **and
disables the form**, because a record sitting here for months would otherwise reach Security on
a lapsed medical. `checkHospitalClearanceAge` returns `{ applicable: false }` for visit+mine
records — they never went through Hospital — and the service re-checks expiry at submit, not
just at render.

Sign-off inserts an `induction_records` row, moves the engagement to `AtSecurity`, writes a
`workflow_transitions` row and notifies Security in one transaction, behind the same
`SELECT … FOR UPDATE` row lock Hospital uses against concurrent submissions.

**`WORKFLOW_STATE_LABELS` (2026-10-12):** workflow states render without their `At…` prefix —
"Reception", "Hospital", "Training", "Security". The stored values keep the prefix (it is the
state machine's vocabulary); only the label drops it. Single source in `lib/domain/types.ts`
beside `ACCESS_PURPOSE_LABELS`, used by `ReceptionRow` and the Approvals "Stage" column.

**New doc types** `induction_declaration_form` / `induction_registration_form` (owned by
`TrainingStaff`) widened `DocType`, which broke `ReceptionData.applicableDocuments`. That is
now a named `ApplicableDocType` = `Exclude<DocType, LayerOwnedDocType>`, so a layer's own form
can never be offered to a visitor as something to supply. Add a layer-owned type to
`LayerOwnedDocType` and the rest follows.

### Hospital dashboard and clearance (2026-10-12)

Files: `dashboard/(workflow)/hospital/page.tsx`,
`hospital/[engagementId]/page.tsx`, `hospital-form.tsx`,
`reception-details-preview.tsx` (`approval` prop)

**Pattern notes:**
The queue **no longer shows a status column.** Every row in it is `AtHospital` by definition —
`listEngagementsForLayer("AtHospital", ["Work"])` — so the badge restated the filter. It now
carries Arrival and Departure instead, plus a **"Record Clearance"** action, matching the
Approvals queue's "Review & Approve" shape.

The record page is **identity plus the clearance form, nothing else**: a `PageHeader` with the
visitor's name and passport number, then `HospitalForm`. Hospital records a clearance and
moves on; reviewing the engagement is Reception's job, and the full record lives there. A
fuller preview was tried here first and removed as noise — don't reintroduce it.

**`ReceptionSummary` was deleted** — it was Hospital's old nine-field summary and had no other
caller. Its `Field` styling lives on in `ReceptionDetailsPreview`.

`HospitalForm` already carried the three documented outcomes and the required
`hospital_fitness_form` upload (submit stays disabled until the form is attached). Two changes:
"Fit With Conditions" → **"Fit with Conditions"**, matching `project-overview.md`, and each
outcome now states its consequence under the select — Fit proceeds to Training School, Fit with
Conditions proceeds *and* notifies Reception, Unfit holds at Hospital and notifies Reception.
The three are not interchangeable and the form shouldn't make them look it.

### Stakeholders never touch Reception's routes (2026-10-12)

Files: `components/workflow/engagement-detail.tsx` (new),
`dashboard/(workflow)/approvals/[engagementId]/page.tsx` (new),
`dashboard/(workflow)/reception/[engagementId]/page.tsx` (now a thin wrapper),
`reception/page.tsx`, `proxy.ts`

**Pattern notes:**
The engagement record is one component, `EngagementDetail`, rendered by **two routes**:
`/dashboard/reception/:id` for Reception and `/dashboard/approvals/:id` for whoever signs off.
Same screen, different breadcrumb trail — a stakeholder's reads `Home › Dashboard › Approvals ›
Engagement` instead of being routed through a queue that isn't theirs. The UUID segment already
renders as "Engagement" via `labelFor`, and `approvals` is in `SEGMENT_LABELS`, so both trails
work with no breadcrumb special-casing. This is why the fix is a route rather than relabelling
a crumb: `ui-rules.md` requires every crumb to have a real route behind it.

`queueHref` is the only prop that differs between them, and it does three jobs: the breadcrumb
(implicitly, via the URL), where `StakeholderPanel` returns after approving, and **who may
open the record** — Receptionist on the reception route; a stakeholder role or
`engagement.delegated_approver_id === session.staffUserId` on the approvals one. The delegate
check needs the engagement loaded, so the guard sits after the fetch, not before it.

Access was narrowed to match: `reception/page.tsx` now redirects anyone who isn't a
Receptionist (HCM/GMM/DMD previously landed there), and `proxy.ts`'s `LAYER_ROLES.reception`
dropped the three stakeholder roles. **`approvals` is deliberately absent from `LAYER_ROLES`** —
a delegated approver holds no workflow role at all, so a role matcher would lock out exactly
the person the grant was for; the page does the checking instead. Note the proxy answers a
plain 403 for a stakeholder who follows an old `/dashboard/reception/...` bookmark, the same
as every other layer mismatch.

### Stakeholder approvals queue (2026-10-11)

File: `src/app/dashboard/(workflow)/approvals/page.tsx`
Service: `listEngagementsAwaitingApproval` (`workflow-service.ts`)

| Property | Class |
|---|---|
| Table | the standard shadcn `Table` pattern, same header/cell classes as Reception's queue |
| Waiting column | `text-muted-foreground`, rendered as "Today" / "N days ago" |
| Row action | `Button size="sm"` → the engagement detail page |
| Empty state | `EmptyState` with lucide `ClipboardCheckIcon` |

**Pattern notes:**
HCM / GMM / DMD now land here instead of Reception's queue (`dashboard/page.tsx` routes them;
Receptionist still goes to `/dashboard/reception`, and stakeholders keep access to it). The
queue lists engagements that are `AtReception`, have `approval_requested_at` set, and have no
`stakeholder_approvals` row — any one approval is enough, so every outstanding engagement is
shown to all three roles.

The page is **two sections, both the stakeholder's own work**: "Awaiting Approval" with a
`status-warning` count pill, and "Approved" with a `status-success` one listing who signed,
their role (and "(delegated)" where that applies), when, and the stage the engagement has
since reached. Approved is deliberately **everyone's**, not just the viewer's — any one
approval is enough, so a stakeholder needs to see that a colleague already handled something.

**Approval itself stays on the engagement page**, deliberately: the stakeholder gets the same
read-only `ReceptionDetailsPreview` Reception sees (documents included, since they are signing
for them) plus the existing `StakeholderPanel`, which already handles signature capture and
delegation. Nothing about approval is duplicated here — the row is a link.

**`StakeholderPanel` gained `returnHref`** (default `/dashboard/reception`). It used to
hard-code a redirect to Reception's dashboard two seconds after approving, written when that
was the only queue — a stakeholder ended up somewhere that isn't their work. The engagement
page now passes `/dashboard/approvals` for a non-Receptionist. `applyStakeholderApprovalAction`
revalidates both queues, so the approved row moves between the two sections immediately.

**`approval_requested_at` (migration `0018`) is what makes this queue possible.** Requesting
approval used to send notifications and write nothing to the record, so "waiting for sign-off"
and "Reception is still preparing it" were indistinguishable. `submitForStakeholderApproval`
now stamps it before the notifications go out, so the queue and the emails cannot disagree.

A **delegated approver** holds no stakeholder role, so the page falls back to listing only
engagements whose `delegated_approver_id` is them, and redirects to `/dashboard` when there
are none — the grant is per engagement, not a standing role.

### Preview vs edit mode — both Reception screens (2026-10-11)

Files: `preview-edit-panel.tsx`, `reception-details-preview.tsx`,
`registration-completion-form.tsx`, `reception/new/page.tsx`,
`reception/[engagementId]/page.tsx`, `registration-service.ts`
(`buildEngagementInput`), `actions/engagements.ts`
(`createEngagementFromRequestAction`)

| Property | Class |
|---|---|
| Mode bar | `flex items-center justify-between rounded-xl border border-border bg-card px-6 py-4` |
| Mode toggle | shadcn `Button variant="outline" size="sm"` with a lucide `PencilIcon` / `EyeIcon` |
| Preview section | standard `Card` per group, `grid grid-cols-3 gap-4` of label/value `Field`s |
| Field | `text-xs font-medium text-muted-foreground` label over `text-sm text-foreground` value — identical to `ReceptionSummary`'s |
| Unset boolean | value rendered `text-muted-foreground` via the `muted` prop, so "No" recedes |

**Pattern notes:**
Converting a submission no longer opens a wall of prefilled inputs. The default is a
**read-only preview** of what the visitor sent, grouped exactly as they filled it in
(Visitor / Company / Access / Site Support / Documents), followed by a **"Reception Completes"**
card holding only what the visitor was never asked: the Administration four
(`accommodationConfirmed`, `itineraryAttached`, `inflightUpdated`, `remarks`) and applicable
documents — plus, for a **Local** submission only, `nationality` (required; `persons.nationality`
is notNull), `ghanaVisaRequired` and `visaType`, which that form has no fields for. "Edit
submission" swaps the whole thing for the full prefilled `ReceptionForm`, which is unchanged
and still the only way to correct what the visitor typed.

`PreviewEditPanel` is a **client component that only holds the mode flag** — the preview, the
form and anything sitting under the preview (`belowPreview`) are passed in as nodes from the
Server Component page, so nothing is duplicated and the heavy parts stay server-rendered. Its
hint copy and edit-button label are props, which is what lets both Reception screens share it.
Note the mode switch discards whatever was typed in the other mode; both are short enough that
this is cheaper than syncing them.

**The same pair now covers an existing Engagement** (`reception/[engagementId]/page.tsx`): it
opens on `ReceptionDetailsPreview` of what Reception recorded — including an Administration
section and the documents as page previews — with "Edit engagement" revealing the same
`ReceptionForm` as before. When `formReadOnly` (the engagement has moved past Reception, or
the viewer can't write) **no toggle renders at all**, just the preview, so a Guest or a later
layer never sees an edit affordance it can't use.

`ReceptionDetailsPreview` (renamed from `RegistrationSubmissionPreview`, which no longer
described it) takes `registrationType`/`department` as **optional**: they drive the type badge
and the hiding of fields a Local form never asks, and an Engagement has neither — it belongs to
a Person — so the full field set renders there. `showAdministration` and `documentsTitle` are
the other two switches between the two uses.

The preview renders **the same parsed values the edit form is prefilled with**
(`registrationRequestToFormValues`, called once in the page) rather than reading the jsonb
itself — so the two views cannot disagree about what was submitted, and the lint rules against
`Record<string, unknown>` props are satisfied for free.

**The submit path never trusts the browser with the visitor's answers.**
`createEngagementFromRequestAction(requestId, completion)` sends only Reception's additions;
`buildEngagementInput` re-reads `form_data` server-side and merges. It also fills the two
things a Local payload lacks structurally: `gmcLiaisonDept` from `invitations.department` via
the request row, and the visa fields from the completion. The action refuses a request that
already has an `engagement_id`, so the preview path cannot double-convert either.

`VISA_TYPES` moved into `lib/domain/types.ts` as a runtime tuple with `VisaType` derived from
it (same shape as `DOC_TYPES`), because both `reception-form.tsx` and the completion form now
render the list — `VISA_TYPE_OPTIONS` is now just a spread of it.

**Create Engagement prefills the form.** `new/page.tsx` takes `?requestId=`, loads the
request and passes `registrationRequestToFormValues(request.formData)` as `ReceptionForm`'s
`defaultValues`, with `allowLookup` **off** in that mode (the identity is already known) and
the page title switching to "Create Engagement". `ReceptionForm` gained
`registrationRequestId`, which it forwards to `submitReceptionAction`; the action calls
`linkRequestToEngagement` after `createEngagement`.

`registration_requests.engagement_id` (migration `0016`) is what distinguishes outstanding
from converted. `linkRequestToEngagement` only updates rows where it `isNull`, and
`new/page.tsx` redirects straight to the Engagement if the request already has one — so the
same submission cannot produce two Engagements even if someone keeps the old URL. Status also
moves to `"Converted"`.

The prefill mapper lives in `lib/domain/` and **parses** the jsonb with zod rather than
casting it: every field is `.optional().catch(undefined)` so a Local submission (no
nationality, no visa) or a row predating a field still maps cleanly. It assigns only defined
values through a typed `assign()` helper — spreading an object containing explicit
`undefined` over react-hook-form's defaults would wipe those defaults rather than leave them.
Note the vendored anti-slop plugin flags the `formData: unknown` parameter
(`no-unknown-parameters`) while its own `no-unknown-type-aliases` rule forbids hiding it
behind an alias; explicit `unknown` at a parsing boundary is the behaviour that rule asks
for, so the one error is expected here.

**Storage switched to UploadThing (2026-10-11):** `UploadSlot` no longer POSTs a
`FormData` to `/api/documents` or `/api/register/documents` — it calls `useUploadThing(...)`
from `lib/uploadthing/client.ts` and the browser streams the file straight to storage. The
endpoint is chosen by which parent the slot has: `registrationDocument` when
`invitationToken` is set, `engagementDocument` when `engagementId` is. The visible component
is unchanged — same hidden `<input type="file">`, same shadcn `Button`, same
`loading` state (now `isUploading` from the hook), same Required/Optional pill, same i18n.
`uploaded.blobUrl` became `uploaded.fileUrl` in the filename link and the delete prompt.
Reception's `PendingUploadSlot` flow is unchanged in the UI; the flush in `reception-form.tsx`
now calls the typed `uploadFiles("engagementDocument", …)` helper in a try/catch instead of
`fetch`. View and delete still go through the existing routes, which kept their GET/DELETE
handlers (`/api/documents/route.ts` held only POST and was deleted outright).

Error text now comes from UploadThing (`onUploadError`), so the dictionary gained its
wordings ("Invalid file type", "File too large", "You can only upload 1 file") alongside the
middleware's own messages, which are thrown as `UploadThingError` and reach the client
verbatim. The toast keys `uploaded`/`removed` are separate dictionary entries because the
document name is interpolated in front of them.

**Upload errors stopped being a blanket 500 (2026-10-11):** `uploadDocument` throws
`DocumentValidationError` (`lib/domain/document-error.ts`) for the two things the person can
fix — over 10MB, and a MIME type outside PDF/JPEG/PNG/WEBP. `/api/register/documents` returns
those as a 400 carrying the real message; everything else still answers a generic 500, since
this route is public and unauthenticated. Found while diagnosing a report of "Internal server
error" on upload: the actual cause was an unreachable storage account, but the same catch-all
would also have told an iPhone visitor uploading a HEIC photo nothing useful. The staff route
`/api/documents` still masks both cases — worth the same treatment when it is next touched.

### Registration language toggle — English ⇄ 简体中文 (2026-10-11)

Files: `src/lib/i18n/registration-dictionary.ts`,
`src/components/workflow/registration-language-provider.tsx`,
`registration-language-toggle.tsx`, `registration-headline.tsx`,
`registration-invalid-link.tsx`

| Property | Class |
|---|---|
| Toggle | shadcn `Button` `variant="outline" size="sm"` with a lucide `Languages` icon |
| Toggle placement | `mb-6 flex justify-end` at the top of `/register`'s form pane |
| Toggle label | the language it switches **to** — "中文" while English is showing |

**Pattern notes:**
Public `/register` only. The dictionary is keyed by the **English string the component already
renders**, so `t("Full Name")` returns its own key in English mode — the staff-facing
`ReceptionForm` on `/dashboard/reception` renders byte-identically and cannot regress from a
missing key. A key with no Chinese entry falls back to English rather than showing a key name.
No i18n library was added; `ZH_ENTRIES` is an inferred object literal validated with
`satisfies Record<string, string>` and wrapped in a `ReadonlyMap` for lookup (an index
signature or an `as` cast trips the vendored anti-slop rules).

**Translate at the primitives, never the call sites.** `t()` lives inside each form's
`TextField`/`SelectField`/`DateField`/`PhoneField`/`CheckboxField`/`ComboboxField`/
`TextAreaField`/`YesNoField`/`PassportField` helper, so all ~72 `label="…"` props translate
with no change at the ~72 call sites. `SelectField` translates the **display** text only —
`<SelectItem value={option}>` still carries the English value, so `"Male"` and `"Work Visa"`
reach the database unchanged. Add a new field and it is translated automatically; it just
needs a dictionary entry.

`components/ui/form.tsx`'s `FormMessage` calls `tValidation(error.message)`: in that component
an error always beats `props.children`, so translating from outside is impossible. Zod messages
stay English and act as keys. `"Required"` is both a zod message and the uploader's slot state
and the two need different Chinese, so `translateValidationMessage` checks a `"<message>_validation"`
key first. **This is the one shadcn-generated file carrying an i18n import** — keep it if `form`
is ever re-generated, same as the `Button ref`/`loading` notes above. The provider lives in
`components/workflow/` and imports nothing from `components/ui/`, so there is no cycle.

**Server messages.** `ActionResult` gained optional `errorCode`/`missingDocTypes`; `error` is
still the English sentence every staff call site renders, so nothing downstream changed.
`RegistrationError` (`lib/domain/registration-error.ts`) carries the code out of
`createRegistrationRequest`, and `tActionError(result)` resolves it. Static sentences are
translated by looking the sentence itself up — the same keying as everything else — so only
the parameterized "Upload these documents before submitting: …" case actually needs the code
and its `missingDocTypes`. The `/api/register/documents` responses were left untouched for
that reason: `t(result.error)` on the client already covers them, provided the route's wording
and the dictionary key stay identical (note the route says "…or revoked" where the service says
"…or has been revoked" — both are in the dictionary).

**Hydration.** The provider renders English on first paint and applies the stored locale in a
`useEffect`, because reading `localStorage` during render would disagree with the
server-rendered HTML. The cost is one frame of English on reload for a returning visitor; the
alternative is a hydration mismatch across the whole form. Every storage access is wrapped in
try/catch (private windows throw). The toggle is client state, so switching language mid-form
**keeps everything already typed** — this is why it is not a `?lang=` URL parameter.

**Not translated, deliberately:** the ~195 `NATIONALITIES` and ~87 `GHANA_LOCATIONS` entries
(searchable by typing, and a large data-entry job), the Department Head's invitation email, and
`ReceptionForm`'s passport-lookup toasts (staff-only path — `allowLookup` is never set in
public mode).

**Public submit button reads "Submit" (2026-10-11):** both public forms. `ReceptionForm`'s
label is still three-way — `publicToken ? "Submit" : engagementId ? "Save Changes" : "Create
Engagement"` — so the staff labels are untouched.

**Administration section is staff-only (2026-10-11):** the "Administration" `Card`
(Accommodation Confirmed / Itinerary Attached / Inflight Updated / Remarks) is Reception's own
bookkeeping, so it no longer renders on the public form. In `reception-form.tsx` the card is
wrapped in `{!publicToken && (...)}` — the authenticated Reception page is unchanged. In
`local-registration-form.tsx` the card was deleted outright, since that component is only ever
public; its now-unused local `CheckboxField` helper and the `Checkbox` import went with it (the
Local form uses `YesNoField` radios everywhere else, so that helper had no other caller — note
this also retires the last copy of the `id={field.name}` label-click bug described below).

The four field names stay in both schemas and both payloads, submitting as `false`/`""`. They
are part of `ReceptionData`/`LocalRegistrationFormInput` and Reception fills them in for real
when it creates the Engagement — dropping them from the payload would have changed the service
contract for no gain. Side effect worth knowing: a public visitor no longer has a free-text
"Remarks" box; "Reason for Request" in Access Details is the field they still have.

**"Visa on Arrival" drops the compulsory visa upload (2026-10-11):** `valid_visa` is only
required when the visitor already holds a visa. The rule lives in
`getRequiredRegistrationDocTypes(registrationType, visaType?)` in `lib/domain/types.ts` — not
in the form and not in the service — so the submit-button gate, the `DocumentSelector` rows,
and the server-side check in `createRegistrationRequest` all read the same function and cannot
drift. `getMissingRegistrationDocTypes` takes an optional `visaType` and delegates to it;
`createRegistrationRequest` pulls that value out of the payload
(`"receptionData" in formData ? formData.receptionData.visaType : undefined`), since a public
submission is the only place the visitor's own answer exists. `ReceptionForm` watches
`visaType` and recomputes `requiredDocTypes` on every change, so flipping the Select live
moves the visa row between required and "(optional)". The row itself never disappears —
`docTypes` still comes from `getRegistrationDocTypes("Foreign")` — it just stops blocking
submit. A visa uploaded before the visitor switched to "Visa on Arrival" stays attached;
nothing deletes it.

**Visa Type + Access Level share a row (2026-10-11):** both `SelectField`s are wrapped in a
`col-span-2 grid grid-cols-2 gap-x-8` cell inside the Site Support Requirements grid. They are
adjacent in source but an odd number of preceding checkbox cells pushed them onto separate
rows; the wrapper pins them together regardless of what is added above. Use this wrapper
pattern rather than reordering fields when two inputs must stay paired in that grid.

**Visa type "Other" → "Visa on Arrival" (2026-10-11):** the last `VISA_TYPE_OPTIONS` entry in
`reception-form.tsx` (and the matching `z.enum` and `VisaType` union in `lib/domain/types.ts`)
is now a real visa category instead of a catch-all. Three places to keep in step — the option
list, the zod enum, and the domain type; there is no DB constraint, since `visaType` lives
inside `engagements.reception_data` / `registration_requests.form_data` jsonb, so no migration
was needed. Any pre-existing jsonb row still holding `"Other"` no longer matches `VisaType`.

**`ACCESS_PURPOSE_LABELS` (2026-10-09):** `AccessPurpose`'s internal values (`Work`/`Visit`/
`VisitMine`) never changed, only their visitor/staff-facing wording — `Visit` → "Familiarization
Visit", `VisitMine` → "Require Mine Tour" (`Work` was "Coming to work", relabelled again on
2026-10-11 to "Require mine site access" — `local-registration-form.tsx`'s own
`optionLabels` copy still reads "Coming to work" and was again left out of scope). Added
`ACCESS_PURPOSE_LABELS: Record<AccessPurpose, string>` next to the type in
`lib/domain/types.ts` as the single source for this wording, rather than letting each
display site (the Foreign form's `Select`, the Reception queue table, Hospital's
`ReceptionSummary`) carry its own copy — this was specifically requested to read
consistently everywhere Reception/Hospital staff see it, not just on the public form. The
`accessPurpose` form field's label also changed from "Access Purpose" to "Nature of Visit"
in `reception-form.tsx`, the Reception queue's column header, and `ReceptionSummary`'s
field label — but **not** in `local-registration-form.tsx`, which was explicitly out of
scope for this change and still reads "Access Purpose".

### `/register` split layout (2026-10-11)

File: `src/app/register/page.tsx`
Last updated: 2026-10-11

| Property | Class |
|---|---|
| Outer | `flex h-screen overflow-hidden` — the page itself never scrolls |
| Image pane (left) | `relative hidden h-screen w-1/2 shrink-0 overflow-hidden lg:block` |
| Image | `/bg-auth.jpg`, `fill sizes="50vw" priority`, `object-cover brightness-50` — same treatment as `PublicShell` |
| Image pane inner | `relative z-10 flex h-full flex-col justify-between p-12` — logo top, heading bottom |
| Logo plate | `inline-flex self-start rounded-xl bg-card p-4`, logo 120×57 |
| Hero heading | `max-w-md text-3xl font-semibold leading-tight text-primary-foreground` |
| Form pane (right) | `ScrollArea` — `h-screen w-full min-w-0 bg-background lg:w-1/2`, inner `<main className="p-10">` |
| Shadow | none — this system never uses `shadow-*` |

**Pattern notes:**
`/register` deliberately does **not** use `PublicShell` (centered `max-w-3xl` panel) — a
multi-section registration form doesn't fit that shape, so this is the one public page with
its own two-pane layout: a full-bleed image column carrying the GMC logo and the page
heading, and the form column, the two panes splitting the viewport evenly. The layout lives
inline in the page rather than in a new `components/layout/` shell because nothing else uses
it; promote it to a shell component if a second page ever needs the same split.

The page's only `<h1>` is the hero on the image — "Ghana Manganese Company Mine Site Access
Registration". The form column has no header of its own (an earlier "Pre-Registration" title
there was removed), so the first `Card` sits at the top of the pane. Text over the darkened
photo uses `text-primary-foreground` (the system's only white token) — there is no dedicated
"on-image" token, so reuse this one rather than inventing a class.

The form column is a shadcn `ScrollArea` (`h-screen`) rather than the document scrollbar, so
the image pane stays fixed with no `sticky`/`position` tricks and only the form scrolls.
Consequences to keep in mind: the outer wrapper must stay `h-screen overflow-hidden`, and the
logo plate needs `self-start` now that its parent is a `flex-col` with `justify-between`.

**`fill` + pane height (2026-10-11):** both panes carry their own `h-screen` rather than
`h-full` off the parent — a `next/image` `fill` collapses to nothing the moment its pane's
height resolves to `auto`, which is exactly what was seen in the first in-browser check: the
image pane rendered only as tall as the logo. The cause was `h-screen` being a utility this
project had never used before (only `min-h-screen`, in `dashboard-shell.tsx`), so the running
dev server's Tailwind CSS chunk had no `.h-screen` rule yet — a hard reload / dev-server
restart generates it. When a layout suddenly ignores a size class, check that the class is
new to the codebase before debugging the markup. `sizes="50vw"` on the `fill` image matches
the pane so Next doesn't serve a full-viewport-width asset.
Panes split `w-1/2` / `w-1/2` (first drafted 2/3 image + 1/3 form, widened to an even split
the same day because the forms' fixed `grid-cols-2` field rows were too cramped at a third);
the form pane needs `min-w-0` or those grid rows push the flex child wider than its half.
Below `lg` the image pane is hidden and the form goes full width — academic in practice,
since `DesktopOnlyGuard` blocks `max-lg` viewports app-wide.

`reception-form.tsx` (Foreign path) and `local-registration-form.tsx` use non-responsive
`grid grid-cols-2 gap-x-8` field rows, left untouched here — at half of a 1440px viewport
each column lands around 290px, which the fields handle. Worth remembering before narrowing
this pane again: `ReceptionForm` is shared with the authenticated Reception page, so changing
that grid needs a container query or a prop, not an edit to the shared class list.

### Entry format

```
### ComponentName

File: src/components/{category}/{component-name}.tsx
Last updated: YYYY-MM-DD

| Property | Class |
|---|---|
| Background | |
| Border | |
| Border radius | |
| Text — primary | |
| Text — secondary | |
| Spacing | |
| Hover state | |
| Shadow | none — this system never uses `shadow-*` |
| Status / accent usage | |

**Pattern notes:**
Key decisions, gotchas, or invariants specific to this component.
```
