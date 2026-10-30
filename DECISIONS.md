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
- Rules-as-code slice: Argon generated 55 EU Annex V rules from official CosIng data; wired into ALL_RULES behind the hand rules. Eval: 89 mechanically derived cases; hand 49%, generated 100%, Argon-direct 100%.
- v1.1 (branch `claude-haiku`): the hackathon Gemini credit was temporary, so the agent and all tool calls moved to Claude Haiku 5.5 (`lib/agent/llm.ts`, Anthropic SDK structured outputs + web_fetch; agent via `@ai-sdk/anthropic` wrapped in a usage-metering middleware). No temperature: Haiku 5.5 rejects non-default sampling.
- Daily spend cap: `lib/budget.ts` prices every model call's real token usage at Haiku rates and stores the UTC-day total in Upstash Redis (in-memory fallback without Redis). Over `DAILY_LIMIT_USD` (default $5) the run endpoint returns 503 and the UI drops to rules-only until 00:00 UTC. Plus `RUNS_PER_IP` (default 20) per IP per day.
- Measured: one full review (audit + label + dupe + MoCRA) costs about $0.01 on Haiku, so $5 is roughly 500 reviews a day.
- The shipped EU Annex V rulebook stays the Argon-generated one (100% on the eval). `rules:gen` now writes a Haiku version to `eu-annex-v.haiku.ts` for comparison: Haiku-generated 96.6%, Haiku direct 91% (missed 7/47 violations). Argon v1 results kept in `eval-results.argon.json`.
- Haiku sometimes answered "None" for the dupe brand on unsafe products; the rulebook brand is kept in that case, and the prompt now says to always invent one.
- MoCRA Markdown now renders GFM tables (remark-gfm).
- Branding: hand-drawn SVG mark (an open compact with a US · CA · EU verdict halo) used as favicon, header logo and README banner; banners, social preview and apple icon rendered from HTML with the app fonts.
- Product URLs: Anthropic's web fetch is blocked by big retailers (Sephora returns url_not_allowed), where Gemini's URL context got through. read_product_url now also has web search: when the page is blocked it finds the same product's INCI list on the brand site, another retailer or an INCI database, includes "may contain" colorants, and reports ingredientSource + sourceNote. It never fills gaps from memory and does not try to get around bot protection.
- Label measurements (warning pt, contrast, peel-off) are optional. A web page only yields the claims, so the label check no longer "passes" invented defaults; it adds a NOTE that size, contrast and placement must be checked on the physical package. NOTE findings don't affect the verdict.
- Haiku marked most unrestricted ingredients NEEDS_REVIEW; the AI audit schema now allows only PASS/VIOLATION/WARN (NEEDS_REVIEW is reserved for AI-vs-rulebook disagreements) and the prompt says unrestricted ingredients are PASS. Tool calls rejected for malformed arguments are hidden, since the agent retries them; agent maxOutputTokens raised to 16000.
