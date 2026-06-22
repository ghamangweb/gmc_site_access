Implementation rules and conventions for the entire project. Follow these in every session without exception. These rules prevent pattern drift across sessions.


---

## Engineering Mindset

Operates as a senior engineer. This means:

- **Think before implementing** — understand what is being built and why before writing a single line
- **Read context files first** — never assume, always verify against `architecture.md` and `project_overview.md`
- **Scope is sacred** — only build what the current feature requires. Never go beyond scope even if it seems helpful
- **Every feature must be testable** — if it cannot be verified immediately after implementation, it is incomplete
- **Clean over clever** — simple readable code that a junior developer can understand is always preferred over clever abstractions
- **One thing at a time** — complete one feature fully before touching the next
- **Failures are expected** — wrap async operations in try/catch, log failures, never let one failure crash the request

---
## TypeScript

- Strict mode enabled in tsconfig.json — no exceptions
- Never use `any` — use `unknown` and narrow the type
- Never use type assertions (`as SomeType`) unless absolutely necessary and commented why
- All function parameters and return types must be explicitly typed
- Use `type` for object shapes and unions — use `interface` only for extendable component props
- All async functions must have proper error handling — never let promises float unhandled
- Use `const` by default — only use `let` when reassignment is necessary

---

## Next.js 16 Conventions

- App Router only — no Pages Router
- React 19 — use React 19 APIs throughout
- All components are Server Components by default
- Only add `"use client"` when the component requires:
  - useState or useReducer
  - useEffect
  - Browser APIs
  - Event listeners
  - Third party client-only libraries
- Never add `"use client"` to layout files unless absolutely required
- Data fetching happens in Server Components — never fetch in Client Components directly
- Route handlers live in `app/api/` — never put business logic directly in route handlers
- Server Actions live in `actions/` — never define Server Actions inline in components
- Caching is uncached by default — all dynamic code runs at request time
- Always read Next.js documentation before implementing any Next.js specific feature — APIs may differ from training data

---

## File and Folder Naming

- Folders: kebab-case — `check-visa-expiry`, `send-email`, `(auth)`
- Component files: kebab-case — `reception-form.tsx`, `layer-queue.tsx`
- Utility files: kebab-case — `workflow-service.ts`, `engagement-repository.ts`
- Type files: kebab-case — `index.ts`, `workflow-states.ts`
- API route files: always `route.ts` — e.g. `app/api/documents/route.ts`
- Server Action files: kebab-case — `engagements.ts`, `admin.ts`
- One component per file — never export multiple components from one file
- Index files only in `components/ui/` — never barrel export from other folders

---

## Component Structure

Every component follows this exact order:

```typescript
"use client"; // only if needed

// 1. External imports
import { useState } from "react";
import { Button } from "@/components/ui/button";

// 2. Internal imports
import { LayerQueue } from "@/components/workflow/layer-queue";
import { transitionEngagement } from "@/actions/engagements";

// 3. Type definitions
type Props = {
  engagementId: string;
  readOnly: boolean;
};

// 4. Component
export function ReceptionForm({ engagementId, readOnly }: Props) {
  // state
  // derived values
  // handlers — call Server Actions; never write to DB from here
  // return JSX
}
```

- Never use default exports for components — always named exports
- Props type defined directly above the component — not in a separate types file unless shared
- Workflow UI lives in `components/workflow/` — layer-specific forms and queues
- No inline styles — all styling via Tailwind classes using CSS variables from ui-tokens.md

---


## API Route Handlers

API routes for **file uploads and non-form HTTP only** — never workflow form mutations.

```typescript
// app/api/documents/route.ts

import { NextRequest, NextResponse } from "next/server";
import { uploadDocument } from "@/lib/services/document-service";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    // validate engagementId, docType, file
    const result = await uploadDocument(formData);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("[api/documents]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
```

- Every route handler has a try/catch
- Every route handler validates the request before processing
- Route handlers delegate to services — no business logic or DB access in the handler
- Errors are logged with the route path as prefix: `[api/documents]`
- Always return `{ success: boolean, data?: T, error?: string }`
- Never return raw data without the success wrapper

