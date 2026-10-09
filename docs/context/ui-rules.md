# UI Rules

Concise rules for building GMC Site Access UI. These cover the most important patterns and
constraints to keep the UI consistent across all workflow layers.

---

## Font

Always import Inter via `next/font/google` in root layout.

```typescript
import { Inter } from "next/font/google";
const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
```

Apply the font variable class to the `<html>` tag. Never use system fonts as the primary font.

---

## Component Library

Every dashboard component is built from shadcn/ui — this is not optional. Never hand-roll a
primitive that shadcn already provides (buttons, inputs, dropdowns, dialogs, avatars, selects,
tables, etc.).

- Before building anything, check `ui-registry.md` — reuse an installed component/pattern first
- Install missing primitives with `pnpm dlx shadcn@latest add <component>`, then register the
  install in `ui-registry.md`'s "Installed shadcn/ui Components" table
- Only reach for a hand-built pattern (like the radio badge group) when there's a documented
  reason a shadcn primitive doesn't fit — and record that reason in `ui-registry.md`
- Never style a native HTML element (`<button>`, `<select>`, `<input>`) as a substitute for the
  matching shadcn component

---

## Layout

Single-column layout: one top bar, one scrollable content column beneath it. No sidebar.

- Top bar: sticky at `top-0`, same `bg-background` as the page — never a separate surface
  color, no bottom border; it blends into the page
- Content area: `mx-auto w-full max-w-5xl`, page padding `p-6`
- Every dashboard page — for every role/layer — lives inside this same constrained column
- The top bar inner row and the content column must always share the same max width
- The shared `src/app/dashboard/layout.tsx` owns the shell and breadcrumbs for every
  dashboard route — child layouts are guard-only, pages never render their own shell

---

## Top Bar

```
sticky top-0 z-10 w-full bg-background
```

Inner row (constrains bar contents to match the content column):

```
mx-auto flex h-20 w-full max-w-5xl items-center justify-between px-6
```

| Element | Position | Notes |
|---|---|---|
| GMC logo | Left | Small (~80px wide), links to `/dashboard`. Nothing else on the left — navigation lives in the breadcrumb below the bar, not the top bar |
| Notifications bell | Right | Lucide `Bell`, `h-5 w-5`; unread indicator dot via `notifications` table |
| User avatar menu | Right, outermost | shadcn `Avatar` (`h-8 w-8`, Microsoft profile photo from session `image`, initials fallback) triggering a `DropdownMenu` — name + email label, then Sign Out |

---

## Breadcrumbs

Rendered automatically for every dashboard route by `DashboardBreadcrumbs`
(`src/components/layout/dashboard-breadcrumbs.tsx`) inside the shared dashboard layout —
pages never render their own breadcrumb.

- shadcn `Breadcrumb`, default styling (chevron separators), `mb-4` below the top bar
- The trail always starts with a `Home` crumb (href `#`, design-only) prepended before the
  URL-derived crumbs, e.g. `Home › Dashboard › Admin › Users`
- Trail is derived from URL segments via the `SEGMENT_LABELS` map in that file — add a label
  there whenever a new dashboard route ships (unmapped segments fall back to capitalized)
- Current page renders as `BreadcrumbPage` (non-clickable); ancestors as `BreadcrumbLink`
  (Next `Link` via `asChild`) — every segment needs a real route, add a `redirect()` page if
  the segment has no content of its own

---

## Dashboard Header

Not a fixed bar — part of normal page flow at the top of the `max-w-5xl` content column,
below the auto breadcrumb. Always rendered via the `PageHeader` component
(`src/components/layout/page-header.tsx`) — never rebuilt inline.

```
flex items-center justify-between mb-6
```

| Element | Notes |
|---|---|
| Page title | `text-2xl font-semibold text-foreground` |
| Subtitle (optional) | `text-sm text-muted-foreground mt-1` |
| Actions (right-aligned) | Button with appropriate variant, via the `actions` prop |

---

## Cards

Every content section lives in a card.

```
bg-card border border-border rounded-xl p-6
```

- Never use colored card backgrounds — always white
- Color goes inside cards via badges, indicators, and text — never on the card surface
- Never nest cards inside cards
- Never use box-shadow — separation comes from `border-border`, not elevation

---

## Typography Hierarchy

Three levels used consistently throughout:

**Page / card title**
```
text-lg font-semibold text-foreground
```

**Body / primary content**
```
text-sm font-normal text-foreground
```

**Secondary / muted — labels, timestamps, captions**
```
text-xs text-muted-foreground
```

Table column headers and form labels use:
```
text-xs font-medium uppercase tracking-wide text-muted-foreground
```
Always all-caps with letter-spacing — never sentence case for labels.

---

## Status Badges

All workflow and access state labels are rendered as status badges using the 5-bucket system.
Never invent per-state colors.

```
rounded-full px-2.5 py-0.5 text-xs font-medium
bg-status-{bucket}-bg text-status-{bucket}-fg
```

See `ui-tokens.md` for the full state → bucket mapping.

---

## Buttons

Use shadcn/ui Button with the correct variant. Never style buttons from scratch.

- One `default` (primary) button max per card — the single primary action
- `destructive` actions must show a confirmation dialog before executing
- `ghost` for tertiary actions and icon-only buttons (e.g. table row actions)

---

## Form Inputs

Use shadcn/ui Form + Input + Label. Focus ring uses `--ring` (primary blue) automatically.

- Labels: `text-xs font-medium uppercase tracking-wide text-muted-foreground` above each field
- Helper text / validation errors: `text-xs` below the field
- Required fields: mark with `*` in the label — not in the placeholder
- Never show raw error strings — always human-readable text
- Never put business logic inside form components

---

## Tables

Used for workflow queues on each layer's dashboard page.

- No alternating row colors — white rows separated by bottom border
- Column headers: `text-xs font-medium uppercase tracking-wide text-muted-foreground px-4 py-3`
- Data cells: `text-sm text-foreground px-4 py-3 border-b border-border`
- Row hover: `hover:bg-muted/50`
- Clickable rows: entire row is the tap target via `<Link>` wrapping each cell

---

## Empty States

Every list, queue, or section that can be empty must have an empty state.

```
flex flex-col items-center justify-center py-16 text-center
```

- Short descriptive text: `text-sm text-muted-foreground`
- Optional Lucide icon above text, `text-muted-foreground`, `h-10 w-10`
- Include a CTA button if there is a logical next action

---

## Do Nots

- Never hardcode hex values — use CSS variable tokens
- Never use raw Tailwind color classes (`bg-blue-600`, `text-gray-500`)
- Never use colored card backgrounds
- Never show more than one primary button per card
- Never show raw error or exception messages to users
- Never skip an empty state for a list or queue
- Never add a confirmation dialog to non-destructive actions
- Never nest cards inside cards
- Never use `position: fixed` for page content — use normal document flow
- Never put business logic inside UI components
- Never use `shadow-*` (box-shadow) on any shadcn/ui component — flat surfaces only, separation via `border-border`
