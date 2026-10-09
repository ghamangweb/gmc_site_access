# Library Docs

Project-specific usage for third-party libraries and environment configuration. Read the relevant section before implementing a feature that touches these.

For coding rules (try/catch, Server Actions, naming): see `docs/context/code-standards.md`.

---

## Before Using Any Library

Before implementing any feature that uses a third party library:

1. **Check AGENTS.md** at the project root — it lists every skill installed for this project and how to use them. Skills contain up-to-date API documentation, usage patterns, and best practices specific to this codebase.

2. **Check if an MCP server is configured** for that library. Some tools have MCP servers that give the AI agent direct access to documentation, logs, and debugging tools. If an MCP server is available — use it before falling back to general knowledge.

3. **Read this file** for project-specific patterns that override general library knowledge.

The order of authority is:

```
MCP server (real-time docs) → Skills via AGENTS.md → This file (project rules) → General training knowledge
```

Never rely on general training knowledge alone for library APIs — they change frequently and training data may be outdated.

---

## Auth.js v5 (`next-auth@beta`)

`latest` on npm is still v4 — v5 only exists under the `beta` dist-tag. Install with
`bun add next-auth@beta`. Provider import: `next-auth/providers/microsoft-entra-id`
(not `azure-ad`); provider id used in `signIn()` calls is `'microsoft-entra-id'`.
Config lives at `src/lib/auth/entra.ts` (not the framework's suggested root `auth.ts`,
to match this project's `lib/auth/` convention) exporting `{ handlers, auth, signIn, signOut }`.

## Next.js 16 `proxy` (formerly `middleware`)

Next 16 deprecated `middleware.ts`/`export function middleware()` in favor of
`proxy.ts`/`export function proxy()`. Runtime is `nodejs` only — `edge` is no longer an
option for this file. This project's auth gate lives at `src/proxy.ts`.

## Microsoft Graph email (`@azure/identity`)

`src/lib/azure/graph-mail.ts` uses `ClientSecretCredential` (client-credentials flow) to
get a token for scope `https://graph.microsoft.com/.default`, then calls the Graph
`sendMail` REST endpoint directly via `fetch` — no `@microsoft/microsoft-graph-client` SDK
needed for this single call. Requires `Mail.Send` **Application** permission
(admin-consented) on the App Registration, separate from the delegated `User.Read`
permission used for sign-in.

## Azure Blob Storage (`@azure/storage-blob`)

`src/lib/azure/blob.ts` uses **shared-key auth** via
`AZURE_STORAGE_CONNECTION_STRING` (`BlobServiceClient.fromConnectionString`) —
not the AAD/`ClientSecretCredential` approach used for Graph mail. This was a
deliberate switch (2026-07-09) from an earlier AAD-based design once local dev
was actually being set up with a connection string from the Storage account's
Access Keys blade rather than an RBAC role assignment; simpler to get working
for this project's stage. SAS URLs are generated with a
`StorageSharedKeyCredential` built by parsing the account name/key back out of
the same connection string (`generateBlobSASQueryParameters` needs a
credential object, not just the client) — the account key is stored in `.env`
and effectively used for both plumbing and SAS generation, unlike the
account-key-free approach used before. `uploadBlob` calls
`containerClient.createIfNotExists()` so the container doesn't need to be
created manually in the Portal first. Blob path:
`engagements/{engagementId}/{docType}/{filename}` inside the container named
by `AZURE_STORAGE_CONTAINER_NAME`.

## react-day-picker / date-fns (shadcn `Calendar` + `DatePicker`)

Both arrived automatically via `pnpm dlx shadcn@latest add calendar` (not a
manual `pnpm add`) — `Calendar` (`src/components/ui/calendar.tsx`) is generated
on top of `react-day-picker`; `src/components/ui/date-picker.tsx` uses
`date-fns`'s `format`/`parseISO` only, to convert between `Date` (what
`Calendar` works with) and the `yyyy-MM-dd` strings this project's Postgres
`date` columns use everywhere else. `calendar.tsx` and `date-picker.tsx` are
the two exceptions that are allowed to import these packages directly — they
*are* the wrapper. Application/feature code (forms, pages, everything outside
`components/ui/`) should never reach for `react-day-picker` or `date-fns`
directly — build on `DatePicker` instead.

## libphonenumber-js (phone number validation)

