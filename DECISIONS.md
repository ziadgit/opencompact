# Decisions

Autonomous build decisions, one line each.

- Brands from the original diamonds presets renamed to fictional names (no real-brand references).
- Scaffolded via scratchpad dir (npm forbids `_scaffold` as a package name); removed `cacheComponents`/`partialPrefetching` from the default next.config to keep route handlers simple.
- M1 smoke test: runtime + BuiltInAgent wiring works, but the provided key returns 429 "free tier limit 0" for gemini-4-argon. Model not substituted (rule 7); UI surfaces run errors and falls back to rules-only mode.
