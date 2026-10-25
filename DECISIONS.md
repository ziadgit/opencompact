# Decisions

Autonomous build decisions, one line each.

- Brands from the original diamonds presets renamed to fictional names (no real-brand references).
- Scaffolded via scratchpad dir (npm forbids `_scaffold` as a package name); removed `cacheComponents`/`partialPrefetching` from the default next.config to keep route handlers simple.
- M1 smoke test: runtime + BuiltInAgent wiring works, but the provided key returns 429 "free tier limit 0" for gemini-4-argon. Model not substituted (rule 7); UI surfaces run errors and falls back to rules-only mode.
- §2 table says Thioglycolic Acid / PPD are CA PASS, but §3 expects P3 CA VIOLATION: added California Sherman Law (Cal. H&S Code §111670) mirroring of FD&C §601 adulteration findings so CA follows US on TGA/PPD.
- "Non-toxic / 100% clean" WARN is attached to the jurisdictions where an ingredient already violates (keeps P2 US = PASS).
- `design_dupe` takes `{ product, brief? }` and re-runs the rulebook itself instead of having the model echo the whole AuditResult back.
- Every tool has a deterministic rulebook fallback if the Argon call fails (e.g. quota), tagged `mode: "rules-only"`.
- 3D environment uses drei <Environment> with local Lightformers (no HDR download) so the stage works offline. Peel is a CPU page-curl on the label plane's vertices.
- Root cause of the M1 quota error: the shell exported a different (free-tier) GEMINI_API_KEY, and Next.js gives process env priority over .env.local. With `env -u GEMINI_API_KEY npm run start` the .env.local key is used and the full agent flow works (verified with all tools on P3). Documented in README.
- M6 verified: read_product_url extracted a real INCI list from a live product page via Argon URL context.
- Notebook: reviews persist in localStorage (entries + agent messages, max 40), restored into the agent once useAgent reports isReady; home renders client-only to read it synchronously.
- Every audited review now shows a label check and a dupe: the prompt says ALWAYS, and the notebook fills either from the rulebook if the agent skips it. Clean labels show an OK row instead of an empty card.
- Multiple notebooks (localStorage v2 library, v1 data migrated); New notebook button in the header.
