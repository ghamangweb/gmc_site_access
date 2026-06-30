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
| Button | `src/components/ui/button.tsx` | |
| Input | `src/components/ui/input.tsx` | |
| Label | `src/components/ui/label.tsx` | |
| Card | `src/components/ui/card.tsx` | |
| Form | `src/components/ui/form.tsx` | |
| Alert | `src/components/ui/alert.tsx` | |

---

## Custom Components

*None yet. Add entries here as components are built.*

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
| Shadow | |
| Status / accent usage | |

**Pattern notes:**
Key decisions, gotchas, or invariants specific to this component.
```
