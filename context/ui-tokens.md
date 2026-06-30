# UI Tokens

Design tokens for GMC Site Access. All colors, typography, and spacing are defined here.
Never hardcode hex values or raw Tailwind color classes in components — always use these tokens.

---

## How to Use

This project uses **Tailwind CSS v4** with shadcn/ui. Tokens are split across two layers
in `src/app/globals.css`:

- **`:root {}`** — raw CSS custom properties; shadcn/ui component internals read these
- **`@theme inline {}`** — maps `:root` variables to Tailwind utility classes

Tailwind v4 auto-generates utility classes from every `--color-*` in `@theme inline`:

- `--color-primary` → `bg-primary`, `text-primary`, `border-primary`
- `--color-status-success-bg` → `bg-status-success-bg`

```tsx
// Correct — Tailwind utility from token
className="bg-primary text-primary-foreground"

// Correct — CSS variable directly (chart colors, inline SVG)
style={{ color: 'var(--status-success)' }}

// Never — hardcoded hex
className="bg-[#0076BF]"

// Never — raw Tailwind color class
className="bg-blue-600 text-gray-500"
```

---

## globals.css — Complete Token Definition

```css
@import "tailwindcss";

:root {
  /* Core palette */
  --background:               0 0% 100%;       /* #FFFFFF */
  --foreground:               222 47% 11%;     /* #0F172A */
  --card:                     0 0% 100%;
  --card-foreground:          222 47% 11%;
  --primary:                  204 100% 37%;    /* GMC Blue #0076BF */
  --primary-foreground:       0 0% 100%;
  --secondary:                210 40% 96%;     /* #F1F5F9 */
  --secondary-foreground:     222 47% 11%;
  --muted:                    210 40% 96%;
  --muted-foreground:         215 16% 47%;     /* #64748B */
  --accent:                   210 40% 96%;
  --accent-foreground:        222 47% 11%;
  --destructive:              0 84% 60%;       /* #EF4444 */
  --destructive-foreground:   0 0% 100%;
  --border:                   214 32% 91%;     /* #E2E8F0 */
  --input:                    214 32% 91%;
  --ring:                     204 100% 37%;

  /* Sidebar */
  --sidebar:                  210 40% 98%;     /* #F8FAFC */
  --sidebar-border:           214 32% 91%;

  /* Workflow status — success (Active, Completed, Fit) */
  --status-success:           142 71% 45%;
  --status-success-bg:        142 76% 95%;
  --status-success-fg:        142 72% 22%;

  /* Workflow status — warning (Pending, Flagged, TerminationRequested, FitWithConditions) */
  --status-warning:           38 92% 50%;
  --status-warning-bg:        48 96% 89%;
  --status-warning-fg:        32 95% 24%;

  /* Workflow status — danger (Rejected, Terminated, Expired, Unfit) */
  --status-danger:            0 84% 60%;
  --status-danger-bg:         0 86% 96%;
  --status-danger-fg:         0 74% 35%;

  /* Workflow status — info (AtReception, AtHospital, AtTraining, AtSecurity, AtIT) */
  --status-info:              204 100% 37%;
  --status-info-bg:           204 100% 94%;
  --status-info-fg:           204 100% 22%;

  /* Workflow status — neutral (Draft, AwaitingProvisioning) */
  --status-neutral:           215 16% 47%;
  --status-neutral-bg:        210 40% 96%;
  --status-neutral-fg:        215 25% 27%;

  /* Shape */
  --radius: 0.5rem;
}

@theme inline {
  --font-sans: "Inter", sans-serif;

  --color-background:               hsl(var(--background));
  --color-foreground:               hsl(var(--foreground));
  --color-card:                     hsl(var(--card));
  --color-card-foreground:          hsl(var(--card-foreground));
  --color-primary:                  hsl(var(--primary));
  --color-primary-foreground:       hsl(var(--primary-foreground));
  --color-secondary:                hsl(var(--secondary));
  --color-secondary-foreground:     hsl(var(--secondary-foreground));
  --color-muted:                    hsl(var(--muted));
  --color-muted-foreground:         hsl(var(--muted-foreground));
  --color-accent:                   hsl(var(--accent));
  --color-accent-foreground:        hsl(var(--accent-foreground));
  --color-destructive:              hsl(var(--destructive));
  --color-destructive-foreground:   hsl(var(--destructive-foreground));
  --color-border:                   hsl(var(--border));
  --color-input:                    hsl(var(--input));
  --color-ring:                     hsl(var(--ring));
  --color-sidebar:                  hsl(var(--sidebar));
  --color-sidebar-border:           hsl(var(--sidebar-border));

  --color-status-success:           hsl(var(--status-success));
  --color-status-success-bg:        hsl(var(--status-success-bg));
  --color-status-success-fg:        hsl(var(--status-success-fg));
  --color-status-warning:           hsl(var(--status-warning));
  --color-status-warning-bg:        hsl(var(--status-warning-bg));
  --color-status-warning-fg:        hsl(var(--status-warning-fg));
  --color-status-danger:            hsl(var(--status-danger));
  --color-status-danger-bg:         hsl(var(--status-danger-bg));
  --color-status-danger-fg:         hsl(var(--status-danger-fg));
  --color-status-info:              hsl(var(--status-info));
  --color-status-info-bg:           hsl(var(--status-info-bg));
  --color-status-info-fg:           hsl(var(--status-info-fg));
  --color-status-neutral:           hsl(var(--status-neutral));
  --color-status-neutral-bg:        hsl(var(--status-neutral-bg));
  --color-status-neutral-fg:        hsl(var(--status-neutral-fg));

  --radius: var(--radius);
}
```

