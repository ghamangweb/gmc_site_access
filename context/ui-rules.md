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

## Layout

Two-column layout: collapsible sidebar on the left, scrollable main content on the right.

- Sidebar expanded: `w-60` (240px)
- Sidebar collapsed: `w-16` (64px) — icons only, no text labels
- Main content area: `flex-1 min-h-screen bg-background`
- Page content padding: `p-6`
- Max width: none — content fills the available area

Collapse state lives in a client component wrapper. Toggle button sits at the bottom of the
sidebar. Sidebar never overlays content — it always pushes the main area.

---

## Sidebar

```
bg-sidebar border-r border-sidebar-border
```

Navigation items:

| State | Classes |
|---|---|
| Expanded, inactive | `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground` |
| Expanded, active | `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium bg-primary/10 text-primary` |
| Collapsed, inactive | `flex items-center justify-center rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground` |
| Collapsed, active | `flex items-center justify-center rounded-lg p-2 bg-primary/10 text-primary` |

Icon size: `h-5 w-5` in all nav items.
GMC logo: full logo when expanded, icon-only when collapsed.

---

## Dashboard Header

Not a fixed bar — part of normal page flow at the top of `p-6` page padding.

```
flex items-center justify-between mb-6
```

| Element | Classes |
|---|---|
| Page title | `text-2xl font-semibold text-foreground` |
| Subtitle (optional) | `text-sm text-muted-foreground mt-1` |
| Actions (right-aligned) | Button with appropriate variant |

---

## Cards

Every content section lives in a card.

```
bg-card border border-border rounded-xl p-6 shadow-sm
```

- Never use colored card backgrounds — always white
- Color goes inside cards via badges, indicators, and text — never on the card surface
- Never nest cards inside cards

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
