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
| Content column | `mx-auto w-full max-w-5xl p-6` |
| Top bar | `sticky top-0 z-10 w-full bg-background` — no separate surface color, no border; blends into the page |
| Top bar inner row | `mx-auto flex h-20 w-full max-w-5xl items-center justify-between px-6` |
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

Width invariant: the top bar inner row and the shell content column are both `max-w-5xl` and
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
2026-07-08 if this regresses); (2) `request-access-form.tsx` uses `defaultValue`
(uncontrolled, posts via native `FormData`), `user-row.tsx` uses `value`/`onValueChange`
(controlled, read into React state before calling a Server Action programmatically) —
pick the mode based on whether the surrounding form actually submits via `FormData` or
via a button `onClick`. Reuse this pattern for any future single-choice-from-a-small-set
picker before reaching for `Select`.

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
`flex` via `max-lg:flex` — Tailwind's `lg` breakpoint (1024px) was picked to
line up with the dashboard shell's own `max-w-5xl` content column
(`architecture.md`): below that width the shell's layout doesn't have room
to render properly anyway. Mounted once in the root `layout.tsx` (alongside
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