Added 2026-07-23 for `reception-form.tsx`'s `phoneFieldSchema` — validates the
combined `"{dialCode} {number}"` string (e.g. `"+233 241234567"`) against the
selected country's real numbering plan (length, valid prefixes, allowed
characters) via `isValidPhoneNumber` from `libphonenumber-js`, instead of only
checking that a dial code and a non-empty number were both present. Approved
as a new dependency specifically because hand-rolled per-country regex rules
across `COUNTRY_CALLING_CODES`'s ~90 countries would be inaccurate and a
maintenance burden — `libphonenumber-js` is the standard, actively-maintained
port of Google's `libphonenumber` metadata. `isValidPhoneNumber` is called
with no explicit country/region argument — since the input already starts
with `+{dialCode}`, the library infers the calling code and matches the
national number against every region sharing it (handles shared codes like
NANP's `+1` correctly). Currently only imported in `reception-form.tsx` — if
another form grows a phone field, extract this into a shared helper rather
than duplicating the `isValidPhoneNumber` call inline.

## Drizzle casing

`drizzle.config.ts` and `src/lib/db/client.ts` both set `casing: "snake_case"` so JS
camelCase column names (e.g. `entraObjectId`) map to snake_case DB columns
(`entra_object_id`), matching `architecture.md`'s schema tables. Both places must agree —
the config controls migration generation, the client option controls runtime queries.

## dotenvx (`@dotenvx/dotenvx` + `@dotenvx/next-env`)

Added 2026-10-09 to replace plaintext `.env` with a committed, encrypted
`.env.development` (Docker Postgres → Neon migration made secrets-in-git
viable: see `architecture.md` Invariants). `package.json` has
`"overrides": { "@next/env": "npm:@dotenvx/next-env" }` — this makes
`next dev`/`build`/`start` decrypt `.env.development` automatically, no
wrapper needed. Non-Next scripts (`db:generate`/`migrate`/`seed`/`start`) do
**not** go through Next's env loader, so they're wrapped explicitly:
`dotenvx run -f .env.development -- <command>`.

**`--no-native` is mandatory on `encrypt`/`decrypt`.** Without it, on a
non-interactive run (no TTY — which is every automated/CI run, and every run
through an agent's shell tool) dotenvx silently stores the private key in the
OS-native secret store (Linux Secret Service / macOS Keychain / Windows
Credential Manager) instead of writing it to `.env.keys`. That key is then
stuck on one machine — unrecoverable by teammates, and by CI entirely. Both
`env:encrypt` and `env:decrypt` scripts already pass `--no-native`; don't
drop it when touching these scripts.

`.env.keys` holds the private key in plaintext — generated locally by
`bun run env:encrypt`, never committed (see `.gitignore` and CLAUDE.md's
"NEVER commit .env.keys"). Anyone who needs to decrypt (a new teammate, a
deploy target) needs this file or its `DOTENV_PRIVATE_KEY_DEVELOPMENT` value
handed to them out-of-band — dotenvx has no mechanism to recover it otherwise.

## Lefthook

Replaced `pre-commit` (Python-based) 2026-10-09 — see `lefthook.yml` at
project root. Installed automatically on `bun install` via
`"postinstall": "lefthook install"` in `package.json`. Config uses the `jobs:`
list form (not the older flat `commands:` map) — matches this package's
bundled `node_modules/lefthook/README.md` examples for v2.x. Validate changes
with `./node_modules/.bin/lefthook validate` before trusting a config edit —
don't guess at field names; `node_modules/lefthook/schema.json` is
authoritative. Directory-exclude jobs (`end-of-file-fixer`,
`trailing-whitespace`, `check-merge-conflict`) always loop over
`{staged_files}` rather than passing it directly to `grep`/`sed` — with zero
staged files matching a job's `glob`, passing `{staged_files}` straight to a
command like `grep` (no filename args) makes it block reading stdin forever.

## Oxlint + anti-slop plugin

Added 2026-10-09 via the `install-anti-slop` Claude Code skill — vendored
(not an upstream-tracking dependency) at `tools/oxlint/anti-slop/`, registered
in `.oxlintrc.json`, run via `bun run lint:anti-slop`. This is **separate from
Biome** (`bun run lint`) — Oxlint here only runs the `anti-slop` rule set
(AI-generated-code-smell checks), not general linting. Two project files
needed edits to keep the vendored plugin from breaking existing tooling,
and both exclusions must be kept if the plugin is ever moved or reinstalled:
- `tsconfig.json` `exclude` needs `tools/oxlint/anti-slop` — the plugin's
  source uses explicit `.ts` import extensions (an Oxlint-runtime convention)
  that this project's `tsc` config doesn't allow (`allowImportingTsExtensions`
  is off), so `tsc --noEmit` fails otherwise.
- `biome.json` `files.includes` needs `!tools/oxlint/anti-slop` (bare form,
  no trailing `/**` — Biome 2.2.0's `useBiomeIgnoreFolder` rule flags `/**` as
  the wrong/outdated syntax) — otherwise Biome lints the vendored plugin's
  own style as if it were application source.

Provenance (source repo, upstream commit if known, intentional deviations):
`tools/oxlint/anti-slop/UPSTREAM.md`, kept beside the plugin's `index.ts`.
Findings in actual project code are **not** auto-fixed by the install —
see `progress-tracker.md`/ask the user before running any bulk fix pass.
---