---

## Server Actions

Server Actions for **workflow form mutations** — transitions, approvals, layer field updates. No file uploads.

```typescript
// actions/engagements.ts

"use server";

import { revalidatePath } from "next/cache";
import { requireWriteAccess } from "@/lib/auth/guards";
import { transitionEngagement } from "@/lib/services/workflow-service";

export async function submitLayerAction(
  engagementId: string,
  layer: string,
  payload: Record<string, unknown>,
) {
  try {
    await requireWriteAccess(layer);
    await transitionEngagement(engagementId, payload);
    revalidatePath(`/dashboard/${layer}`);
    return { success: true };
  } catch (error) {
    console.error("[actions/engagements]", error);
    return { success: false, error: "Failed to submit" };
  }
}
```

- Every Server Action has a try/catch
- Every Server Action returns `{ success: boolean, error?: string }`
- Auth via `lib/auth/guards.ts` — never skip role checks
- Delegate to services — never write to DB directly from actions
- Always call `revalidatePath` after mutations that affect page data
- Never throw from Server Actions — always return the error

---

## Services and Repositories

Business logic lives in services. DB access lives in repositories. Nothing else talks to PostgreSQL directly.

```typescript
// lib/services/workflow-service.ts — business rules, guards, orchestration
// lib/repositories/engagement-repository.ts — Drizzle queries only
```

- Route handlers and Server Actions call **services** — never repositories directly
- Services call **repositories** — never import Drizzle in components, actions, or route handlers
- Services may call other services, `lib/email/`, and `lib/auth/guards.ts`
- `lib/domain/` holds types and enums — no DB or Azure SDK imports
- Azure SDK usage only in `lib/azure/` — services call those wrappers, never raw SDK in actions or routes

---

## Error Handling

- Never use empty catch blocks — always log or handle
- Console errors always include context prefix: `[api/documents]`, `[actions/engagements]`
- User-facing errors must be human readable — never expose raw error messages or stack traces
- API route errors return `status: 500` with a generic message — never expose internals

---

## Secrets and Environment Variables

- Never hardcode keys, URLs, or secrets in source code
- Local dev: copy `.env.example` to `.env` — see `context/build-plan.md` Step 0
- Full variable list and which file reads each one: `context/library-docs.md`
- `NEXT_PUBLIC_` prefix exposes a value to the browser — never use it for secrets
- Secrets never in git — see `architecture.md` Invariants

---

## Import Aliases

Always use the `@/` alias — never use relative imports that go up more than one level.

```typescript
// Correct
import { Button } from "@/components/ui/button";
import { transitionEngagement } from "@/lib/services/workflow-service";
import { submitLayerAction } from "@/actions/engagements";

// Never
import { Button } from "../../../components/ui/button";
```

---

## Comments

- No comments explaining what the code does — code must be self-explanatory
- Comments only for why — explaining a non-obvious decision
- Never leave TODO comments in committed code

---

## Dependencies

Never install a new package without a clear reason. Before installing anything check:

1. Does shadcn/ui already have this component?
2. Does Next.js already provide this functionality?
3. Is there a simpler native solution?

Approved dependencies for this project:

- `next`, `react`, `react-dom` — framework
- `drizzle-orm`, `drizzle-kit` — PostgreSQL ORM and migrations
- `postgres` or `pg` — PostgreSQL driver (pick one at scaffold)
- `zod` — request and form validation
- `lucide-react` — icons
- `tailwindcss` — styling
- shadcn/ui components — UI primitives
- `@azure/storage-blob` — Blob Storage
- `@azure/storage-queue` — email job queue
- `@microsoft/microsoft-graph-client` or `@azure/identity` — Graph API mail
- `@azure/msal-node` or NextAuth / Entra adapter — pick at scaffold; document in library-docs.md

Library-specific usage patterns go in `context/library-docs.md`. Do not install anything else without updating this list first.