---

## Color Usage Guide

### Layout

| Element | Token |
|---|---|
| Page background | `bg-background` |
| Card / panel surface | `bg-card` |
| Sidebar background | `bg-sidebar` |
| Sidebar right border | `border-sidebar-border` |
| Default border | `border-border` |

### Typography

| Element | Token |
|---|---|
| Headings, primary text | `text-foreground` |
| Secondary labels, metadata | `text-muted-foreground` |
| Placeholder text | `text-muted-foreground` |

### Primary (GMC Blue)

Used for: primary buttons, active nav items, focus rings, links.

| Element | Token |
|---|---|
| Button / active background | `bg-primary` |
| Text on primary background | `text-primary-foreground` |
| Primary text or icon | `text-primary` |
| Focus ring | `ring-ring` (auto via shadcn/ui) |

### Workflow Status Badges

Map every workflow and access state to a bucket — never assign colors per individual state.

| State | Bucket |
|---|---|
| Active, Completed, Fit | `success` |
| Pending, Flagged, TerminationRequested, FitWithConditions | `warning` |
| Rejected, Terminated, Expired, Unfit | `danger` |
| AtReception, AtHospital, AtTraining, AtSecurity, AtIT | `info` |
| Draft, AwaitingProvisioning | `neutral` |

Badge classes: `bg-status-{bucket}-bg text-status-{bucket}-fg`

```tsx
<span className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-status-success-bg text-status-success-fg">
  Active
</span>
```

---

## Typography Scale

| Use | Tailwind | Weight |
|---|---|---|
| Page title | `text-2xl` | `font-semibold` |
| Section / card heading | `text-lg` | `font-semibold` |
| Table column header | `text-xs uppercase tracking-wide` | `font-medium` |
| Body / form fields | `text-sm` | `font-normal` |
| Nav item label | `text-sm` | `font-medium` |
| Badge / caption | `text-xs` | `font-medium` |
| Helper / muted text | `text-xs` | `font-normal` |

---

## Spacing Conventions

| Pattern | Tailwind | Usage |
|---|---|---|
| Page content inset | `p-6` | Main content area padding |
| Card inner padding | `p-6` | All card surfaces |
| Form field gap | `gap-4` | Between form rows |
| Section gap | `gap-6` | Between cards on a page |
| Table cell | `px-4 py-3` | `<th>` and `<td>` |

---

## Component Tokens

### Cards
```
bg-card border border-border rounded-xl p-6 shadow-sm
```

### Buttons (shadcn/ui variants)

| Variant | When to use |
|---|---|
| `default` | Primary action — one max per section |
| `outline` | Secondary / cancel |
| `destructive` | Reject, terminate — requires confirmation dialog |
| `ghost` | Tertiary, icon-only |

### Inputs
```
bg-background border border-input rounded-md px-3 py-2 text-sm
placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring
```

### Status Badges
```
rounded-full px-2.5 py-0.5 text-xs font-medium
bg-status-{bucket}-bg text-status-{bucket}-fg
```

### Tables
```
header:  text-xs font-medium uppercase tracking-wide text-muted-foreground px-4 py-3
row:     text-sm text-foreground px-4 py-3 border-b border-border hover:bg-muted/50
```

---

## Invariants

- Never hardcode hex values — always use CSS variable tokens
- Never use raw Tailwind color classes (`bg-blue-600`, `text-gray-500`)
- `--primary` (GMC Blue `#0076BF`) is the only brand blue — never use Tailwind's blue scale
- Status badges always use the 5-bucket system — never assign colors per individual state
- All borders default to `border-border` — never use `border-gray-*`
- Focus rings always use `ring-ring` — never custom ring colors
