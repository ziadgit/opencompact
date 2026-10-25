# OpenCompact

Paste a beauty product (link, ingredient list, or question). An AI agent tells you whether it can be sold in the **US (FDA)**, **California** and the **EU**, explains why with citations, and designs a **compliant dupe** you can inspect in 3D next to the original. Every result is a draft, not legal advice.

Live: [opencompact.vercel.app](https://opencompact.vercel.app) · What it is, explained: [opencompact.vercel.app/about](https://opencompact.vercel.app/about)

## Setup
1. `npm install`
2. `cp .env.example .env.local` and set `GEMINI_API_KEY` (model: `gemini-4-argon`).
3. `npm run dev` → http://localhost:3000 (and `/about`).
4. No key? The app runs in **rules-only mode**: presets and pasted INCI lists are checked by the deterministic rulebook.
5. Check the rulebook: `npx tsx scripts/check-presets.ts`. Note: a `GEMINI_API_KEY` exported in your shell overrides `.env.local` (`unset GEMINI_API_KEY` if it is a different key).

## Architecture
- **Agent**: CopilotKit v2 `BuiltInAgent` (`google/gemini-4-argon`) served by `createCopilotRuntimeHandler` at `app/api/copilotkit/[[...slug]]`; five server tools in `lib/agent/tools.ts` (`read_product_url`, `audit_formulation`, `lint_label`, `design_dupe`, `draft_mocra_report`).
- **Structured AI**: tools call Argon directly via `@google/genai` (`lib/agent/argon.ts`) with JSON schemas from zod 4, plus URL context for product pages.
- **Trust layer**: `lib/rules/` is a hard-coded rulebook (ingredients, label, MoCRA). `crosscheck()` compares AI verdicts to it and marks disagreements `NEEDS_REVIEW`; every tool falls back to the rulebook if Argon fails.
- **UI**: `/` is a notebook of reviews on `useAgent`, with generative UI registered via `useRenderTool` (verdict matrix, label card, dupe stage, MoCRA report). Notebooks persist in localStorage; if the agent skips the label check or the dupe, the rulebook fills them in. `/about` is a static editorial page with a looping demo.
- **3D**: `components/dupe3d/` — React Three Fiber stage with procedural compact / dropper / airless-pump vessels, instanced “Dupe it” particles, a peelable label, verdict halos and an SVG fallback without WebGL.

## Rules-as-code with Gemini 4 Argon (first slice)

The hand-written rulebook covers 10 ingredients. This experiment has Argon turn real regulation into rule code, then measures it against baselines.

- **Source:** the official EU Cosmetics Regulation Annex V (allowed preservatives, 60 entries), pulled from the EU CosIng database API → `data/eu-annex-v/annex-v.json`.
- **Generation** (`npm run rules:gen`): one Argon call reads the whole table plus the existing `Rule` interface and writes `lib/rules/generated/eu-annex-v.ts`. That's 55 rules in 984 lines; it type-checked on the first try. About 7K input and 12K output tokens, in 88 s.
- **Evaluation** (`npm run rules:eval`): 89 test cases built mechanically from the official limits, with no AI. For each single-limit entry: half the limit (should pass), double the limit (should fail), and rinse-off-only preservatives used in a leave-on product (should fail).

| System | Accuracy | Violations caught | Rule coverage |
|---|---|---|---|
| A. Hand-written rulebook (10 rules) | 49% | 2 / 47 | 3 / 89 |
| B. Argon-generated rulebook (55 rules) | **100%** | **47 / 47** | 89 / 89 |
| C. Argon answering directly, no rule code | 100% | 47 / 47 | — |

**What this shows:**
- Generated rules lift the deterministic rulebook from 49% to 100% on this set.
- After a one-time generation they run offline, cost no tokens per check, and always cite the exact Annex V entry.

**What it doesn't show yet:**
- Argon answering directly (C) ties B here; the test set is easy.
- Entries with limits split by product type (a/b/c) were left out of the test set.
- This is one annex at about 12K output tokens, not million-token scale.

The full version covers every EU annex, the FDA color-additive regulations and the California statutes, with harder test cases and chunked and smaller-model baselines. The generated rules are already live in the app's rulebook, behind the hand-written ones.

## History

This is **v1**, following the v0 prototype — repo: [ziadgit/diamonds](https://github.com/ziadgit/diamonds), demo: [opencompact.ai.studio](https://opencompact.ai.studio/). v1 is a rebuild on Next.js 16, CopilotKit v2 and Gemini 4 Argon, with a deterministic rulebook that cross-checks the AI, a notebook of revisitable reviews and a React Three Fiber dupe stage.
