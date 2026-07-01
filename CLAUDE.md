
<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

## Read Before Anything Else

Read in this exact order before any implementation:

1. context/project-overview.md
2. context/architecture.md
3. context/ui-tokens.md
4. context/ui-rules.md
5. context/ui-registry.md
6. context/code-standards.md
7. context/library-docs.md
8. context/build-plan.md
9. context/progress-tracker.md

## Rules That Never Change

- Never use hardcoded hex values or raw Tailwind color classes
- Update `progress-tracker.md` and `ui-registry.md` after every feature
- Before any third party library — load its installed skill first,
  then read `context/library-docs.md` for project-specific rules
- If the same problem persists after one corrective prompt —
  stop immediately and run /recover

## Available Skills

- `/architect` — before any complex feature. Think before building.
- `/imprint` — after any new UI component. Capture patterns.
- `/review` — before demo or when something feels off.
- `/recover` — when something breaks after one failed correction.
- `/remember save` — when a feature spans multiple sessions.
- `/remember restore` — when returning after a multi-session feature.

## Important Notes

- NEVER commit .env.keys
- ALWAYS follow existing code patterns. Ask permission before introducing a new pattern or changing an existing one.
- NEVER GUESS. Load the necessary skills before implementing a feature. Ask when unsure.
- NEVER should you break an existing logic or something that works while trying to fix another thing
- BE CONCISE in plan mode — keep plans short and scannable.
- Do NOT introduce new libraries unless explicitly requested. You may ask if library is needed to implement the task at hand, then proceed if given the permission to install.
- Do NOT refactor unrelated code
- Do NOT change file structure
- Prefer minimal, surgical changes
- Follow existing patterns exactly
- Ask before making architectural decisions
