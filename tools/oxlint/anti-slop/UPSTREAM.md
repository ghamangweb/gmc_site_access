# Anti-slop Oxlint plugin — provenance

- **Source repository:** `dmmulroy/anti-slop` (GitHub)
- **Exact source commit:** unknown — not recoverable in this environment (no network access to the
  upstream repo, and no local clone with git metadata). This was installed via the
  `install-anti-slop` Claude Code skill, whose own `SKILL.md` is tracked in this repo's
  `skills-lock.json` with `computedHash: 4031728fbe75bdcad6ee3208fd52b5d66e167b056fefee1fa9758e9a6cb9c0c8`
  (source: `dmmulroy/anti-slop`, path `skills/install-anti-slop/SKILL.md`). That hash covers the
  skill instructions, not necessarily a specific commit of the vendored plugin assets themselves.
- **Installed plugin paths:**
  - `tools/oxlint/anti-slop/index.ts` (generic plugin entry point, registered in `.oxlintrc.json`)
  - `tools/oxlint/anti-slop/effect/index.ts` (opt-in Effect plugin, not registered — this repo has
    no `effect` dependency)
  - Vendored sub-rule: `tools/oxlint/anti-slop/vendor/eslint-stylistic/` (own `LICENSE` and
    `UPSTREAM.md` travel with it, kept as-is)
- **Intentional deviations from the install skill's default instructions:** none. Installed fresh,
  all generic rules enabled at `"error"` as specified. Effect plugin left unregistered (no `effect`
  dependency in this project, and not explicitly requested). `codespell` (unrelated, pre-existing
  pre-commit check) was dropped during a separate Lefthook migration — not part of this plugin.
